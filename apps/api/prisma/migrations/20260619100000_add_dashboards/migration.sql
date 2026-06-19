-- CreateTable
CREATE TABLE "Dashboard" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Dashboard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Dashboard_slug_key" ON "Dashboard"("slug");

-- CreateTable
CREATE TABLE "Widget" (
    "id" TEXT NOT NULL,
    "dashboardId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "x" INTEGER NOT NULL DEFAULT 0,
    "y" INTEGER NOT NULL DEFAULT 0,
    "w" INTEGER NOT NULL DEFAULT 4,
    "h" INTEGER NOT NULL DEFAULT 3,
    "config" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Widget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Widget_dashboardId_idx" ON "Widget"("dashboardId");

-- AddForeignKey
ALTER TABLE "Widget" ADD CONSTRAINT "Widget_dashboardId_fkey" FOREIGN KEY ("dashboardId") REFERENCES "Dashboard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
