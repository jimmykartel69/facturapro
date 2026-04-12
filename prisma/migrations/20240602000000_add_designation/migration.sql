-- AlterTable: Add designation column, make description optional on DevisItem
ALTER TABLE "DevisItem" ADD COLUMN "designation" TEXT NOT NULL DEFAULT '';
ALTER TABLE "DevisItem" ALTER COLUMN "description" DROP NOT NULL;

-- AlterTable: Add designation column, make description optional on InvoiceItem
ALTER TABLE "InvoiceItem" ADD COLUMN "designation" TEXT NOT NULL DEFAULT '';
ALTER TABLE "InvoiceItem" ALTER COLUMN "description" DROP NOT NULL;
