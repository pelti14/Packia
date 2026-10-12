import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { customerWhere } from "@/lib/customers-query";

export const dynamic = "force-dynamic";

/** CSV para Excel (separador ";" y BOM UTF-8 para que salgan bien las tildes). */
const cell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : v instanceof Date ? v.toISOString().slice(0, 10) : String(v);
  // Evita que Excel interprete fórmulas (=, +, -, @) metidas en los datos.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[";\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (user.role === "CLIENT") return NextResponse.json({ error: "No disponible" }, { status: 403 });
  const sp = new URL(req.url).searchParams;
  const where = customerWhere(user, { client: sp.get("client") ?? undefined, store: sp.get("store") ?? undefined, q: sp.get("q") ?? undefined });
  const rows = await db.storeCustomer.findMany({ where, include: { store: true, client: true }, orderBy: { lastOrderAt: "desc" } });

  const header = ["Nombre", "Email", "Teléfono", "Dirección", "Dirección 2", "C. P.", "Ciudad", "Provincia", "País", "Tienda", "Cliente Packia", "Pedidos", "Primer pedido", "Último pedido"];
  const lines = rows.map((r) =>
    [r.name, r.email, r.phone, r.address1, r.address2, r.zip, r.city, r.province, r.country, r.store.name, r.client.name, r.ordersCount, r.firstOrderAt, r.lastOrderAt].map(cell).join(";"),
  );
  const csv = "﻿" + [header.join(";"), ...lines].join("\r\n");
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="clientes-tienda-${date}.csv"` },
  });
}
