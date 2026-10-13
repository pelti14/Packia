/**
 * Utilidades de seguridad sin dependencias de Node (sirven también en el middleware).
 * Cada una tiene su prueba en tests/security.test.ts.
 */

/**
 * Solo rutas internas para redirigir tras login, enlaces de email o acciones:
 * «/salida?x=1» sí; «//evil.com», «/\\evil.com», «https://evil.com» o «javascript:» no.
 */
export function safeRedirectPath(next: unknown, fallback = "/"): string {
  if (typeof next !== "string") return fallback;
  const p = next.trim();
  if (!p.startsWith("/") || p.startsWith("//") || p.includes("\\")) return fallback;
  // Caracteres de control (\t, \n…) que algunos navegadores ignoran al interpretar la URL.
  if (/[\u0000-\u001f\u007f]/.test(p)) return fallback;
  try {
    const u = new URL(p, "http://interno.invalid");
    if (u.origin !== "http://interno.invalid") return fallback;
    return u.pathname + u.search + u.hash;
  } catch {
    return fallback;
  }
}

/** Cabeceras de seguridad para todas las respuestas. */
export function securityHeaders(opts: { supabaseUrl?: string } = {}) {
  const supabase = opts.supabaseUrl ? ` ${new URL(opts.supabaseUrl).origin}` : "";
  // Política de contenido. Va en modo «Report-Only»: avisa en la consola sin bloquear nada,
  // para comprobar en producción que no rompe nada antes de aplicarla.
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src 'self'${supabase}`,
    "frame-src 'self'",
    "frame-ancestors 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
  return [
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
    // SAMEORIGIN (no DENY): la propia app muestra la etiqueta en un recuadro para imprimirla.
    { key: "X-Frame-Options", value: "SAMEORIGIN" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
    { key: "Content-Security-Policy-Report-Only", value: csp },
  ];
}

/** Opciones forzadas para las cookies de sesión. */
export function hardenCookie<T extends object>(options: T | undefined, production = process.env.NODE_ENV === "production") {
  return { ...(options ?? ({} as T)), httpOnly: true, secure: production, sameSite: "lax" as const, path: "/" };
}

/**
 * Límite de intentos en memoria (ventana deslizante). Suficiente con un único servidor
 * como Hostinger; con varios servidores habría que moverlo a la base de datos o a Redis.
 */
export class RateLimiter {
  private hits = new Map<string, number[]>();
  constructor(private readonly max: number, private readonly windowMs: number) {}

  /** Cuántos fallos lleva la clave y si está bloqueada, sin contar uno nuevo. */
  check(key: string, now = Date.now()) {
    const list = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
    this.hits.set(key, list);
    const blocked = list.length >= this.max;
    const retryAfterMs = blocked ? this.windowMs - (now - list[0]) : 0;
    return { blocked, count: list.length, retryAfterMs };
  }

  fail(key: string, now = Date.now()) {
    const list = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
    list.push(now);
    this.hits.set(key, list);
    if (this.hits.size > 10_000) this.prune(now);
  }

  reset(key: string) {
    this.hits.delete(key);
  }

  private prune(now: number) {
    for (const [k, v] of this.hits) if (!v.some((t) => now - t < this.windowMs)) this.hits.delete(k);
  }
}
