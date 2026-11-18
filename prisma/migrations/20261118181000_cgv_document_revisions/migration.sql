-- Preserve historical CGV public tokens while allowing an explicit CGV
-- revision on an editable document.
ALTER TABLE "CgvSnapshot"
  ADD COLUMN "deliveryMode" TEXT NOT NULL DEFAULT 'qr',
  ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN "supersededAt" TIMESTAMP(3);

-- Older CGV snapshots were created exclusively for QR documents.
DROP INDEX "CgvSnapshot_documentType_documentId_key";
CREATE INDEX "CgvSnapshot_documentType_documentId_idx"
  ON "CgvSnapshot"("documentType", "documentId");

CREATE UNIQUE INDEX "CgvSnapshot_one_active_document_version"
  ON "CgvSnapshot"("documentType", "documentId")
  WHERE "active" = TRUE;
