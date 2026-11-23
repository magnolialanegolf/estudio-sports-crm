import type { HitoCobro, Modalidad, ReglaComision, TipoContrato } from "@prisma/client";

// Cálculo de comisiones. Nunca se captura una comisión devengada a mano:
// se deriva del cobro, la retención de la casa y la regla vigente del director.

export type ReglaPlano = {
  id: string;
  directorId: string;
  marcaId: string | null;
  tipo: TipoContrato | null;
  pctCasa: number;
  pctDirector: number;
  vigenteDesde: Date;
  vigenteHasta: Date | null;
  notas: string | null;
};

export function aplanarRegla(r: ReglaComision): ReglaPlano {
  return {
    id: r.id,
    directorId: r.directorId,
    marcaId: r.marcaId,
    tipo: r.tipo,
    pctCasa: Number(r.pctCasa),
    pctDirector: Number(r.pctDirector),
    vigenteDesde: r.vigenteDesde,
    vigenteHasta: r.vigenteHasta,
    notas: r.notas,
  };
}

function especificidad(r: ReglaPlano) {
  return (r.marcaId ? 2 : 0) + (r.tipo ? 1 : 0);
}

// Regla más específica vigente en la fecha dada para director, marca y tipo.
export function reglaAplicable(
  reglas: ReglaPlano[],
  args: { directorId: string; marcaId: string; tipo: TipoContrato; fecha: Date },
): ReglaPlano | null {
  const candidatas = reglas.filter(
    (r) =>
      r.directorId === args.directorId &&
      (r.marcaId === null || r.marcaId === args.marcaId) &&
      (r.tipo === null || r.tipo === args.tipo) &&
      r.vigenteDesde <= args.fecha &&
      (r.vigenteHasta === null || r.vigenteHasta >= args.fecha),
  );
  if (candidatas.length === 0) return null;
  candidatas.sort(
    (a, b) => especificidad(b) - especificidad(a) || b.vigenteDesde.getTime() - a.vigenteDesde.getTime(),
  );
  return candidatas[0];
}

export function calcularComision(montoCobrado: number, regla: ReglaPlano): number {
  return Math.round(montoCobrado * (1 - regla.pctCasa) * regla.pctDirector);
}

export type ComisionHito = {
  hitoId: string;
  contratoId: string;
  concepto: string;
  modalidad: Modalidad;
  montoCobrado: number;
  fecha: Date | null;
  confirmado: boolean;
  regla: ReglaPlano | null;
  comision: number; // 0 si no hay regla
};

type HitoConContrato = HitoCobro & {
  contrato: { id: string; directorId: string; marcaId: string; tipo: TipoContrato; inicio: Date | null };
};

// Comisión por cada hito con dinero recibido.
export function comisionesPorHito(hitos: HitoConContrato[], reglas: ReglaPlano[]): ComisionHito[] {
  return hitos
    .filter((h) => h.montoRecibido > 0)
    .map((h) => {
      const fechaBase = h.fechaPago ?? h.fechaFacturar ?? h.contrato.inicio ?? new Date();
      const regla = reglaAplicable(reglas, {
        directorId: h.contrato.directorId,
        marcaId: h.contrato.marcaId,
        tipo: h.contrato.tipo,
        fecha: fechaBase,
      });
      return {
        hitoId: h.id,
        contratoId: h.contrato.id,
        concepto: h.concepto,
        modalidad: h.modalidad,
        montoCobrado: h.montoRecibido,
        fecha: h.fechaPago,
        confirmado: h.confirmado,
        regla,
        comision: regla ? calcularComision(h.montoRecibido, regla) : 0,
      };
    });
}

// Comisión que generaría un hito aún no cobrado (proyección).
export function comisionProyectada(
  h: { importe: number; montoRecibido: number; fechaFacturar: Date | null },
  contrato: { directorId: string; marcaId: string; tipo: TipoContrato; inicio: Date | null },
  reglas: ReglaPlano[],
): number {
  const pendiente = Math.max(h.importe - h.montoRecibido, 0);
  if (pendiente === 0) return 0;
  const regla = reglaAplicable(reglas, {
    directorId: contrato.directorId,
    marcaId: contrato.marcaId,
    tipo: contrato.tipo,
    fecha: h.fechaFacturar ?? contrato.inicio ?? new Date(),
  });
  return regla ? calcularComision(pendiente, regla) : 0;
}

export type ResumenComision = {
  devengadaConfirmada: number;
  devengadaPorConfirmar: number;
  pagada: number;
  proyectada: number;
  sinRegla: number; // monto cobrado sin regla aplicable
};

export function resumirComisiones(
  porHito: ComisionHito[],
  pagos: { monto: number }[],
  proyectada: number,
): ResumenComision {
  const r: ResumenComision = {
    devengadaConfirmada: 0,
    devengadaPorConfirmar: 0,
    pagada: pagos.reduce((a, p) => a + p.monto, 0),
    proyectada,
    sinRegla: 0,
  };
  for (const c of porHito) {
    if (!c.regla) {
      r.sinRegla += c.montoCobrado;
      continue;
    }
    if (c.confirmado) r.devengadaConfirmada += c.comision;
    else r.devengadaPorConfirmar += c.comision;
  }
  return r;
}
