import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { registrar } from "@/lib/bitacora";
import { canjearCodigo, dominiosPermitidos, googleConfigurado } from "@/lib/google";
import { establecerCookieSesion } from "@/lib/sesion";
import { COOKIE_GOOGLE, redirectUriGoogle } from "../../util";

export const dynamic = "force-dynamic";

function fallo(req: NextRequest, codigo: string) {
  const res = NextResponse.redirect(new URL(`/ingresar?error=${codigo}`, req.url));
  res.cookies.delete({ name: COOKIE_GOOGLE, path: "/api/auth/google" });
  return res;
}

// Paso 2: Google regresa con un código. Se valida state, se canjea por la identidad,
// se verifica la firma del token y se busca el correo entre los usuarios activos.
export async function GET(req: NextRequest) {
  if (!googleConfigurado()) return fallo(req, "google-no-configurado");
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const crudo = req.cookies.get(COOKIE_GOOGLE)?.value;
  if (!code || !state || !crudo) return fallo(req, "google-cancelado");

  let guardado: { state: string; nonce: string; destino: string };
  try {
    guardado = JSON.parse(crudo);
  } catch {
    return fallo(req, "google-cancelado");
  }
  if (guardado.state !== state) return fallo(req, "google-cancelado");

  let identidad;
  try {
    identidad = await canjearCodigo({ code, redirectUri: redirectUriGoogle(req), nonce: guardado.nonce });
  } catch (e) {
    await registrar({ usuarioId: null, accion: "ingresar", entidad: "sesion", detalle: { exito: false, google: true, motivo: (e as Error).message } });
    return fallo(req, "google-error");
  }

  const dominios = dominiosPermitidos();
  if (dominios.length && (!identidad.dominio || !dominios.includes(identidad.dominio))) {
    await registrar({ usuarioId: null, accion: "ingresar", entidad: "sesion", detalle: { exito: false, google: true, correo: identidad.correo, motivo: "dominio no permitido" } });
    return fallo(req, "google-dominio");
  }

  const u = await db.usuario.findFirst({ where: { correo: { equals: identidad.correo, mode: "insensitive" }, activo: true }, include: { director: true } });
  if (!u) {
    await registrar({ usuarioId: null, accion: "ingresar", entidad: "sesion", detalle: { exito: false, google: true, correo: identidad.correo, motivo: "correo sin usuario" } });
    return fallo(req, "google-sin-usuario");
  }
  if ((u.rol === "DIRECTOR" || u.rol === "ASISTENTE_COMERCIAL") && (!u.director || !u.director.activo)) return fallo(req, "sin-cartera");

  // Con Google no hay contraseña inicial que cambiar: la identidad la garantiza Workspace.
  await establecerCookieSesion({ usuarioId: u.id, usuario: u.usuario, nombre: u.nombre, rol: u.rol, directorId: u.directorId, debeCambiarClave: false });
  await db.usuario.update({ where: { id: u.id }, data: { ultimoAcceso: new Date() } });
  await registrar({ usuarioId: u.id, accion: "ingresar", entidad: "sesion", detalle: { exito: true, google: true } });

  const destino = guardado.destino && guardado.destino.startsWith("/") && !guardado.destino.startsWith("//") ? guardado.destino : "/";
  const res = NextResponse.redirect(new URL(destino, req.url));
  res.cookies.delete({ name: COOKIE_GOOGLE, path: "/api/auth/google" });
  return res;
}
