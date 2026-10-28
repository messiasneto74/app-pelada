-- T5: domínio completo (regras, jogador, partida, presença, sorteio, pagamento)

-- CreateEnum
CREATE TYPE "GoalkeeperMode" AS ENUM ('ROTATING', 'FIXED_PER_TEAM', 'FIXED_GLOBAL');
CREATE TYPE "PresenceMode" AS ENUM ('SELF_CONFIRM', 'ORGANIZER_CLOSES');
CREATE TYPE "PaymentPlan" AS ENUM ('PER_MATCH', 'MONTHLY');
CREATE TYPE "MatchStatus" AS ENUM ('SCHEDULED', 'LIST_CLOSED', 'DRAWN', 'IN_PROGRESS', 'FINISHED');
CREATE TYPE "AttendanceStatus" AS ENUM ('PENDING', 'CONFIRMED', 'DECLINED', 'QUEUE');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'WAIVED');

-- AlterTable
ALTER TABLE "peladas" ADD COLUMN "photo_url" TEXT,
ADD COLUMN "default_weekday" INTEGER,
ADD COLUMN "default_location" TEXT;

-- CreateTable
CREATE TABLE "pelada_rules" (
    "id" TEXT NOT NULL,
    "pelada_id" TEXT NOT NULL,
    "players_per_team" INTEGER NOT NULL DEFAULT 6,
    "team_count" INTEGER NOT NULL DEFAULT 2,
    "modality" TEXT NOT NULL DEFAULT 'campo',
    "goalkeeper_mode" "GoalkeeperMode" NOT NULL DEFAULT 'ROTATING',
    "presence_mode" "PresenceMode" NOT NULL DEFAULT 'ORGANIZER_CLOSES',
    "capacity" INTEGER,
    "allow_player_self_edit" BOOLEAN NOT NULL DEFAULT false,
    "fixed_list_only" BOOLEAN NOT NULL DEFAULT false,
    "draw_weights" JSONB NOT NULL DEFAULT '{}',
    "extra" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pelada_rules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "players" (
    "id" TEXT NOT NULL,
    "pelada_id" TEXT NOT NULL,
    "user_id" TEXT,
    "display_name" TEXT NOT NULL,
    "is_goalkeeper" BOOLEAN NOT NULL DEFAULT false,
    "position" TEXT,
    "rating" INTEGER,
    "attributes" JSONB NOT NULL DEFAULT '{}',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "payment_plan" "PaymentPlan" NOT NULL DEFAULT 'PER_MATCH',
    "is_fixed_list" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "matches" (
    "id" TEXT NOT NULL,
    "pelada_id" TEXT NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "notes" TEXT,
    "presence_mode" "PresenceMode",
    "rules_override" JSONB,
    "list_closed_at" TIMESTAMP(3),
    "status" "MatchStatus" NOT NULL DEFAULT 'SCHEDULED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "match_attendances" (
    "id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PENDING',
    "queue_position" INTEGER,
    "is_guest" BOOLEAN NOT NULL DEFAULT false,
    "guest_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "match_attendances_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "draws" (
    "id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "balance_score" INTEGER,
    "seed" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "draws_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "draw_teams" (
    "id" TEXT NOT NULL,
    "draw_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "draw_teams_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "draw_team_players" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "draw_team_players_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payment_ledger" (
    "id" TEXT NOT NULL,
    "pelada_id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "match_id" TEXT,
    "amount_cents" INTEGER NOT NULL,
    "period_start" TIMESTAMP(3),
    "period_end" TIMESTAMP(3),
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pelada_rules_pelada_id_key" ON "pelada_rules"("pelada_id");
CREATE INDEX "players_pelada_id_idx" ON "players"("pelada_id");
CREATE INDEX "matches_pelada_id_scheduled_at_idx" ON "matches"("pelada_id", "scheduled_at");
CREATE UNIQUE INDEX "match_attendances_match_id_player_id_key" ON "match_attendances"("match_id", "player_id");
CREATE UNIQUE INDEX "draws_match_id_key" ON "draws"("match_id");
CREATE UNIQUE INDEX "draw_team_players_team_id_player_id_key" ON "draw_team_players"("team_id", "player_id");
CREATE INDEX "payment_ledger_pelada_id_player_id_idx" ON "payment_ledger"("pelada_id", "player_id");

-- AddForeignKey
ALTER TABLE "pelada_rules" ADD CONSTRAINT "pelada_rules_pelada_id_fkey" FOREIGN KEY ("pelada_id") REFERENCES "peladas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "players" ADD CONSTRAINT "players_pelada_id_fkey" FOREIGN KEY ("pelada_id") REFERENCES "peladas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "players" ADD CONSTRAINT "players_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "matches" ADD CONSTRAINT "matches_pelada_id_fkey" FOREIGN KEY ("pelada_id") REFERENCES "peladas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "match_attendances" ADD CONSTRAINT "match_attendances_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "match_attendances" ADD CONSTRAINT "match_attendances_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "draws" ADD CONSTRAINT "draws_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "draw_teams" ADD CONSTRAINT "draw_teams_draw_id_fkey" FOREIGN KEY ("draw_id") REFERENCES "draws"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "draw_team_players" ADD CONSTRAINT "draw_team_players_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "draw_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "draw_team_players" ADD CONSTRAINT "draw_team_players_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payment_ledger" ADD CONSTRAINT "payment_ledger_pelada_id_fkey" FOREIGN KEY ("pelada_id") REFERENCES "peladas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payment_ledger" ADD CONSTRAINT "payment_ledger_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payment_ledger" ADD CONSTRAINT "payment_ledger_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
