import { test, expect, devices } from '@playwright/test';
import { loginAsDevOrganizer, readAccessToken } from './helpers/auth';
import { loginAndOpenShell } from './helpers/shell-ready';
import {
  closeListOnApi,
  confirmAllPendingOnApi,
  markPresenceListClosedInSession,
  readActiveMatchId,
  readActivePeladaId,
  readNextMatchId,
  seedRosterPlayers,
  waitForConfirmedCountOnApi,
  waitForListClosedOnApi,
} from './helpers/api';
import { tomorrowLocalDateInput } from './helpers/local-date';

test.describe.configure({ mode: 'serial' });

test.describe('E2E fluxo MVP §D', () => {
  test('criar pelada → regras → jogadores → partida → presença → sorteio → campo', async ({
    browser,
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

    // Issue #234 — sem abas: o adm coloca o elenco pela lista "Colocar na lista".
    await page.getByRole('button', { name: 'Colocar jogador na lista' }).click({ force: true });
    for (let guard = 0; guard < 60; guard += 1) {
      if (
        await page
          .getByText('Todo mundo do elenco já está na lista.')
          .isVisible({ timeout: 500 })
          .catch(() => false)
      ) {
        break;
      }
      const add = page.locator('.add-item button').first();
      if (await add.isVisible({ timeout: 1_000 }).catch(() => false)) {
        await add.click({ force: true });
        await page.waitForTimeout(350);
      }
    }
    await expect(page.getByText('Todo mundo do elenco já está na lista.')).toBeVisible({
      timeout: 60_000,
    });
    await page.getByRole('button', { name: 'Pronto' }).click({ force: true });
    await expect(page.getByText(/^12 de \d+ vagas$/)).toBeVisible({ timeout: 60_000 });

    let matchId = await readActiveMatchId(page).catch(() =>
      readNextMatchId(request, token, peladaId),
    );
    await confirmAllPendingOnApi(request, token, peladaId, matchId);
    await waitForConfirmedCountOnApi(request, token, peladaId, matchId, 12);

    const fecharLista = page.getByRole('button', { name: 'Fechar lista e sortear' });
    await fecharLista.scrollIntoViewIfNeeded();
    await fecharLista.click({ force: true });
    const modalConfirm = page
      .getByRole('dialog')
      .getByRole('button', { name: 'Fechar lista e sortear assim' });
    if (await modalConfirm.isVisible({ timeout: 15_000 }).catch(() => false)) {
      await modalConfirm.click({ force: true });
    }

    const uiCloseList = page
      .waitForResponse(
        (r) =>
          r.url().includes('/attendance/close-list') &&
          r.status() >= 200 &&
          r.status() < 300,
        { timeout: 45_000 },
      )
      .catch(() => null);
    await page
      .waitForURL(/\/partida\/sorteio/, { timeout: 25_000 })
      .catch(() => undefined);

    matchId = await readActiveMatchId(page).catch(() => matchId);
    await closeListOnApi(request, token, peladaId, matchId).catch(async () => {
      await uiCloseList;
    });
    await waitForListClosedOnApi(request, token, peladaId, matchId, 60_000);
    await markPresenceListClosedInSession(page, matchId);

    if (!page.url().includes('/partida/sorteio')) {
      await page.goto('/partida/sorteio');
    }
    await expect(page).toHaveURL(/\/partida\/sorteio/, { timeout: 90_000 });

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

    // Regressão: outro aparelho / novo login (sessionStorage vazio) precisa ver a
    // lista salva no servidor e conseguir abrir Em campo depois do sorteio.
    const other = await browser.newContext({
      ...devices['Pixel 5'],
      baseURL: test.info().project.use.baseURL,
    });
    const otherPage = await other.newPage();
    await loginAsDevOrganizer(otherPage);
    await otherPage.goto('/partida/campo');
    await expect(otherPage).toHaveURL(/\/partida\/campo/, { timeout: 30_000 });
    await expect(
      otherPage.getByRole('heading', { name: 'Pronto para entrar em campo', level: 2 }),
    ).toBeVisible({ timeout: 30_000 });
    await otherPage.goto('/partida/presenca');
    // Issue #234 — sem abas: a lista mostra os 12 confirmados (12 de N vagas).
    await expect(otherPage.getByText(/^12 de \d+ vagas$/)).toBeVisible({ timeout: 30_000 });
    await other.close();
  });
});
