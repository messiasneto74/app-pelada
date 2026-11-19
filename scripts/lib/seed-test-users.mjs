const FIRST_NAMES = [
  'Ana', 'Bruno', 'Carla', 'Diego', 'Elaine', 'Fábio', 'Gabriela', 'Hugo',
  'Isabela', 'João', 'Karina', 'Lucas', 'Mariana', 'Nelson', 'Otávio',
  'Patrícia', 'Rafael', 'Sabrina', 'Tiago', 'Vanessa',
];

const LAST_NAMES = [
  'Silva', 'Souza', 'Oliveira', 'Pereira', 'Santos', 'Costa', 'Almeida',
  'Ribeiro', 'Carvalho', 'Gomes', 'Martins', 'Araújo', 'Rocha', 'Dias',
  'Nascimento', 'Teixeira', 'Barros', 'Freitas', 'Pinto', 'Cardoso',
  'Moreira', 'Lopes',
];

/** E-mail determinístico pro usuário de teste N (1-based). */
export function testUserEmail(index, domain = 'pelada-teste.local') {
  return `jogador-teste-${String(index).padStart(2, '0')}@${domain}`;
}

/**
 * Nome "Nome Sobrenome N" — o índice garante unicidade mesmo com poucas
 * combinações de nome/sobrenome, e serve pra localizar o Player criado
 * pelo convite (displayName vem do claim `name` do token).
 */
export function testUserName(index) {
  const first = FIRST_NAMES[(index - 1) % FIRST_NAMES.length];
  const last = LAST_NAMES[(index - 1 + 7) % LAST_NAMES.length];
  return `${first} ${last} ${index}`;
}

/** Monta a lista de N usuários de teste (sem token ainda). */
export function buildTestUsers(count, opts = {}) {
  const { domain = 'pelada-teste.local', password = 'Teste@12345' } = opts;
  return Array.from({ length: count }, (_, i) => {
    const index = i + 1;
    return {
      index,
      email: testUserEmail(index, domain),
      password,
      name: testUserName(index),
    };
  });
}

const PRESENCE_MODES = ['ORGANIZER_CLOSES', 'SELF_CONFIRM'];

/** Monta N partidas futuras, alternando o modo de presença. */
export function buildMatchPlan(count, opts = {}) {
  const {
    startDate = new Date(),
    intervalDays = 7,
    location = 'Quadra de Teste',
  } = opts;
  return Array.from({ length: count }, (_, i) => ({
    scheduledAt: new Date(
      startDate.getTime() + i * intervalDays * 24 * 60 * 60 * 1000,
    ).toISOString(),
    location,
    notes: `Partida de teste ${i + 1}`,
    presenceMode: PRESENCE_MODES[i % PRESENCE_MODES.length],
  }));
}

/** Subconjunto determinístico (mesmos usuários sempre) pra marcar presença. */
export function pickAttendanceSubset(users, rate = 0.7) {
  const threshold = Math.round(rate * 10);
  return users.filter((_, i) => i % 10 < threshold);
}

async function readBody(res) {
  const text = await res.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** POST/PATCH JSON com Bearer opcional; lança com `status` em erro. */
export async function requestJson(fetchFn, url, options = {}) {
  const { token, ...rest } = options;
  const headers = { 'Content-Type': 'application/json', ...(rest.headers ?? {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetchFn(url, { ...rest, headers });
  const body = await readBody(res);
  if (!res.ok) {
    const err = new Error(
      `${rest.method ?? 'GET'} ${url} → HTTP ${res.status}: ${
        typeof body === 'string' ? body : JSON.stringify(body)
      }`,
    );
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

/** Login Resource Owner Password (Direct Access Grants) direto no Keycloak. */
export async function passwordGrantToken(fetchFn, tokenUrl, clientId, username, password) {
  const res = await fetchFn(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'password',
      client_id: clientId,
      username,
      password,
    }),
  });
  const body = await readBody(res);
  if (!res.ok || !body?.access_token) {
    const err = new Error(`Login Keycloak falhou pra ${username}: HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return body.access_token;
}

/** Cria a conta no Keycloak via `POST /register`; 409 (já existe) não é erro. */
export async function registerUser(fetchFn, apiUrl, user, log = () => {}) {
  try {
    await requestJson(fetchFn, `${apiUrl}/register`, {
      method: 'POST',
      body: JSON.stringify({
        email: user.email,
        password: user.password,
        name: user.name,
      }),
    });
  } catch (err) {
    if (err.status === 409) {
      log(`  já existia: ${user.email}`);
      return;
    }
    throw err;
  }
}

/**
 * Registra todos em lotes — `POST /register` tem throttle de 8/60s
 * (ver `apps/api/src/register/register.controller.ts`).
 */
export async function registerAllUsers(users, deps) {
  const {
    fetchFn,
    apiUrl,
    batchSize = 8,
    batchPauseMs = 65_000,
    log = () => {},
    sleepFn = (ms) => new Promise((r) => setTimeout(r, ms)),
  } = deps;

  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize);
    for (const user of batch) {
      await registerUser(fetchFn, apiUrl, user, log);
      log(`  registrado: ${user.email}`);
    }
    const isLastBatch = i + batchSize >= users.length;
    if (!isLastBatch) {
      log(`  pausa de ${Math.round(batchPauseMs / 1000)}s (limite de cadastro)...`);
      await sleepFn(batchPauseMs);
    }
  }
}

/** Faz login de cada usuário e anexa `token` ao objeto (mutação in-place). */
export async function loginAllUsers(users, deps) {
  const { fetchFn, tokenUrl, clientId, log = () => {} } = deps;
  for (const user of users) {
    user.token = await passwordGrantToken(fetchFn, tokenUrl, clientId, user.email, user.password);
    log(`  login ok: ${user.email}`);
  }
}

/** Cria um convite (organizador) e o resgata (usuário) — entra como Convidado. */
export async function joinPelada(fetchFn, apiUrl, peladaId, orgToken, user) {
  const invite = await requestJson(fetchFn, `${apiUrl}/peladas/${peladaId}/invites`, {
    method: 'POST',
    token: orgToken,
    body: '{}',
  });
  try {
    await requestJson(fetchFn, `${apiUrl}/invites/${invite.token}/redeem`, {
      method: 'POST',
      token: user.token,
      body: '{}',
    });
  } catch (err) {
    if (err.status === 409) {
      return; // já era membro (rerun do script)
    }
    throw err;
  }
}

export async function joinAllUsers(users, deps) {
  const { fetchFn, apiUrl, peladaId, orgToken, log = () => {} } = deps;
  for (const user of users) {
    await joinPelada(fetchFn, apiUrl, peladaId, orgToken, user);
    log(`  entrou na pelada: ${user.name}`);
  }
}

/**
 * Promove cada usuário de Convidado pra Jogador fixo (organizador), e anexa
 * `playerId` ao objeto. Usuários já promovidos (rerun) só têm o id resolvido.
 */
export async function promoteAllUsers(users, deps) {
  const { fetchFn, apiUrl, peladaId, orgToken, log = () => {} } = deps;
  const [guests, players] = await Promise.all([
    requestJson(fetchFn, `${apiUrl}/peladas/${peladaId}/guests`, { token: orgToken }),
    requestJson(fetchFn, `${apiUrl}/peladas/${peladaId}/players`, { token: orgToken }),
  ]);
  const guestByName = new Map(guests.players.map((p) => [p.displayName, p]));
  const playerByName = new Map(players.players.map((p) => [p.displayName, p]));

  for (const user of users) {
    const already = playerByName.get(user.name);
    if (already) {
      user.playerId = already.id;
      continue;
    }
    const guest = guestByName.get(user.name);
    if (!guest) {
      log(`  aviso: convidado "${user.name}" não encontrado, pulando promoção`);
      continue;
    }
    const promoted = await requestJson(
      fetchFn,
      `${apiUrl}/peladas/${peladaId}/players/${guest.id}/promote`,
      { method: 'POST', token: orgToken, body: '{}' },
    );
    user.playerId = promoted.id;
    log(`  promovido: ${user.name}`);
  }
}

/** Cria as partidas do plano e retorna cada item com `id` preenchido. */
export async function createMatches(matchPlan, deps) {
  const { fetchFn, apiUrl, peladaId, orgToken, log = () => {} } = deps;
  const created = [];
  for (const plan of matchPlan) {
    const match = await requestJson(fetchFn, `${apiUrl}/peladas/${peladaId}/matches`, {
      method: 'POST',
      token: orgToken,
      body: JSON.stringify(plan),
    });
    created.push({ ...plan, id: match.id });
    log(`  partida criada: ${plan.scheduledAt} (${plan.presenceMode})`);
  }
  return created;
}

/** Marca presença (confirmada) de um subconjunto dos usuários em cada partida. */
export async function fillAttendance(matches, users, deps) {
  const { fetchFn, apiUrl, peladaId, orgToken, attendanceRate = 0.7, log = () => {} } = deps;
  const subset = pickAttendanceSubset(users, attendanceRate);

  for (const match of matches) {
    for (const user of subset) {
      if (!user.playerId) continue;
      if (match.presenceMode === 'SELF_CONFIRM') {
        await requestJson(
          fetchFn,
          `${apiUrl}/peladas/${peladaId}/matches/${match.id}/attendance/self`,
          { method: 'POST', token: user.token, body: JSON.stringify({ action: 'confirm' }) },
        );
      } else {
        await requestJson(
          fetchFn,
          `${apiUrl}/peladas/${peladaId}/matches/${match.id}/attendance/${user.playerId}`,
          {
            method: 'PATCH',
            token: orgToken,
            body: JSON.stringify({ status: 'CONFIRMED' }),
          },
        );
      }
    }
    log(`  presença marcada em ${subset.length} jogadores (partida ${match.id})`);
  }
}

/**
 * Orquestra tudo: cadastra N usuários de teste no Keycloak, entra com cada
 * um na pelada (via convite), promove a jogador fixo, cria M partidas e
 * marca presença de parte dos usuários em cada uma.
 */
export async function seedTestUsers(deps) {
  const {
    apiUrl,
    tokenUrl,
    clientId,
    organizerEmail,
    organizerPassword,
    peladaId,
    userCount = 50,
    matchCount = 4,
    attendanceRate = 0.7,
    password = 'Teste@12345',
    domain = 'pelada-teste.local',
    fetchFn = globalThis.fetch,
    log = console.log,
    sleepFn = (ms) => new Promise((r) => setTimeout(r, ms)),
  } = deps;

  const users = buildTestUsers(userCount, { domain, password });
  const matchPlan = buildMatchPlan(matchCount);

  log(`Autenticando organizador (${organizerEmail})...`);
  const orgToken = await passwordGrantToken(
    fetchFn,
    tokenUrl,
    clientId,
    organizerEmail,
    organizerPassword,
  );

  log(`Cadastrando ${users.length} usuários de teste no Keycloak...`);
  await registerAllUsers(users, { fetchFn, apiUrl, log, sleepFn });

  log('Autenticando cada usuário de teste...');
  await loginAllUsers(users, { fetchFn, tokenUrl, clientId, log });

  log('Entrando na pelada via convite...');
  await joinAllUsers(users, { fetchFn, apiUrl, peladaId, orgToken, log });

  log('Promovendo convidados a jogadores fixos...');
  await promoteAllUsers(users, { fetchFn, apiUrl, peladaId, orgToken, log });

  log(`Criando ${matchPlan.length} partidas...`);
  const matches = await createMatches(matchPlan, { fetchFn, apiUrl, peladaId, orgToken, log });

  log('Marcando presença de parte dos usuários em cada partida...');
  await fillAttendance(matches, users, { fetchFn, apiUrl, peladaId, orgToken, attendanceRate, log });

  return { users, matches };
}
