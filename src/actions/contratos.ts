"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { registrar } from "@/lib/bitacora";
import { autorizaContrato, esProduccion, filtroContratosProduccion, puedeCapturar, puedeCobrar, requerirSesion, veTodo } from "@/lib/acceso";
import { notificar, responsablesDeContrato } from "@/lib/avisos";
import { casilla, deFormulario, entero, fechaOpcional, primerError, texto, textoRequerido, type Resultado } from "./util";

const esquemaContrato = z.object({
  codigo: textoRequerido(40),
  marcaId: textoRequerido(64),
  directorId: texto(64),
  proyecto: textoRequerido(200),
  tipo: z.enum(["COMERCIAL", "PODCAST", "EMBAJADURIA", "OTRO"]),
  estado: z.enum(["PROSPECTO", "PROPUESTA", "PENDIENTE_FIRMA", "VIGENTE", "FINALIZADO", "CANCELADO"]),
  monto: entero(),
  montoConfirmado: casilla(),
  inicio: fechaOpcional(),
  inicioConfirmado: casilla(),
  vencimiento: fechaOpcional(),
  vencimientoConfirmado: casilla(),
  duracionMeses: entero(),
  talento: texto(200),
  brief: texto(4000),
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
    brief: d.brief,
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
  fechaVencimiento: fechaOpcional(),
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
  tipo: z.enum(["ENTREGABLE", "SEGUIMIENTO", "FECHA_CLAVE"]),
  descripcion: textoRequerido(400),
  fecha: fechaOpcional(),
  responsable: texto(120),
  asignadoAId: texto(64),
  estado: z.enum(["PENDIENTE", "EN_CURSO", "REQUIERE_ATENCION", "CUMPLIDO", "CANCELADO"]),
  notas: texto(2000),
  // Repetición: genera N compromisos a partir de la fecha, cada semana, quincena o mes.
  repetirCantidad: entero(),
  repetirCada: z.preprocess((v) => (v === "" || v === undefined ? null : v), z.enum(["SEMANA", "QUINCENA", "MES"]).nullable()),
});

async function asignableValido(id: string | null) {
  if (!id) return null;
  const u = await db.usuario.findUnique({ where: { id }, select: { id: true, activo: true, rol: true } });
  if (!u || !u.activo) return null;
  return u.id;
}

export async function guardarCompromiso(contratoId: string, compromisoId: string | null, _prev: Resultado, fd: FormData): Promise<Resultado> {
  const s = await requerirSesion();
  const c = await db.contrato.findUnique({ where: { id: contratoId }, select: { id: true, directorId: true, marca: { select: { nombre: true } } } });
  if (!c) return { error: "Contrato no disponible." };
  // Producción puede crear actividades en los contratos que consulta, y editar solo las que creó.
  const produccion = esProduccion(s);
  if (produccion) {
    const visible = await db.contrato.findFirst({ where: { id: contratoId, ...filtroContratosProduccion(s) }, select: { id: true } });
    if (!visible) return { error: "Contrato no disponible." };
    if (compromisoId) {
      const k = await db.compromiso.findUnique({ where: { id: compromisoId }, select: { creadoPorId: true } });
      if (k?.creadoPorId !== s.usuarioId) return { error: "Solo puedes editar actividades que creaste." };
    }
  } else if (!puedeCapturar(s) || !autorizaContrato(s, c)) {
    return { error: "Sin permiso." };
  }
  const parse = esquemaCompromiso.safeParse(deFormulario(fd));
  if (!parse.success) return { error: primerError(parse.error) };
  const { repetirCantidad, repetirCada, ...d } = parse.data;
  const asignadoAId = await asignableValido(d.asignadoAId);
  const datos = { ...d, asignadoAId, cumplidoEn: d.estado === "CUMPLIDO" ? new Date() : null };
  const texto = (n: number) => `${s.nombre} te asignó ${n > 1 ? `${n} tareas` : "una tarea"} en ${c.marca.nombre}: ${d.descripcion}`;

  if (compromisoId) {
    const actual = await db.compromiso.findUnique({ where: { id: compromisoId }, select: { estado: true, cumplidoEn: true, asignadoAId: true } });
    await db.compromiso.update({
      where: { id: compromisoId, contratoId },
      data: { ...datos, cumplidoEn: d.estado === "CUMPLIDO" ? (actual?.cumplidoEn ?? new Date()) : null },
    });
    if (asignadoAId && asignadoAId !== actual?.asignadoAId) await notificar([asignadoAId], texto(1), `/tareas/${compromisoId}`, s.usuarioId);
    await registrar({ usuarioId: s.usuarioId, accion: "editar", entidad: "compromiso", entidadId: compromisoId, detalle: { contratoId, estado: d.estado, asignadoAId } });
  } else {
    const cantidad = repetirCantidad && repetirCada && d.fecha ? Math.min(Math.max(repetirCantidad, 1), 60) : 1;
    const base = d.fecha;
    const fechas: (Date | null)[] = [];
    for (let i = 0; i < cantidad; i++) {
      if (!base || i === 0) {
        fechas.push(base);
        continue;
      }
      const f = new Date(base);
      if (repetirCada === "SEMANA") f.setUTCDate(f.getUTCDate() + 7 * i);
      else if (repetirCada === "QUINCENA") f.setUTCDate(f.getUTCDate() + 15 * i);
      else f.setUTCMonth(f.getUTCMonth() + i);
      fechas.push(f);
    }
    const creados = await db.$transaction(
      fechas.map((fecha, i) =>
        db.compromiso.create({
          data: { ...datos, contratoId, fecha, creadoPorId: s.usuarioId, descripcion: cantidad > 1 ? `${d.descripcion} (${i + 1} de ${cantidad})` : d.descripcion },
        }),
      ),
    );
    if (asignadoAId) await notificar([asignadoAId], texto(cantidad), `/tareas/${creados[0].id}`, s.usuarioId);
    // Si producción crea una actividad, el director de la cartera se entera.
    if (produccion) await notificar(await responsablesDeContrato(c.directorId), `${s.nombre} registró una actividad en ${c.marca.nombre}: ${d.descripcion}`, `/tareas/${creados[0].id}`, s.usuarioId);
    await registrar({ usuarioId: s.usuarioId, accion: "crear", entidad: "compromiso", entidadId: creados[0]?.id, detalle: { contratoId, cantidad, asignadoAId } });
  }
  revalidatePath(`/contratos/${contratoId}`);
  revalidatePath(`/tareas/contrato/${contratoId}`);
  revalidatePath("/tareas");
  revalidatePath("/avisos");
  revalidatePath("/");
  return { ok: true };
}

// Avisa a quien corresponde cuando cambia el estado de una tarea.
async function avisarCambio(
  s: { usuarioId: string; nombre: string },
  k: { id: string; descripcion: string; estado: string; creadoPorId: string | null; asignadoAId: string | null; contrato: { id: string; directorId: string } },
  estado: string,
  reporte: string | null,
) {
  if (estado === k.estado) return;
  const marca = await db.contrato.findUnique({ where: { id: k.contrato.id }, select: { marca: { select: { nombre: true } } } });
  const nombreMarca = marca?.marca.nombre ?? "la marca";
  const href = `/tareas/${k.id}`;
  if (estado === "REQUIERE_ATENCION") {
    const dest = [...(await responsablesDeContrato(k.contrato.directorId)), k.creadoPorId];
    await notificar(dest, `${s.nombre} pide atención en ${nombreMarca} · ${k.descripcion}${reporte ? `: ${reporte.slice(0, 120)}` : ""}`, href, s.usuarioId);
  } else if (estado === "CUMPLIDO") {
    const dest = [...(await responsablesDeContrato(k.contrato.directorId)), k.creadoPorId];
    await notificar(dest, `${s.nombre} reportó cumplida: ${nombreMarca} · ${k.descripcion}`, href, s.usuarioId);
  } else if (k.asignadoAId && k.asignadoAId !== s.usuarioId) {
    await notificar([k.asignadoAId], `${s.nombre} cambió a «${estado === "EN_CURSO" ? "en curso" : estado === "PENDIENTE" ? "pendiente" : "cancelada"}»: ${nombreMarca} · ${k.descripcion}`, href, s.usuarioId);
  }
}

// Cambio de estado con reporte. Lo usan quien captura sobre su cartera y producción sobre lo asignado.
export async function reportarCompromiso(compromisoId: string, _prev: Resultado, fd: FormData): Promise<Resultado> {
  const s = await requerirSesion();
  const k = await db.compromiso.findUnique({ where: { id: compromisoId }, include: { contrato: { select: { id: true, directorId: true } } } });
  if (!k) return { error: "Tarea no encontrada." };
  // Producción: la tarea asignada o la actividad que ella misma creó. Comercial: su cartera.
  const autorizado = esProduccion(s)
    ? k.asignadoAId === s.usuarioId || k.creadoPorId === s.usuarioId
    : puedeCapturar(s) && autorizaContrato(s, k.contrato);
  if (!autorizado) return { error: "Sin permiso sobre esta tarea." };
  const estado = String(fd.get("estado") ?? "");
  if (!["PENDIENTE", "EN_CURSO", "REQUIERE_ATENCION", "CUMPLIDO", "CANCELADO"].includes(estado)) return { error: "Estado inválido." };
  if (estado === "CANCELADO" && esProduccion(s)) return { error: "Producción no cancela tareas; repórtalo al director." };
  const reporte = String(fd.get("reporte") ?? "").trim().slice(0, 2000) || null;
  await db.compromiso.update({
    where: { id: compromisoId },
    data: {
      estado: estado as "PENDIENTE" | "EN_CURSO" | "REQUIERE_ATENCION" | "CUMPLIDO" | "CANCELADO",
      reporte: reporte ?? k.reporte,
      cumplidoEn: estado === "CUMPLIDO" ? (k.cumplidoEn ?? new Date()) : null,
    },
  });
  await avisarCambio(s, k, estado, reporte);
  await registrar({ usuarioId: s.usuarioId, accion: "editar", entidad: "compromiso", entidadId: compromisoId, detalle: { estado, reporte: reporte ? true : false } });
  revalidatePath(`/contratos/${k.contrato.id}`);
  revalidatePath("/tareas");
  revalidatePath("/");
  return { ok: true };
}

export async function cambiarEstadoCompromiso(compromisoId: string, estado: "PENDIENTE" | "EN_CURSO" | "REQUIERE_ATENCION" | "CUMPLIDO" | "CANCELADO") {
  const s = await requerirSesion();
  const k = await db.compromiso.findUnique({ where: { id: compromisoId }, include: { contrato: { select: { id: true, directorId: true } } } });
  if (!k) return;
  const autorizado = esProduccion(s) ? k.asignadoAId === s.usuarioId && estado !== "CANCELADO" : puedeCapturar(s) && autorizaContrato(s, k.contrato);
  if (!autorizado) return;
  await db.compromiso.update({ where: { id: compromisoId }, data: { estado, cumplidoEn: estado === "CUMPLIDO" ? (k.cumplidoEn ?? new Date()) : null } });
  await avisarCambio(s, k, estado, null);
  await registrar({ usuarioId: s.usuarioId, accion: "editar", entidad: "compromiso", entidadId: compromisoId, detalle: { estado } });
  revalidatePath(`/contratos/${k.contrato.id}`);
  revalidatePath("/tareas");
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
  revalidatePath("/tareas");
}
