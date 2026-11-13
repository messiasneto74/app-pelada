import { expect, type Page } from '@playwright/test';

const KC_USER = process.env.E2E_KC_USER ?? 'dev@pelada.local';
const KC_PASSWORD = process.env.E2E_KC_PASSWORD ?? 'dev-pelada-local';

/** Login in-app via /entrar (password grant → Keycloak). */
export async function loginAsDevOrganizer(page: Page): Promise<void> {
  await page.goto('/entrar', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    sessionStorage.clear();
    localStorage.clear();
  });
  await page.goto('/entrar', { waitUntil: 'domcontentloaded' });

  const email = page.locator('#entrar-email');
  await expect(email).toBeVisible({ timeout: 90_000 });
  await email.fill(KC_USER);
  await page.locator('#entrar-senha').fill(KC_PASSWORD);
  await page.locator('form.form button[type="submit"]').click();

  await page.waitForURL(/\/(inicio|onboarding\/pelada|entrar\/completar)/, {
    timeout: 120_000,
  });
  await completePhoneIfNeeded(page);
  await expect(page).toHaveURL(/\/(inicio|onboarding\/pelada)/, { timeout: 60_000 });
}

async function completePhoneIfNeeded(page: Page): Promise<void> {
  if (!page.url().includes('/entrar/completar')) {
    return;
  }
  const phone = page.locator('input[name="phone"]');
  await expect(phone).toBeVisible({ timeout: 30_000 });
  await phone.fill('11999990000');
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(page).toHaveURL(/\/(inicio|onboarding\/pelada)/, { timeout: 60_000 });
}

/** Lê access_token do angular-oauth2-oidc no browser. */
export async function readAccessToken(page: Page): Promise<string> {
  const token = await page.evaluate(() => {
    const readStore = (store: Storage) => {
      for (let i = 0; i < store.length; i += 1) {
        const key = store.key(i);
        if (!key || !key.includes('access_token')) {
          continue;
        }
        const raw = store.getItem(key);
        if (!raw) {
          continue;
        }
        try {
          const parsed = JSON.parse(raw) as { access_token?: string };
          if (parsed.access_token) {
            return parsed.access_token;
          }
        } catch {
          return raw;
        }
      }
      return null;
    };
    return readStore(sessionStorage) ?? readStore(localStorage);
  });
  if (!token) {
    throw new Error('Access token OIDC não encontrado no storage do browser');
  }
  return token;
}
