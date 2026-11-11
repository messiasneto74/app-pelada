import { expect, type Page } from '@playwright/test';
import { loginAsDevOrganizer } from './auth';

/** Onboarding mínimo quando storage foi limpo no login (sem pelada ativa). */
export async function completeOnboardingIfNeeded(
  page: Page,
  peladaName?: string,
): Promise<void> {
  const nav = page.getByRole('navigation', { name: 'Navegação principal' });
  if (await nav.isVisible().catch(() => false)) {
    return;
  }

  const name = peladaName ?? `E2E Smoke ${Date.now()}`;
  if (!page.url().includes('/onboarding/pelada') && !page.url().includes('/inicio/regras')) {
    await page.goto('/onboarding/pelada');
  }
  if (page.url().includes('/onboarding/pelada')) {
    await page.locator('#pelada-nome').fill(name);
    const continuar = page.getByRole('button', { name: 'Continuar para regras' });
    await continuar.scrollIntoViewIfNeeded();
    await continuar.click({ force: true });
    await expect(page).toHaveURL(/\/inicio\/regras/, { timeout: 30_000 });
  }
  if (page.url().includes('/inicio/regras')) {
    const salvar = page.getByRole('button', { name: 'Salvar como padrão' });
    await expect(salvar).toBeVisible({ timeout: 30_000 });
    await salvar.scrollIntoViewIfNeeded();
    await salvar.click({ force: true });
    await expect(page.getByText('Regras salvas como padrão do grupo.')).toBeVisible({
      timeout: 15_000,
    });
    await page.goto('/inicio');
  }
  await expect(nav).toBeVisible({ timeout: 30_000 });
}

export async function loginAndOpenShell(page: Page, peladaName?: string): Promise<void> {
  await loginAsDevOrganizer(page);
  await completeOnboardingIfNeeded(page, peladaName);
}
