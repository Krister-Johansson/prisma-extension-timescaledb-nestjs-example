-- Per-sensor anomaly state: whether the sensor is currently in an anomalous
-- spell, so the detector flags only the entry (not every reading in the spell).
ALTER TABLE "Sensor" ADD COLUMN "inAnomaly" BOOLEAN NOT NULL DEFAULT false;
