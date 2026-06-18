-- Replace the SensorType enum with a user-manageable SensorType table; the unit
-- moves onto the type. Existing Sensor.type enum values become typeKey FKs.

-- 1. Enum column -> text (values like 'TEMPERATURE' are preserved as text).
ALTER TABLE "Sensor" ALTER COLUMN "type" TYPE TEXT USING "type"::text;

-- 2. Drop the now-unused enum type so its name is free for the table.
DROP TYPE "SensorType";

-- 3. The type table.
CREATE TABLE "SensorType" (
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SensorType_pkey" PRIMARY KEY ("key")
);

-- 4. Seed: the existing three + the AirGradient ONE set.
INSERT INTO "SensorType" ("key", "label", "unit") VALUES
    ('TEMPERATURE', 'Temperature', '°C'),
    ('PRESSURE', 'Pressure', 'hPa'),
    ('HUMIDITY', 'Humidity', '%'),
    ('CO2', 'CO₂', 'ppm'),
    ('PM1', 'PM1.0', 'µg/m³'),
    ('PM2_5', 'PM2.5', 'µg/m³'),
    ('PM10', 'PM10', 'µg/m³'),
    ('PARTICLE_COUNT', 'Particle count', '#/0.1L'),
    ('TVOC_INDEX', 'TVOC index', 'idx'),
    ('TVOC_RAW', 'TVOC raw', 'raw'),
    ('NOX_INDEX', 'NOx index', 'idx'),
    ('NOX_RAW', 'NOx raw', 'raw');

-- 5. Sensor: rename type -> typeKey, drop unit (now on the type), index + FK.
ALTER TABLE "Sensor" RENAME COLUMN "type" TO "typeKey";
ALTER TABLE "Sensor" DROP COLUMN "unit";
CREATE INDEX "Sensor_typeKey_idx" ON "Sensor"("typeKey");
ALTER TABLE "Sensor" ADD CONSTRAINT "Sensor_typeKey_fkey"
    FOREIGN KEY ("typeKey") REFERENCES "SensorType"("key")
    ON DELETE RESTRICT ON UPDATE CASCADE;
