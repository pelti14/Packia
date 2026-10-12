"use client";

import { createContext, useContext } from "react";
import { DEFAULT_BRAND, type Brand } from "@/lib/brand-types";

const BrandContext = createContext<Brand>(DEFAULT_BRAND);

export function BrandProvider({ brand, children }: { brand: Brand; children: React.ReactNode }) {
  return <BrandContext.Provider value={brand}>{children}</BrandContext.Provider>;
}

export const useBrand = () => useContext(BrandContext);

/** Nombre comercial (Ajustes → Marca), para usar dentro de cualquier texto. */
export function BrandName() {
  return <>{useBrand().name}</>;
}
