-- Additive migration only: preserve the original current-document uniqueness
-- and every existing QR token and CGV record.
ALTER TABLE "CgvSnapshot"
  ADD COLUMN "deliveryMode" TEXT NOT NULL DEFAULT 'qr';

CREATE TABLE "CgvSnapshotHistory" (
  "id" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "documentType" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "clientType" TEXT NOT NULL,
  "companyName" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "version" VARCHAR(64) NOT NULL,
  "deliveryMode" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL,
  "supersededAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CgvSnapshotHistory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CgvSnapshotHistory_token_key" ON "CgvSnapshotHistory"("token");
CREATE INDEX "CgvSnapshotHistory_documentType_documentId_idx"
  ON "CgvSnapshotHistory"("documentType", "documentId");
CREATE INDEX "CgvSnapshotHistory_userId_idx" ON "CgvSnapshotHistory"("userId");

ALTER TABLE "CgvSnapshotHistory"
  ADD CONSTRAINT "CgvSnapshotHistory_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
