# Monorepo build — contexto na raiz: docker compose build api
FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl

FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/pelada-web/package.json apps/pelada-web/
COPY packages/core/package.json packages/core/
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
RUN npm ci --ignore-scripts

FROM deps AS build
COPY packages/core packages/core
COPY apps/api apps/api
RUN npx prisma generate --schema=apps/api/prisma/schema.prisma
RUN npm run build -w @pelada/api

FROM build AS prod-deps
RUN npm prune --omit=dev

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
WORKDIR /app/apps/api
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --retries=6 --start-period=40s \
  CMD node -e "require('http').get('http://127.0.0.1:3000/health',(r)=>{process.exit(r.statusCode===200?0:1)}).on('error',()=>process.exit(1))"
CMD ["sh", "-c", "node ../../node_modules/prisma/build/index.js migrate deploy && node dist/main.js"]
