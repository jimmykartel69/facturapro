-- AlterTable
ALTER TABLE "User" ADD COLUMN     "customCgvB2b" TEXT,
ADD COLUMN     "customCgvB2c" TEXT,
ADD COLUMN     "depositEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "depositRate" DOUBLE PRECISION NOT NULL DEFAULT 30,
ADD COLUMN     "depositThreshold" DOUBLE PRECISION NOT NULL DEFAULT 1000,
ADD COLUMN     "insuranceActivities" TEXT,
ADD COLUMN     "insuranceCoverageArea" TEXT,
ADD COLUMN     "insuranceEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "insurancePolicyNumber" TEXT,
ADD COLUMN     "insurerName" TEXT,
ADD COLUMN     "invoicePaymentText" TEXT NOT NULL DEFAULT 'Paiement à réception de facture.',
ADD COLUMN     "mediatorAddress" TEXT,
ADD COLUMN     "mediatorName" TEXT,
ADD COLUMN     "mediatorWebsite" TEXT,
ADD COLUMN     "paymentMethod" TEXT NOT NULL DEFAULT 'Virement bancaire',
ADD COLUMN     "quotePaymentText" TEXT NOT NULL DEFAULT 'Paiement à réception de facture.',
ADD COLUMN     "showCgv" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "vatExemptionText" TEXT NOT NULL DEFAULT 'TVA non applicable, article L. 223-3 du Code des impositions sur les biens et services (CIBS).',
ADD COLUMN     "vatRegime" TEXT NOT NULL DEFAULT 'unspecified';

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "clientType" TEXT;
