ALTER TABLE "problems"
ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'QUESTION',
ADD COLUMN "challenge_ends_at" TIMESTAMP(3),
ADD COLUMN "publish_after_challenge" BOOLEAN NOT NULL DEFAULT false;

-- The Prisma field is optional; the legacy column was originally required.
ALTER TABLE "problems" ALTER COLUMN "starter_code" DROP NOT NULL;

ALTER TABLE "submissions"
ADD COLUMN "score_awarded" DOUBLE PRECISION;

CREATE TABLE "challenge_progress" (
    "id" TEXT NOT NULL,
    "problem_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "run_count" INTEGER NOT NULL DEFAULT 0,
    "submission_count" INTEGER NOT NULL DEFAULT 0,
    "first_run_passed" BOOLEAN NOT NULL DEFAULT false,
    "current_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "best_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "solved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "challenge_progress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "challenge_progress_problem_id_user_id_key"
ON "challenge_progress"("problem_id", "user_id");

CREATE INDEX "challenge_progress_problem_id_best_score_idx"
ON "challenge_progress"("problem_id", "best_score");

CREATE INDEX "challenge_progress_user_id_updated_at_idx"
ON "challenge_progress"("user_id", "updated_at");

ALTER TABLE "challenge_progress"
ADD CONSTRAINT "challenge_progress_problem_id_fkey"
FOREIGN KEY ("problem_id") REFERENCES "problems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "challenge_progress"
ADD CONSTRAINT "challenge_progress_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
