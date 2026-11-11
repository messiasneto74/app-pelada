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
    for (let guard = 0; guard < 50; guard += 1) {
      await page.getByRole('tab', { name: /Pendentes/ }).click({ force: true });
      const pendingTab = page.getByRole('tab', { name: /Pendentes/ });
      const tabLabel = (await pendingTab.textContent()) ?? '';
      if (/Pendentes \(0\)/.test(tabLabel)) {
        break;
      }
      const confirm = page.getByRole('button', { name: 'Confirmar' }).first();
      if (await confirm.isVisible({ timeout: 1_000 }).catch(() => false)) {
        await confirm.click({ force: true });
        await page.waitForTimeout(400);
      }
    }
    await page.getByRole('tab', { name: /Confirmados/ }).click({ force: true });
    await expect(page.getByRole('tab', { name: /Confirmados \(12\)/ })).toBeVisible({
      timeout: 30_000,
    });

    await page.getByRole('button', { name: 'Fechar lista e sortear' }).click({ force: true });
    const modalConfirm = page
      .getByRole('dialog')
      .getByRole('button', { name: 'Fechar lista e sortear assim' });
    if (await modalConfirm.isVisible({ timeout: 15_000 }).catch(() => false)) {
      await modalConfirm.click({ force: true });
    }
    // UI navega para /partida/sorteio após closeList (§3.4).
    await expect(page).toHaveURL(/\/partida\/sorteio/, { timeout: 60_000 });
    const sortearAgora = page.getByRole('button', { name: 'Sortear agora' });
    await expect(sortearAgora).toBeVisible({ timeout: 30_000 });
    await sortearAgora.click({ force: true });
    const drawError = page.getByRole('alert');
    const equilibrio = page.getByRole('heading', { name: 'Equilíbrio', level: 2 });
    await expect(equilibrio.or(drawError)).toBeVisible({ timeout: 90_000 });
    if (await drawError.isVisible()) {
      throw new Error(`Sorteio falhou: ${(await drawError.textContent()) ?? ''}`);
    }
    await expect(page.getByText('E2E Jogador 1', { exact: true })).toBeVisible({
      timeout: 30_000,
    });

    await page.goto('/partida/campo');
    await expect(
      page.getByRole('heading', { name: 'Pronto para entrar em campo', level: 2 }),
    ).toBeVisible({ timeout: 30_000 });
  });
});
