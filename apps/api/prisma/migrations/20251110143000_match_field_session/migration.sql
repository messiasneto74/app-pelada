-- 3.6-API: sessão em campo (placar, cronômetro, rodízio)

CREATE TYPE "FieldRotationPolicy" AS ENUM ('WINNER_STAYS', 'REST_QUEUE', 'SEQUENTIAL');

CREATE TABLE "match_field_sessions" (
    "id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "rotation_policy" "FieldRotationPolicy" NOT NULL DEFAULT 'WINNER_STAYS',
    "round_number" INTEGER NOT NULL DEFAULT 1,
    "home_team_sort_order" INTEGER NOT NULL,
    "away_team_sort_order" INTEGER NOT NULL,
    "score_home" INTEGER NOT NULL DEFAULT 0,
    "score_away" INTEGER NOT NULL DEFAULT 0,
    "elapsed_ms" INTEGER NOT NULL DEFAULT 0,
    "timer_running_since" TIMESTAMP(3),
    "goal_history" JSONB NOT NULL DEFAULT '[]',
    "fixed_gk_meta" JSONB NOT NULL DEFAULT '{}',
    "finished_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "match_field_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "match_field_sessions_match_id_key" ON "match_field_sessions"("match_id");

ALTER TABLE "match_field_sessions" ADD CONSTRAINT "match_field_sessions_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
