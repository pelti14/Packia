import { NextResponse, type NextRequest } from "next/server";
import { hardenCookie } from "@/lib/security";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

/** Rutas accesibles sin sesión. */
const PUBLIC = ["/login", "/auth", "/setup", "/api/webhooks", "/api/cron", "/api/public", "/alta", "/seguimiento", "/api/shopify/callback", "/api/woocommerce/callback"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Instalación nueva sin Supabase configurado: todo va al asistente.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const path = request.nextUrl.pathname;
    if (path.startsWith("/setup") || path.startsWith("/api/webhooks") || path.startsWith("/api/cron") || path.startsWith("/api/public")) return response;
    const url = request.nextUrl.clone();
    url.pathname = "/setup";
    url.search = "";
    return NextResponse.redirect(url);
  }

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list: { name: string; value: string; options: CookieOptions }[]) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, hardenCookie(options));
      },
    },
  });

  // getUser() valida el token contra Supabase y refresca la sesión si ha caducado.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC.some((p) => path === p || path.startsWith(`${p}/`));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = path === "/" ? "" : `?next=${encodeURIComponent(path + request.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }
  // Con ?error= (p. ej. cuenta sin perfil en Packia) se deja ver el login para no entrar en bucle.
  if (user && path === "/login" && !request.nextUrl.searchParams.has("error")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:png|jpg|svg|webp)$).*)"],
};
