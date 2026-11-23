import type { NextConfig } from "next";

// Portal transaccional con sesión por cookie: todas las vistas son dinámicas.
// No se activan cacheComponents ni partialPrefetching para evitar caché
// accidental de datos financieros entre usuarios.
const nextConfig: NextConfig = {
  reactStrictMode: true,
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
