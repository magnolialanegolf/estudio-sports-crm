"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { registrar } from "@/lib/bitacora";
import { autorizaContrato, puedeCapturar, puedeCobrar, requerirSesion, veTodo } from "@/lib/acceso";
import { casilla, deFormulario, entero, fechaOpcional, primerError, texto, textoRequerido, type Resultado } from "./util";

const esquemaContrato = z.object({
  codigo: textoRequerido(40),
  marcaId: textoRequerido(64),
  directorId: texto(64),
  proyecto: textoRequerido(200),
  tipo: z.enum(["COMERCIAL", "PODCAST", "EMBAJADURIA", "OTRO"]),
  estado: z.enum(["PROPUESTA", "PENDIENTE_FIRMA", "VIGENTE", "FINALIZADO", "CANCELADO"]),
  monto: entero(),
  montoConfirmado: casilla(),
  inicio: fechaOpcional(),
  inicioConfirmado: casilla(),
  vencimiento: fechaOpcional(),
  vencimientoConfirmado: casilla(),
  duracionMeses: entero(),
  talento: texto(200),
  documentoUrl: texto(500),
  renovacionDeId: texto(64),
  notas: texto(4000),
  observaciones: texto(4000),
});

async function directorParaCaptura(s: Awaited<ReturnType<typeof requerirSesion>>, marcaId: string, directorId: string | null) {
  if (!veTodo(s)) return s.directorId!;
  if (directorId) return directorId;
  const cartera = await db.cartera.findFirst({ where: { marcaId, hasta: null }, select: { directorId: true } });
  if (!cartera) throw new Error("La marca no tiene director asignado. Asígnalo en Directores o elige uno.");
  return cartera.directorId;
}

export async function guardarContrato(id: string | null, _prev: Resultado, fd: FormData): Promise<Resultado> {
  const s = await requerirSesion();
  if (!puedeCapturar(s)) return { error: "Sin permiso para capturar contratos." };
  const parse = esquemaContrato.safeParse(deFormulario(fd));
  if (!parse.success) return { error: primerError(parse.error) };
  const d = parse.data;

  // Un director solo captura sobre marcas de su cartera.
  if (!veTodo(s)) {
    const propia = await db.cartera.findFirst({ where: { marcaId: d.marcaId, directorId: s.directorId!, hasta: null } });
    if (!propia) return { error: "La marca no pertenece a tu cartera." };
  }

  let directorId: string;
  try {
    directorId = await directorParaCaptura(s, d.marcaId, d.directorId);
  } catch (e) {
    return { error: (e as Error).message };
  }

  const datos = {
    codigo: d.codigo.toUpperCase(),
    marcaId: d.marcaId,
    directorId,
    proyecto: d.proyecto,
    tipo: d.tipo,
    estado: d.estado,
    monto: d.monto,
    montoConfirmado: d.montoConfirmado,
    inicio: d.inicio,
    inicioConfirmado: d.inicioConfirmado,
    vencimiento: d.vencimiento,
    vencimientoConfirmado: d.vencimientoConfirmado,
    duracionMeses: d.duracionMeses,
    talento: d.talento,
    documentoUrl: d.documentoUrl,
    renovacionDeId: d.renovacionDeId || null,
    notas: d.notas,
    observaciones: d.observaciones,
  };

  let contratoId = id;
  try {
    if (id) {
      const actual = await db.contrato.findUnique({ where: { id } });
      if (!actual || !autorizaContrato(s, actual)) return { error: "Contrato no disponible." };
      // El director no reasigna contratos a otro director.
      if (!veTodo(s)) datos.directorId = actual.directorId;
      await db.contrato.update({ where: { id }, data: datos });
      await registrar({ usuarioId: s.usuarioId, accion: "editar", entidad: "contrato", entidadId: id, detalle: { codigo: datos.codigo, estado: datos.estado, monto: datos.monto } });
    } else {
      const creado = await db.contrato.create({ data: datos });
      contratoId = creado.id;
      await registrar({ usuarioId: s.usuarioId, accion: "crear", entidad: "contrato", entidadId: creado.id, detalle: { codigo: datos.codigo, monto: datos.monto } });
    }
  } catch (e) {
    const msg = String((e as Error).message ?? e);
    if (msg.includes("Unique constraint")) return { error: "Ya existe un contrato con ese código." };
    return { error: "No se pudo guardar el contrato." };
  }
  revalidatePath("/contratos");
  revalidatePath("/");
  redirect(`/contratos/${contratoId}`);
}

export async function eliminarContrato(id: string) {
  const s = await requerirSesion();
  if (!puedeCapturar(s)) return;
  const c = await db.contrato.findUnique({ where: { id }, select: { directorId: true, codigo: true } });
  if (!c || !autorizaContrato(s, c)) return;
  await db.contrato.delete({ where: { id } });
  await registrar({ usuarioId: s.usuarioId, accion: "eliminar", entidad: "contrato", entidadId: id, detalle: { codigo: c.codigo } });
  revalidatePath("/contratos");
  redirect("/contratos");
}

// ───────── Hitos de cobro ─────────

const esquemaHito = z.object({
  concepto: textoRequerido(200),
  importe: entero().pipe(z.number().int().min(0)),
  modalidad: z.enum(["EFECTIVO", "ESPECIE", "ACCIONES"]),
  fechaFacturar: fechaOpcional(),
  fechaOrientativa: texto(200),
  estadoFactura: z.enum(["POR_EMITIR", "PENDIENTE_AUTORIZACION", "EMITIDA", "POR_CONFIRMAR"]),
  folioFactura: texto(80),
  estadoPago: z.enum(["POR_COBRAR", "PROGRAMADO", "SUJETO_A_FIRMA", "SIN_PROGRAMAR", "PARCIAL", "PAGADO"]),
  montoRecibido: entero().pipe(z.number().int().min(0)),
  fechaPago: fechaOpcional(),
  confirmado: casilla(),
  notas: texto(2000),
});

export async function guardarHito(contratoId: string, hitoId: string | null, _prev: Resultado, fd: FormData): Promise<Resultado> {
  const s = await requerirSesion();
  if (!puedeCapturar(s)) return { error: "Sin permiso." };
  const c = await db.contrato.findUnique({ where: { id: contratoId }, select: { directorId: true } });
  if (!c || !autorizaContrato(s, c)) return { error: "Contrato no disponible." };
  const parse = esquemaHito.safeParse({ ...deFormulario(fd), montoRecibido: fd.get("montoRecibido") ?? 0 });
  if (!parse.success) return { error: primerError(parse.error) };
  const d = parse.data;
  // Consistencia mínima entre estado y monto recibido.
  if (d.estadoPago === "PAGADO" && d.montoRecibido === 0) d.montoRecibido = d.importe;
  if (d.montoRecibido > 0 && d.montoRecibido < d.importe && d.estadoPago === "POR_COBRAR") d.estadoPago = "PARCIAL";

  if (hitoId) {
    await db.hitoCobro.update({ where: { id: hitoId, contratoId }, data: d });
    await registrar({ usuarioId: s.usuarioId, accion: "editar", entidad: "hito", entidadId: hitoId, detalle: { contratoId, importe: d.importe, montoRecibido: d.montoRecibido, estadoPago: d.estadoPago } });
  } else {
    const h = await db.hitoCobro.create({ data: { ...d, contratoId } });
    await registrar({ usuarioId: s.usuarioId, accion: "crear", entidad: "hito", entidadId: h.id, detalle: { contratoId, importe: d.importe } });
  }
  revalidatePath(`/contratos/${contratoId}`);
  revalidatePath("/");
  return { ok: true };
}

// Registro rápido de pago (administración o director sobre su cartera).
export async function registrarPago(hitoId: string, fd: FormData) {
  const s = await requerirSesion();
  if (!puedeCapturar(s)) return;
  const h = await db.hitoCobro.findUnique({ where: { id: hitoId }, include: { contrato: { select: { id: true, directorId: true } } } });
  if (!h || !autorizaContrato(s, h.contrato)) return;
  const monto = Number(String(fd.get("monto") ?? "").replace(/[^\d.]/g, ""));
  const fechaStr = String(fd.get("fecha") ?? "");
  const folio = String(fd.get("folio") ?? "").trim() || null;
  if (!Number.isFinite(monto) || monto <= 0) return;
  const recibido = h.montoRecibido + Math.round(monto);
  await db.hitoCobro.update({
    where: { id: hitoId },
    data: {
      montoRecibido: recibido,
      estadoPago: recibido >= h.importe ? "PAGADO" : "PARCIAL",
      fechaPago: fechaStr ? new Date(`${fechaStr}T12:00:00.000Z`) : new Date(),
      folioFactura: folio ?? h.folioFactura,
      estadoFactura: folio ? "EMITIDA" : h.estadoFactura,
      confirmado: puedeCobrar(s) ? true : h.confirmado,
    },
  });
  await registrar({ usuarioId: s.usuarioId, accion: "editar", entidad: "hito", entidadId: hitoId, detalle: { pago: Math.round(monto), folio } });
  revalidatePath(`/contratos/${h.contrato.id}`);
  revalidatePath("/");
}

export async function eliminarHito(hitoId: string) {
  const s = await requerirSesion();
  if (!puedeCapturar(s)) return;
  const h = await db.hitoCobro.findUnique({ where: { id: hitoId }, include: { contrato: { select: { id: true, directorId: true } } } });
  if (!h || !autorizaContrato(s, h.contrato)) return;
  await db.hitoCobro.delete({ where: { id: hitoId } });
  await registrar({ usuarioId: s.usuarioId, accion: "eliminar", entidad: "hito", entidadId: hitoId, detalle: { concepto: h.concepto, importe: h.importe } });
  revalidatePath(`/contratos/${h.contrato.id}`);
}

// ───────── Compromisos ─────────

const esquemaCompromiso = z.object({
  tipo: z.enum(["ENTREGABLE", "SEGUIMIENTO"]),
  descripcion: textoRequerido(400),
  fecha: fechaOpcional(),
  responsable: texto(120),
  estado: z.enum(["PENDIENTE", "EN_CURSO", "CUMPLIDO", "CANCELADO"]),
  notas: texto(2000),
});

export async function guardarCompromiso(contratoId: string, compromisoId: string | null, _prev: Resultado, fd: FormData): Promise<Resultado> {
  const s = await requerirSesion();
  if (!puedeCapturar(s)) return { error: "Sin permiso." };
  const c = await db.contrato.findUnique({ where: { id: contratoId }, select: { directorId: true } });
  if (!c || !autorizaContrato(s, c)) return { error: "Contrato no disponible." };
  const parse = esquemaCompromiso.safeParse(deFormulario(fd));
  if (!parse.success) return { error: primerError(parse.error) };
  if (compromisoId) {
    await db.compromiso.update({ where: { id: compromisoId, contratoId }, data: parse.data });
    await registrar({ usuarioId: s.usuarioId, accion: "editar", entidad: "compromiso", entidadId: compromisoId, detalle: { contratoId, estado: parse.data.estado } });
  } else {
    const k = await db.compromiso.create({ data: { ...parse.data, contratoId } });
    await registrar({ usuarioId: s.usuarioId, accion: "crear", entidad: "compromiso", entidadId: k.id, detalle: { contratoId } });
  }
  revalidatePath(`/contratos/${contratoId}`);
  revalidatePath("/");
  return { ok: true };
}

export async function cambiarEstadoCompromiso(compromisoId: string, estado: "PENDIENTE" | "EN_CURSO" | "CUMPLIDO" | "CANCELADO") {
  const s = await requerirSesion();
  if (!puedeCapturar(s)) return;
  const k = await db.compromiso.findUnique({ where: { id: compromisoId }, include: { contrato: { select: { id: true, directorId: true } } } });
  if (!k || !autorizaContrato(s, k.contrato)) return;
  await db.compromiso.update({ where: { id: compromisoId }, data: { estado } });
  await registrar({ usuarioId: s.usuarioId, accion: "editar", entidad: "compromiso", entidadId: compromisoId, detalle: { estado } });
  revalidatePath(`/contratos/${k.contrato.id}`);
  revalidatePath("/");
}

export async function eliminarCompromiso(compromisoId: string) {
  const s = await requerirSesion();
  if (!puedeCapturar(s)) return;
  const k = await db.compromiso.findUnique({ where: { id: compromisoId }, include: { contrato: { select: { id: true, directorId: true } } } });
  if (!k || !autorizaContrato(s, k.contrato)) return;
  await db.compromiso.delete({ where: { id: compromisoId } });
  await registrar({ usuarioId: s.usuarioId, accion: "eliminar", entidad: "compromiso", entidadId: compromisoId, detalle: { descripcion: k.descripcion } });
  revalidatePath(`/contratos/${k.contrato.id}`);
}
