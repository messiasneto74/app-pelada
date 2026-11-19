import { describe, expect, it, vi } from 'vitest';
import {
  buildMatchPlan,
  buildTestUsers,
  createMatches,
  fillAttendance,
  joinAllUsers,
  loginAllUsers,
  passwordGrantToken,
  pickAttendanceSubset,
  promoteAllUsers,
  registerAllUsers,
  registerUser,
  requestJson,
  seedTestUsers,
  testUserEmail,
  testUserName,
} from './seed-test-users.mjs';

function jsonResponse(body, status = 200) {
  return { ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(body) };
}

describe('seed-test-users — helpers puros', () => {
  it('testUserEmail é determinístico e com domínio custom', () => {
    expect(testUserEmail(1)).toBe('jogador-teste-01@pelada-teste.local');
    expect(testUserEmail(12, 'x.local')).toBe('jogador-teste-12@x.local');
  });

  it('testUserName inclui o índice pra garantir unicidade', () => {
    expect(testUserName(1)).toMatch(/\S+\s+\S+\s+1$/);
    expect(testUserName(1)).not.toBe(testUserName(2));
  });

  it('buildTestUsers monta N usuários com a mesma senha', () => {
    const users = buildTestUsers(3, { password: 'segredo' });
    expect(users).toHaveLength(3);
    expect(users.every((u) => u.password === 'segredo')).toBe(true);
    expect(new Set(users.map((u) => u.email)).size).toBe(3);
  });

  it('buildMatchPlan alterna o modo de presença', () => {
    const plan = buildMatchPlan(4, { startDate: new Date('2026-01-01T00:00:00Z') });
    expect(plan.map((p) => p.presenceMode)).toEqual([
      'ORGANIZER_CLOSES',
      'SELF_CONFIRM',
      'ORGANIZER_CLOSES',
      'SELF_CONFIRM',
    ]);
    expect(new Date(plan[1].scheduledAt).getTime()).toBeGreaterThan(
      new Date(plan[0].scheduledAt).getTime(),
    );
  });

  it('pickAttendanceSubset seleciona a fração pedida de forma estável', () => {
    const users = Array.from({ length: 10 }, (_, i) => ({ index: i }));
    expect(pickAttendanceSubset(users, 0.7)).toHaveLength(7);
    expect(pickAttendanceSubset(users, 1)).toHaveLength(10);
    expect(pickAttendanceSubset(users, 0)).toHaveLength(0);
  });
});

describe('requestJson', () => {
  it('retorna o body em sucesso e manda Authorization quando token é passado', async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    const body = await requestJson(fetchFn, 'http://x/y', { token: 'abc', method: 'POST' });
    expect(body).toEqual({ ok: true });
    expect(fetchFn).toHaveBeenCalledWith(
      'http://x/y',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer abc' }),
      }),
    );
  });

  it('lança com `status` em erro', async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({ message: 'nope' }, 409));
    await expect(requestJson(fetchFn, 'http://x/y')).rejects.toMatchObject({ status: 409 });
  });
});

describe('passwordGrantToken', () => {
  it('retorna o access_token em sucesso', async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({ access_token: 'tok-1' }));
    const token = await passwordGrantToken(fetchFn, 'http://kc/token', 'pelada-web', 'a@b.com', 'pw');
    expect(token).toBe('tok-1');
  });

  it('lança quando o Keycloak recusa', async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({ error: 'invalid_grant' }, 401));
    await expect(
      passwordGrantToken(fetchFn, 'http://kc/token', 'pelada-web', 'a@b.com', 'pw'),
    ).rejects.toMatchObject({ status: 401 });
  });
});

describe('registerUser', () => {
  it('trata 409 (já existe) como sucesso silencioso', async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({ message: 'já existe' }, 409));
    const log = vi.fn();
    await expect(
      registerUser(fetchFn, 'http://api', { email: 'a@b.com', password: 'x', name: 'A B' }, log),
    ).resolves.toBeUndefined();
    expect(log).toHaveBeenCalledWith(expect.stringContaining('já existia'));
  });

  it('propaga outros erros', async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({}, 500));
    await expect(
      registerUser(fetchFn, 'http://api', { email: 'a@b.com', password: 'x', name: 'A B' }),
    ).rejects.toMatchObject({ status: 500 });
  });
});

describe('registerAllUsers', () => {
  it('pausa entre lotes de 8, mas não após o último', async () => {
    const users = buildTestUsers(9);
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({}));
    const sleepFn = vi.fn().mockResolvedValue(undefined);
    await registerAllUsers(users, { fetchFn, apiUrl: 'http://api', batchSize: 8, sleepFn });
    expect(fetchFn).toHaveBeenCalledTimes(9);
    expect(sleepFn).toHaveBeenCalledTimes(1);
  });

  it('não pausa quando tudo cabe no primeiro lote', async () => {
    const users = buildTestUsers(5);
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({}));
    const sleepFn = vi.fn().mockResolvedValue(undefined);
    await registerAllUsers(users, { fetchFn, apiUrl: 'http://api', batchSize: 8, sleepFn });
    expect(sleepFn).not.toHaveBeenCalled();
  });
});

describe('loginAllUsers', () => {
  it('anexa o token a cada usuário', async () => {
    const users = buildTestUsers(2);
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({ access_token: 'tok' }));
    await loginAllUsers(users, { fetchFn, tokenUrl: 'http://kc/token', clientId: 'pelada-web' });
    expect(users.every((u) => u.token === 'tok')).toBe(true);
  });
});

describe('joinAllUsers', () => {
  it('cria convite e resgata para cada usuário', async () => {
    const users = buildTestUsers(2);
    users.forEach((u) => (u.token = `tok-${u.index}`));
    const fetchFn = vi.fn().mockImplementation((url) => {
      if (url.includes('/invites') && url.endsWith('/invites')) {
        return Promise.resolve(jsonResponse({ token: 'inv-tok' }));
      }
      return Promise.resolve(jsonResponse({}));
    });
    await joinAllUsers(users, { fetchFn, apiUrl: 'http://api', peladaId: 'p1', orgToken: 'org' });
    expect(fetchFn).toHaveBeenCalledTimes(4); // 2 invites + 2 redeems
  });

  it('trata "já é membro" (409 no redeem) como sucesso', async () => {
    const users = buildTestUsers(1);
    users[0].token = 'tok-1';
    const fetchFn = vi.fn().mockImplementation((url) => {
      if (url.endsWith('/invites')) return Promise.resolve(jsonResponse({ token: 'inv-tok' }));
      if (url.endsWith('/redeem')) return Promise.resolve(jsonResponse({ message: 'já é membro' }, 409));
      return Promise.resolve(jsonResponse({}));
    });
    await expect(
      joinAllUsers(users, { fetchFn, apiUrl: 'http://api', peladaId: 'p1', orgToken: 'org' }),
    ).resolves.toBeUndefined();
  });
});

describe('promoteAllUsers', () => {
  it('promove convidados e resolve playerId pra quem já era jogador', async () => {
    const users = buildTestUsers(2);
    const fetchFn = vi.fn().mockImplementation((url) => {
      if (url.endsWith('/guests')) {
        return Promise.resolve(
          jsonResponse({ players: [{ id: 'guest-1', displayName: users[0].name }] }),
        );
      }
      if (url.endsWith('/players')) {
        return Promise.resolve(
          jsonResponse({ players: [{ id: 'player-2', displayName: users[1].name }] }),
        );
      }
      if (url.includes('/promote')) {
        return Promise.resolve(jsonResponse({ id: 'guest-1' }));
      }
      return Promise.resolve(jsonResponse({}));
    });
    await promoteAllUsers(users, { fetchFn, apiUrl: 'http://api', peladaId: 'p1', orgToken: 'org' });
    expect(users[0].playerId).toBe('guest-1');
    expect(users[1].playerId).toBe('player-2');
  });

  it('loga um aviso e segue quando o convidado não é encontrado', async () => {
    const users = buildTestUsers(1);
    const fetchFn = vi.fn().mockImplementation((url) => {
      if (url.endsWith('/guests')) return Promise.resolve(jsonResponse({ players: [] }));
      if (url.endsWith('/players')) return Promise.resolve(jsonResponse({ players: [] }));
      return Promise.resolve(jsonResponse({}));
    });
    const log = vi.fn();
    await promoteAllUsers(users, { fetchFn, apiUrl: 'http://api', peladaId: 'p1', orgToken: 'org', log });
    expect(users[0].playerId).toBeUndefined();
    expect(log).toHaveBeenCalledWith(expect.stringContaining('não encontrado'));
  });
});

describe('createMatches', () => {
  it('cria cada partida do plano e anexa o id retornado', async () => {
    const plan = buildMatchPlan(2, { startDate: new Date('2026-01-01T00:00:00Z') });
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({ id: 'm-1' }));
    const created = await createMatches(plan, { fetchFn, apiUrl: 'http://api', peladaId: 'p1', orgToken: 'org' });
    expect(created).toHaveLength(2);
    expect(created[0].id).toBe('m-1');
  });
});

describe('fillAttendance', () => {
  it('usa self-attendance em partidas SELF_CONFIRM e patch em ORGANIZER_CLOSES', async () => {
    const users = buildTestUsers(10).map((u, i) => ({ ...u, token: `tok-${i}`, playerId: `pl-${i}` }));
    const matches = [
      { id: 'm1', presenceMode: 'SELF_CONFIRM' },
      { id: 'm2', presenceMode: 'ORGANIZER_CLOSES' },
    ];
    const calls = [];
    const fetchFn = vi.fn().mockImplementation((url, opts) => {
      calls.push({ url, method: opts?.method });
      return Promise.resolve(jsonResponse({}));
    });
    await fillAttendance(matches, users, { fetchFn, apiUrl: 'http://api', peladaId: 'p1', orgToken: 'org' });
    const selfCalls = calls.filter((c) => c.url.includes('/attendance/self'));
    const patchCalls = calls.filter((c) => c.method === 'PATCH');
    expect(selfCalls).toHaveLength(7); // 70% de 10
    expect(patchCalls).toHaveLength(7);
  });

  it('ignora usuários sem playerId resolvido', async () => {
    const users = [{ index: 1, token: 'tok', playerId: undefined }];
    const matches = [{ id: 'm1', presenceMode: 'SELF_CONFIRM' }];
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({}));
    await fillAttendance(matches, users, { fetchFn, apiUrl: 'http://api', peladaId: 'p1', orgToken: 'org', attendanceRate: 1 });
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe('seedTestUsers (orquestração)', () => {
  it('reautentica o organizador antes de cada fase (token pode expirar durante o cadastro)', async () => {
    const tokenCalls = [];
    const fetchFn = vi.fn().mockImplementation((url) => {
      if (url.includes('/protocol/openid-connect/token')) {
        tokenCalls.push(url);
        return Promise.resolve(jsonResponse({ access_token: 'tok' }));
      }
      if (url.endsWith('/register')) return Promise.resolve(jsonResponse({}, 201));
      if (url.endsWith('/invites')) return Promise.resolve(jsonResponse({ token: 'inv' }));
      if (url.endsWith('/redeem')) return Promise.resolve(jsonResponse({}));
      if (url.endsWith('/guests')) return Promise.resolve(jsonResponse({ players: [{ id: 'g1', displayName: testUserName(1) }] }));
      if (url.endsWith('/players') && !url.includes('matches')) {
        return Promise.resolve(jsonResponse({ players: [] }));
      }
      if (url.includes('/promote')) return Promise.resolve(jsonResponse({ id: 'g1' }));
      if (url.endsWith('/matches')) return Promise.resolve(jsonResponse({ id: 'm1' }));
      return Promise.resolve(jsonResponse({}));
    });

    await seedTestUsers({
      apiUrl: 'http://api',
      tokenUrl: 'http://kc/protocol/openid-connect/token',
      clientId: 'pelada-web',
      organizerEmail: 'org@x.com',
      organizerPassword: 'pw',
      peladaId: 'p1',
      userCount: 1,
      matchCount: 1,
      fetchFn,
      log: () => {},
      sleepFn: async () => {},
    });

    // 1 login do usuário de teste + 4 reautenticações do organizador
    // (entrar na pelada, promover, criar partidas, marcar presença) — nunca
    // um único token obtido antes do cadastro (que pode levar minutos).
    expect(tokenCalls.length).toBe(5);
  });

  it('encadeia todos os passos e retorna usuários e partidas', async () => {
    const fetchFn = vi.fn().mockImplementation((url) => {
      if (url.includes('/protocol/openid-connect/token')) {
        return Promise.resolve(jsonResponse({ access_token: 'tok' }));
      }
      if (url.endsWith('/register')) return Promise.resolve(jsonResponse({}, 201));
      if (url.endsWith('/invites')) return Promise.resolve(jsonResponse({ token: 'inv' }));
      if (url.endsWith('/redeem')) return Promise.resolve(jsonResponse({}));
      if (url.endsWith('/guests')) return Promise.resolve(jsonResponse({ players: [{ id: 'g1', displayName: testUserNameOf(1) }] }));
      if (url.endsWith('/players') && !url.includes('matches')) {
        return Promise.resolve(jsonResponse({ players: [] }));
      }
      if (url.includes('/promote')) return Promise.resolve(jsonResponse({ id: 'g1' }));
      if (url.endsWith('/matches')) return Promise.resolve(jsonResponse({ id: 'm1' }));
      return Promise.resolve(jsonResponse({}));
    });

    function testUserNameOf(i) {
      return testUserName(i);
    }

    const { users, matches } = await seedTestUsers({
      apiUrl: 'http://api',
      tokenUrl: 'http://kc/protocol/openid-connect/token',
      clientId: 'pelada-web',
      organizerEmail: 'org@x.com',
      organizerPassword: 'pw',
      peladaId: 'p1',
      userCount: 1,
      matchCount: 1,
      fetchFn,
      log: () => {},
      sleepFn: async () => {},
    });

    expect(users).toHaveLength(1);
    expect(users[0].token).toBe('tok');
    expect(matches).toHaveLength(1);
    expect(matches[0].id).toBe('m1');
  });
});
