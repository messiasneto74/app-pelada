import { test, expect } from '@playwright/test';
import { readAccessToken } from './helpers/auth';
import { loginAndOpenShell } from './helpers/shell-ready';
import { readActivePeladaId, seedRosterPlayers } from './helpers/api';
import { tomorrowLocalDateInput } from './helpers/local-date';

test.describe.configure({ mode: 'serial' });

test.describe('E2E fluxo MVP §D', () => {
  test('criar pelada → regras → jogadores → partida → presença → sorteio → campo', async ({
    page,
    request,
  }) => {
    test.setTimeout(process.env.CI ? 420_000 : 180_000);
    const peladaName = `E2E Pelada ${Date.now()}`;
    await loginAndOpenShell(page, peladaName);

    const token = await readAccessToken(page);
    const peladaId = await readActivePeladaId(page);
    await seedRosterPlayers(request, token, peladaId, 12);

    await page
      .getByRole('navigation', { name: 'Navegação principal' })
      .getByRole('link', { name: 'Jogadores' })
      .click({ force: true });
    await expect(page.getByText('12 jogadores no elenco')).toBeVisible();

    await page.goto('/inicio/criar-partida');
    const dateStr = tomorrowLocalDateInput();
    await page.locator('#match-date').fill(dateStr);
    await page.locator('#match-time').fill('19:30');
    await page.locator('#match-location').fill('Society E2E');
    const criarPartida = page.getByRole('button', { name: 'Criar partida' });
    await criarPartida.scrollIntoViewIfNeeded();
    await criarPartida.click({ force: true });
    await expect(page).toHaveURL(/\/partida\/presenca/);

    await page.getByRole('tab', { name: /Pendentes/ }).click({ force: true });
    for (let guard = 0; guard < 60; guard += 1) {
      const pendingTab = page.getByRole('tab', { name: /Pendentes/ });
      const tabLabel = (await pendingTab.textContent()) ?? '';
      if (/Pendentes \(0\)/.test(tabLabel)) {
        break;
      }
      const confirm = page.getByRole('button', { name: 'Confirmar' }).first();
      if (await confirm.isVisible({ timeout: 1_000 }).catch(() => false)) {
        const patchDone = page
          .waitForResponse(
            (r) =>
              r.request().method() === 'PATCH' &&
              /\/attendance\/[^/]+$/.test(r.url()) &&
              r.status() >= 200 &&
              r.status() < 300,
            { timeout: 15_000 },
          )
          .catch(() => null);
        await confirm.click({ force: true });
        await patchDone;
      } else {
        await pendingTab.click({ force: true });
      }
    }
    await expect(page.getByRole('tab', { name: /Pendentes \(0\)/ })).toBeVisible({
      timeout: 60_000,
    });
    await page.getByRole('tab', { name: /Confirmados/ }).click({ force: true });
    await expect(page.getByRole('tab', { name: /Confirmados \(12\)/ })).toBeVisible({
      timeout: 60_000,
    });

    const sorteioNav = page.waitForURL(/\/partida\/sorteio/, { timeout: 150_000 });
    const closeListDone = page
      .waitForResponse(
        (r) =>
          r.url().includes('/attendance/close-list') &&
          r.status() >= 200 &&
          r.status() < 300,
        { timeout: 150_000 },
      )
      .catch(() => null);

    await page.getByRole('button', { name: 'Fechar lista e sortear' }).click({ force: true });
    const modalConfirm = page
      .getByRole('dialog')
      .getByRole('button', { name: 'Fechar lista e sortear assim' });
    if (await modalConfirm.isVisible({ timeout: 20_000 }).catch(() => false)) {
      await modalConfirm.click({ force: true });
    }
    await Promise.all([sorteioNav, closeListDone]);

    await expect(page).toHaveURL(/\/partida\/sorteio/, { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: 'Lista ainda aberta', level: 2 })).not.toBeVisible({
      timeout: 20_000,
    });

    const sortearAgora = page.getByRole('button', { name: 'Sortear agora' });
    await expect(sortearAgora).toBeVisible({ timeout: 90_000 });
    await sortearAgora.click({ force: true });

    const drawError = page.getByRole('alert');
    const equilibrio = page.getByRole('heading', { name: 'Equilíbrio', level: 2 });
    await expect(equilibrio.or(drawError)).toBeVisible({ timeout: 120_000 });
    if (await drawError.isVisible()) {
      throw new Error(`Sorteio falhou: ${(await drawError.textContent()) ?? ''}`);
    }

    const teamsGrid = page.locator('.teams-grid');
    await expect(teamsGrid).toBeVisible({ timeout: 30_000 });
    await expect
      .poll(async () => teamsGrid.locator('pelada-card').count(), { timeout: 60_000 })
      .toBeGreaterThanOrEqual(2);
    const pills = page.locator('.teams-grid .player-pill__name');
    await expect
      .poll(async () => pills.count(), { timeout: 60_000 })
      .toBeGreaterThanOrEqual(10);

    await page.getByRole('link', { name: 'Em campo' }).click({ force: true });
    await expect(page).toHaveURL(/\/partida\/campo/, { timeout: 30_000 });
    await expect(
      page.getByRole('heading', { name: 'Pronto para entrar em campo', level: 2 }),
    ).toBeVisible({ timeout: 30_000 });
  });
});
