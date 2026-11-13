# Evidências de aceite (PRs)

Screenshots anexados nos PRs correspondentes; paths estáveis no repo para revisão.

| Issue | Arquivo | Viewport |
|-------|---------|----------|
| #15 L1 | [l1-15-onboarding-390.png](./l1-15-onboarding-390.png) | **390×844 px** (PNG; rota `/dev/criar-pelada`, viewport mobile) |
| #23 3.1-EMPTY | [3-1-empty-23-inicio-390.jpg](./3-1-empty-23-inicio-390.jpg) | **390×844 px** (JPG; rota `/dev/inicio-empty`, sem partida + elenco vazio) |
| #24 3.7 | [3-7-24-jogadores-390.jpg](./3-7-24-jogadores-390.jpg) | **390×844 px** (JPG; rota `/dev/jogadores-list`, elenco de exemplo) |
| #26 3.8 | [3-8-26-jogador-perfil-390.jpg](./3-8-26-jogador-perfil-390.jpg) | **390×844 px** (JPG; rota `/dev/jogador-perfil`, perfil de exemplo) |
| #27 3.8-EDIT | [3-8-edit-27-jogador-perfil-edit-390.jpg](./3-8-edit-27-jogador-perfil-edit-390.jpg) | **390×844 px** (JPG; rota `/dev/jogador-perfil-edit`, modo edição adm) |
| #28 3.3 | [3-3-28-criar-partida-390.jpg](./3-3-28-criar-partida-390.jpg) | **390×844 px** (JPG; rota `/dev/criar-partida`) |
| #30 3.4 | [3-4-30-presenca-390.jpg](./3-4-30-presenca-390.jpg) | **390×844 px** (JPG; rota `/dev/presenca`, aba Confirmados) |
| #32 L45 | [l45-32-presenca-format-modal-390.jpg](./l45-32-presenca-format-modal-390.jpg) | **390×844 px** (JPG; `/dev/presenca`, modal “Confirmados ≠ capacidade ideal” após *Fechar lista e sortear*) |
| #34 3.4-NAV | [3-4-34-sorteio-nav-390.jpg](./3-4-34-sorteio-nav-390.jpg) | **390×844 px** (JPG; `/dev/partida-sorteio`, sub-aba Sorteio após fechar lista) |
| #40 3.5 | [3-5-40-sorteio-390.jpg](./3-5-40-sorteio-390.jpg) | **390×844 px** (JPG; `/dev/sorteio-3-5`, card equilíbrio, times e drag-and-drop) |
| #42 5-SPIKE | [5-spike-42-sorteio-core-390.jpg](./5-spike-42-sorteio-core-390.jpg) | **390×844 px** (JPG; `/dev/sorteio-3-5`, métricas do `@pelada/core` no browser + drag entre times) |
| #41 3.5-SHARE | [3-5-share-41-modal-390.jpg](./3-5-share-41-modal-390.jpg) | **390×844 px** (JPG; `/dev/sorteio-3-5-share`, modal compartilhar + “Ocultar notas”) |
| #43 3.6 | [3-6-43-campo-390.jpg](./3-6-43-campo-390.jpg) | **390×844 px** (JPG; `/dev/campo-3-6`, placar, cronômetro, descanso) |
| #46 3.9 | [3-9-46-caixa-390.jpg](./3-9-46-caixa-390.jpg) | **390×844 px** (JPG; `/dev/caixa-3-9`, resumo, segmentos, chips pago/devendo) |

Validar dimensões antes do PR:

```powershell
Add-Type -AssemblyName System.Drawing
$i = [System.Drawing.Image]::FromFile('docs/evidence/l1-15-onboarding-390.png')
"$($i.Width)x$($i.Height)"  # deve ser 390x844
$i.Dispose()
```

## npm audit (baseline MVP)

**Status (#84):** Na `main`, com o `package-lock.json` atual, o gate de produção passa sem waiver:

```text
npm audit --omit=dev --audit-level=high
found 0 vulnerabilities
```

Baseline: **Angular 22** no `@pelada/web`, overrides de `multer@2.5.0` e `deepmerge-ts@8.0.2` na raiz, e **Node ≥22.22.3** conforme `engines`.

Histórico (antes do bump): baseline Angular 19 / waiver na issue **#15** — [comentário MVP baseline](https://github.com/messiasneto74/app-pelada/issues/15#issuecomment-6479362114). A issue **#84** foi aberta após revisão do PR **#83** (12 vulns high/moderate); o estado verde atual reflete bumps já presentes na `main` (Angular 22, overrides, lockfile), sem waiver.

**Waivers históricos (core-only, encerrados com #84):**

- **#33** L45-CORE / PR **#101** — decisão formal no corpo da [#33](https://github.com/messiasneto74/app-pelada/issues/33) § *Decisão mantenedor — gate npm audit*.
- **#37** CORE-3 / PR **#106** — mesma linha no corpo da [#37](https://github.com/messiasneto74/app-pelada/issues/37) § *Decisão mantenedor — gate npm audit*.
- **#38** CORE-TEST / PR **#107** — escopo só `packages/core`; decisão no corpo da [#38](https://github.com/messiasneto74/app-pelada/issues/38).
