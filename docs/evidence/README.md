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

Validar dimensões antes do PR:

```powershell
Add-Type -AssemblyName System.Drawing
$i = [System.Drawing.Image]::FromFile('docs/evidence/l1-15-onboarding-390.png')
"$($i.Width)x$($i.Height)"  # deve ser 390x844
$i.Dispose()
```

## npm audit (baseline MVP)

O gate `npm audit --omit=dev --audit-level=high` falha no monorepo por **9 highs** em dependências de **produção** (Angular 19.x, Prisma/deepmerge-ts, Multer/Nest) — **pré-existentes**, não introduzidos por issues de UI isoladas.

**Waiver registrado na issue #15:** [comentário MVP baseline](https://github.com/messiasneto74/app-pelada/issues/15#issuecomment-6479362114) — PRs de feature (ex. **#79**) referenciam até upgrade em `DEPLOY-1` / bump Angular.

**Waiver por issue (core-only):**

- **#33** L45-CORE / PR **#101** — decisão formal no corpo da [#33](https://github.com/messiasneto74/app-pelada/issues/33) § *Decisão mantenedor — gate npm audit*; correção rastreada na **#84**.
- **#37** CORE-3 / PR **#106** — mesma linha no corpo da [#37](https://github.com/messiasneto74/app-pelada/issues/37) § *Decisão mantenedor — gate npm audit*; correção rastreada na **#84**.
