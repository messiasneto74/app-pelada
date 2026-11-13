import { test, expect } from '@playwright/test';
import { loginAndOpenShell } from './helpers/shell-ready';

test.describe('E2E smoke — login', () => {
  test('entra com Keycloak e chega ao shell', async ({ page }) => {
    await loginAndOpenShell(page);
    await expect(
      page.getByRole('navigation', { name: 'Navegação principal' }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Início' })).toBeVisible();
  });
});
