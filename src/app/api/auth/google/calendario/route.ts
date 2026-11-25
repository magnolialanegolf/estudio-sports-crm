import { NextResponse, type NextRequest } from "next/server";
import { obtenerSesion } from "@/lib/sesion";
import { googleConfigurado } from "@/lib/google";
import { ALCANCE_CALENDARIO } from "@/lib/google-calendar";
import { COOKIE_GOOGLE, redirectUriGoogle } from "../../util";

export const dynamic = "force-dynamic";

// Conectar el calendario: pide a Google permiso de calendario con acceso sin conexión (refresh token).
export async function GET(req: NextRequest) {
  const s = await obtenerSesion();
  if (!s) return NextResponse.redirect(new URL("/ingresar", req.url));
  if (!googleConfigurado()) return NextResponse.redirect(new URL("/cuenta?calendario=no-configurado", req.url));
  const state = crypto.randomUUID();
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUriGoogle(req).replace("/api/auth/google/callback", "/api/auth/google/calendario/callback"),
    response_type: "code",
    scope: `openid email ${ALCANCE_CALENDARIO}`,
    state,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
  });
  const res = NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${p.toString()}`);
  res.cookies.set(COOKIE_GOOGLE, JSON.stringify({ state, nonce: "", destino: "/cuenta", calendario: true }), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/api/auth/google", maxAge: 600 });
  return res;
}
