import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import type { PrismaService } from '../src/prisma/prisma.service';
import { KeycloakAdminClient } from '../src/register/keycloak-admin.client';
import { createPelada } from './factories/pelada.factory';
import { createUser } from './factories/user.factory';
import { createTestApp } from './helpers/create-test-app';
import { resetDatabase } from './helpers/reset-database';
import { signTestJwt } from './helpers/sign-test-jwt';

const runHarness =
  process.env.RUN_DB_TESTS === '1' && process.env.DATABASE_URL_TEST;

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

if (runHarness) {
  describe('#226 Meu perfil — nome, foto e senha', () => {
    let app: INestApplication<App>;
    let prisma: PrismaService;
    const keycloak = {
      updateUserName: jest.fn().mockResolvedValue(undefined),
      resetPassword: jest.fn().mockResolvedValue(undefined),
      verifyPassword: jest.fn(),
      createUser: jest.fn(),
    };

    beforeAll(async () => {
      const ctx = await createTestApp([[KeycloakAdminClient, keycloak]]);
      app = ctx.app;
      prisma = ctx.prisma;
    });

    beforeEach(async () => {
      await resetDatabase(prisma);
      jest.clearAllMocks();
    });

    afterAll(async () => {
      await app.close();
    });

    async function seed(sub: string) {
      const user = await createUser(prisma, { keycloakSub: sub });
      const p1 = await createPelada(prisma, { owner: user });
      const other = await createUser(prisma, { keycloakSub: `${sub}-org2` });
      const p2 = await createPelada(prisma, { owner: other });
      await prisma.peladaMember.create({ data: { peladaId: p2.id, userId: user.id, role: 'JOGADOR' } });
      const pl1 = await prisma.player.create({ data: { peladaId: p1.id, displayName: 'Nome Antigo', userId: user.id } });
      const pl2 = await prisma.player.create({ data: { peladaId: p2.id, displayName: 'Apelido Antigo', userId: user.id } });
      const token = signTestJwt({ sub, email: user.email ?? `${sub}@x.y` });
      return { user, pl1, pl2, token };
    }

    it('PATCH /me name: grava, atualiza o Keycloak e o nome dos jogadores em todas as peladas', async () => {
      const { pl1, pl2, token } = await seed('perfil-nome');
      const res = await request(app.getHttpServer())
        .patch('/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: '  Maria   da Silva ' })
        .expect(200);
      expect(res.body.name).toBe('Maria da Silva');
      expect(keycloak.updateUserName).toHaveBeenCalledWith('perfil-nome', 'Maria da Silva');
      const players = await prisma.player.findMany({ where: { id: { in: [pl1.id, pl2.id] } } });
      expect(players.map((p) => p.displayName)).toEqual(['Maria da Silva', 'Maria da Silva']);
    });

    it('PATCH /me name curto é recusado', async () => {
      const { token } = await seed('perfil-nome-curto');
      const res = await request(app.getHttpServer())
        .patch('/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Al' })
        .expect(400);
      expect(JSON.stringify(res.body.message)).toContain('Informe nome e sobrenome');
      expect(keycloak.updateUserName).not.toHaveBeenCalled();
    });

    it('POST /me/photo: grava a foto da conta e dos jogadores vinculados', async () => {
      const { pl1, pl2, token } = await seed('perfil-foto');
      const res = await request(app.getHttpServer())
        .post('/me/photo')
        .set('Authorization', `Bearer ${token}`)
        .attach('photo', PNG, { filename: 'eu.png', contentType: 'image/png' })
        .expect(201);
      expect(res.body.photoUrl).toMatch(/\/uploads\/user-.+\.png$/);
      const players = await prisma.player.findMany({ where: { id: { in: [pl1.id, pl2.id] } } });
      expect(players.every((p) => p.photoUrl === res.body.photoUrl)).toBe(true);
    });

    it('POST /me/photo recusa GIF e envio sem arquivo', async () => {
      const { token } = await seed('perfil-foto-ruim');
      await request(app.getHttpServer())
        .post('/me/photo')
        .set('Authorization', `Bearer ${token}`)
        .attach('photo', Buffer.from('GIF89a'), { filename: 'x.gif', contentType: 'image/gif' })
        .expect(400);
      await request(app.getHttpServer())
        .post('/me/photo')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });

    it('POST /me/password: senha atual errada → 400 sem trocar', async () => {
      const { token } = await seed('perfil-senha-errada');
      keycloak.verifyPassword.mockResolvedValue(false);
      const res = await request(app.getHttpServer())
        .post('/me/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'errada123', newPassword: 'NovaSenha@1' })
        .expect(400);
      expect(res.body.message).toBe('Senha atual incorreta.');
      expect(keycloak.resetPassword).not.toHaveBeenCalled();
    });

    it('POST /me/password: senha atual certa → troca no Keycloak (204)', async () => {
      const { user, token } = await seed('perfil-senha-ok');
      keycloak.verifyPassword.mockResolvedValue(true);
      await request(app.getHttpServer())
        .post('/me/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'Atual@123', newPassword: 'NovaSenha@1' })
        .expect(204);
      expect(keycloak.verifyPassword).toHaveBeenCalledWith(user.email, 'Atual@123');
      expect(keycloak.resetPassword).toHaveBeenCalledWith('perfil-senha-ok', 'NovaSenha@1');
    });

    it('POST /me/password: nova senha curta ou igual à atual é recusada', async () => {
      const { token } = await seed('perfil-senha-regra');
      keycloak.verifyPassword.mockResolvedValue(true);
      await request(app.getHttpServer())
        .post('/me/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'Atual@123', newPassword: 'curta' })
        .expect(400);
      const same = await request(app.getHttpServer())
        .post('/me/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'Atual@123', newPassword: 'Atual@123' })
        .expect(400);
      expect(same.body.message).toContain('diferente da atual');
      expect(keycloak.resetPassword).not.toHaveBeenCalled();
    });

    it('sem login: 401 nas rotas novas', async () => {
      await request(app.getHttpServer()).post('/me/photo').expect(401);
      await request(app.getHttpServer()).post('/me/password').send({}).expect(401);
    });
  });
}
