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
