import { NextResponse, type NextRequest } from "next/server";
import { format } from "date-fns";
import { db } from "@/lib/db";
import { obtenerSesion } from "@/lib/sesion";
import { filtroContratos, filtroMarcas, veComisionesDeTodos, veTodo } from "@/lib/acceso";
import { comisionesPorHito } from "@/lib/comisiones";
import { hitosVisibles, reglasPara } from "@/lib/consultas";
import { ETIQUETAS } from "@/lib/formato";

// Exportación CSV (UTF-8 con BOM para Excel) e ICS. Respeta el filtro de fila de la sesión.

function csv(filas: (string | number | null | undefined)[][]): string {
  const esc = (v: string | number | null | undefined) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + filas.map((f) => f.map(esc).join(",")).join("\r\n");
}

const f = (d: Date | null | undefined) => (d ? format(d, "yyyy-MM-dd") : "");
const e = <K extends keyof typeof ETIQUETAS>(g: K, v: string | null | undefined) => (v ? ((ETIQUETAS[g] as Record<string, string>)[v] ?? v) : "");

export async function GET(req: NextRequest, { params }: { params: Promise<{ recurso: string }> }) {
  const s = await obtenerSesion();
  if (!s) return new NextResponse("No autorizado", { status: 401 });
  const { recurso } = await params;
  const directorParam = req.nextUrl.searchParams.get("director") || undefined;
  const directorId = veTodo(s) ? directorParam : s.directorId!;
  const filtro = directorId ? { directorId } : filtroContratos(s);
  const nombre = (base: string) => `${base}-${format(new Date(), "yyyyMMdd")}`;

  if (recurso === "marcas") {
    const marcas = await db.marca.findMany({ where: filtroMarcas(s), include: { carteras: { where: { hasta: null }, include: { director: true } }, _count: { select: { contratos: true, contactos: true } } }, orderBy: { nombre: "asc" } });
    const filas = [["Marca", "Sector", "Director actual", "Contratos", "Contactos", "Notas"], ...marcas.map((m) => [m.nombre, m.sector, m.carteras[0]?.director.nombre ?? "", m._count.contratos, m._count.contactos, m.notas])];
    return respuestaCsv(csv(filas), nombre("marcas"));
  }

  if (recurso === "contratos") {
    const contratos = await db.contrato.findMany({ where: filtro, include: { marca: true, director: true, hitos: true }, orderBy: [{ marca: { nombre: "asc" } }, { codigo: "asc" }] });
    const filas = [
      ["Código", "Marca", "Director", "Proyecto", "Tipo", "Estado", "Monto sin IVA", "Monto confirmado", "Inicio", "Vencimiento", "Duración meses", "Cobrado", "Pendiente", "Talento", "Notas", "Observaciones"],
      ...contratos.map((c) => {
        const cobrado = c.hitos.reduce((a, h) => a + h.montoRecibido, 0);
        const pend = c.hitos.reduce((a, h) => a + Math.max(h.importe - h.montoRecibido, 0), 0);
        return [c.codigo, c.marca.nombre, c.director.nombre, c.proyecto, e("tipo", c.tipo), e("estadoContrato", c.estado), c.monto, c.montoConfirmado ? "sí" : "no", f(c.inicio), f(c.vencimiento), c.duracionMeses, cobrado, pend, c.talento, c.notas, c.observaciones];
      }),
    ];
    return respuestaCsv(csv(filas), nombre("contratos"));
  }

  if (recurso === "cobranza" || recurso === "hitos") {
    const hitos = await hitosVisibles(s, recurso === "cobranza" ? { estadoPago: { not: "PAGADO" }, contrato: { estado: { in: ["VIGENTE", "PENDIENTE_FIRMA"] } } } : {}, directorId);
    const filas = [
      ["Marca", "Contrato", "Director", "Concepto", "Modalidad", "Importe", "Fecha a facturar", "Fecha orientativa", "Estado factura", "Folio", "Estado pago", "Recibido", "Fecha pago", "Pendiente", "Confirmado", "Notas"],
      ...hitos.map((h) => [h.contrato.marca.nombre, h.contrato.codigo, h.contrato.director.nombre, h.concepto, e("modalidad", h.modalidad), h.importe, f(h.fechaFacturar), h.fechaOrientativa, e("estadoFactura", h.estadoFactura), h.folioFactura, e("estadoPago", h.estadoPago), h.montoRecibido, f(h.fechaPago), h.importe - h.montoRecibido, h.confirmado ? "sí" : "no", h.notas]),
    ];
    return respuestaCsv(csv(filas), nombre(recurso));
  }

  if (recurso === "comisiones") {
    if (veTodo(s) && !veComisionesDeTodos(s)) return new NextResponse("Sin permiso", { status: 403 });
    const hitos = await hitosVisibles(s, { montoRecibido: { gt: 0 } }, directorId);
    const reglas = await reglasPara(s, directorId);
    const porHito = comisionesPorHito(hitos, reglas);
    const mapa = new Map(hitos.map((h) => [h.id, h]));
    const filas = [
      ["Marca", "Contrato", "Director", "Concepto", "Modalidad", "Fecha pago", "Cobrado", "Retención casa", "% director", "Comisión", "Confirmado"],
      ...porHito.map((k) => {
        const h = mapa.get(k.hitoId)!;
        return [h.contrato.marca.nombre, h.contrato.codigo, h.contrato.director.nombre, k.concepto, e("modalidad", k.modalidad), f(k.fecha), k.montoCobrado, k.regla?.pctCasa ?? "", k.regla?.pctDirector ?? "", k.comision, k.confirmado ? "sí" : "no"];
      }),
    ];
    return respuestaCsv(csv(filas), nombre("comisiones"));
  }

  if (recurso === "calendario.ics") {
    const [hitos, compromisos] = await Promise.all([
      db.hitoCobro.findMany({ where: { contrato: { ...filtro, estado: { in: ["VIGENTE", "PENDIENTE_FIRMA"] } }, fechaFacturar: { not: null }, estadoPago: { not: "PAGADO" } }, include: { contrato: { include: { marca: true } } } }),
      db.compromiso.findMany({ where: { contrato: filtro, fecha: { not: null }, estado: { in: ["PENDIENTE", "EN_CURSO"] } }, include: { contrato: { include: { marca: true } } } }),
    ]);
    const lineas = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Estudio Sports//CRM comercial//ES", "CALSCALE:GREGORIAN", "X-WR-CALNAME:Estudio Sports · CRM"];
    const dia = (d: Date) => format(d, "yyyyMMdd");
    const limpiar = (t: string) => t.replace(/[\\;,]/g, (m) => `\\${m}`).replace(/\n/g, "\\n");
    for (const h of hitos) {
      lineas.push("BEGIN:VEVENT", `UID:hito-${h.id}@estudiosports`, `DTSTAMP:${format(new Date(), "yyyyMMdd'T'HHmmss'Z'")}`, `DTSTART;VALUE=DATE:${dia(h.fechaFacturar!)}`, `SUMMARY:${limpiar(`Facturar · ${h.contrato.marca.nombre} · ${h.concepto} · $${h.importe.toLocaleString("es-MX")}`)}`, `DESCRIPTION:${limpiar(h.notas ?? "")}`, "CATEGORIES:Cobros", "END:VEVENT");
    }
    for (const k of compromisos) {
      lineas.push("BEGIN:VEVENT", `UID:compromiso-${k.id}@estudiosports`, `DTSTAMP:${format(new Date(), "yyyyMMdd'T'HHmmss'Z'")}`, `DTSTART;VALUE=DATE:${dia(k.fecha!)}`, `SUMMARY:${limpiar(`${k.contrato.marca.nombre} · ${k.descripcion}`)}`, `DESCRIPTION:${limpiar(k.responsable ? `Responsable: ${k.responsable}` : "")}`, "CATEGORIES:Acciones", "END:VEVENT");
    }
    lineas.push("END:VCALENDAR");
    return new NextResponse(lineas.join("\r\n"), {
      headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="${nombre("estudio-sports-calendario")}.ics"`, "Cache-Control": "no-store" },
    });
  }

  return new NextResponse("Recurso no disponible", { status: 404 });
}

function respuestaCsv(cuerpo: string, nombre: string) {
  return new NextResponse(cuerpo, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${nombre}.csv"`, "Cache-Control": "no-store" },
  });
}
