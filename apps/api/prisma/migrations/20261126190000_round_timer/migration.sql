-- Issue #229 — cronômetro por rodada: onde a rodada atual começou no relógio acumulado.
ALTER TABLE "match_field_sessions" ADD COLUMN "round_started_elapsed_ms" INTEGER NOT NULL DEFAULT 0;
