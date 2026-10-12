-- DropIndex
DROP INDEX "Invoice_clientId_periodStart_key";

-- AlterTable
ALTER TABLE "AppSettings" ADD COLUMN     "invoicePrefix" TEXT NOT NULL DEFAULT 'KG';

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "correctsId" TEXT,
ADD COLUMN     "kind" TEXT NOT NULL DEFAULT 'INVOICE',
ADD COLUMN     "reason" TEXT,
ADD COLUMN     "replacesId" TEXT;

-- CreateIndex
CREATE INDEX "Invoice_clientId_periodStart_idx" ON "Invoice"("clientId", "periodStart");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_correctsId_fkey" FOREIGN KEY ("correctsId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_replacesId_fkey" FOREIGN KEY ("replacesId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

