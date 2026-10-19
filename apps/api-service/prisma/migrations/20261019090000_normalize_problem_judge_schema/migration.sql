-- Normalize the problem and judge schema while preserving existing development data.

-- Problems -----------------------------------------------------------------
ALTER TABLE "problems" RENAME COLUMN "description" TO "statement_md";
ALTER TABLE "problems" RENAME COLUMN "starterCode" TO "starter_code";
ALTER TABLE "problems" RENAME COLUMN "createdAt" TO "created_at";

ALTER TABLE "problems"
  ADD COLUMN "constraints_md" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "time_limit_ms" INTEGER NOT NULL DEFAULT 2000,
  ADD COLUMN "memory_limit_mb" INTEGER NOT NULL DEFAULT 256,
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "problems" AS p
SET "constraints_md" = CASE
  WHEN p."constraints" IS NULL THEN ''
  WHEN jsonb_typeof(p."constraints") = 'array' THEN COALESCE(
    (SELECT string_agg('- ' || item, E'\n') FROM jsonb_array_elements_text(p."constraints") AS item),
    ''
  )
  ELSE p."constraints" #>> '{}'
END;

CREATE TABLE "problem_examples" (
  "id" TEXT NOT NULL,
  "problem_id" TEXT NOT NULL,
  "input_text" TEXT NOT NULL,
  "output_text" TEXT NOT NULL,
  "explanation" TEXT,
  "position" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "problem_examples_pkey" PRIMARY KEY ("id")
);

INSERT INTO "problem_examples" ("id", "problem_id", "input_text", "output_text", "explanation", "position")
SELECT
  'example_' || md5(p."id" || ':' || e.ordinality::text),
  p."id",
  COALESCE(e.value->>'input', ''),
  COALESCE(e.value->>'output', ''),
  e.value->>'explanation',
  e.ordinality::integer - 1
FROM "problems" p
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(p."examples", '[]'::jsonb)) WITH ORDINALITY AS e(value, ordinality);

ALTER TABLE "problems" DROP COLUMN "constraints";
ALTER TABLE "problems" DROP COLUMN "examples";

CREATE UNIQUE INDEX "problem_examples_problem_id_position_key" ON "problem_examples"("problem_id", "position");
CREATE INDEX "problem_examples_problem_id_idx" ON "problem_examples"("problem_id");
ALTER TABLE "problem_examples" ADD CONSTRAINT "problem_examples_problem_id_fkey"
  FOREIGN KEY ("problem_id") REFERENCES "problems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Test cases ---------------------------------------------------------------
ALTER TABLE "test_cases" RENAME COLUMN "problemId" TO "problem_id";
ALTER TABLE "test_cases" RENAME COLUMN "input" TO "input_key";
ALTER TABLE "test_cases" RENAME COLUMN "expectedOutput" TO "expected_output_key";
ALTER TABLE "test_cases" RENAME COLUMN "order" TO "position";
ALTER TABLE "test_cases" RENAME COLUMN "createdAt" TO "created_at";

ALTER TABLE "test_cases"
  ADD COLUMN "visibility" TEXT NOT NULL DEFAULT 'HIDDEN',
  ADD COLUMN "points" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "group_id" TEXT;

UPDATE "test_cases"
SET
  "input_key" = 'inline-base64:' || replace(encode(convert_to("input_key", 'UTF8'), 'base64'), E'\n', ''),
  "expected_output_key" = 'inline-base64:' || replace(encode(convert_to("expected_output_key", 'UTF8'), 'base64'), E'\n', ''),
  "visibility" = CASE WHEN "isHidden" THEN 'HIDDEN' ELSE 'PUBLIC' END;

ALTER TABLE "test_cases" DROP COLUMN "isHidden";
CREATE UNIQUE INDEX "test_cases_problem_id_position_key" ON "test_cases"("problem_id", "position");
CREATE INDEX "test_cases_problem_id_visibility_idx" ON "test_cases"("problem_id", "visibility");

-- Official solutions -------------------------------------------------------
CREATE TABLE "official_solutions" (
  "id" TEXT NOT NULL,
  "problem_id" TEXT NOT NULL,
  "language" TEXT NOT NULL,
  "source_key" TEXT NOT NULL,
  "editorial_md" TEXT NOT NULL,
  "visibility" TEXT NOT NULL DEFAULT 'PRIVATE',
  CONSTRAINT "official_solutions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "official_solutions_problem_id_language_key" ON "official_solutions"("problem_id", "language");
CREATE INDEX "official_solutions_problem_id_idx" ON "official_solutions"("problem_id");
ALTER TABLE "official_solutions" ADD CONSTRAINT "official_solutions_problem_id_fkey"
  FOREIGN KEY ("problem_id") REFERENCES "problems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Submissions --------------------------------------------------------------
ALTER TABLE "submissions" DROP CONSTRAINT IF EXISTS "submissions_problemId_fkey";
ALTER TABLE "submissions" RENAME COLUMN "problemId" TO "problem_id";
ALTER TABLE "submissions" RENAME COLUMN "userId" TO "user_id";
ALTER TABLE "submissions" RENAME COLUMN "sourceCode" TO "source_key";
ALTER TABLE "submissions" RENAME COLUMN "executionTimeMs" TO "runtime_ms";
ALTER TABLE "submissions" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "submissions" RENAME COLUMN "passedTestCases" TO "passed_test_cases";
ALTER TABLE "submissions" RENAME COLUMN "totalTestCases" TO "total_test_cases";
ALTER TABLE "submissions" RENAME COLUMN "failedTestCase" TO "failed_test_case";
ALTER TABLE "submissions" RENAME COLUMN "runtimeIntelligence" TO "runtime_intelligence";
ALTER TABLE "submissions" RENAME COLUMN "memory" TO "memory_legacy";

ALTER TABLE "submissions" ADD COLUMN "memory_kb" INTEGER;
UPDATE "submissions"
SET
  "source_key" = 'inline-base64:' || replace(encode(convert_to("source_key", 'UTF8'), 'base64'), E'\n', ''),
  "memory_kb" = NULLIF(regexp_replace(COALESCE("memory_legacy", ''), '[^0-9]', '', 'g'), '')::integer;
ALTER TABLE "submissions" DROP COLUMN "memory_legacy";

INSERT INTO "problems" (
  "id", "slug", "title", "difficulty", "statement_md", "constraints_md", "time_limit_ms",
  "memory_limit_mb", "status", "version", "starter_code", "created_at", "updated_at"
)
SELECT
  'legacy-sandbox-problem', 'legacy-sandbox', 'Legacy sandbox submission', 'easy',
  'Archived placeholder for submissions created without a problem.', '', 2000, 256,
  'ARCHIVED', 1, '{}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE EXISTS (SELECT 1 FROM "submissions" WHERE "problem_id" IS NULL)
ON CONFLICT ("slug") DO NOTHING;

UPDATE "submissions"
SET "problem_id" = (SELECT "id" FROM "problems" WHERE "slug" = 'legacy-sandbox')
WHERE "problem_id" IS NULL;

ALTER TABLE "submissions" ALTER COLUMN "problem_id" SET NOT NULL;
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_problem_id_fkey"
  FOREIGN KEY ("problem_id") REFERENCES "problems"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "submissions_user_id_created_at_idx" ON "submissions"("user_id", "created_at");
CREATE INDEX "submissions_problem_id_created_at_idx" ON "submissions"("problem_id", "created_at");

-- Per-test judge results ---------------------------------------------------
CREATE TABLE "submission_test_results" (
  "id" TEXT NOT NULL,
  "submission_id" TEXT NOT NULL,
  "test_case_id" TEXT NOT NULL,
  "verdict" TEXT NOT NULL,
  "runtime_ms" INTEGER,
  "memory_kb" INTEGER,
  CONSTRAINT "submission_test_results_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "submission_test_results_submission_id_test_case_id_key"
  ON "submission_test_results"("submission_id", "test_case_id");
CREATE INDEX "submission_test_results_submission_id_idx" ON "submission_test_results"("submission_id");
ALTER TABLE "submission_test_results" ADD CONSTRAINT "submission_test_results_submission_id_fkey"
  FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "submission_test_results" ADD CONSTRAINT "submission_test_results_test_case_id_fkey"
  FOREIGN KEY ("test_case_id") REFERENCES "test_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
