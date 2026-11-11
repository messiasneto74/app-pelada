import type { APIRequestContext } from '@playwright/test';

const apiUrl = (process.env.PELADA_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');

export async function seedRosterPlayers(
  request: APIRequestContext,
  token: string,
  peladaId: string,
  count: number,
): Promise<void> {
  for (let i = 1; i <= count; i += 1) {
    const res = await request.post(`${apiUrl}/peladas/${peladaId}/players`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        displayName: `E2E Jogador ${i}`,
        rating: 5 + (i % 5),
        isGoalkeeper: i === 1 || i === 7,
      },
    });
    if (!res.ok()) {
      const body = await res.text();
      throw new Error(`POST player ${i} falhou: ${res.status()} ${body}`);
    }
  }
}

export async function readActiveMatchId(page: import('@playwright/test').Page): Promise<string> {
  const id = await page.evaluate(() => sessionStorage.getItem('pelada:presence:@active-match-id'));
  if (!id) {
    throw new Error('partida ativa não encontrada no sessionStorage');
  }
  return id;
}

export async function readNextMatchId(
  request: APIRequestContext,
  token: string,
  peladaId: string,
): Promise<string> {
  const res = await request.get(`${apiUrl}/peladas/${peladaId}/dashboard`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok()) {
    throw new Error(`GET dashboard falhou: ${res.status()} ${await res.text()}`);
  }
  const body = (await res.json()) as { nextMatch?: { id?: string } | null };
  const id = body.nextMatch?.id;
  if (!id) {
    throw new Error('nextMatch ausente no dashboard');
  }
  return id;
}

type AttendanceListDto = {
  listClosed: boolean;
  entries: { playerId: string; status: string }[];
  counts?: { confirmed: number; pending: number };
};

export async function fetchAttendance(
  request: APIRequestContext,
  token: string,
  peladaId: string,
  matchId: string,
): Promise<AttendanceListDto> {
  const res = await request.get(
    `${apiUrl}/peladas/${peladaId}/matches/${matchId}/attendance`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok()) {
    throw new Error(`GET attendance falhou: ${res.status()} ${await res.text()}`);
  }
  return (await res.json()) as AttendanceListDto;
}

/** Garante confirmados na API após interação na UI (evita close-list com estado defasado no CI). */
export async function confirmAllPendingOnApi(
  request: APIRequestContext,
  token: string,
  peladaId: string,
  matchId: string,
): Promise<void> {
  const list = await fetchAttendance(request, token, peladaId, matchId);
  for (const entry of list.entries) {
    if (entry.status === 'CONFIRMED') {
      continue;
    }
    if (entry.status === 'DECLINED') {
      continue;
    }
    const res = await request.patch(
      `${apiUrl}/peladas/${peladaId}/matches/${matchId}/attendance/${entry.playerId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        data: { status: 'CONFIRMED' },
      },
    );
    if (!res.ok()) {
      throw new Error(
        `PATCH attendance ${entry.playerId} falhou: ${res.status()} ${await res.text()}`,
      );
    }
  }
}

export async function waitForConfirmedCountOnApi(
  request: APIRequestContext,
  token: string,
  peladaId: string,
  matchId: string,
  minConfirmed: number,
  timeoutMs = 60_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const list = await fetchAttendance(request, token, peladaId, matchId);
    const confirmed =
      list.counts?.confirmed ??
      list.entries.filter((e) => e.status === 'CONFIRMED').length;
    if (confirmed >= minConfirmed) {
      return;
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`timeout aguardando ${minConfirmed} confirmados na API`);
}

export async function closeListOnApi(
  request: APIRequestContext,
  token: string,
  peladaId: string,
  matchId: string,
): Promise<void> {
  const res = await request.post(
    `${apiUrl}/peladas/${peladaId}/matches/${matchId}/attendance/close-list`,
    {
      headers: { Authorization: `Bearer ${token}` },
      data: {},
    },
  );
  if (!res.ok()) {
    throw new Error(`POST close-list falhou: ${res.status()} ${await res.text()}`);
  }
}

export async function waitForListClosedOnApi(
  request: APIRequestContext,
  token: string,
  peladaId: string,
  matchId: string,
  timeoutMs = 120_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const list = await fetchAttendance(request, token, peladaId, matchId);
    if (list.listClosed) {
      return;
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error('timeout aguardando listClosed na API');
}

/** Sincroniza flag local usada pelo guard de /partida/sorteio (§3.4-NAV). */
export async function markPresenceListClosedInSession(
  page: import('@playwright/test').Page,
  matchId: string,
): Promise<void> {
  await page.evaluate((mid) => {
    const prefix = 'pelada:presence:';
    const raw = sessionStorage.getItem(prefix + mid);
    if (!raw) {
      return;
    }
    const snap = JSON.parse(raw) as { listClosed?: boolean };
    snap.listClosed = true;
    sessionStorage.setItem(prefix + mid, JSON.stringify(snap));
  }, matchId);
}

export async function readActivePeladaId(page: import('@playwright/test').Page): Promise<string> {
  const id = await page.evaluate(() => {
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i);
      if (!key?.startsWith('pelada:active-v1')) {
        continue;
      }
      const raw = sessionStorage.getItem(key);
      if (!raw) {
        continue;
      }
      const parsed = JSON.parse(raw) as { id?: string };
      if (parsed.id) {
        return parsed.id;
      }
    }
    return null;
  });
  if (!id) {
    throw new Error('pelada ativa não encontrada no sessionStorage');
  }
  return id;
}
