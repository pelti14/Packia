import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getBadges, listNotifications, markNotificationsSeen } from "@/lib/notifications";

export const dynamic = "force-dynamic";

/** Avisos + numeritos del menú. La interfaz lo consulta cada 20 s. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const [list, badges] = await Promise.all([listNotifications(user), getBadges(user)]);
  return NextResponse.json({ ...list, badges });
}

/** Marca todo como leído. */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await markNotificationsSeen(user);
  return NextResponse.json({ ok: true });
}
