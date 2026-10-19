-- Runs and judged submissions previously shared the same history. Existing
-- records predate the Submit action, so preserve them as RUN attempts.
ALTER TABLE "submissions"
ADD COLUMN "execution_mode" TEXT NOT NULL DEFAULT 'SUBMIT';

UPDATE "submissions"
SET "execution_mode" = 'RUN';

CREATE INDEX "submissions_user_id_problem_id_execution_mode_created_at_idx"
ON "submissions"("user_id", "problem_id", "execution_mode", "created_at");
