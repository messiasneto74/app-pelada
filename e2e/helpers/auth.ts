import { expect, type Page } from '@playwright/test';

const KC_USER = process.env.E2E_KC_USER ?? 'dev';
const KC_PASSWORD = process.env.E2E_KC_PASSWORD ?? 'dev-pelada-local';

/** Login Keycloak via tela /entrar (realm pelada). */
export async function loginAsDevOrganizer(page: Page): Promise<void> {
  await page.goto('/entrar', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    sessionStorage.clear();
    localStorage.clear();
  });
  await page.goto('/entrar', { waitUntil: 'domcontentloaded' });
  // AuthService.init() deixa a tela em "Conectando ao Keycloak…" até concluir.
  const loginBtn = page.getByRole('button', { name: 'Entrar com Keycloak' });
  await expect(loginBtn).toBeVisible({ timeout: 90_000 });
  await expect(loginBtn).toBeEnabled();
  await loginBtn.scrollIntoViewIfNeeded();
  await loginBtn.click({ force: true });
  await page.waitForURL(/localhost:8080|\/realms\/pelada/, { timeout: 90_000 });
  const userField = page.locator('#username, input[name="username"]');
  await userField.fill(KC_USER);
  await page.locator('#password, input[name="password"]').fill(KC_PASSWORD);
  await page.locator('#kc-login, input[type="submit"], button[type="submit"]').first().click();
  await page.waitForURL(/localhost:4200/, { timeout: 60_000 });
  await completePhoneIfNeeded(page);
  await page.waitForURL(/\/(inicio|onboarding\/pelada)/, { timeout: 60_000 });
}

async function completePhoneIfNeeded(page: Page): Promise<void> {
  if (!page.url().includes('/entrar/completar')) {
    return;
  }
  await page.locator('input[name="phone"]').fill('11999990000');
  await page.getByRole('button', { name: 'Salvar' }).click();
  await page.waitForURL(/\/(inicio|onboarding\/pelada)/, { timeout: 30_000 });
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
