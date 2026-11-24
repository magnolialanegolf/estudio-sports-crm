"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { registrar } from "@/lib/bitacora";
import { esDireccion, requerirSesion } from "@/lib/acceso";
import { filtroIncidencias } from "@/lib/incidencias";
import { notificar } from "@/lib/avisos";
import { deFormulario, fechaOpcional, primerError, texto, textoRequerido, type Resultado } from "./util";

// Incidencias, pendientes y problemas. Cada quien ve lo suyo: lo que reportó, lo que tiene
// asignado y lo de su cartera; dirección, gerencia y administración ven todo.

const esquema = z.object({
  titulo: textoRequerido(200),
  descripcion: texto(4000),
  tipo: z.enum(["INCIDENCIA", "PENDIENTE", "PROBLEMA", "SOLICITUD"]),
  prioridad: z.enum(["BAJA", "MEDIA", "ALTA", "URGENTE"]),
  asignadoAId: texto(64),
  contratoId: texto(64),
  marcaId: texto(64),
  fechaLimite: fechaOpcional(),
});

async function direccion(): Promise<string[]> {
  const us = await db.usuario.findMany({ where: { activo: true, rol: { in: ["ADMIN_GENERAL", "GERENTE_GENERAL"] } }, select: { id: true } });
  return us.map((u) => u.id);
}

export async function crearIncidencia(_prev: Resultado, fd: FormData): Promise<Resultado> {
  const s = await requerirSesion();
  const parse = esquema.safeParse(deFormulario(fd));
  if (!parse.success) return { error: primerError(parse.error) };
  const d = parse.data;
  const inc = await db.incidencia.create({
    data: { titulo: d.titulo, descripcion: d.descripcion, tipo: d.tipo, prioridad: d.prioridad, asignadoAId: d.asignadoAId || null, contratoId: d.contratoId || null, marcaId: d.marcaId || null, fechaLimite: d.fechaLimite, reportadoPorId: s.usuarioId },
  });
  const href = `/incidencias/${inc.id}`;
  if (inc.asignadoAId) await notificar([inc.asignadoAId], `${s.nombre} te asignó ${d.tipo === "PROBLEMA" ? "un problema" : d.tipo === "SOLICITUD" ? "una solicitud" : "un pendiente"}${d.prioridad === "URGENTE" ? " URGENTE" : ""}: ${d.titulo}`, href, s.usuarioId);
  if (d.prioridad === "URGENTE" || d.tipo === "PROBLEMA") await notificar(await direccion(), `${s.nombre} reportó ${d.prioridad === "URGENTE" ? "algo urgente" : "un problema"}: ${d.titulo}`, href, s.usuarioId);
  await registrar({ usuarioId: s.usuarioId, accion: "crear", entidad: "incidencia", entidadId: inc.id, detalle: { tipo: d.tipo, prioridad: d.prioridad, asignadoAId: inc.asignadoAId } });
  revalidatePath("/incidencias");
  revalidatePath("/");
  redirect(href);
}

const esquemaCambio = z.object({
  estado: z.enum(["ABIERTA", "EN_ATENCION", "RESUELTA", "CERRADA"]),
  prioridad: z.enum(["BAJA", "MEDIA", "ALTA", "URGENTE"]),
  asignadoAId: texto(64),
  fechaLimite: fechaOpcional(),
  comentario: texto(4000),
});

export async function actualizarIncidencia(id: string, _prev: Resultado, fd: FormData): Promise<Resultado> {
  const s = await requerirSesion();
  const inc = await db.incidencia.findFirst({ where: { id, ...filtroIncidencias(s) } });
  if (!inc) return { error: "Incidencia no disponible." };
  const parse = esquemaCambio.safeParse(deFormulario(fd));
  if (!parse.success) return { error: primerError(parse.error) };
  const d = parse.data;
  // Cerrar definitivamente es de quien reportó o de dirección.
  if (d.estado === "CERRADA" && inc.reportadoPorId !== s.usuarioId && !esDireccion(s)) return { error: "Solo quien reportó o la dirección puede cerrar. Márcala como resuelta." };
  const asignadoAId = d.asignadoAId || null;
  await db.incidencia.update({
    where: { id },
    data: { estado: d.estado, prioridad: d.prioridad, asignadoAId, fechaLimite: d.fechaLimite, resueltoEn: d.estado === "RESUELTA" || d.estado === "CERRADA" ? (inc.resueltoEn ?? new Date()) : null },
  });
  if (d.comentario) await db.comentarioIncidencia.create({ data: { incidenciaId: id, usuarioId: s.usuarioId, texto: d.comentario } });
  const href = `/incidencias/${id}`;
  const cambios: string[] = [];
  if (d.estado !== inc.estado) cambios.push(`estado: ${d.estado.toLowerCase().replace("_", " ")}`);
  if (d.prioridad !== inc.prioridad) cambios.push(`prioridad: ${d.prioridad.toLowerCase()}`);
  if (asignadoAId && asignadoAId !== inc.asignadoAId) await notificar([asignadoAId], `${s.nombre} te asignó: ${inc.titulo}`, href, s.usuarioId);
  if (cambios.length || d.comentario) {
    await notificar([inc.reportadoPorId, inc.asignadoAId], `${s.nombre} actualizó «${inc.titulo}»${cambios.length ? ` (${cambios.join(", ")})` : ""}${d.comentario ? `: ${d.comentario.slice(0, 100)}` : ""}`, href, s.usuarioId);
  }
  await registrar({ usuarioId: s.usuarioId, accion: "editar", entidad: "incidencia", entidadId: id, detalle: { estado: d.estado, prioridad: d.prioridad, asignadoAId, comentario: Boolean(d.comentario) } });
  revalidatePath("/incidencias");
  revalidatePath(href);
  revalidatePath("/");
  return { ok: true };
}
