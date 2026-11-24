"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { registrar } from "@/lib/bitacora";
import { autorizaContrato, puedeCapturar, requerirSesion } from "@/lib/acceso";
import { analizarContratoPdf, EsquemaPropuesta, iaConfigurada, type PropuestaIa } from "@/lib/ia";
import type { Resultado } from "./util";

const fecha = (v: string | null | undefined) => {
  if (!v) return null;
  const d = new Date(`${v}T12:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
};

// 1. Lee el PDF del contrato y guarda la propuesta para revisión.
export async function analizarDocumento(documentoId: string): Promise<Resultado> {
  const s = await requerirSesion();
  if (!puedeCapturar(s)) return { error: "Sin permiso." };
  if (!iaConfigurada()) return { error: "El lector de contratos no está configurado en este entorno." };
  const d = await db.documento.findUnique({ where: { id: documentoId }, include: { contrato: { select: { id: true, directorId: true, proyecto: true, marca: { select: { nombre: true } } } } } });
  if (!d || !autorizaContrato(s, d.contrato)) return { error: "Documento no disponible." };
  if (d.tipoMime !== "application/pdf") return { error: "Solo se analizan documentos PDF." };
  try {
    const { propuesta, uso } = await analizarContratoPdf(Buffer.from(d.contenido), { marca: d.contrato.marca.nombre, proyecto: d.contrato.proyecto });
    await db.contrato.update({ where: { id: d.contrato.id }, data: { propuestaIa: propuesta as unknown as Prisma.InputJsonValue, propuestaIaEn: new Date() } });
    await registrar({ usuarioId: s.usuarioId, accion: "editar", entidad: "contrato", entidadId: d.contrato.id, detalle: { lectorIa: "propuesta generada", documento: d.nombre, entregables: propuesta.entregables.length, tokensEntrada: uso.tokensEntrada, tokensSalida: uso.tokensSalida, costoUsd: uso.costoUsd } });
    revalidatePath(`/contratos/${d.contrato.id}`);
    return { ok: true };
  } catch (e) {
    return { error: `No se pudo analizar el contrato: ${(e as Error).message}` };
  }
}

// 2. Aplica la propuesta aprobada: acuerdos de contenido, entregables, fechas clave y datos del contrato.
export async function aplicarPropuesta(contratoId: string, _prev: Resultado, fd: FormData): Promise<Resultado> {
  const s = await requerirSesion();
  if (!puedeCapturar(s)) return { error: "Sin permiso." };
  const c = await db.contrato.findUnique({ where: { id: contratoId }, include: { hitos: { select: { id: true } }, compromisos: { select: { descripcion: true } } } });
  if (!c || !autorizaContrato(s, c)) return { error: "Contrato no disponible." };
  const parse = EsquemaPropuesta.safeParse(c.propuestaIa);
  if (!parse.success) return { error: "No hay una propuesta válida que aplicar." };
  const p: PropuestaIa = parse.data;

  const aplicarBrief = fd.get("brief") === "on";
  const aplicarDatos = fd.get("datos") === "on";
  const aplicarEntregables = fd.get("entregables") === "on";
  const aplicarFechas = fd.get("fechas") === "on";
  const aplicarHitos = fd.get("hitos") === "on" && c.hitos.length === 0;
  const asignadoAId = String(fd.get("asignadoAId") ?? "") || null;
  const editorId = String(fd.get("editorId") ?? "") || null;

  const datos: Prisma.ContratoUpdateInput = { propuestaIa: Prisma.DbNull, propuestaIaEn: null };
  if (aplicarBrief) datos.brief = p.acuerdosContenido;
  if (aplicarDatos) {
    if (p.talento && !c.talento) datos.talento = p.talento;
    if (p.inicio && !c.inicio) datos.inicio = fecha(p.inicio);
    if (p.vencimiento && !c.vencimiento) datos.vencimiento = fecha(p.vencimiento);
    if (p.montoSinIva && !c.monto) datos.monto = Math.round(p.montoSinIva);
  }
  await db.contrato.update({ where: { id: contratoId }, data: datos });

  let creados = 0;
  if (aplicarEntregables) {
    const existentes = new Set(c.compromisos.map((k) => k.descripcion));
    for (const e of p.entregables) {
      const cantidad = Math.min(Math.max(e.cantidad, 1), 60);
      const base = fecha(e.fechaInicio) ?? c.inicio ?? null;
      for (let i = 0; i < cantidad; i++) {
        const descripcion = cantidad > 1 ? `${e.descripcion} (${i + 1} de ${cantidad})` : e.descripcion;
        if (existentes.has(descripcion)) continue;
        let f: Date | null = null;
        if (base && (cantidad === 1 || e.periodicidad !== "UNICA")) {
          f = new Date(base);
          if (e.periodicidad === "SEMANA") f.setUTCDate(f.getUTCDate() + 7 * i);
          else if (e.periodicidad === "QUINCENA") f.setUTCDate(f.getUTCDate() + 15 * i);
          else if (e.periodicidad === "MES") f.setUTCMonth(f.getUTCMonth() + i);
        }
        await db.compromiso.create({ data: { contratoId, tipo: "ENTREGABLE", etapa: "POR_AUTORIZAR", descripcion, fecha: f, notas: e.detalle, asignadoAId, editorId, creadoPorId: s.usuarioId } });
        creados += 1;
      }
    }
  }
  if (aplicarFechas) {
    const existentes = new Set(c.compromisos.map((k) => k.descripcion));
    for (const k of p.fechasClave) {
      if (existentes.has(k.descripcion)) continue;
      await db.compromiso.create({ data: { contratoId, tipo: "FECHA_CLAVE", descripcion: k.descripcion, fecha: fecha(k.fecha), creadoPorId: s.usuarioId } });
      creados += 1;
    }
  }
  let hitos = 0;
  if (aplicarHitos) {
    for (const h of p.hitosCobro) {
      if (!h.importe) continue;
      await db.hitoCobro.create({ data: { contratoId, concepto: h.concepto, importe: Math.round(h.importe), fechaFacturar: fecha(h.fecha), confirmado: false, notas: "Propuesto por el lector de contratos; confirmar contra el documento." } });
      hitos += 1;
    }
  }
  await registrar({ usuarioId: s.usuarioId, accion: "editar", entidad: "contrato", entidadId: contratoId, detalle: { lectorIa: "propuesta aplicada", brief: aplicarBrief, compromisos: creados, hitos } });
  revalidatePath(`/contratos/${contratoId}`);
  revalidatePath("/tareas");
  return { ok: true };
}

export async function descartarPropuesta(contratoId: string) {
  const s = await requerirSesion();
  if (!puedeCapturar(s)) return;
  const c = await db.contrato.findUnique({ where: { id: contratoId }, select: { directorId: true } });
  if (!c || !autorizaContrato(s, c)) return;
  await db.contrato.update({ where: { id: contratoId }, data: { propuestaIa: Prisma.DbNull, propuestaIaEn: null } });
  revalidatePath(`/contratos/${contratoId}`);
}
