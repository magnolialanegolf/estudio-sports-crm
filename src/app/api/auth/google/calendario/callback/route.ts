import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { registrar } from "@/lib/bitacora";
import { obtenerSesion } from "@/lib/sesion";
import { googleConfigurado } from "@/lib/google";
import { sincronizarCalendarioDe } from "@/lib/google-calendar";
import { COOKIE_GOOGLE, redirectUriGoogle } from "../../../util";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function volver(req: NextRequest, codigo: string) {
  const res = NextResponse.redirect(new URL(`/cuenta?calendario=${codigo}`, req.url));
  res.cookies.delete({ name: COOKIE_GOOGLE, path: "/api/auth/google" });
  return res;
}

// Google regresa con el código: se guarda el refresh token del usuario y se sincroniza por primera vez.
export async function GET(req: NextRequest) {
  const s = await obtenerSesion();
  if (!s) return NextResponse.redirect(new URL("/ingresar", req.url));
  if (!googleConfigurado()) return volver(req, "no-configurado");
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const crudo = req.cookies.get(COOKIE_GOOGLE)?.value;
  if (!code || !state || !crudo) return volver(req, "cancelado");
  let guardado: { state: string; calendario?: boolean };
  try {
    guardado = JSON.parse(crudo);
  } catch {
    return volver(req, "cancelado");
  }
  if (guardado.state !== state || !guardado.calendario) return volver(req, "cancelado");

  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, redirect_uri: redirectUriGoogle(req).replace("/api/auth/google/callback", "/api/auth/google/calendario/callback"), grant_type: "authorization_code" }),
    cache: "no-store",
  });
  if (!r.ok) return volver(req, "error");
  const datos = (await r.json()) as { refresh_token?: string; scope?: string; id_token?: string };
  if (!datos.refresh_token) return volver(req, "sin-permiso");
  if (!datos.scope?.includes("calendar")) return volver(req, "sin-permiso");

  // Correo de la cuenta conectada, del id_token (sin verificar firma: solo es informativo).
  let correoGoogle: string | null = null;
  try {
    const payload = JSON.parse(Buffer.from(datos.id_token!.split(".")[1], "base64url").toString("utf8")) as { email?: string };
    correoGoogle = payload.email ?? null;
  } catch {
    correoGoogle = null;
  }
  await db.usuario.update({ where: { id: s.usuarioId }, data: { googleRefreshToken: datos.refresh_token, googleCorreo: correoGoogle, sincronizarCalendario: true, calendarioError: null } });
  await registrar({ usuarioId: s.usuarioId, accion: "editar", entidad: "usuario", entidadId: s.usuarioId, detalle: { calendario: "google conectado", cuenta: correoGoogle } });
  try {
    await sincronizarCalendarioDe(s.usuarioId);
  } catch (e) {
    await db.usuario.update({ where: { id: s.usuarioId }, data: { calendarioError: (e as Error).message.slice(0, 300) } });
  }
  return volver(req, "conectado");
}
