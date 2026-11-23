// Carga inicial a partir del archivo "CRM Comercial Estudio Sport" (corte 23 nov 2026).
// Los datos se transcriben tal cual. Donde el archivo se contradice o marca
// "por confirmar", el registro queda con confirmado=false y la observación
// correspondiente, para resolverse con el director en la revisión del piloto.

import { PrismaClient, type EstadoContrato, type EstadoFactura, type EstadoPago, type Modalidad, type TipoContrato } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const d = (iso: string) => new Date(`${iso}T12:00:00.000Z`);

type HitoSeed = {
  concepto: string;
  importe: number;
  modalidad?: Modalidad;
  fechaFacturar?: string;
  fechaOrientativa?: string;
  estadoFactura?: EstadoFactura;
  estadoPago?: EstadoPago;
  montoRecibido?: number;
  fechaPago?: string;
  confirmado?: boolean;
  notas?: string;
};

type CompromisoSeed = {
  tipo?: "ENTREGABLE" | "SEGUIMIENTO";
  descripcion: string;
  fecha?: string;
  responsable?: string;
  estado?: "PENDIENTE" | "EN_CURSO" | "CUMPLIDO" | "CANCELADO";
};

type ContratoSeed = {
  codigo: string;
  marca: string;
  proyecto: string;
  tipo: TipoContrato;
  estado: EstadoContrato;
  monto: number | null;
  montoConfirmado?: boolean;
  inicio?: string;
  inicioConfirmado?: boolean;
  vencimiento?: string;
  vencimientoConfirmado?: boolean;
  duracionMeses?: number;
  talento?: string;
  renovacionDe?: string;
  notas?: string;
  observaciones?: string;
  hitos: HitoSeed[];
  compromisos?: CompromisoSeed[];
};

function mensualidades(args: {
  concepto: (n: number) => string;
  importe: number;
  desde: string; // yyyy-mm-dd, día 1
  cantidad: number;
  estadoPago?: EstadoPago;
  estadoFactura?: EstadoFactura;
  notas?: string;
}): HitoSeed[] {
  const [y, m, day] = args.desde.split("-").map(Number);
  const out: HitoSeed[] = [];
  for (let i = 0; i < args.cantidad; i++) {
    const dt = new Date(Date.UTC(y, m - 1 + i, day, 12));
    out.push({
      concepto: args.concepto(i + 1),
      importe: args.importe,
      fechaFacturar: dt.toISOString().slice(0, 10),
      estadoFactura: args.estadoFactura ?? "POR_EMITIR",
      estadoPago: args.estadoPago ?? "POR_COBRAR",
      confirmado: false,
      notas: args.notas,
    });
  }
  return out;
}

const CONTRATOS: ContratoSeed[] = [
  // ───────── Play Do It ─────────
  {
    codigo: "PLAY-2024-2026",
    marca: "Play Do It",
    proyecto: "Comercial 2024–2026",
    tipo: "COMERCIAL",
    estado: "VIGENTE",
    monto: 4_800_000,
    montoConfirmado: true,
    vencimiento: "2026-12-31",
    vencimientoConfirmado: true,
    duracionMeses: 24,
    notas: "Renovación en curso. Última factura del contrato anterior pendiente en diciembre de 2026.",
    observaciones: "Inicio exacto por confirmar. El historial registra el monto del contrato pero el cobro acumulado está por validar.",
    hitos: [
      {
        concepto: "Cobros 2024–2026 (acumulado histórico)",
        importe: 4_600_000,
        estadoFactura: "POR_CONFIRMAR",
        estadoPago: "PAGADO",
        montoRecibido: 4_600_000,
        confirmado: false,
        notas: "Importe deducido: monto del contrato menos la última factura pendiente. Cobro por validar con facturas.",
      },
      {
        concepto: "Última factura · contrato anterior",
        importe: 200_000,
        fechaFacturar: "2026-12-01",
        fechaOrientativa: "Diciembre 2026 · fecha de depósito por confirmar",
        estadoFactura: "POR_EMITIR",
        estadoPago: "POR_COBRAR",
        confirmado: true,
        notas: "Facturar $200,000 el 01/12/2026.",
      },
    ],
    compromisos: [{ tipo: "SEGUIMIENTO", descripcion: "Preparar renovación", responsable: "Director comercial" }],
  },
  {
    codigo: "PLAY-REN-2026",
    marca: "Play Do It",
    proyecto: "Renovación 2027–2028",
    tipo: "COMERCIAL",
    estado: "PENDIENTE_FIRMA",
    monto: 5_160_000,
    montoConfirmado: true,
    inicio: "2027-01-01",
    inicioConfirmado: true,
    vencimiento: "2028-12-31",
    vencimientoConfirmado: true,
    duracionMeses: 24,
    renovacionDe: "PLAY-2024-2026",
    notas: "Acuerdo confirmado, contrato en proceso de firma. Facturas y pagos mensuales desde enero de 2027.",
    observaciones: "Importe mensual y comisión por confirmar. Se generaron 24 mensualidades de $215,000 como supuesto (5,160,000 / 24).",
    hitos: mensualidades({
      concepto: (n) => `Mensualidad ${n} de 24`,
      importe: 215_000,
      desde: "2027-01-01",
      cantidad: 24,
      estadoPago: "SUJETO_A_FIRMA",
      notas: "Importe mensual supuesto; confirmar con el contrato firmado.",
    }),
    compromisos: [
      { tipo: "SEGUIMIENTO", descripcion: "Recibir el documento firmado", fecha: "2026-11-30", responsable: "Director comercial" },
    ],
  },
  {
    codigo: "PLAY-POD-T1",
    marca: "Play Do It",
    proyecto: "Pódcast · Temporada 1",
    tipo: "PODCAST",
    estado: "FINALIZADO",
    monto: 2_000_000,
    montoConfirmado: true,
    notas: "Se asume 10 capítulos por temporada, pendiente confirmar.",
    observaciones: "Cobro reportado; fecha, factura y pago de comisión por verificar.",
    hitos: [
      { concepto: "Temporada 1", importe: 2_000_000, estadoFactura: "POR_CONFIRMAR", estadoPago: "PAGADO", montoRecibido: 2_000_000, confirmado: false, notas: "Pago recibido de la marca; fecha y factura por confirmar." },
    ],
    compromisos: [{ tipo: "SEGUIMIENTO", descripcion: "Confirmar si la comisión fue pagada", responsable: "Director comercial" }],
  },
  {
    codigo: "PLAY-POD-T2",
    marca: "Play Do It",
    proyecto: "Pódcast · Temporada 2",
    tipo: "PODCAST",
    estado: "FINALIZADO",
    monto: 1_200_000,
    montoConfirmado: true,
    observaciones: "Cobro reportado; fecha, factura y pago de comisión por verificar.",
    hitos: [
      { concepto: "Temporada 2", importe: 1_200_000, estadoFactura: "POR_CONFIRMAR", estadoPago: "PAGADO", montoRecibido: 1_200_000, confirmado: false, notas: "Pago recibido de la marca; fecha y factura por confirmar." },
    ],
    compromisos: [{ tipo: "SEGUIMIENTO", descripcion: "Confirmar si la comisión fue pagada", responsable: "Director comercial" }],
  },
  {
    codigo: "PLAY-POD-T3",
    marca: "Play Do It",
    proyecto: "Pódcast · Temporada 3",
    tipo: "PODCAST",
    estado: "PROPUESTA",
    monto: 1_200_000,
    notas: "Patrocinio de la tercera temporada. Inicio de temporada, facturación y fechas de pago por confirmar.",
    observaciones: "Facturación y Cobranza indica propuesta pendiente de envío antes del 16 de noviembre de 2026; Pendientes comerciales la registra como propuesta pendiente. No considerar cuenta por cobrar.",
    hitos: [
      { concepto: "Patrocinio temporada 3", importe: 1_200_000, fechaOrientativa: "Inicio de temporada por confirmar", estadoFactura: "POR_EMITIR", estadoPago: "SIN_PROGRAMAR", confirmado: false },
    ],
    compromisos: [
      { tipo: "SEGUIMIENTO", descripcion: "Confirmar inicio de temporada y calendario de facturación y pagos", responsable: "Director comercial" },
    ],
  },

  // ───────── Little Caesars ─────────
  {
    codigo: "LC-ANT-2026",
    marca: "Little Caesars",
    proyecto: "Contrato anterior (12 meses)",
    tipo: "COMERCIAL",
    estado: "FINALIZADO",
    monto: 4_000_000,
    montoConfirmado: true,
    vencimiento: "2026-07-31",
    duracionMeses: 12,
    notas: "Histórico. Venció en julio de 2026.",
    observaciones: "Fecha de inicio exacta por confirmar. Cobro por validar. Estado de pago de la comisión no confirmado.",
    hitos: [
      { concepto: "Contrato 12 meses (acumulado histórico)", importe: 4_000_000, estadoFactura: "POR_CONFIRMAR", estadoPago: "PAGADO", montoRecibido: 4_000_000, confirmado: false, notas: "Cobro por validar." },
    ],
  },
  {
    codigo: "LC-REN-2026",
    marca: "Little Caesars",
    proyecto: "Renovación propuesta (12 meses)",
    tipo: "COMERCIAL",
    estado: "PROPUESTA",
    monto: 4_000_000,
    duracionMeses: 12,
    renovacionDe: "LC-ANT-2026",
    notas: "Mismas condiciones de monto y duración que el contrato anterior. No contabilizar como ganado.",
    observaciones: "Fechas exactas de inicio y fin por confirmar.",
    hitos: [
      { concepto: "Renovación 12 meses", importe: 4_000_000, fechaOrientativa: "Sujeto a aceptación", estadoPago: "SIN_PROGRAMAR", confirmado: false },
    ],
    compromisos: [
      { tipo: "SEGUIMIENTO", descripcion: "Dar seguimiento a confirmación y aceptación de propuesta", responsable: "Director comercial" },
    ],
  },

  // ───────── Hisense ─────────
  {
    codigo: "HIS-2026",
    marca: "Hisense",
    proyecto: "Contrato vigente 2026",
    tipo: "COMERCIAL",
    estado: "VIGENTE",
    monto: 2_500_000,
    montoConfirmado: true,
    inicio: "2026-01-01",
    inicioConfirmado: false,
    vencimiento: "2026-12-31",
    vencimientoConfirmado: true,
    duracionMeses: 12,
    notas: "Primer 50 % cobrado aprox. julio 2026. Segundo 50 % pendiente de autorización para facturar.",
    observaciones:
      "Contradicción en el segundo pago: $1,250,000 en Facturación y Cobranza frente a $1,170,000 en Agenda de facturas (estimación tras descuento por producto de $80,000, por confirmar). Se registró el saldo neto en efectivo y el descuento como hito en especie. Criterio de comisión solo sobre efectivo por confirmar.",
    hitos: [
      { concepto: "Primer 50 %", importe: 1_250_000, fechaOrientativa: "Julio 2026", estadoFactura: "POR_CONFIRMAR", estadoPago: "PAGADO", montoRecibido: 1_250_000, fechaPago: "2026-07-31", confirmado: false, notas: "Primer pago reportado como recibido; falta verificar emisión de factura y monto." },
      { concepto: "Segundo 50 % · saldo neto en efectivo", importe: 1_170_000, fechaFacturar: "2026-11-23", fechaOrientativa: "Por acordar", estadoFactura: "PENDIENTE_AUTORIZACION", estadoPago: "POR_COBRAR", confirmado: false, notas: "Confirmar importe corregido antes de facturar. Solicitar OK para emitir segunda factura." },
      { concepto: "Productos recibidos (descuento estimado)", importe: 80_000, modalidad: "ESPECIE", fechaOrientativa: "Entrega 12 nov 2026", estadoFactura: "POR_CONFIRMAR", estadoPago: "PAGADO", montoRecibido: 80_000, fechaPago: "2026-11-12", confirmado: false, notas: "Valor estimado de producto recibido; confirmar valor real." },
    ],
    compromisos: [
      { tipo: "SEGUIMIENTO", descripcion: "Validar entrega y descuento en especie; autorizar factura neta", fecha: "2026-11-13", responsable: "Director comercial", estado: "EN_CURSO" },
      { tipo: "SEGUIMIENTO", descripcion: "Preparar renovación antes de vencimiento", responsable: "Director comercial" },
    ],
  },
  {
    codigo: "HIS-REN-2027",
    marca: "Hisense",
    proyecto: "Renovación 2027",
    tipo: "COMERCIAL",
    estado: "PROPUESTA",
    monto: null,
    renovacionDe: "HIS-2026",
    notas: "Renovación sin propuesta enviada. Monto y duración por definir.",
    hitos: [],
    compromisos: [{ tipo: "SEGUIMIENTO", descripcion: "Preparar y enviar propuesta de renovación", responsable: "Director comercial" }],
  },

  // ───────── Amazon ─────────
  {
    codigo: "AMZ-POD-T1T2",
    marca: "Amazon",
    proyecto: "Pódcast · Temporadas 1 y 2 (histórico)",
    tipo: "PODCAST",
    estado: "FINALIZADO",
    monto: 4_800_000,
    montoConfirmado: false,
    observaciones:
      "Registro inferido: el archivo reporta $960,000 de comisión recibida por Pódcast T1/T2 \"según conversación\", lo que implica $4,800,000 cobrados al 25 % tras 20 %. No aparece en Control de contratos. Confirmar montos por temporada.",
    hitos: [
      { concepto: "Temporadas 1 y 2 (acumulado)", importe: 4_800_000, estadoFactura: "POR_CONFIRMAR", estadoPago: "PAGADO", montoRecibido: 4_800_000, confirmado: false, notas: "Monto deducido de la comisión reportada." },
    ],
  },
  {
    codigo: "AMZ-POD-T3",
    marca: "Amazon",
    proyecto: "Patrocinio · Pódcast Temporada 3",
    tipo: "PODCAST",
    estado: "PENDIENTE_FIRMA",
    monto: 2_000_000,
    montoConfirmado: true,
    notas: "Aprobado, sin facturar. Factura programada para el 15/01/2027, sujeta a autorización.",
    hitos: [
      { concepto: "Patrocinio temporada 3", importe: 2_000_000, fechaFacturar: "2027-01-15", fechaOrientativa: "2027 · fecha de depósito por confirmar", estadoFactura: "PENDIENTE_AUTORIZACION", estadoPago: "POR_COBRAR", confirmado: true, notas: "Validar autorización y fecha de depósito." },
    ],
    compromisos: [{ tipo: "SEGUIMIENTO", descripcion: "Obtener autorización para facturar", responsable: "Director comercial" }],
  },

  // ───────── Finsus ─────────
  {
    codigo: "FIN-2025",
    marca: "Finsus",
    proyecto: "Comercial febrero–julio 2025",
    tipo: "COMERCIAL",
    estado: "FINALIZADO",
    monto: 2_500_000,
    montoConfirmado: true,
    inicio: "2025-02-01",
    inicioConfirmado: true,
    vencimiento: "2025-07-31",
    vencimientoConfirmado: true,
    duracionMeses: 6,
    notas: "Finalizado y pagado. Comisión pagada: $100,000 (5 % tras 20 %).",
    hitos: [
      { concepto: "Contrato 2025 (acumulado)", importe: 2_500_000, estadoFactura: "EMITIDA", estadoPago: "PAGADO", montoRecibido: 2_500_000, fechaPago: "2025-07-31", confirmado: true },
    ],
  },
  {
    codigo: "FIN-2026",
    marca: "Finsus",
    proyecto: "Comercial 2026–2027",
    tipo: "COMERCIAL",
    estado: "PENDIENTE_FIRMA",
    monto: 3_500_000,
    montoConfirmado: true,
    inicio: "2026-11-15",
    inicioConfirmado: true,
    vencimiento: "2027-12-31",
    vencimientoConfirmado: true,
    duracionMeses: 13,
    notas: "Siete pagos bimestrales de $500,000. Primer abono recibido el 15/11/2026. Comisión de $40,000 recibida el 20/11/2026.",
    observaciones:
      "Contradicción: Agenda de facturas dice \"6 pagos bimestrales pendientes\" ($3,000,000) y Control de contratos \"siete pagos\" por $3,500,000; son consistentes si el primero ya se pagó. Comisión: 5 % en el contrato 2025 frente a 10 % en 2026; se modeló como regla con vigencia. Fechas de facturación de los pagos restantes por confirmar.",
    hitos: [
      { concepto: "Pago bimestral 1 de 7", importe: 500_000, fechaFacturar: "2026-11-15", estadoFactura: "EMITIDA", estadoPago: "PAGADO", montoRecibido: 500_000, fechaPago: "2026-11-15", confirmado: true },
      { concepto: "Pago bimestral 2 de 7", importe: 500_000, fechaFacturar: "2027-01-15", fechaOrientativa: "Previsto 15/01/2027", confirmado: false, notas: "Fecha de facturación por confirmar." },
      { concepto: "Pago bimestral 3 de 7", importe: 500_000, fechaFacturar: "2027-03-15", confirmado: false },
      { concepto: "Pago bimestral 4 de 7", importe: 500_000, fechaFacturar: "2027-05-15", confirmado: false },
      { concepto: "Pago bimestral 5 de 7", importe: 500_000, fechaFacturar: "2027-07-15", confirmado: false },
      { concepto: "Pago bimestral 6 de 7", importe: 500_000, fechaFacturar: "2027-09-15", confirmado: false },
      { concepto: "Pago bimestral 7 de 7", importe: 500_000, fechaFacturar: "2027-11-15", confirmado: false },
    ],
    compromisos: [{ tipo: "SEGUIMIENTO", descripcion: "Formalizar contrato pendiente de firma", responsable: "Director comercial" }],
  },

  // ───────── Zycar ─────────
  {
    codigo: "ZYC-2026",
    marca: "Zycar",
    proyecto: "Acuerdo efectivo + especie",
    tipo: "COMERCIAL",
    estado: "VIGENTE",
    monto: 1_060_000,
    montoConfirmado: true,
    inicio: "2026-12-01",
    inicioConfirmado: false,
    duracionMeses: 10,
    notas: "$700,000 en 10 mensualidades de $70,000 desde el 01/12/2026. Incluye dos carritos de $180,000 cada uno.",
    observaciones:
      "Control de contratos lo marca \"Firmado\" y el Dashboard Ejecutivo \"Contrato sin firma\". Vigencia por confirmar. Regla de comisión \"acuerdo especial\": el primer carrito se recibió como comisión en especie y de la venta del segundo ($185,000 en efectivo el 19/11/2026) corresponden $46,250 al director y $138,750 a la casa; la venta no suma al valor del contrato.",
    hitos: [
      ...mensualidades({ concepto: (n) => `Mensualidad ${n} de 10`, importe: 70_000, desde: "2026-12-01", cantidad: 10, notas: "Avisos en Calendar a las 9:00 a. m." }),
      { concepto: "Primer carrito", importe: 180_000, modalidad: "ESPECIE", estadoFactura: "POR_CONFIRMAR", estadoPago: "PAGADO", montoRecibido: 180_000, confirmado: false, notas: "Recibido; entregado al director como comisión en especie." },
      { concepto: "Segundo carrito", importe: 180_000, modalidad: "ESPECIE", estadoFactura: "POR_CONFIRMAR", estadoPago: "PAGADO", montoRecibido: 180_000, fechaPago: "2026-11-19", confirmado: false, notas: "Vendido en efectivo por $185,000 el 19/11/2026." },
    ],
    compromisos: [{ tipo: "SEGUIMIENTO", descripcion: "Confirmar vencimiento y firma del acuerdo", responsable: "Director comercial" }],
  },

  // ───────── Kavak ─────────
  {
    codigo: "KAV-2026-2028",
    marca: "Kavak",
    proyecto: "Contrato 2026–2028",
    tipo: "COMERCIAL",
    estado: "VIGENTE",
    monto: 9_000_000,
    montoConfirmado: true,
    inicio: "2026-02-01",
    inicioConfirmado: true,
    vencimiento: "2028-02-01",
    vencimientoConfirmado: true,
    duracionMeses: 24,
    notas: "5.4 M en acciones y 3.6 M en efectivo; tres anualidades. Acciones a nombre de Caskarita; traspaso por resolver al final de 2028; valor variable.",
    hitos: [
      { concepto: "Anualidad 2026 · efectivo", importe: 1_200_000, fechaFacturar: "2026-02-01", estadoFactura: "EMITIDA", estadoPago: "PAGADO", montoRecibido: 1_200_000, fechaPago: "2026-02-28", confirmado: true, notas: "Comisión de $240,000 recibida en febrero de 2026." },
      { concepto: "Anualidad 2026 · acciones", importe: 1_800_000, modalidad: "ACCIONES", fechaOrientativa: "Febrero 2026", estadoFactura: "POR_CONFIRMAR", estadoPago: "PAGADO", montoRecibido: 1_800_000, fechaPago: "2026-02-28", confirmado: false, notas: "Valor inicial de referencia. No efectivo." },
      { concepto: "Anualidad 2027 · efectivo", importe: 1_200_000, fechaFacturar: "2027-02-01", fechaOrientativa: "Febrero 2027", estadoPago: "PROGRAMADO", confirmado: true, notas: "Facturar el 01/02/2027. Día de depósito por confirmar." },
      { concepto: "Anualidad 2027 · acciones", importe: 1_800_000, modalidad: "ACCIONES", fechaFacturar: "2027-02-01", estadoPago: "PROGRAMADO", confirmado: false, notas: "Valor inicial. No efectivo." },
      { concepto: "Anualidad 2028 · efectivo", importe: 1_200_000, fechaFacturar: "2028-02-01", fechaOrientativa: "Febrero 2028", estadoFactura: "POR_CONFIRMAR", estadoPago: "PROGRAMADO", confirmado: false, notas: "Confirmar día de facturación." },
      { concepto: "Anualidad 2028 · acciones", importe: 1_800_000, modalidad: "ACCIONES", fechaFacturar: "2028-02-01", estadoPago: "PROGRAMADO", confirmado: false, notas: "Valor inicial. No efectivo." },
    ],
    compromisos: [{ tipo: "SEGUIMIENTO", descripcion: "Documentar derechos y futura transferencia de acciones", responsable: "Dirección" }],
  },

  // ───────── Mazda ─────────
  {
    codigo: "MAZ-POD-T1",
    marca: "Mazda",
    proyecto: "Pódcast · Temporada 1",
    tipo: "PODCAST",
    estado: "FINALIZADO",
    monto: 1_500_000,
    montoConfirmado: true,
    notas: "Finalizado y pagado. Comisión de $300,000 pagada.",
    hitos: [{ concepto: "Temporada 1", importe: 1_500_000, estadoFactura: "EMITIDA", estadoPago: "PAGADO", montoRecibido: 1_500_000, confirmado: true }],
  },
  {
    codigo: "MAZ-POD-T2",
    marca: "Mazda",
    proyecto: "Pódcast · Temporada 2",
    tipo: "PODCAST",
    estado: "FINALIZADO",
    monto: 1_500_000,
    montoConfirmado: true,
    notas: "Finalizado y pagado. Comisión de $300,000 pagada.",
    hitos: [{ concepto: "Temporada 2", importe: 1_500_000, estadoFactura: "EMITIDA", estadoPago: "PAGADO", montoRecibido: 1_500_000, confirmado: true }],
  },
  {
    codigo: "MAZ-POD-T3",
    marca: "Mazda",
    proyecto: "Pódcast · Temporada 3",
    tipo: "PODCAST",
    estado: "PROPUESTA",
    monto: 1_500_000,
    notas: "Propuesta por enviar / aprobar. No considerar cuenta por cobrar.",
    hitos: [{ concepto: "Temporada 3", importe: 1_500_000, fechaOrientativa: "Por confirmar", estadoPago: "SIN_PROGRAMAR", confirmado: false }],
    compromisos: [{ tipo: "SEGUIMIENTO", descripcion: "Enviar propuesta de temporada 3", responsable: "Director comercial" }],
  },
  {
    codigo: "MAZ-2026",
    marca: "Mazda",
    proyecto: "Comercial 2026–2027",
    tipo: "COMERCIAL",
    estado: "VIGENTE",
    monto: 2_400_000,
    montoConfirmado: false,
    inicio: "2026-04-01",
    inicioConfirmado: false,
    vencimiento: "2027-03-31",
    vencimientoConfirmado: true,
    duracionMeses: 12,
    notas: "$1,800,000 cobrado según registro histórico. Última factura de $650,000 prevista para enero de 2027.",
    observaciones:
      "Contradicción: $2,400,000 contratados frente a $1,800,000 cobrados más $650,000 por cobrar ($2,450,000). El Dashboard menciona además un cobro de $600,000 en diciembre de 2026. Validar la diferencia de $50,000 y la fecha real del último pago. Inicio deducido del plazo.",
    hitos: [
      { concepto: "Cobros acumulados 2026", importe: 1_800_000, estadoFactura: "POR_CONFIRMAR", estadoPago: "PAGADO", montoRecibido: 1_800_000, confirmado: false, notas: "Según registro histórico. Comisión de $144,000 pagada." },
      { concepto: "Último pago", importe: 650_000, fechaFacturar: "2027-01-01", fechaOrientativa: "Durante enero de 2027", estadoFactura: "POR_EMITIR", estadoPago: "POR_COBRAR", confirmado: false, notas: "Facturar el 01/01/2027. El Dashboard registra $600,000 en diciembre; conciliar importe y fecha." },
    ],
    compromisos: [{ tipo: "SEGUIMIENTO", descripcion: "Confirmar fecha y monto del último cobro comercial", fecha: "2026-12-15", responsable: "Director comercial" }],
  },

  // ───────── Mi Tienda Favorita ─────────
  {
    codigo: "MTF-2026",
    marca: "Mi Tienda Favorita",
    proyecto: "Embajaduría de marca 360° · 24 meses",
    tipo: "EMBAJADURIA",
    estado: "PROPUESTA",
    monto: 15_500_000,
    montoConfirmado: true,
    duracionMeses: 24,
    talento: "Luis García Postigo y Christian Martinoli",
    notas:
      "$7,750,000 más IVA por año; $15,500,000 más IVA por los dos años. Opción A: 100 % a la firma. Opción B: 50 % a la firma, 25 % al mes 4 y 25 % al mes 8. Opción de tercer año al mismo precio si se confirma por escrito con 12 meses de anticipación.",
    observaciones: "Sin regla de comisión definida en el archivo. Fijarla antes de la firma.",
    hitos: [
      { concepto: "Año 1", importe: 7_750_000, fechaOrientativa: "A la firma (según opción de pago)", estadoPago: "SIN_PROGRAMAR", confirmado: false },
      { concepto: "Año 2", importe: 7_750_000, fechaOrientativa: "Según opción de pago", estadoPago: "SIN_PROGRAMAR", confirmado: false },
    ],
    compromisos: [
      { tipo: "SEGUIMIENTO", descripcion: "Respuesta del cliente; confirmar opción de pago si acepta", fecha: "2026-11-20", responsable: "Director comercial", estado: "EN_CURSO" },
    ],
  },
];

// Comisiones efectivamente recibidas según "Comisiones detalladas".
const PAGOS_COMISION: { contrato: string; concepto: string; monto: number; modalidad?: Modalidad; fechaPago?: string; confirmado?: boolean; notas?: string }[] = [
  { contrato: "FIN-2025", concepto: "Comisión contrato 2025", monto: 100_000, confirmado: true, notas: "Pagada; 5 % después de 20 %." },
  { contrato: "FIN-2026", concepto: "Comisión pago bimestral 1", monto: 40_000, fechaPago: "2026-11-20", confirmado: true },
  { contrato: "ZYC-2026", concepto: "Primer carrito", monto: 180_000, modalidad: "ESPECIE", confirmado: false, notas: "Recibido en especie." },
  { contrato: "KAV-2026-2028", concepto: "Anualidad 2026 efectivo", monto: 240_000, fechaPago: "2026-02-28", confirmado: true },
  { contrato: "MAZ-POD-T1", concepto: "Pódcast T1", monto: 300_000, confirmado: true },
  { contrato: "MAZ-POD-T2", concepto: "Pódcast T2", monto: 300_000, confirmado: true },
  { contrato: "MAZ-2026", concepto: "Comercial cobrado", monto: 144_000, confirmado: true },
  { contrato: "AMZ-POD-T1T2", concepto: "Pódcast T1 y T2", monto: 960_000, confirmado: false, notas: "Recibido según conversación." },
];

// Reglas de comisión del director (hoja "Comisiones referencia" y "Control contratos").
const REGLAS: { marca?: string; tipo?: TipoContrato; pctDirector: number; desde: string; hasta?: string; notas?: string }[] = [
  { pctDirector: 0.25, desde: "2024-01-01", notas: "Regla general de referencia; revisar por marca." },
  { marca: "Play Do It", pctDirector: 0.25, desde: "2024-01-01" },
  { marca: "Little Caesars", pctDirector: 0.1, desde: "2024-01-01" },
  { marca: "Mazda", tipo: "COMERCIAL", pctDirector: 0.1, desde: "2024-01-01" },
  { marca: "Mazda", tipo: "PODCAST", pctDirector: 0.25, desde: "2024-01-01" },
  { marca: "Amazon", pctDirector: 0.25, desde: "2024-01-01" },
  { marca: "Kavak", pctDirector: 0.25, desde: "2024-01-01" },
  { marca: "Finsus", pctDirector: 0.05, desde: "2024-01-01", hasta: "2025-12-31", notas: "Contrato 2025: 5 % tras 20 %." },
  { marca: "Finsus", pctDirector: 0.1, desde: "2026-01-01", notas: "Contrato 2026: 10 % tras 20 %." },
  { marca: "Zycar", pctDirector: 0.25, desde: "2024-01-01", notas: "Acuerdo especial con componente en especie; confirmar criterio." },
  { marca: "Hisense", pctDirector: 0.05, desde: "2024-01-01" },
];

const MARCAS: { nombre: string; sector: string }[] = [
  { nombre: "Play Do It", sector: "Entretenimiento" },
  { nombre: "Little Caesars", sector: "Alimentos" },
  { nombre: "Hisense", sector: "Electrónica" },
  { nombre: "Amazon", sector: "Comercio electrónico" },
  { nombre: "Finsus", sector: "Servicios financieros" },
  { nombre: "Zycar", sector: "Automotriz" },
  { nombre: "Kavak", sector: "Automotriz" },
  { nombre: "Mazda", sector: "Automotriz" },
  { nombre: "Mi Tienda Favorita", sector: "Comercio" },
];

async function main() {
  // Protección: en una base que ya tiene usuarios no se recarga nada,
  // salvo que se pida explícitamente con SEED_FORZAR=1.
  const yaCargada = (await db.usuario.count()) > 0;
  if (yaCargada && process.env.SEED_FORZAR !== "1") {
    console.log("La base ya tiene datos; no se recarga la semilla (usa SEED_FORZAR=1 para forzarla).");
    return;
  }
  console.log("Limpiando base…");
  await db.bitacora.deleteMany();
  await db.pagoComision.deleteMany();
  await db.reglaComision.deleteMany();
  await db.compromiso.deleteMany();
  await db.hitoCobro.deleteMany();
  await db.contrato.deleteMany();
  await db.contacto.deleteMany();
  await db.cartera.deleteMany();
  await db.marca.deleteMany();
  await db.usuario.deleteMany();
  await db.director.deleteMany();

  console.log("Directores y usuarios…");
  const miguel = await db.director.create({ data: { nombre: "Miguel Moisés Lotfe" } });
  const demo = await db.director.create({
    data: { nombre: "Dirección de demostración", esDemo: true, notas: "Director ficticio para mostrar el consolidado. Eliminar antes de operar." },
  });

  const claves = {
    admin: process.env.SEED_CLAVE_ADMIN ?? "EstudioSports-Admin-2026",
    miguel: process.env.SEED_CLAVE_MIGUEL ?? "EstudioSports-Miguel-2026",
    demo: process.env.SEED_CLAVE_DEMO ?? "EstudioSports-Demo-2026",
  };
  const hash = (c: string) => bcrypt.hash(c, 12);

  await db.usuario.createMany({
    data: [
      { usuario: "admin", nombre: "Administrador general", rol: "ADMIN_GENERAL", passwordHash: await hash(claves.admin) },
      { usuario: "miguel", nombre: "Miguel Moisés Lotfe", rol: "DIRECTOR", directorId: miguel.id, passwordHash: await hash(claves.miguel) },
      { usuario: "demo", nombre: "Director de demostración", rol: "DIRECTOR", directorId: demo.id, passwordHash: await hash(claves.demo) },
    ],
  });

  console.log("Marcas y cartera…");
  const marcaId = new Map<string, string>();
  for (const m of MARCAS) {
    const r = await db.marca.create({ data: { nombre: m.nombre, sector: m.sector } });
    marcaId.set(m.nombre, r.id);
    await db.cartera.create({ data: { marcaId: r.id, directorId: miguel.id, desde: d("2024-01-01") } });
  }

  await db.contacto.create({
    data: {
      marcaId: marcaId.get("Mi Tienda Favorita")!,
      nombre: "Juan Rafael Gramillo Gonzalez",
      cargo: "DONK",
      ultimaInteraccion: d("2026-11-13"),
      notas: "Único contacto registrado en el archivo original.",
    },
  });

  console.log("Reglas de comisión…");
  for (const r of REGLAS) {
    await db.reglaComision.create({
      data: {
        directorId: miguel.id,
        marcaId: r.marca ? marcaId.get(r.marca)! : null,
        tipo: r.tipo ?? null,
        pctCasa: 0.2,
        pctDirector: r.pctDirector,
        vigenteDesde: d(r.desde),
        vigenteHasta: r.hasta ? d(r.hasta) : null,
        notas: r.notas,
      },
    });
  }

  console.log("Contratos, hitos y compromisos…");
  const contratoId = new Map<string, string>();
  for (const c of CONTRATOS) {
    const creado = await db.contrato.create({
      data: {
        codigo: c.codigo,
        marcaId: marcaId.get(c.marca)!,
        directorId: miguel.id,
        proyecto: c.proyecto,
        tipo: c.tipo,
        estado: c.estado,
        monto: c.monto,
        montoConfirmado: c.montoConfirmado ?? false,
        inicio: c.inicio ? d(c.inicio) : null,
        inicioConfirmado: c.inicioConfirmado ?? false,
        vencimiento: c.vencimiento ? d(c.vencimiento) : null,
        vencimientoConfirmado: c.vencimientoConfirmado ?? false,
        duracionMeses: c.duracionMeses,
        talento: c.talento,
        notas: c.notas,
        observaciones: c.observaciones,
        renovacionDeId: c.renovacionDe ? contratoId.get(c.renovacionDe) : undefined,
        hitos: {
          create: c.hitos.map((h) => ({
            concepto: h.concepto,
            importe: h.importe,
            modalidad: h.modalidad ?? "EFECTIVO",
            fechaFacturar: h.fechaFacturar ? d(h.fechaFacturar) : null,
            fechaOrientativa: h.fechaOrientativa,
            estadoFactura: h.estadoFactura ?? "POR_EMITIR",
            estadoPago: h.estadoPago ?? "POR_COBRAR",
            montoRecibido: h.montoRecibido ?? 0,
            fechaPago: h.fechaPago ? d(h.fechaPago) : null,
            confirmado: h.confirmado ?? false,
            notas: h.notas,
          })),
        },
        compromisos: {
          create: (c.compromisos ?? []).map((k) => ({
            tipo: k.tipo ?? "ENTREGABLE",
            descripcion: k.descripcion,
            fecha: k.fecha ? d(k.fecha) : null,
            responsable: k.responsable,
            estado: k.estado ?? "PENDIENTE",
          })),
        },
      },
    });
    contratoId.set(c.codigo, creado.id);
  }

  console.log("Pagos de comisión…");
  for (const p of PAGOS_COMISION) {
    await db.pagoComision.create({
      data: {
        directorId: miguel.id,
        contratoId: contratoId.get(p.contrato)!,
        concepto: p.concepto,
        monto: p.monto,
        modalidad: p.modalidad ?? "EFECTIVO",
        fechaPago: p.fechaPago ? d(p.fechaPago) : null,
        confirmado: p.confirmado ?? false,
        notas: p.notas,
      },
    });
  }

  console.log("Cartera de demostración…");
  const demoA = await db.marca.create({ data: { nombre: "Marca Demo A", sector: "Demostración", esDemo: true } });
  const demoB = await db.marca.create({ data: { nombre: "Marca Demo B", sector: "Demostración", esDemo: true } });
  await db.cartera.createMany({
    data: [
      { marcaId: demoA.id, directorId: demo.id, desde: d("2026-01-01") },
      { marcaId: demoB.id, directorId: demo.id, desde: d("2026-06-01") },
    ],
  });
  await db.reglaComision.create({
    data: { directorId: demo.id, pctCasa: 0.2, pctDirector: 0.1, vigenteDesde: d("2026-01-01"), notas: "Regla general del director de demostración." },
  });
  await db.contrato.create({
    data: {
      codigo: "DEMO-A-2026",
      marcaId: demoA.id,
      directorId: demo.id,
      proyecto: "Comercial 2026 (demostración)",
      tipo: "COMERCIAL",
      estado: "VIGENTE",
      monto: 1_200_000,
      montoConfirmado: true,
      inicio: d("2026-03-01"),
      inicioConfirmado: true,
      vencimiento: d("2027-02-28"),
      vencimientoConfirmado: true,
      duracionMeses: 12,
      notas: "Datos ficticios.",
      hitos: {
        create: [
          { concepto: "Pago 1 de 3", importe: 400_000, fechaFacturar: d("2026-03-01"), estadoFactura: "EMITIDA", estadoPago: "PAGADO", montoRecibido: 400_000, fechaPago: d("2026-03-20"), confirmado: true },
          { concepto: "Pago 2 de 3", importe: 400_000, fechaFacturar: d("2026-09-01"), estadoFactura: "EMITIDA", estadoPago: "POR_COBRAR", confirmado: true, notas: "Vencido; demuestra la vista de cobranza." },
          { concepto: "Pago 3 de 3", importe: 400_000, fechaFacturar: d("2027-01-15"), estadoPago: "POR_COBRAR", confirmado: true },
        ],
      },
      compromisos: {
        create: [
          { tipo: "ENTREGABLE", descripcion: "Dos menciones en redes al mes", fecha: d("2026-12-05"), responsable: "Talento", estado: "PENDIENTE" },
          { tipo: "ENTREGABLE", descripcion: "Presencia en evento de lanzamiento", fecha: d("2026-10-10"), responsable: "Talento", estado: "CUMPLIDO" },
        ],
      },
    },
  });
  await db.contrato.create({
    data: {
      codigo: "DEMO-B-2026",
      marcaId: demoB.id,
      directorId: demo.id,
      proyecto: "Pódcast temporada única (demostración)",
      tipo: "PODCAST",
      estado: "PROPUESTA",
      monto: 600_000,
      notas: "Datos ficticios.",
      hitos: { create: [{ concepto: "Patrocinio", importe: 600_000, fechaOrientativa: "Sujeto a aceptación", estadoPago: "SIN_PROGRAMAR" }] },
      compromisos: { create: [{ tipo: "SEGUIMIENTO", descripcion: "Enviar propuesta revisada", fecha: d("2026-11-28"), responsable: "Director" }] },
    },
  });
  await db.pagoComision.create({
    data: { directorId: demo.id, concepto: "Comisión pago 1 Marca Demo A", monto: 32_000, fechaPago: d("2026-04-05"), confirmado: true },
  });

  const totales = {
    marcas: await db.marca.count(),
    contratos: await db.contrato.count(),
    hitos: await db.hitoCobro.count(),
    compromisos: await db.compromiso.count(),
    reglas: await db.reglaComision.count(),
  };
  console.log("Listo:", totales);
  console.log("Usuarios: admin / miguel / demo (claves en SEED_CLAVE_* o valores por defecto del seed).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
