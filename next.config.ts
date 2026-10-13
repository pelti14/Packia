import type { NextConfig } from "next";
import pkg from "./package.json";
import { securityHeaders } from "./src/lib/security";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // No anunciar «X-Powered-By: Next.js».
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders({ supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL }) }];
  },
  // Versión visible en el menú, para comprobar qué hay subido.
  env: { NEXT_PUBLIC_APP_VERSION: pkg.version },
};

export default nextConfig;
