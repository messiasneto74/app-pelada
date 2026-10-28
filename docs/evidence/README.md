# Evidências de aceite (PRs)

Screenshots anexados nos PRs correspondentes; paths estáveis no repo para revisão.

| Issue | Arquivo | Viewport |
|-------|---------|----------|
| #15 L1 | [l1-15-onboarding-390.png](./l1-15-onboarding-390.png) | **390×844 px** (PNG; rota `/dev/criar-pelada`, viewport mobile) |

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
