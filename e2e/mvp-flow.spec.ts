import { test, expect } from '@playwright/test';
import { loginAsDevOrganizer, readAccessToken } from './helpers/auth';
import { readActivePeladaId, seedRosterPlayers } from './helpers/api';
import { tomorrowLocalDateInput } from './helpers/local-date';

test.describe.configure({ mode: 'serial' });

test.describe('E2E fluxo MVP §D', () => {
  test('criar pelada → regras → jogadores → partida → presença → sorteio → campo', async ({
    page,
    request,
  }) => {
    const peladaName = `E2E Pelada ${Date.now()}`;
    await loginAsDevOrganizer(page);

    if (page.url().includes('/onboarding/pelada')) {
      await page.locator('#pelada-nome').fill(peladaName);
      await page.getByRole('button', { name: 'Continuar para regras' }).click();
      await expect(page).toHaveURL(/\/inicio\/regras/);
    } else {
      await page.goto('/onboarding/pelada');
      await page.locator('#pelada-nome').fill(peladaName);
      await page.getByRole('button', { name: 'Continuar para regras' }).click();
      await expect(page).toHaveURL(/\/inicio\/regras/);
    }

    await page.getByRole('button', { name: 'Salvar como padrão' }).click();
    await expect(page.getByText('Regras salvas como padrão do grupo.')).toBeVisible({
      timeout: 15_000,
    });

    const token = await readAccessToken(page);
    const peladaId = await readActivePeladaId(page);
    await seedRosterPlayers(request, token, peladaId, 12);

    await page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('link', {
      name: 'Jogadores',
    }).click();
    await expect(page.getByText('12 jogadores no elenco')).toBeVisible();

    await page.goto('/inicio/criar-partida');
    const dateStr = tomorrowLocalDateInput();
    await page.locator('#match-date').fill(dateStr);
    await page.locator('#match-time').fill('19:30');
    await page.locator('#match-location').fill('Society E2E');
    await page.getByRole('button', { name: 'Criar partida' }).click();
    await expect(page).toHaveURL(/\/partida\/presenca/);

    await page.getByRole('button', { name: /Pendentes/ }).click();
    for (let guard = 0; guard < 20; guard += 1) {
      const confirm = page.getByRole('button', { name: 'Confirmar' }).first();
      if (!(await confirm.isVisible())) {
        break;
      }
      await confirm.click();
      await page.waitForTimeout(200);
    }

    await page.getByRole('button', { name: 'Fechar lista e sortear' }).click();
    const modalConfirm = page.getByRole('button', { name: 'Fechar lista e sortear assim' });
    if (await modalConfirm.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await modalConfirm.click();
    }
    await expect(page.getByText('Lista fechada')).toBeVisible({ timeout: 15_000 });

    await page.getByRole('link', { name: 'Sorteio' }).click();
    await page.getByRole('button', { name: 'Sortear agora' }).click();
    await expect(page.getByText('Equilíbrio')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('E2E Jogador 1')).toBeVisible();

    await page.getByRole('link', { name: 'Em campo' }).click();
    await expect(page.getByText('Pronto para entrar em campo')).toBeVisible({
      timeout: 20_000,
    });
  });
});
