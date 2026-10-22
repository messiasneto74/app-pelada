const { test, expect } = require("@playwright/test");
const action = (page, name) => page.locator(`[data-action="${name}"]`);
const data = (page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem("resenha-v1")));
async function openMatch(page) {
  await page.goto("/");
  await action(page, "open-match").first().click();
}
async function draw(page) {
  await openMatch(page);
  await action(page, "close-draw").click();
  await expect(page).toHaveURL(/#sorteio$/);
}

test("painel, navegação e telas sem erros nem rolagem horizontal", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Bora jogar",
  );
  for (const route of ["partida", "jogadores", "caixa", "regras", "inicio"]) {
    await page.locator(`#nav a[href="#${route}"]`).click();
    await expect(page.locator(`#nav a[href="#${route}"]`)).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  expect(errors).toEqual([]);
});

test("cria partida, confirma elenco e sorteia times sem repetir jogadores", async ({
  page,
}) => {
  await page.goto("/");
  await action(page, "new-match").first().click();
  await page.getByLabel("Data", { exact: true }).fill("2026-12-12");
  await page.getByLabel("Hora", { exact: true }).fill("20:00");
  await page.getByLabel("Local", { exact: true }).fill("Quadra da galera");
  await page
    .getByRole("button", { name: "Criar partida", exact: false })
    .last()
    .click();
  await expect(page).toHaveURL(/#presenca$/);
  for (const id of [1, 2, 3, 4])
    await page.locator(`[data-action="confirm"][data-id="${id}"]`).click();
  await action(page, "close-draw").click();
  await expect(page).toHaveURL(/#sorteio$/);
  const s = await data(page),
    m = s.matches[0];
  expect(m.venue).toBe("Quadra da galera");
  expect(m.teams.map((t) => t.length)).toEqual([2, 2]);
  expect([...new Set(m.teams.flat())].sort()).toEqual([1, 2, 3, 4]);
  for (const team of m.teams)
    expect(
      team.filter(
        (id) => s.players.find((p) => p.id === id).position === "Goleiro",
      ),
    ).toHaveLength(1);
  await page.reload();
  await expect(page.locator(".team-grid .player-row")).toHaveCount(4);
});

test("fila respeita ordem de chegada e a lista fechada bloqueia edições", async ({
  page,
}) => {
  await openMatch(page);
  await page
    .locator('[data-action="attendance-tab"][data-id="pending"]')
    .click();
  for (const id of [13, 14, 18, 17])
    await page.locator(`[data-action="confirm"][data-id="${id}"]`).click();
  let m = (await data(page)).matches[0];
  expect(m.attendance[18]).toBe("queue");
  expect(m.attendance[17]).toBe("queue");
  await page
    .locator('[data-action="attendance-tab"][data-id="confirmed"]')
    .click();
  await page.locator('[data-action="unconfirm"][data-id="3"]').click();
  m = (await data(page)).matches[0];
  expect(m.attendance[18]).toBe("confirmed");
  expect(m.attendance[17]).toBe("queue");
  await action(page, "close-draw").click();
  await page.locator('[data-action="match-tab"][data-id="presenca"]').click();
  await expect(action(page, "unconfirm").first()).toBeDisabled();
  await action(page, "reopen").click();
  await action(page, "confirm-reopen").click();
  await expect(action(page, "unconfirm").first()).toBeEnabled();
  expect((await data(page)).matches[0].teams).toEqual([]);
});

test("cadastro, busca, edição de perfil e texto seguro", async ({ page }) => {
  await page.goto("/#jogadores");
  await action(page, "new-player").click();
  await page.getByLabel("Nome do jogador").fill("<img src=x onerror=alert(1)>");
  await page.getByLabel("Posição preferida").selectOption("Goleiro");
  await page.getByLabel("Nota geral").fill("9.1");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Adicionar jogador", exact: true })
    .click();
  await page.getByLabel("Buscar jogador").fill("<img");
  await expect(page.locator("#player-list .player-row")).toHaveCount(1);
  await expect(page.locator("#player-list img")).toHaveCount(0);
  await action(page, "profile").first().click();
  await action(page, "edit-player").click();
  await page.getByLabel("Nome do jogador").fill("Alex da Resenha");
  await page.getByLabel("Nota geral").fill("8.6");
  await page.getByRole("button", { name: "Salvar perfil" }).click();
  await page.getByLabel("Buscar jogador").fill("alex");
  await expect(page.locator("#player-list")).toContainText("Alex da Resenha");
  await expect(page.locator("#player-list .rating")).toHaveText("8.6");
  await page.reload();
  await page.getByLabel("Buscar jogador").fill("Alex");
  await expect(page.locator("#player-list .player-row")).toHaveCount(1);
});

test("pagamentos atualizam o painel e podem ser desfeitos", async ({
  page,
}) => {
  await page.goto("/#caixa");
  await page.locator('[data-action="toggle-payment"][data-id="12"]').click();
  await expect(page.locator(".stats .stat").first()).toContainText("360");
  await page.locator('#nav a[href="#inicio"]').click();
  await expect(page.locator(".stat").nth(3)).toContainText("360");
  await page.reload();
  await expect(page.locator(".stat").nth(3)).toContainText("360");
  await page.locator('#nav a[href="#caixa"]').click();
  await page.locator('[data-action="toggle-payment"][data-id="12"]').click();
  await expect(page.locator(".stats .stat").first()).toContainText("330");
});

test("trocas preservam times e goleiros; faltam goleiros bloqueia sorteio", async ({
  page,
}) => {
  await draw(page);
  const before = (await data(page)).matches[0].teams;
  await page.locator('[data-action="swap"][data-id="1"]').click();
  await expect(action(page, "do-swap")).toHaveCount(1);
  await action(page, "do-swap").click();
  const after = (await data(page)).matches[0].teams;
  expect(after.map((t) => t.length)).toEqual(before.map((t) => t.length));
  expect(after.flat().sort((a, b) => a - b)).toEqual(
    before.flat().sort((a, b) => a - b),
  );
  expect(after.findIndex((t) => t.includes(1))).not.toBe(
    before.findIndex((t) => t.includes(1)),
  );
  await page.locator('[data-action="match-tab"][data-id="presenca"]').click();
  await action(page, "reopen").click();
  await action(page, "confirm-reopen").click();
  await page.locator('[data-action="unconfirm"][data-id="1"]').click();
  await action(page, "close-draw").click();
  await expect(page.locator("#toast")).toContainText("goleiros");
  expect((await data(page)).matches[0].status).toBe("open");
});

test("placar, desfazer gol e cronômetro resistem à navegação e recarga", async ({
  page,
}) => {
  await page.clock.install();
  await draw(page);
  await action(page, "go-live").click();
  await action(page, "timer").click();
  await page.clock.fastForward(65000);
  await expect(page.locator("#timer")).toHaveText(/^01:0[5-6]$/);
  await page.locator('[data-action="goal"][data-id="0"]').click();
  await page.locator('[data-action="goal"][data-id="1"]').click();
  await action(page, "undo-goal").click();
  await expect(page.locator(".score-number").first()).toHaveText("1");
  await expect(page.locator(".score-number").last()).toHaveText("0");
  await page.locator('#nav a[href="#inicio"]').click();
  await page.goto("/#campo");
  await page.reload();
  await expect(page.locator("#timer")).toHaveText(/^01:0[5-6]$/);
  await action(page, "timer").click();
  await page.clock.fastForward(5000);
  await expect(page.locator("#timer")).toHaveText(/^01:0[5-6]$/);
  await action(page, "finish").click();
  await action(page, "confirm-finish").click();
  await expect(page.locator(".scoreboard")).toContainText("PARTIDA ENCERRADA");
  expect((await data(page)).matches[0].finished).toBe(true);
  await expect(action(page, "goal")).toHaveCount(0);
});

test("configurações preservam partidas antigas e governam novos encontros", async ({
  page,
}) => {
  await page.goto("/#regras");
  await page.getByLabel("Nome da pelada").fill("Resenha da Vila");
  await page.getByLabel("Quantidade de times").fill("3");
  await page.getByLabel("Jogadores por time").fill("5");
  await page.getByRole("button", { name: "Salvar configurações" }).click();
  expect((await data(page)).matches[0].capacity).toBe(14);
  await page.locator('#nav a[href="#partida"]').click();
  await action(page, "new-match").click();
  await expect(page.locator(".modal .notice")).toContainText("15 vagas");
  await page
    .getByRole("button", { name: "Criar partida", exact: false })
    .last()
    .click();
  expect((await data(page)).matches[0].capacity).toBe(15);
  expect((await data(page)).matches[0].teamCount).toBe(3);
});

test("três times: rodízio, compartilhamento sem notas e bloqueio após início", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async (text) => {
          window.sharedText = text;
        },
      },
      configurable: true,
    });
  });
  await page.goto("/#regras");
  await page.getByLabel("Quantidade de times").fill("3");
  await page.getByLabel("Jogadores por time").fill("5");
  await page.getByRole("button", { name: "Salvar configurações" }).click();
  await page.locator('#nav a[href="#jogadores"]').click();
  await page.locator('[data-action="profile"][data-id="3"]').first().click();
  await action(page, "edit-player").click();
  await page.getByLabel("Posição preferida").selectOption("Goleiro");
  await page.getByRole("button", { name: "Salvar perfil" }).click();
  await page.locator('#nav a[href="#partida"]').click();
  await action(page, "new-match").click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Criar partida/ })
    .click();
  for (let id = 1; id <= 15; id++)
    await page.locator(`[data-action="confirm"][data-id="${id}"]`).click();
  await action(page, "close-draw").click();
  await expect(page.locator(".team-grid .panel")).toHaveCount(3);
  const state = await data(page),
    teams = state.matches[0].teams;
  expect(teams.map((t) => t.length)).toEqual([5, 5, 5]);
  for (const t of teams)
    expect(
      t.filter(
        (id) => state.players.find((p) => p.id === id).position === "Goleiro",
      ),
    ).toHaveLength(1);
  await action(page, "share-teams").click();
  const shared = await page.evaluate(() => window.sharedText);
  expect(shared).toContain("TIME C");
  expect(shared).toContain("Rafael Lima");
  expect(shared).not.toContain("8.2");
  await action(page, "go-live").click();
  await page.locator('[data-action="goal"][data-id="0"]').click();
  await page.locator('[data-action="match-tab"][data-id="sorteio"]').click();
  await expect(action(page, "redraw")).toBeDisabled();
  await action(page, "go-live").click();
  await action(page, "next-round").click();
  expect((await data(page)).matches[0].sides).toEqual([0, 2]);
  await expect(page.locator(".score-number").first()).toHaveText("0");
  await expect(page.locator(".scoreboard")).toContainText("RODADA 2");
});

test("janela mantém foco no formulário e fecha com Escape", async ({
  page,
}) => {
  await page.goto("/");
  const trigger = action(page, "new-match").first();
  await trigger.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(await page.locator(".workspace").evaluate((el) => el.inert)).toBe(
    true,
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Criar partida/ })
    .focus();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Fechar janela" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(trigger).toBeFocused();
});
