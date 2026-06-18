-- A sensor can now have many alert rules: drop the unique on sensorId and
-- index it instead. (The SensorReading_time_idx drift Prisma also detects is a
-- TimescaleDB-managed index from create_hypertable — intentionally left alone.)

-- DropIndex
DROP INDEX "AlertRule_sensorId_key";

-- AlterTable
ALTER TABLE "AlertRule" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "AlertRule_sensorId_idx" ON "AlertRule"("sensorId");
