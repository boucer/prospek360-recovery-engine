-- CreateTable
CREATE TABLE "RecoveryFinding" (
    "id" TEXT NOT NULL,
    "auditRunId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "severity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecoveryFinding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecoveryFinding_auditRunId_idx" ON "RecoveryFinding"("auditRunId");

-- AddForeignKey
ALTER TABLE "RecoveryFinding" ADD CONSTRAINT "RecoveryFinding_auditRunId_fkey" FOREIGN KEY ("auditRunId") REFERENCES "AuditRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
