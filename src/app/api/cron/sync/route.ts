import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { syncAllStores } from "@/lib/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Respaldo para un cron externo (Cron Jobs de Hostinger, cron-job.org…):
 *   GET /api/cron/sync?key=CRON_SECRET
 * Solo existe si CRON_SECRET está configurado.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const key = new URL(req.url).searchParams.get("key") ?? req.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!secret) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const a = Buffer.from(key);
  const b = Buffer.from(secret);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  return NextResponse.json(await syncAllStores());
}
