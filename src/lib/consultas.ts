import { addDays, startOfDay } from "date-fns";
import type { EstadoContrato, Prisma } from "@prisma/client";
import { db } from "./db";
import type { Sesion } from "./sesion";
import { filtroContratos, filtroDirector, veTodo } from "./acceso";
import { aplanarRegla, comisionProyectada, comisionesPorHito, resumirComisiones, type ReglaPlano, type ResumenComision } from "./comisiones";

// Consultas compartidas por las vistas. Todas reciben la sesión y aplican el filtro de fila.

export const ESTADOS_ACTIVOS: EstadoContrato[] = ["VIGENTE", "PENDIENTE_FIRMA", "PROPUESTA"];
export const ESTADOS_PIPELINE: EstadoContrato[] = ["PROPUESTA", "PENDIENTE_FIRMA"];
export const PONDERACION: Record<EstadoContrato, number> = {
  PROPUESTA: 0.4,
  PENDIENTE_FIRMA: 0.8,
  VIGENTE: 1,
  FINALIZADO: 1,
  CANCELADO: 0,
};

export async function reglasPara(s: Sesion, directorId?: string): Promise<ReglaPlano[]> {
  const where: Prisma.ReglaComisionWhereInput = directorId ? { directorId } : veTodo(s) ? {} : { directorId: s.directorId! };
  const reglas = await db.reglaComision.findMany({ where });
  return reglas.map(aplanarRegla);
}

export const incluirContratoBase = {
  marca: { select: { id: true, nombre: true, esDemo: true } },
  director: { select: { id: true, nombre: true, esDemo: true } },
} satisfies Prisma.ContratoInclude;

export async function directoresVisibles(s: Sesion) {
  return db.director.findMany({ where: { ...filtroDirector(s), activo: true }, orderBy: [{ esDemo: "asc" }, { nombre: "asc" }] });
}

// Hitos de cobro con su contrato, filtrados por sesión.
export async function hitosVisibles(s: Sesion, extra: Prisma.HitoCobroWhereInput = {}, directorId?: string) {
  const filtro = directorId ? { directorId } : filtroContratos(s);
  return db.hitoCobro.findMany({
    where: { contrato: filtro, ...extra },
    include: {
      contrato: {
        select: { id: true, codigo: true, proyecto: true, directorId: true, marcaId: true, tipo: true, inicio: true, estado: true, marca: { select: { nombre: true } }, director: { select: { nombre: true } } },
      },
    },
    orderBy: [{ fechaFacturar: "asc" }],
  });
}

export type Alerta = {
  tipo: "cobro_vencido" | "cobro_proximo" | "renovacion" | "compromiso_vencido" | "compromiso_proximo" | "por_confirmar";
  gravedad: "riesgo" | "alerta" | "neutro";
  titulo: string;
  detalle: string;
  fecha: Date | null;
  href: string;
  monto?: number;
};

// Agenda del día: vencidos y próximos 30 días. Si se pasa directorId, se restringe a esa cartera.
export async function agenda(s: Sesion, horizonteDias = 30, directorId?: string) {
  const hoy = startOfDay(new Date());
  const limite = addDays(hoy, horizonteDias);
  const filtro = directorId ? { directorId } : filtroContratos(s);

  const [hitos, compromisos, contratos] = await Promise.all([
    db.hitoCobro.findMany({
      where: {
        contrato: { ...filtro, estado: { in: ["VIGENTE", "PENDIENTE_FIRMA"] } },
        estadoPago: { in: ["POR_COBRAR", "PROGRAMADO", "PARCIAL"] },
        fechaFacturar: { lte: limite },
      },
      include: { contrato: { select: { id: true, codigo: true, marca: { select: { nombre: true } } } } },
      orderBy: { fechaFacturar: "asc" },
    }),
    db.compromiso.findMany({
      where: { contrato: filtro, OR: [{ estado: { in: ["PENDIENTE", "EN_CURSO"] }, fecha: { lte: limite } }, { estado: "REQUIERE_ATENCION" }] },
      include: { contrato: { select: { id: true, codigo: true, marca: { select: { nombre: true } } } }, asignadoA: { select: { nombre: true } } },
      orderBy: { fecha: "asc" },
    }),
    db.contrato.findMany({
      where: { ...filtro, estado: "VIGENTE", vencimiento: { lte: addDays(hoy, 90) } },
      include: { marca: { select: { nombre: true } }, renovacion: { select: { id: true, estado: true } } },
      orderBy: { vencimiento: "asc" },
    }),
  ]);

  const alertas: Alerta[] = [];
  for (const h of hitos) {
    const vencido = h.fechaFacturar! < hoy;
    alertas.push({
      tipo: vencido ? "cobro_vencido" : "cobro_proximo",
      gravedad: vencido ? "riesgo" : "alerta",
      titulo: `${h.contrato.marca.nombre} · ${h.concepto}`,
      detalle: vencido ? "Cobro vencido sin registro de pago" : "Facturar o cobrar",
      fecha: h.fechaFacturar,
      href: `/contratos/${h.contrato.id}`,
      monto: h.importe - h.montoRecibido,
    });
  }
  for (const k of compromisos) {
    const atencion = k.estado === "REQUIERE_ATENCION";
    const vencido = atencion || (!!k.fecha && k.fecha < hoy);
    const quien = k.asignadoA ? k.asignadoA.nombre : k.responsable ?? "sin responsable";
    alertas.push({
      tipo: vencido ? "compromiso_vencido" : "compromiso_proximo",
      gravedad: vencido ? "riesgo" : "neutro",
      titulo: `${k.contrato.marca.nombre} · ${k.descripcion}`,
      detalle: atencion ? `Requiere atención · ${quien}${k.reporte ? ` · ${k.reporte.slice(0, 120)}` : ""}` : k.asignadoA ? `Responsable: ${k.asignadoA.nombre}${k.estado === "EN_CURSO" ? " · en curso" : ""}` : k.responsable ? `Responsable: ${k.responsable}` : "Sin responsable asignado",
      fecha: k.fecha,
      href: `/tareas/${k.id}`,
    });
  }
  for (const c of contratos) {
    const dias = Math.ceil((c.vencimiento!.getTime() - hoy.getTime()) / 86_400_000);
    const tieneRenovacion = c.renovacion && c.renovacion.estado !== "CANCELADO";
    alertas.push({
      tipo: "renovacion",
      gravedad: dias <= 30 && !tieneRenovacion ? "riesgo" : dias <= 60 ? "alerta" : "neutro",
      titulo: `${c.marca.nombre} · ${c.proyecto}`,
      detalle: tieneRenovacion ? `Vence en ${dias} d · renovación en curso` : `Vence en ${dias} d · sin renovación registrada`,
      fecha: c.vencimiento,
      href: `/contratos/${c.id}`,
      monto: c.monto ?? undefined,
    });
  }
  alertas.sort((a, b) => (a.fecha?.getTime() ?? 0) - (b.fecha?.getTime() ?? 0));
  return alertas;
}

export type ResumenDirector = {
  director: { id: string; nombre: string; esDemo: boolean };
  marcasActivas: number;
  contratosVigentes: number;
  contratosPipeline: number;
  valorVigente: number;
  pipelineNominal: number;
  pipelinePonderado: number;
  cobrado: number;
  cobradoConfirmado: number;
  porCobrar: number; // de contratos vigentes y pendientes de firma
  vencido: number;
  renovaciones90: number;
  compromisosVencidos: number;
  porConfirmar: number; // hitos sin confirmar
  comisiones: ResumenComision;
};

// Resumen ejecutivo por director. Base del tablero del administrador y de los reportes.
export async function resumenPorDirector(s: Sesion, directorIds?: string[]): Promise<ResumenDirector[]> {
  const hoy = startOfDay(new Date());
  const directores = await db.director.findMany({
    where: { ...filtroDirector(s), activo: true, ...(directorIds ? { id: { in: directorIds } } : {}) },
    orderBy: [{ esDemo: "asc" }, { nombre: "asc" }],
  });
  const out: ResumenDirector[] = [];
  for (const dir of directores) {
    const [contratos, hitos, reglas, pagos, carteras, compromisosVencidos] = await Promise.all([
      db.contrato.findMany({ where: { directorId: dir.id }, select: { id: true, estado: true, monto: true, vencimiento: true, marcaId: true, tipo: true, inicio: true, directorId: true } }),
      db.hitoCobro.findMany({
        where: { contrato: { directorId: dir.id } },
        include: { contrato: { select: { id: true, directorId: true, marcaId: true, tipo: true, inicio: true, estado: true } } },
      }),
      reglasPara(s, dir.id),
      db.pagoComision.findMany({ where: { directorId: dir.id }, select: { monto: true } }),
      db.cartera.count({ where: { directorId: dir.id, hasta: null } }),
      db.compromiso.count({ where: { contrato: { directorId: dir.id }, estado: { in: ["PENDIENTE", "EN_CURSO", "REQUIERE_ATENCION"] }, fecha: { lt: hoy } } }),
    ]);

    const vigentes = contratos.filter((c) => c.estado === "VIGENTE");
    const pipeline = contratos.filter((c) => ESTADOS_PIPELINE.includes(c.estado));
    const activos = hitos.filter((h) => h.contrato.estado === "VIGENTE" || h.contrato.estado === "PENDIENTE_FIRMA");

    let proyectada = 0;
    for (const h of activos) proyectada += comisionProyectada(h, h.contrato, reglas);

    const porHito = comisionesPorHito(hitos, reglas);
    out.push({
      director: { id: dir.id, nombre: dir.nombre, esDemo: dir.esDemo },
      marcasActivas: carteras,
      contratosVigentes: vigentes.length,
      contratosPipeline: pipeline.length,
      valorVigente: vigentes.reduce((a, c) => a + (c.monto ?? 0), 0),
      pipelineNominal: pipeline.reduce((a, c) => a + (c.monto ?? 0), 0),
      pipelinePonderado: pipeline.reduce((a, c) => a + (c.monto ?? 0) * PONDERACION[c.estado], 0),
      cobrado: hitos.reduce((a, h) => a + h.montoRecibido, 0),
      cobradoConfirmado: hitos.filter((h) => h.confirmado).reduce((a, h) => a + h.montoRecibido, 0),
      porCobrar: activos.reduce((a, h) => a + Math.max(h.importe - h.montoRecibido, 0), 0),
      vencido: activos
        .filter((h) => h.fechaFacturar && h.fechaFacturar < hoy && h.estadoPago !== "PAGADO")
        .reduce((a, h) => a + Math.max(h.importe - h.montoRecibido, 0), 0),
      renovaciones90: vigentes.filter((c) => c.vencimiento && c.vencimiento <= addDays(hoy, 90)).length,
      compromisosVencidos,
      porConfirmar: hitos.filter((h) => !h.confirmado && h.montoRecibido > 0).length,
      comisiones: resumirComisiones(porHito, pagos, proyectada),
    });
  }
  return out;
}

export function sumarResumenes(rs: ResumenDirector[]): Omit<ResumenDirector, "director"> {
  const base: Omit<ResumenDirector, "director"> = {
    marcasActivas: 0,
    contratosVigentes: 0,
    contratosPipeline: 0,
    valorVigente: 0,
    pipelineNominal: 0,
    pipelinePonderado: 0,
    cobrado: 0,
    cobradoConfirmado: 0,
    porCobrar: 0,
    vencido: 0,
    renovaciones90: 0,
    compromisosVencidos: 0,
    porConfirmar: 0,
    comisiones: { devengadaConfirmada: 0, devengadaPorConfirmar: 0, pagada: 0, proyectada: 0, sinRegla: 0 },
  };
  for (const r of rs) {
    for (const k of Object.keys(base) as (keyof typeof base)[]) {
      if (k === "comisiones") {
        for (const c of Object.keys(base.comisiones) as (keyof ResumenComision)[]) base.comisiones[c] += r.comisiones[c];
      } else {
        (base[k] as number) += r[k] as number;
      }
    }
  }
  return base;
}

// Cobranza por antigüedad para la vista de cobranza y los reportes.
export type TramoAntiguedad = { etiqueta: string; monto: number; hitos: number };

export function antiguedad(hitos: { fechaFacturar: Date | null; importe: number; montoRecibido: number; estadoPago: string }[], hoy = startOfDay(new Date())): TramoAntiguedad[] {
  const tramos: TramoAntiguedad[] = [
    { etiqueta: "Vencido > 90 d", monto: 0, hitos: 0 },
    { etiqueta: "Vencido 31–90 d", monto: 0, hitos: 0 },
    { etiqueta: "Vencido 1–30 d", monto: 0, hitos: 0 },
    { etiqueta: "Próximos 30 d", monto: 0, hitos: 0 },
    { etiqueta: "31–90 d", monto: 0, hitos: 0 },
    { etiqueta: "Más de 90 d", monto: 0, hitos: 0 },
    { etiqueta: "Sin fecha", monto: 0, hitos: 0 },
  ];
  for (const h of hitos) {
    if (h.estadoPago === "PAGADO") continue;
    const pendiente = Math.max(h.importe - h.montoRecibido, 0);
    if (pendiente === 0) continue;
    let i = 6;
    if (h.fechaFacturar) {
      const dias = Math.round((h.fechaFacturar.getTime() - hoy.getTime()) / 86_400_000);
      if (dias < -90) i = 0;
      else if (dias < -30) i = 1;
      else if (dias < 0) i = 2;
      else if (dias <= 30) i = 3;
      else if (dias <= 90) i = 4;
      else i = 5;
    }
    tramos[i].monto += pendiente;
    tramos[i].hitos += 1;
  }
  return tramos;
}
