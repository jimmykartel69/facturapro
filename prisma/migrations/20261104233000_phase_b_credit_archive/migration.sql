-- AlterTable
ALTER TABLE "User" ADD COLUMN     "nextCreditNoteNumber" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "InvoiceArchive" (
    "invoiceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pdfBytes" BYTEA NOT NULL,
    "sha256" VARCHAR(64) NOT NULL,
    "snapshot" JSONB NOT NULL,
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceArchive_pkey" PRIMARY KEY ("invoiceId")
);

-- CreateTable
CREATE TABLE "CreditNote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT NOT NULL,
    "amountHtCents" INTEGER NOT NULL,
    "amountVatCents" INTEGER NOT NULL,
    "amountTtcCents" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "pdfBytes" BYTEA NOT NULL,
    "sha256" VARCHAR(64) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvoiceArchive_userId_idx" ON "InvoiceArchive"("userId");

-- CreateIndex
CREATE INDEX "CreditNote_userId_idx" ON "CreditNote"("userId");

-- CreateIndex
CREATE INDEX "CreditNote_invoiceId_idx" ON "CreditNote"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "CreditNote_userId_number_key" ON "CreditNote"("userId", "number");

-- AddForeignKey
ALTER TABLE "InvoiceArchive" ADD CONSTRAINT "InvoiceArchive_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceArchive" ADD CONSTRAINT "InvoiceArchive_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
