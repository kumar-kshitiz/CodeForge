ALTER TABLE "submissions" ADD COLUMN "team_match_id" TEXT;
CREATE INDEX "submissions_team_match_id_idx" ON "submissions"("team_match_id");
