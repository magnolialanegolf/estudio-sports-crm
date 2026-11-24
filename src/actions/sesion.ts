"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { registrar } from "@/lib/bitacora";
import { borrarCookieSesion, establecerCookieSesion, obtenerSesion } from "@/lib/sesion";

const esquemaIngreso = z.object({
  usuario: z.string().trim().min(1).max(64),
  clave: z.string().min(1).max(256),
  destino: z.string().optional(),
});

export type EstadoIngreso = { error?: string } | undefined;

export async function ingresar(_prev: EstadoIngreso, formData: FormData): Promise<EstadoIngreso> {
  const datos = esquemaIngreso.safeParse({
    usuario: formData.get("usuario"),
    clave: formData.get("clave"),
    destino: formData.get("destino") ?? undefined,
  });
  if (!datos.success) return { error: "Captura usuario y contraseña." };

  const u = await db.usuario.findUnique({
    where: { usuario: datos.data.usuario.toLowerCase() },
    include: { director: true },
  });
  // Mismo mensaje exista o no el usuario, para no revelar cuentas.
  const valido = u && u.activo && (await bcrypt.compare(datos.data.clave, u.passwordHash));
  if (!valido) {
    await registrar({ usuarioId: u?.id ?? null, accion: "ingresar", entidad: "sesion", detalle: { exito: false, usuario: datos.data.usuario } });
    return { error: "Usuario o contraseña incorrectos." };
  }
  if (u.rol === "DIRECTOR" && (!u.director || !u.director.activo)) {
    return { error: "La cuenta no tiene una dirección comercial activa asignada." };
  }

  await establecerCookieSesion({
    usuarioId: u.id,
    usuario: u.usuario,
    nombre: u.nombre,
    rol: u.rol,
    directorId: u.directorId,
    debeCambiarClave: u.debeCambiarClave,
  });
  await db.usuario.update({ where: { id: u.id }, data: { ultimoAcceso: new Date() } });
  await registrar({ usuarioId: u.id, accion: "ingresar", entidad: "sesion", detalle: { exito: true } });

  if (u.debeCambiarClave) redirect("/cuenta?cambiar=1");
  const destino = datos.data.destino && datos.data.destino.startsWith("/") && !datos.data.destino.startsWith("//") ? datos.data.destino : "/";
  redirect(destino);
}

export async function salir() {
  const s = await obtenerSesion();
  if (s) await registrar({ usuarioId: s.usuarioId, accion: "salir", entidad: "sesion" });
  await borrarCookieSesion();
  redirect("/ingresar");
}

const esquemaClave = z
  .object({
    actual: z.string().min(1),
    nueva: z.string().min(12, "La nueva contraseña debe tener al menos 12 caracteres."),
    confirmacion: z.string(),
  })
  .refine((d) => d.nueva === d.confirmacion, { message: "La confirmación no coincide.", path: ["confirmacion"] });

export type EstadoClave = { error?: string; ok?: boolean } | undefined;

export async function cambiarContrasena(_prev: EstadoClave, formData: FormData): Promise<EstadoClave> {
  const s = await obtenerSesion();
  if (!s) redirect("/ingresar");
  const datos = esquemaClave.safeParse({
    actual: formData.get("actual"),
    nueva: formData.get("nueva"),
    confirmacion: formData.get("confirmacion"),
  });
  if (!datos.success) return { error: datos.error.issues[0]?.message ?? "Datos inválidos." };
  const u = await db.usuario.findUnique({ where: { id: s.usuarioId } });
  if (!u || !(await bcrypt.compare(datos.data.actual, u.passwordHash))) return { error: "La contraseña actual no es correcta." };
  if (datos.data.nueva === datos.data.actual) return { error: "La nueva contraseña debe ser distinta de la actual." };
  await db.usuario.update({ where: { id: u.id }, data: { passwordHash: await bcrypt.hash(datos.data.nueva, 12), debeCambiarClave: false } });
  await registrar({ usuarioId: u.id, accion: "contraseña", entidad: "usuario", entidadId: u.id });
  await establecerCookieSesion({ ...s, debeCambiarClave: false });
  return { ok: true };
}
