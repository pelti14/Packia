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
