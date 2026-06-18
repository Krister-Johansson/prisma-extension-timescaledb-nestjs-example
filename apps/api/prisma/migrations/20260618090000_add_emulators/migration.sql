-- CreateTable
CREATE TABLE "Emulator" (
    "id" TEXT NOT NULL,
    "sensorId" TEXT NOT NULL,
    "min" DOUBLE PRECISION NOT NULL,
    "max" DOUBLE PRECISION NOT NULL,
    "intervalSeconds" INTEGER NOT NULL,
    "running" BOOLEAN NOT NULL DEFAULT true,
    "lastValue" DOUBLE PRECISION,
    "lastTickAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Emulator_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Emulator_sensorId_idx" ON "Emulator"("sensorId");

-- AddForeignKey
ALTER TABLE "Emulator" ADD CONSTRAINT "Emulator_sensorId_fkey" FOREIGN KEY ("sensorId") REFERENCES "Sensor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
