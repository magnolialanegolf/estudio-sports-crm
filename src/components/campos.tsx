// Campos de formulario sin estado (render en servidor o cliente).
import { fechaISO } from "@/lib/formato";

export function Entrada({
  nombre,
  etiqueta,
  valor,
  tipo = "text",
  requerido,
  ayuda,
  placeholder,
  className = "",
  paso,
}: {
  nombre: string;
  etiqueta: string;
  valor?: string | number | Date | null;
  tipo?: "text" | "number" | "date" | "url" | "email" | "password";
  requerido?: boolean;
  ayuda?: string;
  placeholder?: string;
  className?: string;
  paso?: string;
}) {
  const v = valor === null || valor === undefined ? "" : valor instanceof Date ? fechaISO(valor) : String(valor);
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-tinta-3">{etiqueta}</span>
      <input name={nombre} type={tipo} defaultValue={v} required={requerido} placeholder={placeholder} step={paso} className="campo" />
      {ayuda ? <span className="mt-1 block text-xs text-tinta-3">{ayuda}</span> : null}
    </label>
  );
}

export function Fecha({ nombre, etiqueta, valor, requerido, className = "", ayuda }: { nombre: string; etiqueta: string; valor?: Date | null; requerido?: boolean; className?: string; ayuda?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-tinta-3">{etiqueta}</span>
      <input name={nombre} type="date" defaultValue={fechaISO(valor)} required={requerido} className="campo" />
      {ayuda ? <span className="mt-1 block text-xs text-tinta-3">{ayuda}</span> : null}
    </label>
  );
}

export function Seleccion({
  nombre,
  etiqueta,
  valor,
  opciones,
  requerido,
  vacio,
  className = "",
  ayuda,
}: {
  nombre: string;
  etiqueta: string;
  valor?: string | null;
  opciones: { valor: string; texto: string }[];
  requerido?: boolean;
  vacio?: string;
  className?: string;
  ayuda?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-tinta-3">{etiqueta}</span>
      <select name={nombre} defaultValue={valor ?? ""} required={requerido} className="campo">
        {vacio !== undefined ? <option value="">{vacio}</option> : null}
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.texto}
          </option>
        ))}
      </select>
      {ayuda ? <span className="mt-1 block text-xs text-tinta-3">{ayuda}</span> : null}
    </label>
  );
}

export function Area({ nombre, etiqueta, valor, filas = 3, className = "", ayuda }: { nombre: string; etiqueta: string; valor?: string | null; filas?: number; className?: string; ayuda?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-tinta-3">{etiqueta}</span>
      <textarea name={nombre} defaultValue={valor ?? ""} rows={filas} className="campo" />
      {ayuda ? <span className="mt-1 block text-xs text-tinta-3">{ayuda}</span> : null}
    </label>
  );
}

export function Casilla({ nombre, etiqueta, valor, ayuda }: { nombre: string; etiqueta: string; valor?: boolean; ayuda?: string }) {
  return (
    <label className="flex items-start gap-2 text-sm text-tinta">
      <input name={nombre} type="checkbox" defaultChecked={valor} className="mt-1 h-4 w-4 accent-[var(--acento)]" />
      <span>
        {etiqueta}
        {ayuda ? <span className="block text-xs text-tinta-3">{ayuda}</span> : null}
      </span>
    </label>
  );
}

export const OPCIONES = {
  tipo: [
    { valor: "COMERCIAL", texto: "Comercial" },
    { valor: "PODCAST", texto: "Pódcast" },
    { valor: "EMBAJADURIA", texto: "Embajaduría" },
    { valor: "OTRO", texto: "Otro" },
  ],
  estadoContrato: [
    { valor: "PROSPECTO", texto: "Prospecto" },
    { valor: "PROPUESTA", texto: "Propuesta" },
    { valor: "PENDIENTE_FIRMA", texto: "Pendiente de firma" },
    { valor: "VIGENTE", texto: "Vigente" },
    { valor: "FINALIZADO", texto: "Finalizado" },
    { valor: "CANCELADO", texto: "Cancelado" },
  ],
  estadoFactura: [
    { valor: "POR_EMITIR", texto: "Por emitir" },
    { valor: "PENDIENTE_AUTORIZACION", texto: "Pendiente de autorización" },
    { valor: "EMITIDA", texto: "Emitida" },
    { valor: "POR_CONFIRMAR", texto: "Por confirmar" },
  ],
  estadoPago: [
    { valor: "POR_COBRAR", texto: "Por cobrar" },
    { valor: "PROGRAMADO", texto: "Programado" },
    { valor: "SUJETO_A_FIRMA", texto: "Sujeto a firma" },
    { valor: "SIN_PROGRAMAR", texto: "Sin programar" },
    { valor: "PARCIAL", texto: "Pago parcial" },
    { valor: "PAGADO", texto: "Pagado" },
  ],
  categoriaDocumento: [
    { valor: "CONTRATO", texto: "Contrato firmado" },
    { valor: "FACTURA_PDF", texto: "Factura PDF" },
    { valor: "FACTURA_XML", texto: "Factura XML" },
    { valor: "COMPROBANTE", texto: "Comprobante de pago" },
    { valor: "OTRO", texto: "Otro" },
  ],
  modalidad: [
    { valor: "EFECTIVO", texto: "Efectivo" },
    { valor: "ESPECIE", texto: "Especie" },
    { valor: "ACCIONES", texto: "Acciones" },
  ],
  tipoCompromiso: [
    { valor: "ENTREGABLE", texto: "Entregable con la marca" },
    { valor: "SEGUIMIENTO", texto: "Seguimiento interno" },
    { valor: "FECHA_CLAVE", texto: "Fecha clave del contrato" },
  ],
  estadoCompromiso: [
    { valor: "PENDIENTE", texto: "Pendiente" },
    { valor: "EN_CURSO", texto: "En curso" },
    { valor: "REQUIERE_ATENCION", texto: "Requiere atención" },
    { valor: "CUMPLIDO", texto: "Cumplido" },
    { valor: "CANCELADO", texto: "Cancelado" },
  ],
  rol: [
    { valor: "ADMIN_GENERAL", texto: "Administrador general" },
    { valor: "GERENTE_GENERAL", texto: "Gerente general" },
    { valor: "DIRECTOR", texto: "Director comercial" },
    { valor: "ASISTENTE_COMERCIAL", texto: "Asistente comercial" },
    { valor: "ADMINISTRACION", texto: "Pagos y administración" },
    { valor: "PRODUCCION", texto: "Producción" },
    { valor: "CONTENIDOS", texto: "Contenidos" },
    { valor: "OPERATIVO", texto: "Operativo" },
    { valor: "LECTURA", texto: "Lectura" },
  ],
};
