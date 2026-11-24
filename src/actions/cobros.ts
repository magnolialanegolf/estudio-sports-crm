"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { registrar } from "@/lib/bitacora";
import { autorizaContrato, esAdmin, puedeCapturar, puedeCobrar, requerirSesion } from "@/lib/acceso";
import { notificar, responsablesDeContrato } from "@/lib/avisos";
import { guardarArchivo } from "./documentos";
import type { Resultado } from "./util";

// Flujo de cobro: el director programa y factura, dirección autoriza, pagos registra el pago.

function revalidar(contratoId: string) {
  for (const r of [`/contratos/${contratoId}`, "/pagos", "/cobranza", "/avisos", "/"]) revalidatePath(r);
}

async function usuariosDePagos(): Promise<string[]> {
  const us = await db.usuario.findMany({ where: { activo: true, rol: { in: ["ADMINISTRACION", "ADMIN_GENERAL"] } }, select: { id: true } });
  return us.map((u) => u.id);
}

async function hitoCon(id: string) {
  return db.hitoCobro.findUnique({
    where: { id },
    include: { contrato: { select: { id: true, directorId: true, codigo: true, marca: { select: { nombre: true } } } }, documentos: { select: { categoria: true } } },
  });
}

// 1. El director sube factura PDF y XML y solicita autorización de cobro.
export async function solicitarAutorizacion(hitoId: string, _prev: Resultado, fd: FormData): Promise<Resultado> {
  const s = await requerirSesion();
  if (!puedeCapturar(s)) return { error: "Sin permiso." };
  const h = await hitoCon(hitoId);
  if (!h || !autorizaContrato(s, h.contrato)) return { error: "Hito no disponible." };
  if (h.estadoPago === "PAGADO") return { error: "El hito ya está pagado." };

  const pdf = fd.get("facturaPdf");
  const xml = fd.get("facturaXml");
  const folio = String(fd.get("folio") ?? "").trim().slice(0, 80) || null;
  const fechaStr = String(fd.get("fechaFacturar") ?? "");
  const vencStr = String(fd.get("fechaVencimiento") ?? "");
  const pendiente = h.importe - h.montoRecibido;
  const montoCrudo = String(fd.get("montoSolicitado") ?? "").replace(/[^\d.]/g, "");
  const montoSolicitado = montoCrudo ? Math.round(Number(montoCrudo)) : pendiente;
  if (!Number.isFinite(montoSolicitado) || montoSolicitado <= 0) return { error: "Indica el monto que se manda pagar." };
  if (montoSolicitado > pendiente) return { error: `El monto no puede exceder lo pendiente ($${pendiente.toLocaleString("es-MX")}).` };
  if (pdf instanceof File && pdf.size > 0) {
    const r = await guardarArchivo({ usuarioId: s.usuarioId, contratoId: h.contrato.id, hitoId, categoria: "FACTURA_PDF", archivo: pdf });
    if ("error" in r) return { error: `Factura PDF: ${r.error}` };
  }
  if (xml instanceof File && xml.size > 0) {
    const r = await guardarArchivo({ usuarioId: s.usuarioId, contratoId: h.contrato.id, hitoId, categoria: "FACTURA_XML", archivo: xml });
    if ("error" in r) return { error: `Factura XML: ${r.error}` };
  }
  const tiene = await db.documento.count({ where: { hitoId, categoria: { in: ["FACTURA_PDF", "FACTURA_XML"] } } });
  if (tiene === 0) return { error: "Adjunta la factura (PDF o XML) para solicitar la autorización." };

  await db.hitoCobro.update({
    where: { id: hitoId },
    data: {
      estadoFactura: "EMITIDA",
      folioFactura: folio ?? h.folioFactura,
      fechaFacturar: fechaStr ? new Date(`${fechaStr}T12:00:00.000Z`) : h.fechaFacturar,
      fechaVencimiento: vencStr ? new Date(`${vencStr}T12:00:00.000Z`) : h.fechaVencimiento,
      montoSolicitado,
      solicitadoEn: new Date(),
      solicitadoPorId: s.usuarioId,
      autorizadoEn: null,
      autorizadoPorId: null,
      estadoPago: h.estadoPago === "SIN_PROGRAMAR" || h.estadoPago === "SUJETO_A_FIRMA" ? "POR_COBRAR" : h.estadoPago,
    },
  });
  const admins = await db.usuario.findMany({ where: { activo: true, rol: "ADMIN_GENERAL" }, select: { id: true } });
  await notificar(admins.map((u) => u.id), `${s.nombre} solicita autorizar el cobro de ${h.contrato.marca.nombre} · ${h.concepto} · $${montoSolicitado.toLocaleString("es-MX")}${montoSolicitado < pendiente ? ` (parcialidad de $${pendiente.toLocaleString("es-MX")} pendientes)` : ""}`, "/pagos", s.usuarioId);
  await registrar({ usuarioId: s.usuarioId, accion: "editar", entidad: "hito", entidadId: hitoId, detalle: { paso: "solicitud de autorización", folio, fechaVencimiento: vencStr || null, montoSolicitado } });
  revalidar(h.contrato.id);
  return { ok: true };
}

// 2. El administrador general autoriza (o regresa) el cobro.
export async function autorizarCobro(hitoId: string, decision: "autorizar" | "regresar", fd: FormData) {
  const s = await requerirSesion();
  if (!esAdmin(s)) return;
  const h = await hitoCon(hitoId);
  if (!h) return;
  const motivo = String(fd.get("motivo") ?? "").trim().slice(0, 300);
  if (decision === "autorizar") {
    await db.hitoCobro.update({ where: { id: hitoId }, data: { autorizadoEn: new Date(), autorizadoPorId: s.usuarioId, estadoPago: h.estadoPago === "PAGADO" ? "PAGADO" : "PROGRAMADO" } });
    await notificar([...(await usuariosDePagos()), ...(await responsablesDeContrato(h.contrato.directorId))], `Cobro autorizado: ${h.contrato.marca.nombre} · ${h.concepto} · $${h.importe.toLocaleString("es-MX")}. Pagos puede registrar el pago.`, "/pagos", s.usuarioId);
  } else {
    await db.hitoCobro.update({ where: { id: hitoId }, data: { solicitadoEn: null, solicitadoPorId: null, autorizadoEn: null, autorizadoPorId: null, notas: motivo ? `${h.notas ? `${h.notas}\n` : ""}Regresado por dirección: ${motivo}` : h.notas } });
    await notificar(await responsablesDeContrato(h.contrato.directorId), `Cobro regresado por dirección: ${h.contrato.marca.nombre} · ${h.concepto}${motivo ? ` · ${motivo}` : ""}`, `/contratos/${h.contrato.id}`, s.usuarioId);
  }
  await registrar({ usuarioId: s.usuarioId, accion: "editar", entidad: "hito", entidadId: hitoId, detalle: { paso: decision, motivo: motivo || null } });
  revalidar(h.contrato.id);
}

// 3. Pagos registra el pago recibido con fecha y comprobante. También el director sobre su cartera.
export async function registrarPagoCobro(hitoId: string, _prev: Resultado, fd: FormData): Promise<Resultado> {
  const s = await requerirSesion();
  const h = await hitoCon(hitoId);
  if (!h) return { error: "Hito no disponible." };
  const esPagos = puedeCobrar(s);
  if (!esPagos && !(puedeCapturar(s) && autorizaContrato(s, h.contrato))) return { error: "Sin permiso." };
  const monto = Math.round(Number(String(fd.get("monto") ?? "").replace(/[^\d.]/g, "")));
  if (!Number.isFinite(monto) || monto <= 0) return { error: "Indica el monto recibido." };
  const fechaStr = String(fd.get("fecha") ?? "");
  const folio = String(fd.get("folio") ?? "").trim().slice(0, 80) || null;
  const comprobante = fd.get("comprobante");
  if (comprobante instanceof File && comprobante.size > 0) {
    const r = await guardarArchivo({ usuarioId: s.usuarioId, contratoId: h.contrato.id, hitoId, categoria: "COMPROBANTE", archivo: comprobante });
    if ("error" in r) return { error: `Comprobante: ${r.error}` };
  }
  const recibido = h.montoRecibido + monto;
  const liquidado = recibido >= h.importe;
  await db.hitoCobro.update({
    where: { id: hitoId },
    data: {
      montoRecibido: recibido,
      estadoPago: liquidado ? "PAGADO" : "PARCIAL",
      // Con saldo pendiente, la solicitud vigente queda cerrada: el director solicita la siguiente parcialidad.
      ...(liquidado ? {} : { solicitadoEn: null, solicitadoPorId: null, autorizadoEn: null, autorizadoPorId: null, montoSolicitado: null }),
      fechaPago: fechaStr ? new Date(`${fechaStr}T12:00:00.000Z`) : new Date(),
      folioFactura: folio ?? h.folioFactura,
      estadoFactura: folio || h.estadoFactura === "EMITIDA" ? "EMITIDA" : h.estadoFactura,
      confirmado: esPagos ? true : h.confirmado, // la cartera registra; pagos confirma
      pagoRegistradoPorId: s.usuarioId,
    },
  });
  await notificar([...(await responsablesDeContrato(h.contrato.directorId)), ...(await usuariosDePagos())], `${recibido >= h.importe ? "Pago registrado" : "Pago parcial registrado"}: ${h.contrato.marca.nombre} · ${h.concepto} · $${monto.toLocaleString("es-MX")}`, `/contratos/${h.contrato.id}`, s.usuarioId);
  await registrar({ usuarioId: s.usuarioId, accion: "editar", entidad: "hito", entidadId: hitoId, detalle: { paso: "pago", monto, folio, confirmado: esPagos } });
  revalidar(h.contrato.id);
  return { ok: true };
}
