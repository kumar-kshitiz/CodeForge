CREATE TABLE "ability_puzzles" (
  "id" TEXT NOT NULL,
  "prompt" TEXT NOT NULL,
  "options" JSONB NOT NULL,
  "correct_option" INTEGER NOT NULL,
  "explanation" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ability_puzzles_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ability_puzzles_status_created_at_idx"
ON "ability_puzzles"("status", "created_at");
