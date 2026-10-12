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
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
