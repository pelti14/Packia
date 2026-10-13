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
