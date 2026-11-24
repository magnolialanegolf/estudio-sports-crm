import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { cache } from "react";
import type { Rol } from "@prisma/client";

export const COOKIE_SESION = "es_sesion";
const DURACION_HORAS = 12;

export type Sesion = {
  usuarioId: string;
  usuario: string;
  nombre: string;
  rol: Rol;
  directorId: string | null;
  debeCambiarClave?: boolean;
};

function secreto() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error("SESSION_SECRET debe definirse con al menos 32 caracteres.");
  }
  return new TextEncoder().encode(s);
}

export async function firmarSesion(sesion: Sesion): Promise<string> {
  return new SignJWT(sesion)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${DURACION_HORAS}h`)
    .sign(secreto());
}

export async function leerSesion(token: string | undefined): Promise<Sesion | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secreto(), { algorithms: ["HS256"] });
    const p = payload as Partial<Sesion>;
    if (!p.usuarioId || !p.rol) return null;
    return {
      usuarioId: p.usuarioId,
      usuario: p.usuario ?? "",
      nombre: p.nombre ?? "",
      rol: p.rol,
      directorId: p.directorId ?? null,
      debeCambiarClave: p.debeCambiarClave === true,
    };
  } catch {
    return null;
  }
}

export const obtenerSesion = cache(async (): Promise<Sesion | null> => {
  const jar = await cookies();
  const s = await leerSesion(jar.get(COOKIE_SESION)?.value);
  if (!s) return null;
  // La cookie prueba quién es; la base dice si sigue pudiendo entrar y con qué rol.
  const { db } = await import("./db");
  const u = await db.usuario.findUnique({ where: { id: s.usuarioId }, select: { activo: true, rol: true, directorId: true, nombre: true, debeCambiarClave: true } });
  if (!u || !u.activo) return null;
  return { ...s, rol: u.rol, directorId: u.directorId, nombre: u.nombre, debeCambiarClave: u.debeCambiarClave };
});

export async function establecerCookieSesion(sesion: Sesion) {
  const jar = await cookies();
  jar.set(COOKIE_SESION, await firmarSesion(sesion), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DURACION_HORAS * 3600,
  });
}

export async function borrarCookieSesion() {
  const jar = await cookies();
  jar.delete(COOKIE_SESION);
}
