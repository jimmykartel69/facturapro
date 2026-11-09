-- Persist an exact TTC total target and the optional display of an unsigned early-start request.
ALTER TABLE "Devis"
  ADD COLUMN IF NOT EXISTS "targetTotalTtc" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "showEarlyExecutionRequest" BOOLEAN NOT NULL DEFAULT false;
