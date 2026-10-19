/*
  Warnings:

  - You are about to drop the column `roomId` on the `submissions` table. All the data in the column will be lost.
  - You are about to drop the `interview_rooms` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `room_code_snapshots` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `room_participants` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[slug]` on the table `problems` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `slug` to the `problems` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "interview_rooms" DROP CONSTRAINT "interview_rooms_createdBy_fkey";

-- DropForeignKey
ALTER TABLE "room_code_snapshots" DROP CONSTRAINT "room_code_snapshots_roomId_fkey";

-- DropForeignKey
ALTER TABLE "room_participants" DROP CONSTRAINT "room_participants_roomId_fkey";

-- DropForeignKey
ALTER TABLE "room_participants" DROP CONSTRAINT "room_participants_userId_fkey";

-- DropForeignKey
ALTER TABLE "submissions" DROP CONSTRAINT "submissions_roomId_fkey";

-- AlterTable
ALTER TABLE "problems" ADD COLUMN     "constraints" JSONB,
ADD COLUMN     "examples" JSONB,
ADD COLUMN     "slug" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "submissions" DROP COLUMN "roomId",
ADD COLUMN     "failedTestCase" JSONB,
ADD COLUMN     "memory" TEXT,
ADD COLUMN     "passedTestCases" INTEGER,
ADD COLUMN     "runtimeIntelligence" JSONB,
ADD COLUMN     "totalTestCases" INTEGER;

-- DropTable
DROP TABLE "interview_rooms";

-- DropTable
DROP TABLE "room_code_snapshots";

-- DropTable
DROP TABLE "room_participants";

-- CreateTable
CREATE TABLE "problem_tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "problem_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_cases" (
    "id" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "input" TEXT NOT NULL,
    "expectedOutput" TEXT NOT NULL,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "test_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "code_drafts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "code_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submission_feedbacks" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "strengths" JSONB NOT NULL,
    "weaknesses" JSONB NOT NULL,
    "optimizations" JSONB NOT NULL,
    "complexityEstimate" TEXT NOT NULL,
    "readabilityScore" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submission_feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submission_error_feedbacks" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "errorType" TEXT NOT NULL,
    "agentResponse" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submission_error_feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ProblemToProblemTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ProblemToProblemTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "problem_tags_name_key" ON "problem_tags"("name");

-- CreateIndex
CREATE UNIQUE INDEX "code_drafts_userId_problemId_language_key" ON "code_drafts"("userId", "problemId", "language");

-- CreateIndex
CREATE UNIQUE INDEX "submission_feedbacks_submissionId_key" ON "submission_feedbacks"("submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "submission_error_feedbacks_submissionId_key" ON "submission_error_feedbacks"("submissionId");

-- CreateIndex
CREATE INDEX "_ProblemToProblemTag_B_index" ON "_ProblemToProblemTag"("B");

-- CreateIndex
CREATE UNIQUE INDEX "problems_slug_key" ON "problems"("slug");

-- AddForeignKey
ALTER TABLE "test_cases" ADD CONSTRAINT "test_cases_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "problems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "code_drafts" ADD CONSTRAINT "code_drafts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "code_drafts" ADD CONSTRAINT "code_drafts_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "problems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_feedbacks" ADD CONSTRAINT "submission_feedbacks_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_error_feedbacks" ADD CONSTRAINT "submission_error_feedbacks_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProblemToProblemTag" ADD CONSTRAINT "_ProblemToProblemTag_A_fkey" FOREIGN KEY ("A") REFERENCES "problems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProblemToProblemTag" ADD CONSTRAINT "_ProblemToProblemTag_B_fkey" FOREIGN KEY ("B") REFERENCES "problem_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
