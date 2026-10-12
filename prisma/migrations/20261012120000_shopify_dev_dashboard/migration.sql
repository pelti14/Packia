-- AlterTable: Shopify Dev Dashboard (client credentials)
ALTER TABLE "Store" ADD COLUMN "shopifyClientId" TEXT,
ADD COLUMN "shopifyClientSecret" TEXT,
ADD COLUMN "tokenExpiresAt" TIMESTAMP(3);
