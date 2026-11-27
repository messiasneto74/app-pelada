import { INestApplication } from '@nestjs/common';
import { get, type IncomingMessage } from 'node:http';
import type { AddressInfo } from 'node:net';
import request from 'supertest';
import { App } from 'supertest/types';
import type { PrismaService } from '../src/prisma/prisma.service';
import { createMatch } from './factories/match.factory';
import { createPelada } from './factories/pelada.factory';
import { createPlayer } from './factories/player.factory';
import { createUser } from './factories/user.factory';
import { createTestApp } from './helpers/create-test-app';
import { resetDatabase } from './helpers/reset-database';
import { signTestJwt } from './helpers/sign-test-jwt';

const runHarness =
  process.env.RUN_DB_TESTS === '1' && process.env.DATABASE_URL_TEST;

type Listener = {
  status: number;
  ended: boolean;
  events: Array<{ type: string; data: Record<string, unknown>; at: number }>;
  close: () => void;
};

/** Abre `GET /peladas/:id/live` como o app faz (fetch com Bearer) e junta os eventos. */
function listen(port: number, peladaId: string, token: string): Promise<Listener> {
  return new Promise((resolve, reject) => {
    const req = get(
      {
        host: '127.0.0.1',
        port,
        path: `/peladas/${peladaId}/live`,
        headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
      },
      (res: IncomingMessage) => {
        const out: Listener = {
          status: res.statusCode ?? 0,
          ended: false,
          events: [],
          close: () => req.destroy(),
        };
        res.on('end', () => (out.ended = true));
        let buf = '';
        res.setEncoding('utf8');
        res.on('data', (chunk: string) => {
          buf += chunk;
          let idx: number;
          while ((idx = buf.indexOf('\n\n')) >= 0) {
            const block = buf.slice(0, idx);
            buf = buf.slice(idx + 2);
            const type = /^event: (.*)$/m.exec(block)?.[1] ?? 'message';
            const data = /^data: (.*)$/m.exec(block)?.[1];
            if (data) {
              out.events.push({ type, data: JSON.parse(data), at: Date.now() });
            }
          }
        });
        res.on('error', () => undefined);
        resolve(out);
      },
    );
    req.on('error', (e) => {
      if ((e as NodeJS.ErrnoException).code !== 'ECONNRESET') reject(e);
    });
  });
}

const waitFor = async (cond: () => boolean, ms = 3000) => {
  const end = Date.now() + ms;
  while (!cond() && Date.now() < end) {
    await new Promise((r) => setTimeout(r, 20));
  }
};

if (runHarness) {
  describe('Issue #233 — avisos instantâneos (GET /peladas/:id/live)', () => {
    let app: INestApplication<App>;
    let prisma: PrismaService;
    let port: number;

    beforeAll(async () => {
      const ctx = await createTestApp();
      app = ctx.app;
      prisma = ctx.prisma;
      await app.listen(0, '127.0.0.1');
      port = (app.getHttpServer().address() as AddressInfo).port;
    });

    beforeEach(async () => {
      await resetDatabase(prisma);
    });

    afterAll(async () => {
      await app.close();
    });

    async function seed(nPlayers: number) {
      const sub = `live-${Math.random().toString(36).slice(2, 8)}`;
      const org = await createUser(prisma, { keycloakSub: `${sub}-org` });
      const pelada = await createPelada(prisma, { owner: org });
      const match = await createMatch(prisma, { pelada });
      const orgToken = signTestJwt({ sub: `${sub}-org`, email: org.email ?? 'o@l.v' });
      const players: Array<{ token: string; playerId: string }> = [];
      for (let i = 0; i < nPlayers; i++) {
        const u = await createUser(prisma, { keycloakSub: `${sub}-p${i}` });
        await prisma.peladaMember.create({
          data: { peladaId: pelada.id, userId: u.id, role: 'JOGADOR' },
        });
        const p = await createPlayer(prisma, { peladaId: pelada.id, displayName: `J${i}` });
        await prisma.player.update({ where: { id: p.id }, data: { userId: u.id } });
        players.push({
          token: signTestJwt({ sub: `${sub}-p${i}`, email: u.email ?? `p${i}@l.v` }),
          playerId: p.id,
        });
      }
      return { pelada, match, orgToken, players };
    }

    it('sem login: 401; quem não é da pelada: 403', async () => {
      const { pelada } = await seed(0);
      await request(app.getHttpServer()).get(`/peladas/${pelada.id}/live`).expect(401);
      const outsider = await createUser(prisma, { keycloakSub: 'live-outsider' });
      const l = await listen(
        port,
        pelada.id,
        signTestJwt({ sub: 'live-outsider', email: outsider.email ?? 'x@l.v' }),
      );
      expect(l.status).toBe(403);
      l.close();
    });

    it('presença marcada pelo adm chega na hora pro jogador; erro não avisa; outra pelada não recebe', async () => {
      const { pelada, match, orgToken, players } = await seed(2);
      const other = await seed(1);
      const l = await listen(port, pelada.id, players[0]!.token);
      const lOther = await listen(port, other.pelada.id, other.players[0]!.token);
      expect(l.status).toBe(200);

      // gravação que falha (jogador comum tentando marcar outro) não avisa ninguém
      await request(app.getHttpServer())
        .patch(`/peladas/${pelada.id}/matches/${match.id}/attendance/${players[1]!.playerId}`)
        .set('Authorization', `Bearer ${players[0]!.token}`)
        .send({ status: 'CONFIRMED' })
        .expect(403);

      const sentAt = Date.now();
      await request(app.getHttpServer())
        .patch(`/peladas/${pelada.id}/matches/${match.id}/attendance/${players[1]!.playerId}`)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({ status: 'CONFIRMED' })
        .expect(200);
      await waitFor(() => l.events.some((e) => e.type === 'change'));

      const changes = l.events.filter((e) => e.type === 'change');
      expect(changes).toHaveLength(1);
      expect(changes[0]!.data).toMatchObject({
        peladaId: pelada.id,
        scope: 'attendance',
        matchId: match.id,
      });
      expect(changes[0]!.at - sentAt).toBeLessThan(1000);
      expect(lOther.events.filter((e) => e.type === 'change')).toHaveLength(0);
      l.close();
      lOther.close();
    });

    it('removido da pelada: para de receber na hora e o fluxo fecha', async () => {
      const { pelada, match, orgToken, players } = await seed(2);
      const l = await listen(port, pelada.id, players[0]!.token);
      expect(l.status).toBe(200);
      await request(app.getHttpServer())
        .delete(`/peladas/${pelada.id}/players/${players[0]!.playerId}`)
        .set('Authorization', `Bearer ${orgToken}`)
        .expect((r) => {
          if (r.status >= 300) throw new Error(`delete ${r.status}`);
        });
      // o próprio "apagar jogador" já é uma gravação da pelada: o fluxo confere e fecha
      await waitFor(() => l.ended);
      await request(app.getHttpServer())
        .patch(`/peladas/${pelada.id}/matches/${match.id}/attendance/${players[1]!.playerId}`)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({ status: 'CONFIRMED' })
        .expect(200);
      await new Promise((r) => setTimeout(r, 300));
      expect(l.events.filter((e) => e.type === 'change')).toHaveLength(0);
      expect(l.ended).toBe(true);
      l.close();
    });

    it('carga: 50 jogadores conectados ao mesmo tempo recebem o aviso', async () => {
      const { pelada, match, orgToken, players } = await seed(50);
      const listeners = await Promise.all(players.map((p) => listen(port, pelada.id, p.token)));
      expect(listeners.every((l) => l.status === 200)).toBe(true);

      const sentAt = Date.now();
      await request(app.getHttpServer())
        .patch(`/peladas/${pelada.id}/matches/${match.id}/attendance/${players[7]!.playerId}`)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({ status: 'CONFIRMED' })
        .expect(200);
      await waitFor(() => listeners.every((l) => l.events.some((e) => e.type === 'change')), 5000);

      const delays = listeners.map((l) => {
        const first = l.events.find((e) => e.type === 'change');
        return first ? first.at - sentAt : Number.POSITIVE_INFINITY;
      });
      expect(delays.filter((d) => Number.isFinite(d))).toHaveLength(50);
      expect(Math.max(...delays)).toBeLessThan(2000);
      listeners.forEach((l) => l.close());
    });
  });
}
