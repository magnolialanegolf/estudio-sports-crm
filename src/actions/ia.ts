"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { registrar } from "@/lib/bitacora";
import { autorizaContrato, puedeCapturar, requerirSesion } from "@/lib/acceso";
import { analizarContratoPdf, EsquemaPropuesta, iaConfigurada, type PropuestaIa } from "@/lib/ia";
import type { Sesion } from "@/lib/sesion";
import type { Resultado } from "./util";

const fecha = (v: string | null | undefined) => {
  if (!v) return null;
  const d = new Date(`${v}T12:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
};

// Lee un documento PDF y guarda la propuesta en el contrato. Lo usan la subida automática y el botón.
export async function leerYGuardarPropuesta(documentoId: string, s: Sesion): Promise<Resultado> {
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
    return { error: `No se pudo leer el contrato: ${(e as Error).message}` };
  }
}

export async function analizarDocumento(documentoId: string): Promise<Resultado> {
  const s = await requerirSesion();
  if (!puedeCapturar(s)) return { error: "Sin permiso." };
  return leerYGuardarPropuesta(documentoId, s);
}

const texto = (fd: FormData, k: string, max = 400) => String(fd.get(k) ?? "").trim().slice(0, max);
const numero = (fd: FormData, k: string) => {
  const n = Number(String(fd.get(k) ?? "").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

// Aplica lo que el usuario marcó y corrigió en la ventana: acuerdos, datos, acciones, fechas clave y pagos.
export async function aplicarPropuesta(contratoId: string, _prev: Resultado, fd: FormData): Promise<Resultado> {
  const s = await requerirSesion();
  if (!puedeCapturar(s)) return { error: "Sin permiso." };
  const c = await db.contrato.findUnique({ where: { id: contratoId }, include: { hitos: { select: { id: true } }, compromisos: { select: { descripcion: true } } } });
  if (!c || !autorizaContrato(s, c)) return { error: "Contrato no disponible." };
  const parse = EsquemaPropuesta.safeParse(c.propuestaIa);
  if (!parse.success) return { error: "No hay una propuesta válida que aplicar." };
  const p: PropuestaIa = parse.data;

  const asignadoAId = texto(fd, "asignadoAId", 64) || null;
  const editorId = texto(fd, "editorId", 64) || null;

  const datos: Prisma.ContratoUpdateInput = { propuestaIa: Prisma.DbNull, propuestaIaEn: null };
  if (fd.get("brief") === "on") datos.brief = texto(fd, "acuerdosContenido", 8000) || p.acuerdosContenido;
  if (fd.get("datos") === "on") {
    if (p.talento && !c.talento) datos.talento = p.talento;
    if (p.inicio && !c.inicio) datos.inicio = fecha(p.inicio);
    if (p.vencimiento && !c.vencimiento) datos.vencimiento = fecha(p.vencimiento);
    if (p.montoSinIva && !c.monto) datos.monto = Math.round(p.montoSinIva);
  }
  await db.contrato.update({ where: { id: contratoId }, data: datos });

  const existentes = new Set(c.compromisos.map((k) => k.descripcion));
  let creados = 0;
  for (let i = 0; i < p.entregables.length; i++) {
    if (fd.get(`e${i}_incluir`) !== "on") continue;
    const descripcionBase = texto(fd, `e${i}_descripcion`) || p.entregables[i].descripcion;
    const cantidad = Math.min(Math.max(Math.round(numero(fd, `e${i}_cantidad`)) || p.entregables[i].cantidad, 1), 60);
    const periodicidadRaw = texto(fd, `e${i}_periodicidad`, 12);
    const periodicidad = (["UNICA", "SEMANA", "QUINCENA", "MES"].includes(periodicidadRaw) ? periodicidadRaw : p.entregables[i].periodicidad) as "UNICA" | "SEMANA" | "QUINCENA" | "MES";
    const base = fecha(texto(fd, `e${i}_fechaInicio`, 10)) ?? fecha(p.entregables[i].fechaInicio) ?? c.inicio ?? null;
    for (let n = 0; n < cantidad; n++) {
      const descripcion = cantidad > 1 ? `${descripcionBase} (${n + 1} de ${cantidad})` : descripcionBase;
      if (existentes.has(descripcion)) continue;
      let f: Date | null = null;
      if (base && (cantidad === 1 || periodicidad !== "UNICA")) {
        f = new Date(base);
        if (periodicidad === "SEMANA") f.setUTCDate(f.getUTCDate() + 7 * n);
        else if (periodicidad === "QUINCENA") f.setUTCDate(f.getUTCDate() + 15 * n);
        else if (periodicidad === "MES") f.setUTCMonth(f.getUTCMonth() + n);
      }
      await db.compromiso.create({ data: { contratoId, tipo: "ENTREGABLE", etapa: "POR_AUTORIZAR", descripcion, fecha: f, notas: p.entregables[i].detalle, asignadoAId, editorId, creadoPorId: s.usuarioId } });
      existentes.add(descripcion);
      creados += 1;
    }
  }
  for (let i = 0; i < p.fechasClave.length; i++) {
    if (fd.get(`k${i}_incluir`) !== "on") continue;
    const descripcion = texto(fd, `k${i}_descripcion`) || p.fechasClave[i].descripcion;
    if (existentes.has(descripcion)) continue;
    await db.compromiso.create({ data: { contratoId, tipo: "FECHA_CLAVE", descripcion, fecha: fecha(texto(fd, `k${i}_fecha`, 10)) ?? fecha(p.fechasClave[i].fecha), creadoPorId: s.usuarioId } });
    existentes.add(descripcion);
    creados += 1;
  }
  let hitos = 0;
  for (let i = 0; i < p.hitosCobro.length; i++) {
    if (fd.get(`h${i}_incluir`) !== "on") continue;
    const importe = Math.round(numero(fd, `h${i}_importe`) || p.hitosCobro[i].importe || 0);
    if (importe <= 0) continue;
    await db.hitoCobro.create({
      data: { contratoId, concepto: texto(fd, `h${i}_concepto`, 200) || p.hitosCobro[i].concepto, importe, fechaFacturar: fecha(texto(fd, `h${i}_fecha`, 10)) ?? fecha(p.hitosCobro[i].fecha), confirmado: false, notas: "Propuesto por el lector de contratos; confirmar contra el documento." },
    });
    hitos += 1;
  }
  if (asignadoAId || editorId) {
    const ids = [asignadoAId, editorId].filter((x): x is string => Boolean(x));
    const { notificar } = await import("@/lib/avisos");
    await notificar(ids, `${s.nombre} cargó ${creados} acción(es) del contrato leído. Quedan por autorizar.`, `/tareas`, s.usuarioId);
  }
  await registrar({ usuarioId: s.usuarioId, accion: "editar", entidad: "contrato", entidadId: contratoId, detalle: { lectorIa: "propuesta aplicada", brief: fd.get("brief") === "on", compromisos: creados, hitos } });
  revalidatePath(`/contratos/${contratoId}`);
  revalidatePath("/tareas");
  revalidatePath("/pagos");
  revalidatePath("/calendario");
  revalidatePath("/");
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
