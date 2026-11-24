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

// Fecha que manda para "atrasado": la requerida de pago si existe; si no, la de facturación.
export function fechaCobro(h: { fechaVencimiento?: Date | null; fechaFacturar?: Date | null }): Date | null {
  return h.fechaVencimiento ?? h.fechaFacturar ?? null;
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
    PROSPECTO: "Prospecto",
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
    FECHA_CLAVE: "Fecha clave",
  },
  estadoCompromiso: {
    PENDIENTE: "Pendiente",
    EN_CURSO: "En curso",
    REQUIERE_ATENCION: "Requiere atención",
    CUMPLIDO: "Cumplido",
    CANCELADO: "Cancelado",
  },
  tipoIncidencia: {
    INCIDENCIA: "Incidencia",
    PENDIENTE: "Pendiente",
    PROBLEMA: "Problema",
    SOLICITUD: "Solicitud",
  },
  prioridad: {
    BAJA: "Baja",
    MEDIA: "Media",
    ALTA: "Alta",
    URGENTE: "Urgente",
  },
  estadoIncidencia: {
    ABIERTA: "Abierta",
    EN_ATENCION: "En atención",
    RESUELTA: "Resuelta",
    CERRADA: "Cerrada",
  },
  categoriaDocumento: {
    CONTRATO: "Contrato",
    FACTURA_PDF: "Factura PDF",
    FACTURA_XML: "Factura XML",
    COMPROBANTE: "Comprobante de pago",
    OTRO: "Otro",
  },
  rol: {
    ADMIN_GENERAL: "Administrador general",
    GERENTE_GENERAL: "Gerente general",
    DIRECTOR: "Director comercial",
    ASISTENTE_COMERCIAL: "Asistente comercial",
    ADMINISTRACION: "Pagos y administración",
    PRODUCCION: "Producción",
    CONTENIDOS: "Contenidos",
    OPERATIVO: "Operativo",
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
