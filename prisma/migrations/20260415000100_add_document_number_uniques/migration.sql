-- Ensure invoice/devis numbers are unique per user for legal and concurrency safety
ALTER TABLE "Devis"
ADD CONSTRAINT "Devis_userId_number_key" UNIQUE ("userId", "number");

ALTER TABLE "Invoice"
ADD CONSTRAINT "Invoice_userId_number_key" UNIQUE ("userId", "number");