"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { registrar } from "@/lib/bitacora";
import { requerirSesion } from "@/lib/acceso";
import { correoConfigurado, enviarCorreo } from "@/lib/correo";
import { calendarioPushConfigurado, sincronizarCalendarioDe } from "@/lib/google-calendar";
import type { Resultado } from "./util";

// Preferencia personal: recibir o no los avisos también por correo.
export async function cambiarAvisosPorCorreo(fd: FormData) {
  const s = await requerirSesion();
  const activar = fd.get("avisosPorCorreo") === "on";
  await db.usuario.update({ where: { id: s.usuarioId }, data: { avisosPorCorreo: activar } });
  await registrar({ usuarioId: s.usuarioId, accion: "editar", entidad: "usuario", entidadId: s.usuarioId, detalle: { avisosPorCorreo: activar } });
  revalidatePath("/cuenta");
}

export async function enviarCorreoPrueba(): Promise<Resultado> {
  const s = await requerirSesion();
  if (!correoConfigurado()) return { error: "El envío de correo no está configurado en este entorno." };
  const u = await db.usuario.findUnique({ where: { id: s.usuarioId }, select: { correo: true } });
  if (!u?.correo) return { error: "Tu cuenta no tiene correo registrado. Pide al administrador que lo capture." };
  const ok = await enviarCorreo({ para: u.correo, nombre: s.nombre, asunto: "Prueba de avisos · Estudio Sports", texto: "Este es un correo de prueba del CRM comercial. Si lo recibes, los avisos por correo te llegarán aquí.", href: "/avisos" });
  return ok ? { ok: true } : { error: "El servicio de correo rechazó el envío. Revisa remitente y dominio verificado." };
}

export async function cambiarSincronizacionCalendario(fd: FormData) {
  const s = await requerirSesion();
  const activar = fd.get("sincronizarCalendario") === "on";
  await db.usuario.update({ where: { id: s.usuarioId }, data: { sincronizarCalendario: activar } });
  await registrar({ usuarioId: s.usuarioId, accion: "editar", entidad: "usuario", entidadId: s.usuarioId, detalle: { sincronizarCalendario: activar } });
  revalidatePath("/cuenta");
}

export async function desconectarCalendario() {
  const s = await requerirSesion();
  await db.usuario.update({ where: { id: s.usuarioId }, data: { googleRefreshToken: null, googleCorreo: null, calendarioGoogleId: null, calendarioSincronizadoEn: null, calendarioError: null } });
  await registrar({ usuarioId: s.usuarioId, accion: "editar", entidad: "usuario", entidadId: s.usuarioId, detalle: { calendario: "google desconectado" } });
  revalidatePath("/cuenta");
}

export async function sincronizarAhora(): Promise<Resultado> {
  const s = await requerirSesion();
  if (!calendarioPushConfigurado()) return { error: "La sincronización con Google Calendar no está conectada en este entorno." };
  try {
    const r = await sincronizarCalendarioDe(s.usuarioId);
    await registrar({ usuarioId: s.usuarioId, accion: "editar", entidad: "usuario", entidadId: s.usuarioId, detalle: { calendario: "sincronizado", ...r } });
    revalidatePath("/cuenta");
    return { ok: true };
  } catch (e) {
    const msg = (e as Error).message.slice(0, 300);
    await db.usuario.update({ where: { id: s.usuarioId }, data: { calendarioError: msg } }).catch(() => undefined);
    revalidatePath("/cuenta");
    return { error: msg };
  }
}
