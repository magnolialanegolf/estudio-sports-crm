import { fechaCobro } from "@/lib/formato";
import { addMonths, endOfMonth, format, startOfDay, startOfMonth, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import type { EstadoContrato } from "@prisma/client";
import { db } from "./db";
import type { Sesion } from "./sesion";
import { antiguedad, ESTADOS_PIPELINE, PONDERACION, reglasPara, resumenPorDirector, sumarResumenes, type ResumenDirector, type TramoAntiguedad } from "./consultas";
import { comisionesPorHito } from "./comisiones";

// Datos de los informes (director → socios, consolidado del administrador).
// Todo se calcula en el momento a partir de la base: el informe siempre está al día.

export type Periodo = { desde: Date; hasta: Date; etiqueta: string };

export function periodoDesdeParametros(p: { desde?: string; hasta?: string; periodo?: string }): Periodo {
  const hoy = startOfDay(new Date());
  const parse = (v?: string) => (v ? new Date(`${v}T12:00:00.000Z`) : null);
  const d = parse(p.desde);
  const h = parse(p.hasta);
  if (d && h && !Number.isNaN(d.getTime()) && !Number.isNaN(h.getTime())) {
    return { desde: d, hasta: h, etiqueta: `${format(d, "d MMM yyyy", { locale: es })} – ${format(h, "d MMM yyyy", { locale: es })}` };
  }
  switch (p.periodo) {
    case "mes":
      return { desde: startOfMonth(hoy), hasta: endOfMonth(hoy), etiqueta: format(hoy, "MMMM yyyy", { locale: es }) };
    case "anio":
      return { desde: new Date(Date.UTC(hoy.getFullYear(), 0, 1, 12)), hasta: new Date(Date.UTC(hoy.getFullYear(), 11, 31, 12)), etiqueta: `Año ${hoy.getFullYear()}` };
    case "todo":
      return { desde: new Date(Date.UTC(2000, 0, 1, 12)), hasta: new Date(Date.UTC(2100, 0, 1, 12)), etiqueta: "Histórico completo" };
    case "trimestre":
    default: {
      const q = Math.floor(hoy.getMonth() / 3);
      const desde = new Date(Date.UTC(hoy.getFullYear(), q * 3, 1, 12));
      const hasta = endOfMonth(new Date(Date.UTC(hoy.getFullYear(), q * 3 + 2, 1, 12)));
      return { desde, hasta, etiqueta: `${q + 1}.º trimestre ${hoy.getFullYear()}` };
    }
  }
}

export type Informe = {
  generadoEl: Date;
  periodo: Periodo;
  resumenes: ResumenDirector[];
  total: ReturnType<typeof sumarResumenes>;
  logros: {
    contratosGanados: { id: string; marca: string; proyecto: string; monto: number | null; inicio: Date | null; director: string }[];
    cobrosRecibidos: { id: string; marca: string; concepto: string; monto: number; fecha: Date | null; confirmado: boolean; contratoId: string }[];
    totalCobradoPeriodo: number;
    compromisosCumplidos: { id: string; marca: string; descripcion: string; fecha: Date | null; contratoId: string }[];
    propuestasEnviadas: { id: string; marca: string; proyecto: string; monto: number | null; estado: EstadoContrato }[];
  };
  cartera: { marca: string; marcaId: string; director: string; vigentes: number; valorVigente: number; cobrado: number; porCobrar: number; proximoCobro: Date | null }[];
  mensual: { categorias: string[]; cobrado: number[]; proyectado: number[] };
  antiguedad: TramoAntiguedad[];
  vencidos: { id: string; marca: string; concepto: string; pendiente: number; fecha: Date | null; contratoId: string }[];
  pipeline: { estado: EstadoContrato; cantidad: number; nominal: number; ponderado: number }[];
  renovaciones: { id: string; marca: string; proyecto: string; vencimiento: Date | null; monto: number | null; renovacionEstado: EstadoContrato | null }[];
  comisiones: { marca: string; concepto: string; cobrado: number; comision: number; fecha: Date | null; confirmado: boolean }[] | null;
  pendientesConfirmar: { id: string; marca: string; proyecto: string; observaciones: string }[];
};

export async function construirInforme(s: Sesion, args: { directorIds?: string[]; periodo: Periodo; incluirComisiones: boolean }): Promise<Informe> {
  const { periodo } = args;
  const hoy = startOfDay(new Date());
  const resumenes = await resumenPorDirector(s, args.directorIds);
  const ids = resumenes.map((r) => r.director.id);
  const filtro = { directorId: { in: ids } };

  const [contratos, hitos, compromisosCumplidos] = await Promise.all([
    db.contrato.findMany({
      where: filtro,
      include: { marca: { select: { id: true, nombre: true } }, director: { select: { nombre: true } }, renovacion: { select: { estado: true } }, hitos: true },
      orderBy: [{ marca: { nombre: "asc" } }],
    }),
    db.hitoCobro.findMany({
      where: { contrato: filtro },
      include: { contrato: { select: { id: true, codigo: true, directorId: true, marcaId: true, tipo: true, inicio: true, estado: true, marca: { select: { nombre: true } } } } },
    }),
    db.compromiso.findMany({
      where: { contrato: filtro, estado: "CUMPLIDO", actualizadoEn: { gte: periodo.desde, lte: periodo.hasta } },
      include: { contrato: { select: { id: true, marca: { select: { nombre: true } } } } },
      orderBy: { fecha: "desc" },
    }),
  ]);

  const enPeriodo = (d: Date | null) => !!d && d >= periodo.desde && d <= periodo.hasta;

  const contratosGanados = contratos
    .filter((c) => (c.estado === "VIGENTE" || c.estado === "FINALIZADO") && (enPeriodo(c.inicio) || (!c.inicio && enPeriodo(c.creadoEn))))
    .map((c) => ({ id: c.id, marca: c.marca.nombre, proyecto: c.proyecto, monto: c.monto, inicio: c.inicio, director: c.director.nombre }));

  const cobrosPeriodo = hitos.filter((h) => h.montoRecibido > 0 && enPeriodo(h.fechaPago ?? h.fechaFacturar));
  const cobrosRecibidos = cobrosPeriodo
    .map((h) => ({ id: h.id, marca: h.contrato.marca.nombre, concepto: h.concepto, monto: h.montoRecibido, fecha: h.fechaPago ?? h.fechaFacturar, confirmado: h.confirmado, contratoId: h.contrato.id }))
    .sort((a, b) => (b.fecha?.getTime() ?? 0) - (a.fecha?.getTime() ?? 0));

  const propuestasEnviadas = contratos
    .filter((c) => ESTADOS_PIPELINE.includes(c.estado))
    .map((c) => ({ id: c.id, marca: c.marca.nombre, proyecto: c.proyecto, monto: c.monto, estado: c.estado }));

  // Cartera por marca
  const porMarca = new Map<string, Informe["cartera"][number]>();
  for (const c of contratos) {
    if (c.estado === "CANCELADO") continue;
    const k = c.marca.id;
    if (!porMarca.has(k)) porMarca.set(k, { marca: c.marca.nombre, marcaId: k, director: c.director.nombre, vigentes: 0, valorVigente: 0, cobrado: 0, porCobrar: 0, proximoCobro: null });
    const m = porMarca.get(k)!;
    if (c.estado === "VIGENTE") {
      m.vigentes += 1;
      m.valorVigente += c.monto ?? 0;
    }
    for (const h of c.hitos) {
      m.cobrado += h.montoRecibido;
      if (c.estado === "VIGENTE" || c.estado === "PENDIENTE_FIRMA") {
        const pend = Math.max(h.importe - h.montoRecibido, 0);
        m.porCobrar += pend;
        if (pend > 0 && h.fechaFacturar && h.fechaFacturar >= hoy && (!m.proximoCobro || h.fechaFacturar < m.proximoCobro)) m.proximoCobro = h.fechaFacturar;
      }
    }
  }
  const cartera = [...porMarca.values()].sort((a, b) => b.valorVigente - a.valorVigente || b.cobrado - a.cobrado);

  // Serie mensual: 6 meses atrás y 6 adelante
  const meses: Date[] = [];
  for (let i = -6; i <= 6; i++) meses.push(startOfMonth(i < 0 ? subMonths(hoy, -i) : addMonths(hoy, i)));
  const clave = (d: Date) => format(d, "yyyy-MM");
  const cobradoMes = new Map(meses.map((m) => [clave(m), 0]));
  const proyectadoMes = new Map(meses.map((m) => [clave(m), 0]));
  for (const h of hitos) {
    if (h.montoRecibido > 0 && h.fechaPago && cobradoMes.has(clave(h.fechaPago))) cobradoMes.set(clave(h.fechaPago), cobradoMes.get(clave(h.fechaPago))! + h.montoRecibido);
    const pend = h.importe - h.montoRecibido;
    if (pend > 0 && h.fechaFacturar && (h.contrato.estado === "VIGENTE" || h.contrato.estado === "PENDIENTE_FIRMA") && proyectadoMes.has(clave(h.fechaFacturar)))
      proyectadoMes.set(clave(h.fechaFacturar), proyectadoMes.get(clave(h.fechaFacturar))! + pend);
  }
  const mensual = {
    categorias: meses.map((m) => format(m, "MMM yy", { locale: es })),
    cobrado: meses.map((m) => cobradoMes.get(clave(m))!),
    proyectado: meses.map((m) => proyectadoMes.get(clave(m))!),
  };

  const activos = hitos.filter((h) => h.contrato.estado === "VIGENTE" || h.contrato.estado === "PENDIENTE_FIRMA");
  const tramos = antiguedad(activos, hoy);
  const vencidos = activos
    .filter((h) => { const f = fechaCobro(h); return f !== null && f < hoy && h.estadoPago !== "PAGADO" && h.importe - h.montoRecibido > 0; })
    .map((h) => ({ id: h.id, marca: h.contrato.marca.nombre, concepto: h.concepto, pendiente: h.importe - h.montoRecibido, fecha: fechaCobro(h), contratoId: h.contrato.id }))
    .sort((a, b) => (a.fecha?.getTime() ?? 0) - (b.fecha?.getTime() ?? 0));

  const pipeline = ESTADOS_PIPELINE.map((estado) => {
    const cs = contratos.filter((c) => c.estado === estado);
    const nominal = cs.reduce((a, c) => a + (c.monto ?? 0), 0);
    return { estado, cantidad: cs.length, nominal, ponderado: Math.round(nominal * PONDERACION[estado]) };
  });

  const renovaciones = contratos
    .filter((c) => c.estado === "VIGENTE" && c.vencimiento && c.vencimiento <= addMonths(hoy, 6))
    .sort((a, b) => a.vencimiento!.getTime() - b.vencimiento!.getTime())
    .map((c) => ({ id: c.id, marca: c.marca.nombre, proyecto: c.proyecto, vencimiento: c.vencimiento, monto: c.monto, renovacionEstado: c.renovacion?.estado ?? null }));

  let comisiones: Informe["comisiones"] = null;
  if (args.incluirComisiones) {
    const reglas = (await Promise.all(ids.map((id) => reglasPara(s, id)))).flat();
    comisiones = comisionesPorHito(cobrosPeriodo, reglas).map((k) => {
      const h = hitos.find((x) => x.id === k.hitoId)!;
      return { marca: h.contrato.marca.nombre, concepto: k.concepto, cobrado: k.montoCobrado, comision: k.comision, fecha: k.fecha, confirmado: k.confirmado };
    });
  }

  const pendientesConfirmar = contratos.filter((c) => c.observaciones && c.estado !== "CANCELADO").map((c) => ({ id: c.id, marca: c.marca.nombre, proyecto: c.proyecto, observaciones: c.observaciones! }));

  return {
    generadoEl: new Date(),
    periodo,
    resumenes,
    total: sumarResumenes(resumenes),
    logros: {
      contratosGanados,
      cobrosRecibidos,
      totalCobradoPeriodo: cobrosRecibidos.reduce((a, c) => a + c.monto, 0),
      compromisosCumplidos: compromisosCumplidos.map((k) => ({ id: k.id, marca: k.contrato.marca.nombre, descripcion: k.descripcion, fecha: k.fecha, contratoId: k.contrato.id })),
      propuestasEnviadas,
    },
    cartera,
    mensual,
    antiguedad: tramos,
    vencidos,
    pipeline,
    renovaciones,
    comisiones,
    pendientesConfirmar,
  };
}
