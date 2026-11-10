import { test, expect } from '@playwright/test';
import { loginAsDevOrganizer } from './helpers/auth';

test.describe('E2E smoke — 4 abas', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDevOrganizer(page);
  });

  test('navega Início, Partida, Jogadores e Caixa', async ({ page }) => {
    const nav = page.getByRole('navigation', { name: 'Navegação principal' });
    await nav.getByRole('link', { name: 'Partida' }).click();
    await expect(page).toHaveURL(/\/partida/);

    await nav.getByRole('link', { name: 'Jogadores' }).click();
    await expect(page).toHaveURL(/\/jogadores/);

    await nav.getByRole('link', { name: 'Caixa' }).click();
    await expect(page).toHaveURL(/\/caixa/);

    await nav.getByRole('link', { name: 'Início' }).click();
    await expect(page).toHaveURL(/\/inicio/);
  });
});
