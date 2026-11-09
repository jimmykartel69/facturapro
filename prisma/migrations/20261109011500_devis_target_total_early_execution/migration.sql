-- Persist an exact TTC total target and the optional display of an unsigned early-start request.
ALTER TABLE "Devis"
  ADD COLUMN "targetTotalTtc" DOUBLE PRECISION,
  ADD COLUMN "showEarlyExecutionRequest" BOOLEAN NOT NULL DEFAULT false;
