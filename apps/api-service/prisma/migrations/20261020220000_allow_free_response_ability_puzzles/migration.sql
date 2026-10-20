ALTER TABLE "ability_puzzles"
ALTER COLUMN "options" DROP NOT NULL,
ALTER COLUMN "correct_option" DROP NOT NULL,
ADD COLUMN "answer_text" TEXT;
