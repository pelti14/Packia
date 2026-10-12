-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "barcode" TEXT,
ADD COLUMN     "validatedAt" TIMESTAMP(3),
ADD COLUMN     "validatedBy" TEXT;


-- Los productos que ya existían se dan por validados (ya se estaban preparando).
-- A partir de ahora, cada producto nuevo necesita el OK del equipo.
UPDATE "Product" SET "validatedAt" = now(), "validatedBy" = 'Migración' WHERE "validatedAt" IS NULL;
