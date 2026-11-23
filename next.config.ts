import type { NextConfig } from "next";

// Portal transaccional con sesión por cookie: todas las vistas son dinámicas.
// No se activan cacheComponents ni partialPrefetching para evitar caché
// accidental de datos financieros entre usuarios.
const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // Carga de contratos en PDF desde acciones de servidor.
    serverActions: { bodySizeLimit: "12mb" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
