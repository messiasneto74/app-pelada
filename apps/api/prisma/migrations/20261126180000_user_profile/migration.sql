-- Issue #226 — Meu perfil: nome e foto da conta.
ALTER TABLE "users" ADD COLUMN "name" TEXT;
ALTER TABLE "users" ADD COLUMN "photo_url" TEXT;
