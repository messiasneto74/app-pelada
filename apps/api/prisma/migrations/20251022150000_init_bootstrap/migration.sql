-- CreateEnum
CREATE TYPE "PeladaRole" AS ENUM ('ORGANIZADOR', 'JOGADOR');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "keycloak_sub" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "peladas" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "peladas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pelada_members" (
    "id" TEXT NOT NULL,
    "pelada_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "PeladaRole" NOT NULL DEFAULT 'JOGADOR',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pelada_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_keycloak_sub_key" ON "users"("keycloak_sub");

-- CreateIndex
CREATE UNIQUE INDEX "pelada_members_pelada_id_user_id_key" ON "pelada_members"("pelada_id", "user_id");

-- AddForeignKey
ALTER TABLE "peladas" ADD CONSTRAINT "peladas_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pelada_members" ADD CONSTRAINT "pelada_members_pelada_id_fkey" FOREIGN KEY ("pelada_id") REFERENCES "peladas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pelada_members" ADD CONSTRAINT "pelada_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
