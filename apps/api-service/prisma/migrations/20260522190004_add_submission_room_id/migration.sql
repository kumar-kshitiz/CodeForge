-- AlterTable
ALTER TABLE "submissions" ADD COLUMN     "roomId" TEXT;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "interview_rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
