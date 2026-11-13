# STORAGE-1 — fotos no filesystem (MVP)

API Nest serve arquivos em `UPLOAD_DIR` (padrão `./uploads`; no Docker `/app/uploads` com volume).

## Variáveis

| Variável | Uso |
|----------|-----|
| `UPLOAD_DIR` | Pasta de gravação (relativa ao `cwd` da API ou absoluta) |
| `PUBLIC_UPLOAD_BASE_URL` | Prefixo das URLs retornadas (`photoUrl`), ex. `http://localhost:3000/uploads` |

Ver [.env.example](../.env.example) e [deploy-staging.md](deploy-staging.md) (`PUBLIC_UPLOAD_BASE_URL` em staging).

## Endpoints

| Rota | Campo multipart | Limite |
|------|-----------------|--------|
| `POST /peladas` | `photo` | JPG/PNG/WebP, 5 MB |
| `PATCH /peladas/:peladaId/players/:playerId` | `photo` (opcional; JSON no mesmo request) | idem |

Leitura pública: `GET {API}/uploads/<arquivo>` (static em `bootstrap.ts`).

Erros: tipo inválido `400`; Multer acima de 5 MB `413` (`Foto deve ter no máximo 5 MB.`).

## Testes

- Unitários: `apps/api/src/storage/photo-storage.service.spec.ts`
- Integração (Postgres harness): `apps/api/test/storage-1.integration-spec.ts` — `RUN_DB_TESTS=1` + `npm run test:api:harness`

## Depois do MVP

Object storage (S3 / R2 / Cloudflare Images) — ver issue #58 no GitHub.
