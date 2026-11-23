"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { registrar } from "@/lib/bitacora";
import { autorizaContrato, puedeCapturar, requerirSesion } from "@/lib/acceso";
import type { Resultado } from "./util";

const MAX_BYTES = 10 * 1024 * 1024;
const PERMITIDOS = new Set(["application/pdf", "image/png", "image/jpeg"]);

// Sube un documento al contrato. Solo quien captura sobre esa cartera.
export async function subirDocumento(contratoId: string, _prev: Resultado, fd: FormData): Promise<Resultado> {
  const s = await requerirSesion();
  if (!puedeCapturar(s)) return { error: "Sin permiso." };
  const c = await db.contrato.findUnique({ where: { id: contratoId }, select: { directorId: true, codigo: true } });
  if (!c || !autorizaContrato(s, c)) return { error: "Contrato no disponible." };

  const archivo = fd.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) return { error: "Selecciona un archivo." };
  if (archivo.size > MAX_BYTES) return { error: "El archivo supera 10 MB." };
  const tipo = archivo.type || "application/octet-stream";
  if (!PERMITIDOS.has(tipo)) return { error: "Solo se aceptan PDF, PNG o JPG." };

  const contenido = Buffer.from(await archivo.arrayBuffer());
  // Comprobación mínima de que un PDF lo es.
  if (tipo === "application/pdf" && contenido.subarray(0, 5).toString("latin1") !== "%PDF-") return { error: "El archivo no es un PDF válido." };

  const descripcion = String(fd.get("descripcion") ?? "").trim().slice(0, 300) || null;
  const doc = await db.documento.create({
    data: { contratoId, nombre: archivo.name.slice(0, 200), tipoMime: tipo, tamano: archivo.size, contenido, descripcion, subidoPorId: s.usuarioId },
    select: { id: true },
  });
  await registrar({ usuarioId: s.usuarioId, accion: "crear", entidad: "documento", entidadId: doc.id, detalle: { contrato: c.codigo, nombre: archivo.name, tamano: archivo.size } });
  revalidatePath(`/contratos/${contratoId}`);
  return { ok: true };
}

export async function eliminarDocumento(documentoId: string) {
  const s = await requerirSesion();
  if (!puedeCapturar(s)) return;
  const d = await db.documento.findUnique({ where: { id: documentoId }, select: { nombre: true, contrato: { select: { id: true, directorId: true } } } });
  if (!d || !autorizaContrato(s, d.contrato)) return;
  await db.documento.delete({ where: { id: documentoId } });
  await registrar({ usuarioId: s.usuarioId, accion: "eliminar", entidad: "documento", entidadId: documentoId, detalle: { nombre: d.nombre } });
  revalidatePath(`/contratos/${d.contrato.id}`);
}
