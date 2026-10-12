-- Packia · creación de tablas para Supabase (base de datos NUEVA).
-- Supabase → SQL Editor → New query → pega todo este archivo → Run.
-- Generado con `npm run setup:sql`. No lo edites a mano.

CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id" VARCHAR(36) PRIMARY KEY NOT NULL,
    "checksum" VARCHAR(64) NOT NULL,
    "finished_at" TIMESTAMPTZ,
    "migration_name" VARCHAR(255) NOT NULL,
    "logs" TEXT,
    "rolled_back_at" TIMESTAMPTZ,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "applied_steps_count" INTEGER NOT NULL DEFAULT 0
);

-- ════════ 20261012030730_init ════════
-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'STAFF',
    "clientId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactEmail" TEXT,
    "taxId" TEXT,
    "billingAddress" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'ARRANQUE',
    "planOrders" INTEGER NOT NULL DEFAULT 300,
    "monthlyFeeCents" INTEGER NOT NULL DEFAULT 48000,
    "extraOrderFeeCents" INTEGER NOT NULL DEFAULT 140,
    "returnFeeCents" INTEGER NOT NULL DEFAULT 150,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Store" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "accessToken" TEXT,
    "consumerKey" TEXT,
    "consumerSecret" TEXT,
    "webhookSecret" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncAt" TIMESTAMP(3),
    "lastSyncError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "storeId" TEXT,
    "externalId" TEXT,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "location" TEXT,
    "lowStockAt" INTEGER NOT NULL DEFAULT 10,
    "weightGrams" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "customerName" TEXT NOT NULL,
    "email" TEXT,
    "shippingAddress" TEXT NOT NULL,
    "carrier" TEXT,
    "trackingNumber" TEXT,
    "trackingUrl" TEXT,
    "labelProvider" TEXT,
    "labelRef" TEXT,
    "weightGrams" INTEGER,
    "syncError" TEXT,
    "placedAt" TIMESTAMP(3) NOT NULL,
    "shippedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "externalLineId" TEXT,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inbound" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "carrier" TEXT,
    "boxes" INTEGER,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'EXPECTED',
    "expectedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Inbound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InboundItem" (
    "id" TEXT NOT NULL,
    "inboundId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "expectedQty" INTEGER NOT NULL,
    "receivedQty" INTEGER,
    "damagedQty" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "InboundItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Return" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "orderId" TEXT,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ANNOUNCED',
    "receivedAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Return_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReturnItem" (
    "id" TEXT NOT NULL,
    "returnId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "condition" TEXT,

    CONSTRAINT "ReturnItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ISSUED',
    "subtotalCents" INTEGER NOT NULL,
    "taxRate" INTEGER NOT NULL DEFAULT 21,
    "taxCents" INTEGER NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceLine" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPriceCents" INTEGER NOT NULL,
    "amountCents" INTEGER NOT NULL,

    CONSTRAINT "InvoiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Profile_email_key" ON "Profile"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Store_platform_domain_key" ON "Store"("platform", "domain");

-- CreateIndex
CREATE UNIQUE INDEX "Product_clientId_sku_key" ON "Product"("clientId", "sku");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_clientId_shippedAt_idx" ON "Order"("clientId", "shippedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Order_storeId_externalId_key" ON "Order"("storeId", "externalId");

-- CreateIndex
CREATE INDEX "Inbound_status_idx" ON "Inbound"("status");

-- CreateIndex
CREATE INDEX "Return_status_idx" ON "Return"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_number_key" ON "Invoice"("number");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_clientId_periodStart_key" ON "Invoice"("clientId", "periodStart");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Store" ADD CONSTRAINT "Store_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inbound" ADD CONSTRAINT "Inbound_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboundItem" ADD CONSTRAINT "InboundItem_inboundId_fkey" FOREIGN KEY ("inboundId") REFERENCES "Inbound"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Return" ADD CONSTRAINT "Return_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Return" ADD CONSTRAINT "Return_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnItem" ADD CONSTRAINT "ReturnItem_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "Return"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Seguridad en Supabase ───────────────────────────────────
-- Supabase publica el esquema "public" en su API REST con la clave anónima.
-- Activamos RLS sin políticas: la API pública no puede leer ni escribir nada.
-- La app accede con Prisma (rol postgres), que no está sujeto a RLS.
ALTER TABLE "Profile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Client" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Store" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrderItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Inbound" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InboundItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Return" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ReturnItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invoice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InvoiceLine" ENABLE ROW LEVEL SECURITY;

INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, applied_steps_count)
VALUES ('b6b9e7f4-08d8-40fe-9331-78461e09a75b', '10d15a52a8e24001cceeb9c7539d6c5f52df5221dffbccf056d82955d32e23c4', now(), '20261012030730_init', 1);

-- ════════ 20261012031806_app_settings ════════
-- CreateTable
CREATE TABLE "AppSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "companyName" TEXT,
    "companyTaxId" TEXT,
    "companyAddress" TEXT,
    "companyEmail" TEXT,
    "companyIban" TEXT,
    "senderName" TEXT,
    "senderAddress" TEXT,
    "senderCity" TEXT,
    "senderZip" TEXT,
    "senderCountry" TEXT,
    "senderPhone" TEXT,
    "senderEmail" TEXT,
    "sendcloudPublicKey" TEXT,
    "sendcloudSecretKey" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);

-- Seguridad en Supabase: sin acceso por la API pública.
ALTER TABLE "AppSettings" ENABLE ROW LEVEL SECURITY;
-- (condicional: en la base "shadow" de prisma migrate dev esta tabla no existe)
DO $$ BEGIN IF to_regclass('public._prisma_migrations') IS NOT NULL THEN ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY; END IF; END $$;

INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, applied_steps_count)
VALUES ('704a5056-d1c3-4744-af92-dcf52361a279', '43fa63b1c3f2360a1429f876f167cb5f74fc9d20c5e86ffa1d87a1a95fdb5aeb', now(), '20261012031806_app_settings', 1);

-- ════════ 20261012120000_shopify_dev_dashboard ════════
-- AlterTable: Shopify Dev Dashboard (client credentials)
ALTER TABLE "Store" ADD COLUMN "shopifyClientId" TEXT,
ADD COLUMN "shopifyClientSecret" TEXT,
ADD COLUMN "tokenExpiresAt" TIMESTAMP(3);

INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, applied_steps_count)
VALUES ('9e02fcc0-94c8-4e7d-aa4a-b73d67abb75a', 'b7d797a87902cbcea16cc86b75ca38d851ba8463137949e9c1a78c80f99065d2', now(), '20261012120000_shopify_dev_dashboard', 1);

-- ════════ 20261012180000_v4_notifications_customers ════════
-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "defaultShipping" TEXT,
ADD COLUMN     "sendcloudPublicKey" TEXT,
ADD COLUMN     "sendcloudSecretKey" TEXT;

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "notificationsSeenAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "productsSyncedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "StoreCustomer" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address1" TEXT,
    "address2" TEXT,
    "city" TEXT,
    "zip" TEXT,
    "province" TEXT,
    "country" TEXT,
    "ordersCount" INTEGER NOT NULL DEFAULT 0,
    "firstOrderAt" TIMESTAMP(3) NOT NULL,
    "lastOrderAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "clientId" TEXT,
    "audience" TEXT NOT NULL DEFAULT 'STAFF',
    "tone" TEXT NOT NULL DEFAULT 'info',
    "title" TEXT NOT NULL,
    "body" TEXT,
    "href" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncLock" (
    "id" TEXT NOT NULL,
    "lockedUntil" TIMESTAMP(3) NOT NULL,
    "lastRunAt" TIMESTAMP(3),

    CONSTRAINT "SyncLock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StoreCustomer_clientId_idx" ON "StoreCustomer"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "StoreCustomer_storeId_key_key" ON "StoreCustomer"("storeId", "key");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- AddForeignKey
ALTER TABLE "StoreCustomer" ADD CONSTRAINT "StoreCustomer_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreCustomer" ADD CONSTRAINT "StoreCustomer_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Seguridad en Supabase: sin acceso por la API pública.
ALTER TABLE "StoreCustomer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SyncLock" ENABLE ROW LEVEL SECURITY;

INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, applied_steps_count)
VALUES ('3a94c7f4-85c2-4626-b879-14ef9d225b51', '1e652c6e81c1a088bd5a8008377f6f032066eec7fae43178778b05921f2aba05', now(), '20261012180000_v4_notifications_customers', 1);

-- ════════ 20261012200000_v5_trial_autoinvoice ════════
-- AlterTable
ALTER TABLE "AppSettings" ADD COLUMN     "autoInvoice" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "serviceStartAt" TIMESTAMP(3),
ADD COLUMN     "trialWeeks" INTEGER NOT NULL DEFAULT 0;

INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, applied_steps_count)
VALUES ('c56b2ecc-c190-4259-ac9b-2f213418d495', 'fe21962bea31e1033a6bc9057e01b9ad6e98ac62f13769be29548cb8e78f518d', now(), '20261012200000_v5_trial_autoinvoice', 1);

-- ════════ 20261013090000_v6_product_validation ════════
-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "barcode" TEXT,
ADD COLUMN     "validatedAt" TIMESTAMP(3),
ADD COLUMN     "validatedBy" TEXT;


-- Los productos que ya existían se dan por validados (ya se estaban preparando).
-- A partir de ahora, cada producto nuevo necesita el OK del equipo.
UPDATE "Product" SET "validatedAt" = now(), "validatedBy" = 'Migración' WHERE "validatedAt" IS NULL;

INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, applied_steps_count)
VALUES ('716e4ae6-5ea6-44e2-b377-2c6b764ad18f', '3c3981eab56c03c7c7c9c55031c0871401ed6cd441e4d0c066225c7e6285e0f6', now(), '20261013090000_v6_product_validation', 1);

-- ════════ 20261014090000_v7_plans ════════
-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "serviceEndAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PlanConfig" (
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "orders" INTEGER NOT NULL,
    "feeCents" INTEGER NOT NULL,
    "extraCents" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanConfig_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "PlanChange" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "effectiveAt" TIMESTAMP(3) NOT NULL,
    "fromPlan" TEXT NOT NULL,
    "fromOrders" INTEGER NOT NULL,
    "fromFeeCents" INTEGER NOT NULL,
    "fromExtraCents" INTEGER NOT NULL,
    "toPlan" TEXT NOT NULL,
    "toOrders" INTEGER NOT NULL,
    "toFeeCents" INTEGER NOT NULL,
    "toExtraCents" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanRequest" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "plan" TEXT,
    "orders" INTEGER,
    "feeCents" INTEGER,
    "extraCents" INTEGER,
    "effectiveAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,

    CONSTRAINT "PlanRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlanChange_clientId_effectiveAt_idx" ON "PlanChange"("clientId", "effectiveAt");

-- CreateIndex
CREATE INDEX "PlanRequest_status_effectiveAt_idx" ON "PlanRequest"("status", "effectiveAt");

-- AddForeignKey
ALTER TABLE "PlanChange" ADD CONSTRAINT "PlanChange_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanRequest" ADD CONSTRAINT "PlanRequest_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Planes por defecto (editables en Ajustes)
INSERT INTO "PlanConfig" ("key", "label", "orders", "feeCents", "extraCents", "sortOrder", "updatedAt") VALUES
  ('ARRANQUE', 'Arranque', 300, 48000, 140, 1, now()),
  ('CRECIMIENTO', 'Crecimiento', 600, 85000, 130, 2, now()),
  ('ESCALA', 'Escala', 1000, 120000, 120, 3, now())
ON CONFLICT ("key") DO NOTHING;

-- Supabase: sin acceso por la API pública (la app usa la conexión directa)
ALTER TABLE "PlanConfig" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PlanChange" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PlanRequest" ENABLE ROW LEVEL SECURITY;

INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, applied_steps_count)
VALUES ('fcc8b122-610e-4cda-80fa-c7193adea75b', '8510c44bd1b6e741991049e12b820e37fe0db0d65ee19342fe39f6a92566c344', now(), '20261014090000_v7_plans', 1);

-- ════════ 20261015090000_v8_brand ════════
-- AlterTable
ALTER TABLE "AppSettings" ADD COLUMN     "brandLogo" TEXT,
ADD COLUMN     "brandName" TEXT,
ADD COLUMN     "brandTagline" TEXT;

INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, applied_steps_count)
VALUES ('91814445-acd1-45f7-a210-89b1aeeb4d9e', 'f261fba3e2e72c838c8f2a842c69b2354f0175b9086288c77f7381511ddfade8', now(), '20261015090000_v8_brand', 1);
