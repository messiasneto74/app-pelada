-- CreateTable
CREATE TABLE "pelada_invites" (
    "id" TEXT NOT NULL,
    "pelada_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "created_by_user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "used_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pelada_invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pelada_invites_token_key" ON "pelada_invites"("token");

-- CreateIndex
CREATE INDEX "pelada_invites_pelada_id_idx" ON "pelada_invites"("pelada_id");

-- AddForeignKey
ALTER TABLE "pelada_invites" ADD CONSTRAINT "pelada_invites_pelada_id_fkey" FOREIGN KEY ("pelada_id") REFERENCES "peladas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
