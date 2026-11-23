"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { registrar } from "@/lib/bitacora";
import { requerirSesion } from "@/lib/acceso";

// Genera o renueva la liga privada del calendario personal. Renovarla invalida la anterior.
export async function renovarLigaCalendario() {
  const s = await requerirSesion();
  const token = randomBytes(24).toString("hex");
  await db.usuario.update({ where: { id: s.usuarioId }, data: { icsToken: token } });
  await registrar({ usuarioId: s.usuarioId, accion: "editar", entidad: "usuario", entidadId: s.usuarioId, detalle: { calendario: "liga renovada" } });
  revalidatePath("/cuenta");
}

export async function desactivarLigaCalendario() {
  const s = await requerirSesion();
  await db.usuario.update({ where: { id: s.usuarioId }, data: { icsToken: null } });
  await registrar({ usuarioId: s.usuarioId, accion: "editar", entidad: "usuario", entidadId: s.usuarioId, detalle: { calendario: "liga desactivada" } });
  revalidatePath("/cuenta");
}
