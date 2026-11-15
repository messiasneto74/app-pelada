-- CreateTable
CREATE TABLE "match_field_rounds" (
    "id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "round_number" INTEGER NOT NULL,
    "home_draw_team_id" TEXT NOT NULL,
    "away_draw_team_id" TEXT NOT NULL,
    "score_home" INTEGER NOT NULL,
    "score_away" INTEGER NOT NULL,
    "goals" JSONB NOT NULL DEFAULT '[]',
    "duration_ms" INTEGER NOT NULL,
    "finished_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_field_rounds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "match_field_rounds_match_id_idx" ON "match_field_rounds"("match_id");

-- AddForeignKey
ALTER TABLE "match_field_rounds" ADD CONSTRAINT "match_field_rounds_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_field_rounds" ADD CONSTRAINT "match_field_rounds_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "match_field_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
