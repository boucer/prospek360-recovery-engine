/*
  Warnings:

  - You are about to drop the column `firstName` on the `Contact` table. All the data in the column will be lost.
  - You are about to drop the column `ghlContactId` on the `Contact` table. All the data in the column will be lost.
  - You are about to drop the column `lastActivityAt` on the `Contact` table. All the data in the column will be lost.
  - You are about to drop the column `lastName` on the `Contact` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Contact` table. All the data in the column will be lost.
  - You are about to drop the column `tags` on the `Contact` table. All the data in the column will be lost.
  - You are about to drop the column `lastMessageAt` on the `Conversation` table. All the data in the column will be lost.
  - You are about to drop the column `unreadCount` on the `Conversation` table. All the data in the column will be lost.
  - You are about to drop the column `accessToken` on the `GhlConnection` table. All the data in the column will be lost.
  - You are about to drop the column `pipelineId` on the `GhlConnection` table. All the data in the column will be lost.
  - You are about to drop the column `refreshToken` on the `GhlConnection` table. All the data in the column will be lost.
  - You are about to drop the column `stageId` on the `GhlConnection` table. All the data in the column will be lost.
  - You are about to drop the column `tokenExpiresAt` on the `GhlConnection` table. All the data in the column will be lost.
  - You are about to drop the column `activatedCount` on the `RecoveryRun` table. All the data in the column will be lost.
  - You are about to drop the column `finishedAt` on the `RecoveryRun` table. All the data in the column will be lost.
  - You are about to drop the column `flaggedCount` on the `RecoveryRun` table. All the data in the column will be lost.
  - You are about to drop the column `startedAt` on the `RecoveryRun` table. All the data in the column will be lost.
  - You are about to drop the column `totalContacts` on the `RecoveryRun` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `RecoveryRun` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[externalId]` on the table `Contact` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `status` to the `Conversation` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Contact_ghlContactId_key";

-- DropIndex
DROP INDEX "Conversation_contactId_key";

-- AlterTable
ALTER TABLE "Contact" DROP COLUMN "firstName",
DROP COLUMN "ghlContactId",
DROP COLUMN "lastActivityAt",
DROP COLUMN "lastName",
DROP COLUMN "status",
DROP COLUMN "tags",
ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "name" TEXT;

-- AlterTable
ALTER TABLE "Conversation" DROP COLUMN "lastMessageAt",
DROP COLUMN "unreadCount",
ADD COLUMN     "status" TEXT NOT NULL,
ALTER COLUMN "channel" DROP DEFAULT;

-- AlterTable
ALTER TABLE "GhlConnection" DROP COLUMN "accessToken",
DROP COLUMN "pipelineId",
DROP COLUMN "refreshToken",
DROP COLUMN "stageId",
DROP COLUMN "tokenExpiresAt",
ADD COLUMN     "baseUrl" TEXT,
ALTER COLUMN "locationId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "brandColor" TEXT,
ADD COLUMN     "locale" TEXT NOT NULL DEFAULT 'fr-CA',
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "replyToEmail" TEXT,
ADD COLUMN     "senderPhone" TEXT,
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'America/Toronto';

-- AlterTable
ALTER TABLE "RecoveryFinding" ADD COLUMN     "recoveryRunId" TEXT;

-- AlterTable
ALTER TABLE "RecoveryRun" DROP COLUMN "activatedCount",
DROP COLUMN "finishedAt",
DROP COLUMN "flaggedCount",
DROP COLUMN "startedAt",
DROP COLUMN "totalContacts",
DROP COLUMN "updatedAt",
ALTER COLUMN "status" DROP DEFAULT;

-- CreateTable
CREATE TABLE "MessageTemplate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessageTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MessageTemplate_organizationId_idx" ON "MessageTemplate"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "MessageTemplate_organizationId_name_channel_key" ON "MessageTemplate"("organizationId", "name", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "Contact_externalId_key" ON "Contact"("externalId");

-- CreateIndex
CREATE INDEX "Contact_organizationId_idx" ON "Contact"("organizationId");

-- CreateIndex
CREATE INDEX "Contact_organizationId_email_idx" ON "Contact"("organizationId", "email");

-- CreateIndex
CREATE INDEX "Contact_organizationId_phone_idx" ON "Contact"("organizationId", "phone");

-- CreateIndex
CREATE INDEX "Conversation_organizationId_contactId_idx" ON "Conversation"("organizationId", "contactId");

-- CreateIndex
CREATE INDEX "Conversation_organizationId_updatedAt_idx" ON "Conversation"("organizationId", "updatedAt");

-- CreateIndex
CREATE INDEX "GhlConnection_organizationId_idx" ON "GhlConnection"("organizationId");

-- CreateIndex
CREATE INDEX "RecoveryRun_organizationId_idx" ON "RecoveryRun"("organizationId");

-- CreateIndex
CREATE INDEX "RecoveryRun_createdAt_idx" ON "RecoveryRun"("createdAt");

-- AddForeignKey
ALTER TABLE "RecoveryFinding" ADD CONSTRAINT "RecoveryFinding_recoveryRunId_fkey" FOREIGN KEY ("recoveryRunId") REFERENCES "RecoveryRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageTemplate" ADD CONSTRAINT "MessageTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
