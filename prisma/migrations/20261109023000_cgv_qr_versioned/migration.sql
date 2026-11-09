-- Versioned and access-controlled CGV publication; no customer data is exposed.
ALTER TABLE "User" ADD COLUMN "cgvDeliveryMode" TEXT NOT NULL DEFAULT 'annex';
CREATE TABLE "CgvSnapshot" (
  "id" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "documentType" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "clientType" TEXT NOT NULL,
  "companyName" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "version" VARCHAR(64) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CgvSnapshot_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CgvSnapshot_token_key" ON "CgvSnapshot"("token");
CREATE UNIQUE INDEX "CgvSnapshot_documentType_documentId_key" ON "CgvSnapshot"("documentType", "documentId");
CREATE INDEX "CgvSnapshot_userId_idx" ON "CgvSnapshot"("userId");
ALTER TABLE "CgvSnapshot" ADD CONSTRAINT "CgvSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
