"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requerirSesion } from "@/lib/acceso";

export async function marcarAvisosLeidos() {
  const s = await requerirSesion();
  await db.aviso.updateMany({ where: { usuarioId: s.usuarioId, leido: false }, data: { leido: true } });
  revalidatePath("/avisos");
}

export async function marcarAvisoLeido(id: string) {
  const s = await requerirSesion();
  await db.aviso.updateMany({ where: { id, usuarioId: s.usuarioId }, data: { leido: true } });
  revalidatePath("/avisos");
}
