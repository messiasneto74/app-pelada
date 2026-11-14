import { test, expect } from '@playwright/test';
import { loginAndOpenShell } from './helpers/shell-ready';

test.describe('E2E MVP #138 — jogador e regras', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndOpenShell(page, `E2E Regras ${Date.now()}`);
  });

  test('organizador cadastra jogador no modal POST', async ({ page }) => {
    const nav = page.getByRole('navigation', { name: 'Navegação principal' });
    await nav.getByRole('link', { name: 'Jogadores' }).click();
    await expect(page).toHaveURL(/\/jogadores/);

    const uniqueName = `E2E Modal ${Date.now()}`;
    await page.getByRole('button', { name: '+ Adicionar jogador' }).click();
    const dialog = page.getByRole('dialog', { name: 'Novo jogador' });
    await expect(dialog).toBeVisible();

    await dialog.locator('#new-player-name').fill(uniqueName);
    await dialog.getByRole('button', { name: 'Adicionar jogador', exact: true }).click();
    await expect(dialog).not.toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('link', { name: uniqueName })).toBeVisible();
  });

  test('salvar regras navega para /inicio', async ({ page }) => {
    await page.goto('/inicio/regras');
    await expect(page.getByRole('heading', { name: 'Regras da pelada' })).toBeVisible();

    const salvar = page.getByRole('button', { name: 'Salvar como padrão' });
    await salvar.scrollIntoViewIfNeeded();
    await salvar.click({ force: true });

    await expect(page).toHaveURL(/\/inicio$/, { timeout: 30_000 });
    await expect(
      page.getByRole('navigation', { name: 'Navegação principal' }),
    ).toBeVisible();
  });
});