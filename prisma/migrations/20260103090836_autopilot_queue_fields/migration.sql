-- AlterTable
ALTER TABLE "RecoveryFinding" ADD COLUMN     "autopilotQueued" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "autopilotQueuedAt" TIMESTAMP(3);
