import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { getBrand } from "@/lib/brand";
import { BrandProvider } from "@/components/brand";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-grotesk" });
export const dynamic = "force-dynamic";

const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" });

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getBrand();
  return {
    title: { default: `${brand.name} · Logística para ecommerce`, template: `%s · ${brand.name}` },
    description: "Recepción, almacenaje, preparación y envío de pedidos para tiendas Shopify y WooCommerce.",
    ...(brand.logo ? { icons: { icon: brand.logo } } : {}),
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const brand = await getBrand();
  return (
    <html lang="es" className={`${inter.variable} ${grotesk.variable} ${mono.variable}`}>
      <body>
        <BrandProvider brand={brand}>{children}</BrandProvider>
      </body>
    </html>
  );
}
