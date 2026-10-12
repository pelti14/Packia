import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

/** Cierra la sesión (aquí sí se pueden borrar cookies) y vuelve al login con el aviso. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();
  const error = url.searchParams.get("error");
  return NextResponse.redirect(new URL(error ? `/login?error=${encodeURIComponent(error)}` : "/login", url.origin));
}
