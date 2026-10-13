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
VALUES ('b09ad4f2-fe76-43a6-ba9d-7b3fa932f35b', '10d15a52a8e24001cceeb9c7539d6c5f52df5221dffbccf056d82955d32e23c4', now(), '20261012030730_init', 1);

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
VALUES ('8de55dd7-0b77-4483-a3a5-6d945730a02a', '43fa63b1c3f2360a1429f876f167cb5f74fc9d20c5e86ffa1d87a1a95fdb5aeb', now(), '20261012031806_app_settings', 1);

-- ════════ 20261012120000_shopify_dev_dashboard ════════
-- AlterTable: Shopify Dev Dashboard (client credentials)
ALTER TABLE "Store" ADD COLUMN "shopifyClientId" TEXT,
ADD COLUMN "shopifyClientSecret" TEXT,
ADD COLUMN "tokenExpiresAt" TIMESTAMP(3);

INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, applied_steps_count)
VALUES ('1a45e18e-c7e6-4f0d-93fd-7b81cd90abe2', 'b7d797a87902cbcea16cc86b75ca38d851ba8463137949e9c1a78c80f99065d2', now(), '20261012120000_shopify_dev_dashboard', 1);

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
VALUES ('f593401f-069a-4d96-af9f-68bd81a28e5b', '1e652c6e81c1a088bd5a8008377f6f032066eec7fae43178778b05921f2aba05', now(), '20261012180000_v4_notifications_customers', 1);

-- ════════ 20261012200000_v5_trial_autoinvoice ════════
-- AlterTable
ALTER TABLE "AppSettings" ADD COLUMN     "autoInvoice" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "serviceStartAt" TIMESTAMP(3),
ADD COLUMN     "trialWeeks" INTEGER NOT NULL DEFAULT 0;

INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, applied_steps_count)
VALUES ('5b3fd7a6-9284-4192-bc48-96584257ae8a', 'fe21962bea31e1033a6bc9057e01b9ad6e98ac62f13769be29548cb8e78f518d', now(), '20261012200000_v5_trial_autoinvoice', 1);

-- ════════ 20261013090000_v6_product_validation ════════
-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "barcode" TEXT,
ADD COLUMN     "validatedAt" TIMESTAMP(3),
ADD COLUMN     "validatedBy" TEXT;


-- Los productos que ya existían se dan por validados (ya se estaban preparando).
-- A partir de ahora, cada producto nuevo necesita el OK del equipo.
UPDATE "Product" SET "validatedAt" = now(), "validatedBy" = 'Migración' WHERE "validatedAt" IS NULL;

INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, applied_steps_count)
VALUES ('a83ef68d-88c6-47a8-ac5a-3aad76d593db', '3c3981eab56c03c7c7c9c55031c0871401ed6cd441e4d0c066225c7e6285e0f6', now(), '20261013090000_v6_product_validation', 1);

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
VALUES ('e8cbfa41-a694-45ce-ba22-ab9cc9293ab4', '8510c44bd1b6e741991049e12b820e37fe0db0d65ee19342fe39f6a92566c344', now(), '20261014090000_v7_plans', 1);

-- ════════ 20261015090000_v8_brand ════════
-- AlterTable
ALTER TABLE "AppSettings" ADD COLUMN     "brandLogo" TEXT,
ADD COLUMN     "brandName" TEXT,
ADD COLUMN     "brandTagline" TEXT;

INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, applied_steps_count)
VALUES ('8eea341a-1b19-45be-a432-76113cb827a1', 'f261fba3e2e72c838c8f2a842c69b2354f0175b9086288c77f7381511ddfade8', now(), '20261015090000_v8_brand', 1);

-- ════════ 20261016090000_v9_print_queue ════════
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

INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, applied_steps_count)
VALUES ('0348779a-aa19-49e8-80f9-bf217e583e62', '7276af2221b865e0ef401ab4865ba40198a09b30625ef562185bea4b8c15a5e9', now(), '20261016090000_v9_print_queue', 1);

-- ════════ 20261017090000_v10_contact ════════
-- AlterTable
ALTER TABLE "AppSettings" ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "contactPhone" TEXT,
ADD COLUMN     "contactWhatsapp" TEXT;

INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, applied_steps_count)
VALUES ('0899b64c-bb6b-41b1-ad13-d484a293bc49', 'f17c20f71ba6fddf0d2ecf65acb828f566195f0cc623f147ab420d1362e35d21', now(), '20261017090000_v10_contact', 1);

-- ════════ 20261018090000_v11_invoice_corrections ════════
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

INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, applied_steps_count)
VALUES ('5b144ff6-4006-4c46-b587-86cd6d1df408', 'fd0d485bf12c95fe374774dc607364c1c1f2e591de081f0bdd9a1761e8872c22', now(), '20261018090000_v11_invoice_corrections', 1);

-- ════════ 20261019090000_v12_print_on_pack ════════
-- AlterTable
ALTER TABLE "AppSettings" ADD COLUMN     "printOnPack" BOOLEAN NOT NULL DEFAULT true;

INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, applied_steps_count)
VALUES ('c751a2c6-91a8-48eb-aaa4-366bdeeb88fc', '4c5436cf80da64646d2bcbd0d0575aaab6713265363187de20a1b0449e0a021a', now(), '20261019090000_v12_print_on_pack', 1);

-- ════════ 20261020090000_v14_carriers_onboarding_tracking ════════
-- AlterTable
ALTER TABLE "AppSettings" ADD COLUMN     "defaultTrialWeeks" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "openSignup" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "shippingMarkupCents" INTEGER NOT NULL DEFAULT 40;

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "buyerEvents" TEXT NOT NULL DEFAULT 'RECEIVED,PACKED,SHIPPED,DELIVERED',
ADD COLUMN     "notifyBuyer" TEXT NOT NULL DEFAULT 'STORE',
ADD COLUMN     "publicColor" TEXT,
ADD COLUMN     "publicLogo" TEXT,
ADD COLUMN     "publicMessage" TEXT,
ADD COLUMN     "publicName" TEXT,
ADD COLUMN     "publicReplyTo" TEXT,
ADD COLUMN     "shippingMarkupCents" INTEGER,
ADD COLUMN     "shippingStrategy" TEXT NOT NULL DEFAULT 'DEFAULT',
ADD COLUMN     "trackingEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "carrierServiceId" TEXT,
ADD COLUMN     "carrierStatus" TEXT,
ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "shippingChargeCents" INTEGER,
ADD COLUMN     "shippingCostCents" INTEGER,
ADD COLUMN     "trackingToken" TEXT;

-- CreateTable
CREATE TABLE "CarrierService" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "carrier" TEXT NOT NULL,
    "labelMethod" TEXT NOT NULL,
    "transitDays" INTEGER NOT NULL DEFAULT 1,
    "maxWeightGrams" INTEGER NOT NULL DEFAULT 30000,
    "rates" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarrierService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invite" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "email" TEXT,
    "companyName" TEXT,
    "plan" TEXT,
    "trialWeeks" INTEGER,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "clientId" TEXT,

    CONSTRAINT "Invite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthState" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "OAuthState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageLog" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'EMAIL',
    "to" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Invite_token_key" ON "Invite"("token");

-- CreateIndex
CREATE UNIQUE INDEX "MessageLog_orderId_event_channel_key" ON "MessageLog"("orderId", "event", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "Order_trackingToken_key" ON "Order"("trackingToken");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_carrierServiceId_fkey" FOREIGN KEY ("carrierServiceId") REFERENCES "CarrierService"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageLog" ADD CONSTRAINT "MessageLog_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Supabase: sin acceso por la API pública (la app usa la conexión directa)
ALTER TABLE "CarrierService" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invite" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OAuthState" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MessageLog" ENABLE ROW LEVEL SECURITY;

INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, applied_steps_count)
VALUES ('8ae4a52e-163d-436b-99f2-877ea345d270', 'ba678c403a009ecf9ee73e94483e075a2f1fbd3f83ed469ec6f48cc17750765f', now(), '20261020090000_v14_carriers_onboarding_tracking', 1);
