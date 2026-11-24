"use server";

import { revalidatePath } from "next/cache";
import type { CategoriaDocumento } from "@prisma/client";
import { db } from "@/lib/db";
import { registrar } from "@/lib/bitacora";
import { autorizaContrato, puedeCapturar, puedeCobrar, requerirSesion } from "@/lib/acceso";
import type { Resultado } from "./util";

const MAX_BYTES = 10 * 1024 * 1024;
const PERMITIDOS = new Set(["application/pdf", "image/png", "image/jpeg", "application/xml", "text/xml"]);
const CATEGORIAS: CategoriaDocumento[] = ["CONTRATO", "FACTURA_PDF", "FACTURA_XML", "COMPROBANTE", "OTRO"];

function tipoDe(archivo: File) {
  const t = archivo.type || "";
  if (t) return t;
  const n = archivo.name.toLowerCase();
  if (n.endsWith(".pdf")) return "application/pdf";
  if (n.endsWith(".xml")) return "application/xml";
  if (n.endsWith(".png")) return "image/png";
  if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "image/jpeg";
  return "application/octet-stream";
}

// Guarda un archivo ligado a un contrato o a uno de sus hitos de cobro.
export async function guardarArchivo(args: {
  usuarioId: string;
  contratoId: string;
  hitoId?: string | null;
  categoria: CategoriaDocumento;
  archivo: File;
  descripcion?: string | null;
}): Promise<{ id: string } | { error: string }> {
  const { archivo } = args;
  if (!(archivo instanceof File) || archivo.size === 0) return { error: "Selecciona un archivo." };
  if (archivo.size > MAX_BYTES) return { error: "El archivo supera 10 MB." };
  const tipo = tipoDe(archivo);
  if (!PERMITIDOS.has(tipo)) return { error: "Solo se aceptan PDF, XML, PNG o JPG." };
  const contenido = Buffer.from(await archivo.arrayBuffer());
  if (tipo === "application/pdf" && contenido.subarray(0, 5).toString("latin1") !== "%PDF-") return { error: "El archivo no es un PDF válido." };
  if ((tipo === "application/xml" || tipo === "text/xml") && !contenido.subarray(0, 200).toString("utf8").includes("<")) return { error: "El archivo no es un XML válido." };
  const doc = await db.documento.create({
    data: { contratoId: args.contratoId, hitoId: args.hitoId ?? null, categoria: args.categoria, nombre: archivo.name.slice(0, 200), tipoMime: tipo, tamano: archivo.size, contenido, descripcion: args.descripcion ?? null, subidoPorId: args.usuarioId },
    select: { id: true },
  });
  await registrar({ usuarioId: args.usuarioId, accion: "crear", entidad: "documento", entidadId: doc.id, detalle: { contratoId: args.contratoId, hitoId: args.hitoId ?? null, categoria: args.categoria, nombre: archivo.name, tamano: archivo.size } });
  return doc;
}

// Sube un documento al contrato (o a un hito). Capturan director y administración.
export async function subirDocumento(contratoId: string, _prev: Resultado, fd: FormData): Promise<Resultado> {
  const s = await requerirSesion();
  if (!puedeCapturar(s)) return { error: "Sin permiso." };
  const c = await db.contrato.findUnique({ where: { id: contratoId }, select: { directorId: true } });
  if (!c || !autorizaContrato(s, c)) return { error: "Contrato no disponible." };
  const archivo = fd.get("archivo");
  const categoriaRaw = String(fd.get("categoria") ?? "OTRO");
  const categoria = (CATEGORIAS.includes(categoriaRaw as CategoriaDocumento) ? categoriaRaw : "OTRO") as CategoriaDocumento;
  const hitoId = String(fd.get("hitoId") ?? "") || null;
  if (hitoId) {
    const h = await db.hitoCobro.findUnique({ where: { id: hitoId }, select: { contratoId: true } });
    if (!h || h.contratoId !== contratoId) return { error: "Hito no disponible." };
  }
  if (categoria === "COMPROBANTE" && !puedeCobrar(s) && s.rol !== "DIRECTOR") return { error: "Sin permiso." };
  const r = await guardarArchivo({ usuarioId: s.usuarioId, contratoId, hitoId, categoria, archivo: archivo as File, descripcion: String(fd.get("descripcion") ?? "").trim().slice(0, 300) || null });
  if ("error" in r) return { error: r.error };
  revalidatePath(`/contratos/${contratoId}`);
  revalidatePath("/pagos");
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
  revalidatePath("/pagos");
}
