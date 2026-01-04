-- 1) Ajouter updatedAt avec un DEFAULT temporaire (sinon erreur sur rows existantes)
ALTER TABLE "RecoveryFinding"
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- 2) Backfill explicite (sécuritaire)
UPDATE "RecoveryFinding"
SET "updatedAt" = COALESCE("handledAt", "createdAt", CURRENT_TIMESTAMP)
WHERE "updatedAt" IS NULL;

-- 3) Nettoyage (optionnel mais clean)
ALTER TABLE "RecoveryFinding"
ALTER COLUMN "updatedAt" DROP DEFAULT;
