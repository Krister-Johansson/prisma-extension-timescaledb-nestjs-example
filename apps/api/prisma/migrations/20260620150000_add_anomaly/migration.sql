-- Anomaly detection: per-reading anomalies flagged by rolling MAD (modified z-score).

-- CreateEnum
CREATE TYPE "AnomalySeverity" AS ENUM ('WARNING', 'CRITICAL');

-- CreateTable
CREATE TABLE "Anomaly" (
    "id" TEXT NOT NULL,
    "sensorId" TEXT NOT NULL,
    "time" TIMESTAMP(3) NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "median" DOUBLE PRECISION NOT NULL,
    "mad" DOUBLE PRECISION NOT NULL,
    "severity" "AnomalySeverity" NOT NULL DEFAULT 'WARNING',
    "aiSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Anomaly_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Anomaly_sensorId_time_idx" ON "Anomaly"("sensorId", "time");

-- CreateIndex
CREATE INDEX "Anomaly_createdAt_idx" ON "Anomaly"("createdAt");

-- AddForeignKey
ALTER TABLE "Anomaly" ADD CONSTRAINT "Anomaly_sensorId_fkey" FOREIGN KEY ("sensorId") REFERENCES "Sensor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
