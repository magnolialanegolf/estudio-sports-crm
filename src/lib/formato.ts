import { format, differenceInCalendarDays } from "date-fns";
import { es } from "date-fns/locale";

const mxn = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

export function dinero(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return mxn.format(n);
}

export function dineroCorto(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(abs >= 10_000_000 ? 1 : 2)} M`;
  if (abs >= 1_000) return `${Math.round(n / 1_000)} mil`;
  return String(n);
}

export function porcentaje(fraccion: number | null | undefined, decimales = 0): string {
  if (fraccion === null || fraccion === undefined) return "—";
  return `${(fraccion * 100).toFixed(decimales)} %`;
}

export function fecha(d: Date | null | undefined): string {
  if (!d) return "—";
  return format(d, "d MMM yyyy", { locale: es });
}

export function fechaLarga(d: Date | null | undefined): string {
  if (!d) return "—";
  return format(d, "d 'de' MMMM 'de' yyyy", { locale: es });
}

export function mesAnio(d: Date): string {
  return format(d, "MMMM yyyy", { locale: es });
}

export function fechaISO(d: Date | null | undefined): string {
  if (!d) return "";
  return format(d, "yyyy-MM-dd");
}

export function diasHasta(d: Date | null | undefined, desde = new Date()): number | null {
  if (!d) return null;
  return differenceInCalendarDays(d, desde);
}

export function textoDias(n: number | null): string {
  if (n === null) return "sin fecha";
  if (n === 0) return "hoy";
  if (n < 0) return `vencido hace ${Math.abs(n)} d`;
  return `en ${n} d`;
}

export const ETIQUETAS = {
  tipo: {
    COMERCIAL: "Comercial",
    PODCAST: "Pódcast",
    EMBAJADURIA: "Embajaduría",
    OTRO: "Otro",
  },
  estadoContrato: {
    PROPUESTA: "Propuesta",
    PENDIENTE_FIRMA: "Pendiente de firma",
    VIGENTE: "Vigente",
    FINALIZADO: "Finalizado",
    CANCELADO: "Cancelado",
  },
  estadoFactura: {
    POR_EMITIR: "Por emitir",
    PENDIENTE_AUTORIZACION: "Pendiente de autorización",
    EMITIDA: "Emitida",
    POR_CONFIRMAR: "Por confirmar",
  },
  estadoPago: {
    POR_COBRAR: "Por cobrar",
    PROGRAMADO: "Programado",
    SUJETO_A_FIRMA: "Sujeto a firma",
    SIN_PROGRAMAR: "Sin programar",
    PARCIAL: "Pago parcial",
    PAGADO: "Pagado",
  },
  modalidad: {
    EFECTIVO: "Efectivo",
    ESPECIE: "Especie",
    ACCIONES: "Acciones",
  },
  tipoCompromiso: {
    ENTREGABLE: "Entregable",
    SEGUIMIENTO: "Seguimiento",
  },
  estadoCompromiso: {
    PENDIENTE: "Pendiente",
    EN_CURSO: "En curso",
    CUMPLIDO: "Cumplido",
    CANCELADO: "Cancelado",
  },
  rol: {
    ADMIN_GENERAL: "Administrador general",
    DIRECTOR: "Director comercial",
    ADMINISTRACION: "Administración",
    LECTURA: "Lectura",
  },
} as const;

export function etiqueta<K extends keyof typeof ETIQUETAS>(
  grupo: K,
  valor: keyof (typeof ETIQUETAS)[K] | null | undefined,
): string {
  if (!valor) return "—";
  return (ETIQUETAS[grupo] as Record<string, string>)[valor as string] ?? String(valor);
}
