import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import type { PrismaService } from '../src/prisma/prisma.service';
import { createMatch } from './factories/match.factory';
import { createPelada } from './factories/pelada.factory';
import { createUser } from './factories/user.factory';
import { createTestApp } from './helpers/create-test-app';
import { resetDatabase } from './helpers/reset-database';
import { signTestJwt } from './helpers/sign-test-jwt';

const runHarness =
  process.env.RUN_DB_TESTS === '1' && process.env.DATABASE_URL_TEST;

if (runHarness) {
  describe('3.2-EXC match rulesOverride GET/PATCH', () => {
    let app: INestApplication<App>;
    let prisma: PrismaService;

    beforeAll(async () => {
      const ctx = await createTestApp();
      app = ctx.app;
      prisma = ctx.prisma;
    });

    beforeEach(async () => {
      await resetDatabase(prisma);
    });

    afterAll(async () => {
      await app.close();
    });

    it('GET .../rules without token returns 401', async () => {
      const user = await createUser(prisma, { keycloakSub: 'exc-401' });
      const pelada = await createPelada(prisma, { owner: user });
      const match = await createMatch(prisma, { pelada });

      await request(app.getHttpServer())
        .get(`/peladas/${pelada.id}/matches/${match.id}/rules`)
        .expect(401);
    });

    it('GET .../rules returns default, override and effective for member', async () => {
      const sub = 'exc-get';
      const user = await createUser(prisma, { keycloakSub: sub });
      const pelada = await createPelada(prisma, { owner: user });
      const match = await createMatch(prisma, {
        pelada,
        rulesOverride: { playersPerTeam: 5 },
      });
      const token = signTestJwt({ sub, email: user.email ?? 'x@y.z' });

      const res = await request(app.getHttpServer())
        .get(`/peladas/${pelada.id}/matches/${match.id}/rules`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.matchId).toBe(match.id);
      expect(res.body.defaultRules.playersPerTeam).toBe(6);
      expect(res.body.rulesOverride).toMatchObject({ playersPerTeam: 5 });
      expect(res.body.effectiveRules.playersPerTeam).toBe(5);
    });

    it('PATCH .../rules-override does not change PeladaRules default', async () => {
      const sub = 'exc-default';
      const user = await createUser(prisma, { keycloakSub: sub });
      const pelada = await createPelada(prisma, { owner: user });
      const match = await createMatch(prisma, { pelada });
      const token = signTestJwt({ sub, email: user.email ?? 'd@f.g' });

      await request(app.getHttpServer())
        .patch(`/peladas/${pelada.id}/matches/${match.id}/rules-override`)
        .set('Authorization', `Bearer ${token}`)
        .send({ playersPerTeam: 8 })
        .expect(200);

      const defaults = await prisma.peladaRules.findUnique({
        where: { peladaId: pelada.id },
      });
      expect(defaults?.playersPerTeam).toBe(6);

      const stored = await prisma.match.findUnique({ where: { id: match.id } });
      expect(stored?.rulesOverride).toMatchObject({ playersPerTeam: 8 });
    });

    describe('puxar a fila ao aumentar as vagas (issue #230)', () => {
      async function seedQueue(sub: string, autoFill: boolean) {
        const user = await createUser(prisma, { keycloakSub: sub });
        const pelada = await createPelada(prisma, { owner: user });
        await prisma.peladaRules.update({
          where: { peladaId: pelada.id },
          data: {
            playersPerTeam: 4,
            teamCount: 2,
            capacity: null,
            extra: { autoFillQueueOnCapacityIncrease: autoFill },
          },
        });
        const match = await createMatch(prisma, { pelada });
        const token = signTestJwt({ sub, email: user.email ?? 'q@f.g' });
        const players = [];
        for (let i = 0; i < 10; i++) {
          players.push(
            await prisma.player.create({ data: { peladaId: pelada.id, displayName: `J${i}` } }),
          );
        }
        for (const p of players) {
          await request(app.getHttpServer())
            .patch(`/peladas/${pelada.id}/matches/${match.id}/attendance/${p.id}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ status: 'CONFIRMED' })
            .expect(200);
        }
        return { pelada, match, token, players };
      }
      const counts = async (matchId: string) => {
        const rows = await prisma.matchAttendance.findMany({ where: { matchId } });
        return {
          confirmed: rows.filter((r) => r.status === 'CONFIRMED').length,
          queue: rows.filter((r) => r.status === 'QUEUE').length,
        };
      };

      it('ligado: 4 → 5 na linha sobe os 2 da fila', async () => {
        const { pelada, match, token, players } = await seedQueue('exc-autofill-on', true);
        expect(await counts(match.id)).toEqual({ confirmed: 8, queue: 2 });
        await request(app.getHttpServer())
          .patch(`/peladas/${pelada.id}/matches/${match.id}/rules-override`)
          .set('Authorization', `Bearer ${token}`)
          .send({ playersPerTeam: 5 })
          .expect(200);
        expect(await counts(match.id)).toEqual({ confirmed: 10, queue: 0 });
        const last = await prisma.matchAttendance.findUniqueOrThrow({
          where: { matchId_playerId: { matchId: match.id, playerId: players[9].id } },
        });
        expect(last.status).toBe('CONFIRMED');
      });

      it('desligado: as vagas aumentam mas a fila fica como está', async () => {
        const { pelada, match, token } = await seedQueue('exc-autofill-off', false);
        await request(app.getHttpServer())
          .patch(`/peladas/${pelada.id}/matches/${match.id}/rules-override`)
          .set('Authorization', `Bearer ${token}`)
          .send({ playersPerTeam: 5 })
          .expect(200);
        expect(await counts(match.id)).toEqual({ confirmed: 8, queue: 2 });
      });

      it('depois do sorteio ninguém sobe', async () => {
        const { pelada, match, token } = await seedQueue('exc-autofill-drawn', true);
        await prisma.match.update({ where: { id: match.id }, data: { status: 'DRAWN' } });
        await request(app.getHttpServer())
          .patch(`/peladas/${pelada.id}/matches/${match.id}/rules-override`)
          .set('Authorization', `Bearer ${token}`)
          .send({ playersPerTeam: 5 })
          .expect(200);
        expect(await counts(match.id)).toEqual({ confirmed: 8, queue: 2 });
      });
    });

        it('PATCH .../rules-override returns 403 for non-organizador', async () => {
      const orgSub = 'exc-org';
      const jogSub = 'exc-jog';
      const org = await createUser(prisma, { keycloakSub: orgSub });
      const jog = await createUser(prisma, { keycloakSub: jogSub });
      const pelada = await createPelada(prisma, { owner: org });
      await prisma.peladaMember.create({
        data: { peladaId: pelada.id, userId: jog.id, role: 'JOGADOR' },
      });
      const match = await createMatch(prisma, { pelada });
      const token = signTestJwt({ sub: jogSub, email: jog.email ?? 'j@z.c' });

      await request(app.getHttpServer())
        .patch(`/peladas/${pelada.id}/matches/${match.id}/rules-override`)
        .set('Authorization', `Bearer ${token}`)
        .send({ teamCount: 3 })
        .expect(403);
    });

    it('PATCH rejects conflicting GK flags in override extra', async () => {
      const sub = 'exc-gk-bad';
      const user = await createUser(prisma, { keycloakSub: sub });
      const pelada = await createPelada(prisma, { owner: user });
      const match = await createMatch(prisma, { pelada });
      const token = signTestJwt({ sub, email: user.email ?? 'g@k.c' });

      await request(app.getHttpServer())
        .patch(`/peladas/${pelada.id}/matches/${match.id}/rules-override`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          extra: { goalkeeperPerTeam: true, fixedGoalkeeper: true },
        })
        .expect(400);
    });
  });
}
