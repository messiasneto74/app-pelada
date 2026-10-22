const { chromium } = require("@playwright/test");
const { spawn } = require("node:child_process");
const { mkdir, writeFile } = require("node:fs/promises");
const { existsSync } = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const output = path.join(root, "visual");
const url = "http://127.0.0.1:8002";
const captures = [
  ["inicio", "Visão geral"],
  ["partidas", "Agenda de partidas"],
  ["nova-partida", "Criar partida"],
  ["presenca", "Presença: confirmados"],
  ["pendentes", "Presença: pendentes"],
  ["fila", "Presença: fila de espera"],
  ["detalhes-partida", "Detalhes da partida"],
  ["sorteio", "Sorteio e equilíbrio dos times"],
  ["trocar-jogador", "Trocar jogadores entre times"],
  ["em-campo", "Placar e cronômetro"],
  ["jogadores", "Elenco de jogadores"],
  ["perfil-jogador", "Perfil do jogador"],
  ["editar-jogador", "Editar perfil"],
  ["novo-jogador", "Adicionar jogador"],
  ["caixa", "Caixa e pagamentos"],
  ["configuracoes", "Configurações da pelada"],
];
const action = (page, name) => page.locator(`[data-action="${name}"]`);
async function capture(page, mode, name, dialog = false) {
  await page.clock.runFor(3600);
  await page.evaluate(() => document.fonts.ready);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  if (overflow) throw new Error(`Rolagem horizontal em ${mode}/${name}`);
  await page.screenshot({
    path: path.join(output, mode, name + ".png"),
    fullPage: !dialog,
    animations: "disabled",
  });
  console.log(`${mode}/${name}.png`);
}
async function run() {
  // Reserve a dedicated port; never reuse or terminate another user's server.
  const server = spawn(
    process.execPath,
    [path.join(__dirname, "static-server.cjs"), "8002"],
    { cwd: root, stdio: "ignore" },
  );
  let serverError;
  server.on("error", (e) => {
    serverError = e;
  });
  let browser;
  try {
    for (let i = 0; i < 50; i++) {
      if (serverError) throw serverError;
      if (server.exitCode !== null)
        throw new Error(
          "O servidor não iniciou. Verifique se a porta 8002 está livre.",
        );
      try {
        if ((await fetch(url)).ok) break;
      } catch {}
      if (i === 49) throw new Error("Servidor não respondeu na porta 8002.");
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    browser = await chromium.launch({
      executablePath:
        process.env.CHROMIUM_PATH ||
        (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
    });
    for (const mode of ["mobile", "desktop"]) {
      await mkdir(path.join(output, mode), { recursive: true });
      const context = await browser.newContext({
        viewport:
          mode === "mobile"
            ? { width: 390, height: 844 }
            : { width: 1440, height: 1000 },
        isMobile: mode === "mobile",
        hasTouch: mode === "mobile",
        deviceScaleFactor: 1,
        reducedMotion: "reduce",
        locale: "pt-BR",
        timezoneId: "America/Sao_Paulo",
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.clock.install({ time: new Date("2026-10-21T21:00:00Z") });
      await page.goto(url);
      await capture(page, mode, "inicio");
      await page.locator('#nav a[href="#partida"]').click();
      await capture(page, mode, "partidas");
      await action(page, "new-match").click();
      await capture(page, mode, "nova-partida", true);
      await action(page, "close-modal").first().click();
      await action(page, "open-match").first().click();
      await page
        .locator('[data-action="attendance-tab"][data-id="pending"]')
        .click();
      for (const id of [13, 14, 15])
        await page.locator(`[data-action="confirm"][data-id="${id}"]`).click();
      await capture(page, mode, "pendentes");
      await page
        .locator('[data-action="attendance-tab"][data-id="queue"]')
        .click();
      await capture(page, mode, "fila");
      await page
        .locator('[data-action="attendance-tab"][data-id="confirmed"]')
        .click();
      await capture(page, mode, "presenca");
      await action(page, "match-details").click();
      await capture(page, mode, "detalhes-partida", true);
      await action(page, "close-modal").first().click();
      await action(page, "close-draw").click();
      await capture(page, mode, "sorteio");
      await page.locator('[data-action="swap"][data-id="3"]').click();
      await capture(page, mode, "trocar-jogador", true);
      await action(page, "close-modal").first().click();
      await action(page, "go-live").click();
      await page.locator('[data-action="goal"][data-id="0"]').click();
      await page.locator('[data-action="goal"][data-id="0"]').click();
      await page.locator('[data-action="goal"][data-id="1"]').click();
      await action(page, "timer").click();
      await page.clock.fastForward(754000);
      await action(page, "timer").click();
      await capture(page, mode, "em-campo");
      await page.locator('#nav a[href="#jogadores"]').click();
      await capture(page, mode, "jogadores");
      await page
        .locator('[data-action="profile"][data-id="3"]')
        .first()
        .click();
      await capture(page, mode, "perfil-jogador", true);
      await action(page, "edit-player").click();
      await capture(page, mode, "editar-jogador", true);
      await action(page, "close-modal").first().click();
      await action(page, "new-player").click();
      await capture(page, mode, "novo-jogador", true);
      await action(page, "close-modal").first().click();
      await page.locator('#nav a[href="#caixa"]').click();
      await capture(page, mode, "caixa");
      await page.locator('#nav a[href="#regras"]').click();
      await capture(page, mode, "configuracoes");
      if (errors.length) throw new Error(errors.join("\n"));
      await context.close();
    }
    const gallery = `# Resenha — galeria de telas\n\nCapturas reais do protótipo no Chromium. Clique nas imagens para abrir em tamanho original.\n\n**Celular:** 390 × 844 px, com toque e dispositivo móvel emulado. **Desktop:** 1440 × 1000 px. As telas completas incluem o conteúdo abaixo da dobra; os formulários são capturados no tamanho da janela.\n\nOs dados são demonstrativos. Cada formato usa uma sessão isolada, por isso os times sorteados podem variar.\n\n${captures.map(([name, label], index) => `## ${index + 1}. ${label}\n\n| Celular | Desktop |\n| --- | --- |\n| [![${label} no celular](mobile/${name}.png)](mobile/${name}.png) | [![${label} no desktop](desktop/${name}.png)](desktop/${name}.png) |\n`).join("\n")}\n## Reproduzir os prints\n\nEm \`prototipo/\`, execute \`npm ci\` e \`npm run screenshots\`. Requer Python 3, Chromium e porta 8002 livre. O script usa Chromium do sistema quando disponível ou \`CHROMIUM_PATH\`; alternativamente instale com \`npx playwright install chromium\`.\n`;
    await writeFile(path.join(output, "README.md"), gallery);
    console.log(
      `Galeria criada com ${captures.length * 2} capturas, sem erros de JavaScript ou rolagem horizontal.`,
    );
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
}
run().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
