import type { NextConfig } from "next";
import pkg from "./package.json";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Versión visible en el menú, para comprobar qué hay subido.
  env: { NEXT_PUBLIC_APP_VERSION: pkg.version },
};

export default nextConfig;
