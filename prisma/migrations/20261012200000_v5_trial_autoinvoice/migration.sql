-- AlterTable
ALTER TABLE "AppSettings" ADD COLUMN     "autoInvoice" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "serviceStartAt" TIMESTAMP(3),
ADD COLUMN     "trialWeeks" INTEGER NOT NULL DEFAULT 0;

