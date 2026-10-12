-- AlterTable
ALTER TABLE "AppSettings" ADD COLUMN     "printAutoDialog" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "printFormat" TEXT NOT NULL DEFAULT 'THERMAL_100x150',
ADD COLUMN     "printOffsetX" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "printOffsetY" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "printRotate180" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "printScale" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "printSort" TEXT NOT NULL DEFAULT 'CARRIER';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "labelPrintCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "labelPrintedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Order_labelPrintedAt_idx" ON "Order"("labelPrintedAt");


-- Las etiquetas de envíos anteriores se dan por impresas (no llenar la cola de golpe).
UPDATE "Order" SET "labelPrintedAt" = COALESCE("shippedAt", now()), "labelPrintCount" = 1
WHERE "labelProvider" IS NOT NULL AND "labelPrintedAt" IS NULL;
