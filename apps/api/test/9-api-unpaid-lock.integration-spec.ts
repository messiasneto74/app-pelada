import { INestApplication } from '@nestjs/common';
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

if (runHarness) {
  describe('Issue #263 — travar quem não pagou', () => {
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

    async function seed(policy: 'BLOCK' | 'CHARGE' | null) {
      const sub = `unpaid-${Math.random().toString(36).slice(2, 8)}`;
      const org = await createUser(prisma, { keycloakSub: `${sub}-org` });
      const jog = await createUser(prisma, { keycloakSub: `${sub}-j` });
      const pelada = await createPelada(prisma, { owner: org });
      await prisma.peladaMember.create({ data: { peladaId: pelada.id, userId: jog.id, role: 'JOGADOR' } });
      await prisma.peladaRules.update({
        where: { peladaId: pelada.id },
        data: {
          playersPerTeam: 1,
          teamCount: 2,
          capacity: null,
          extra: policy ? { unpaidPolicy: policy } : {},
        },
      });
      const previous = await createMatch(prisma, { pelada, scheduledAt: new Date('2030-01-01T19:00:00Z') });
      const match = await createMatch(prisma, { pelada, scheduledAt: new Date('2030-01-08T19:00:00Z') });
      await prisma.match.update({ where: { id: match.id }, data: { presenceMode: 'SELF_CONFIRM' } });
      const devedor = await createPlayer(prisma, { peladaId: pelada.id, displayName: 'Devedor' });
      await prisma.player.update({ where: { id: devedor.id }, data: { userId: jog.id } });
      const outro = await createPlayer(prisma, { peladaId: pelada.id, displayName: 'Outro' });
      const outro2 = await createPlayer(prisma, { peladaId: pelada.id, displayName: 'Outro2' });
      // cobrança da partida anterior, ainda não paga
      const charge = await prisma.paymentLedger.create({
        data: { peladaId: pelada.id, playerId: devedor.id, matchId: previous.id, amountCents: 2000, status: 'PENDING' },
      });
      const orgToken = signTestJwt({ sub: `${sub}-org`, email: org.email ?? 'o@u.p' });
      const jogToken = signTestJwt({ sub: `${sub}-j`, email: jog.email ?? 'j@u.p' });
      const base = `/peladas/${pelada.id}/matches/${match.id}`;
      return { pelada, match, devedor, outro, outro2, charge, orgToken, jogToken, base };
    }

    it('Trava: o jogador não se coloca na lista e o adm também não consegue; lista mostra quem está travado', async () => {
      const { base, devedor, orgToken, jogToken } = await seed('BLOCK');
      const self = await request(app.getHttpServer())
        .post(`${base}/attendance/self`)
        .set('Authorization', `Bearer ${jogToken}`)
        .send({ action: 'confirm' })
        .expect(409);
      expect(self.body.message).toBe(
        'Devedor tem cobrança em aberto. Só entra na lista depois que o adm confirmar o pagamento no Caixa.',
      );
      await request(app.getHttpServer())
        .patch(`${base}/attendance/${devedor.id}`)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({ status: 'CONFIRMED' })
        .expect(409);
      const list = await request(app.getHttpServer())
        .get(`${base}/attendance`)
        .set('Authorization', `Bearer ${orgToken}`)
        .expect(200);
      expect(list.body.unpaidPolicy).toBe('BLOCK');
      const row = list.body.entries.find((e: { playerId: string }) => e.playerId === devedor.id);
      expect(row.openCharge).toBe(true);
      expect(row.status).not.toBe('CONFIRMED');
    });

    it('Trava: depois que o adm marca como paga, entra normal', async () => {
      const { pelada, base, charge, orgToken, jogToken } = await seed('BLOCK');
      await request(app.getHttpServer())
        .post(`/peladas/${pelada.id}/payments/${charge.id}/mark-paid`)
        .set('Authorization', `Bearer ${orgToken}`)
        .expect((r) => {
          if (r.status >= 300) throw new Error(`paid ${r.status} ${JSON.stringify(r.body)}`);
        });
      await request(app.getHttpServer())
        .post(`${base}/attendance/self`)
        .set('Authorization', `Bearer ${jogToken}`)
        .send({ action: 'confirm' })
        .expect(201);
    });

    it('Trava: quem foi cobrado depois de entrar na lista não entra no sorteio', async () => {
      const { pelada, base, devedor, outro, charge, orgToken } = await seed('BLOCK');
      // pagou a anterior, entrou na lista…
      await prisma.paymentLedger.update({ where: { id: charge.id }, data: { status: 'PAID', paidAt: new Date() } });
      for (const id of [devedor.id, outro.id]) {
        await request(app.getHttpServer())
          .patch(`${base}/attendance/${id}`)
          .set('Authorization', `Bearer ${orgToken}`)
          .send({ status: 'CONFIRMED' })
          .expect(200);
      }
      // …e ganhou outra cobrança em aberto (sem partida) antes do sorteio
      await prisma.paymentLedger.create({
        data: { peladaId: pelada.id, playerId: devedor.id, amountCents: 1000, status: 'PENDING' },
      });
      await request(app.getHttpServer())
        .post(`${base}/attendance/close-list`)
        .set('Authorization', `Bearer ${orgToken}`)
        .expect((r) => {
          if (r.status >= 300) throw new Error(`close ${r.status}`);
        });
      const draw = await request(app.getHttpServer())
        .post(`${base}/draw`)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({ mode: 'RANDOM' })
        .expect(409);
      expect(draw.body.message).toBe(
        'Cobrança em aberto: Devedor. Tire da lista ou confirme o pagamento no Caixa antes de sortear.',
      );
    });

    it('cobrança desta própria partida não trava', async () => {
      const { pelada, match, base, charge, jogToken } = await seed('BLOCK');
      await prisma.paymentLedger.update({ where: { id: charge.id }, data: { matchId: match.id } });
      expect(pelada.id).toBeTruthy();
      await request(app.getHttpServer())
        .post(`${base}/attendance/self`)
        .set('Authorization', `Bearer ${jogToken}`)
        .send({ action: 'confirm' })
        .expect(201);
    });

    it.each([['CHARGE' as const], [null]])('Só cobra (%s): entra normal e o recebido do caixa não conta a cobrança em aberto', async (policy) => {
      const { pelada, base, jogToken, orgToken } = await seed(policy);
      await request(app.getHttpServer())
        .post(`${base}/attendance/self`)
        .set('Authorization', `Bearer ${jogToken}`)
        .send({ action: 'confirm' })
        .expect(201);
      const ledger = await request(app.getHttpServer())
        .get(`/peladas/${pelada.id}/payments/ledger`)
        .set('Authorization', `Bearer ${orgToken}`)
        .expect(200);
      expect(ledger.body.summary.receivedCents).toBe(0);
    });
  });
}
