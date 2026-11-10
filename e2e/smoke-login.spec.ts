import { test, expect } from '@playwright/test';
import { loginAsDevOrganizer } from './helpers/auth';

test.describe('E2E smoke — login', () => {
  test('entra com Keycloak e chega ao shell', async ({ page }) => {
    await loginAsDevOrganizer(page);
    await expect(
      page.getByRole('navigation', { name: 'Navegação principal' }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Início' })).toBeVisible();
  });
});
