-- Dismiss/acknowledge an anomaly: acknowledgedAt set = reviewed & cleared from
-- the active list (kept in history; nullable so it can be un-dismissed).
ALTER TABLE "Anomaly" ADD COLUMN "acknowledgedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Anomaly_acknowledgedAt_idx" ON "Anomaly"("acknowledgedAt");
