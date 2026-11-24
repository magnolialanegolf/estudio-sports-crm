import type { NextRequest } from "next/server";

export const COOKIE_GOOGLE = "es_google";

// La URI de retorno debe coincidir exactamente con la registrada en Google Cloud.
// Detrás de Vercel el host real llega en x-forwarded-host.
export function redirectUriGoogle(req: NextRequest) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? req.nextUrl.host;
  const proto = req.headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}/api/auth/google/callback`;
}
