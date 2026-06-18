-- Sensor grouping tree (adjacency list) + a sensor's optional group.

-- AlterTable
ALTER TABLE "Sensor" ADD COLUMN "groupId" TEXT;

-- CreateTable
CREATE TABLE "SensorGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SensorGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Sensor_groupId_idx" ON "Sensor"("groupId");

-- CreateIndex
CREATE INDEX "SensorGroup_parentId_idx" ON "SensorGroup"("parentId");

-- AddForeignKey
ALTER TABLE "Sensor" ADD CONSTRAINT "Sensor_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "SensorGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SensorGroup" ADD CONSTRAINT "SensorGroup_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "SensorGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
