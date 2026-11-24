import { NextResponse, type NextRequest } from "next/server";
import { googleConfigurado, urlAutorizacion } from "@/lib/google";
import { COOKIE_GOOGLE, redirectUriGoogle } from "../util";

export const dynamic = "force-dynamic";

// Paso 1: manda a la pantalla de cuentas de Google. Guarda state y nonce en una cookie
// de diez minutos para validar la respuesta y recordar a dónde quería ir el usuario.
export async function GET(req: NextRequest) {
  if (!googleConfigurado()) return NextResponse.redirect(new URL("/ingresar?error=google-no-configurado", req.url));
  const destino = req.nextUrl.searchParams.get("destino") ?? "";
  const state = crypto.randomUUID();
  const nonce = crypto.randomUUID();
  const res = NextResponse.redirect(urlAutorizacion({ redirectUri: redirectUriGoogle(req), state, nonce }));
  res.cookies.set(COOKIE_GOOGLE, JSON.stringify({ state, nonce, destino }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/auth/google",
    maxAge: 600,
  });
  return res;
}
