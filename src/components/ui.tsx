import Link from "next/link";
import type { ReactNode } from "react";

// Piezas de interfaz sobrias y reutilizables. Sin librería de componentes externa.

export function Pagina({
  titulo,
  subtitulo,
  acciones,
  children,
}: {
  titulo: string;
  subtitulo?: ReactNode;
  acciones?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-tinta">{titulo}</h1>
          {subtitulo ? <p className="mt-1 text-sm text-tinta-2">{subtitulo}</p> : null}
        </div>
        {acciones ? <div className="no-imprimir flex flex-wrap items-center gap-2">{acciones}</div> : null}
      </header>
      {children}
    </div>
  );
}

export function Tarjeta({
  titulo,
  descripcion,
  acciones,
  children,
  className = "",
}: {
  titulo?: ReactNode;
  descripcion?: ReactNode;
  acciones?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-lg border border-linea bg-superficie ${className}`}>
      {titulo || acciones ? (
        <div className="flex items-start justify-between gap-3 border-b border-linea px-5 py-3">
          <div>
            {titulo ? <h2 className="text-sm font-semibold uppercase tracking-wide text-tinta-2">{titulo}</h2> : null}
            {descripcion ? <p className="mt-0.5 text-xs text-tinta-3">{descripcion}</p> : null}
          </div>
          {acciones ? <div className="no-imprimir flex items-center gap-2">{acciones}</div> : null}
        </div>
      ) : null}
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

export function Cifra({
  etiqueta,
  valor,
  nota,
  tono = "neutro",
}: {
  etiqueta: string;
  valor: ReactNode;
  nota?: ReactNode;
  tono?: "neutro" | "ok" | "alerta" | "riesgo" | "acento";
}) {
  const borde = {
    neutro: "border-linea",
    ok: "border-ok/40",
    alerta: "border-alerta/40",
    riesgo: "border-riesgo/50",
    acento: "border-acento/40",
  }[tono];
  return (
    <div className={`rounded-lg border bg-superficie px-4 py-3 ${borde}`}>
      <div className="text-xs font-medium uppercase tracking-wide text-tinta-3">{etiqueta}</div>
      <div className="tabular mt-1 text-xl font-semibold text-tinta">{valor}</div>
      {nota ? <div className="mt-0.5 text-xs text-tinta-2">{nota}</div> : null}
    </div>
  );
}

export type Tono = "neutro" | "ok" | "alerta" | "riesgo" | "acento";

export function Etiqueta({ children, tono = "neutro", titulo }: { children: ReactNode; tono?: Tono; titulo?: string }) {
  const clase = {
    neutro: "bg-neutro-suave text-tinta-2",
    ok: "bg-ok-suave text-ok",
    alerta: "bg-alerta-suave text-alerta",
    riesgo: "bg-riesgo-suave text-riesgo",
    acento: "bg-acento-suave text-acento",
  }[tono];
  return (
    <span title={titulo} className={`inline-flex items-center whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ${clase}`}>
      {children}
    </span>
  );
}

export function PorConfirmar({ confirmado }: { confirmado: boolean }) {
  return confirmado ? null : (
    <Etiqueta tono="alerta" titulo="Dato heredado del archivo original sin respaldo documental">
      por confirmar
    </Etiqueta>
  );
}

export function Boton({
  children,
  href,
  tipo = "secundario",
  type,
  disabled,
  pequeno,
  name,
  value,
  formAction,
}: {
  children: ReactNode;
  href?: string;
  tipo?: "primario" | "secundario" | "peligro" | "texto";
  type?: "submit" | "button";
  disabled?: boolean;
  pequeno?: boolean;
  name?: string;
  value?: string;
  formAction?: (formData: FormData) => void | Promise<void>;
}) {
  const base = `inline-flex items-center justify-center rounded border font-medium transition-colors disabled:opacity-50 ${
    pequeno ? "px-2.5 py-1 text-xs" : "px-3.5 py-2 text-sm"
  }`;
  const estilo = {
    primario: "border-acento bg-acento text-white hover:bg-[#182e4b]",
    secundario: "border-linea-fuerte bg-superficie text-tinta hover:bg-superficie-2",
    peligro: "border-riesgo/40 bg-superficie text-riesgo hover:bg-riesgo-suave",
    texto: "border-transparent bg-transparent text-acento hover:underline px-1",
  }[tipo];
  if (href) {
    return (
      <Link href={href} className={`${base} ${estilo}`}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type ?? "submit"} disabled={disabled} name={name} value={value} formAction={formAction} className={`${base} ${estilo}`}>
      {children}
    </button>
  );
}

export function Tabla({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`-mx-5 overflow-x-auto ${className}`}>
      <table className="w-full min-w-[640px] border-collapse text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, derecha, className = "" }: { children?: ReactNode; derecha?: boolean; className?: string }) {
  return (
    <th
      className={`border-b border-linea px-5 py-2 text-left text-xs font-semibold uppercase tracking-wide text-tinta-3 ${
        derecha ? "text-right" : ""
      } ${className}`}
    >
      {children}
    </th>
  );
}

export function Td({ children, derecha, className = "", colSpan }: { children?: ReactNode; derecha?: boolean; className?: string; colSpan?: number }) {
  return (
    <td colSpan={colSpan} className={`border-b border-linea/70 px-5 py-2.5 align-top ${derecha ? "tabular text-right" : ""} ${className}`}>
      {children}
    </td>
  );
}

export function Vacio({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-sm text-tinta-3">{children}</p>;
}

export function Campo({
  etiqueta,
  children,
  ayuda,
  className = "",
}: {
  etiqueta: string;
  children: ReactNode;
  ayuda?: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-tinta-3">{etiqueta}</span>
      {children}
      {ayuda ? <span className="mt-1 block text-xs text-tinta-3">{ayuda}</span> : null}
    </label>
  );
}

export function Aviso({ children, tono = "neutro" }: { children: ReactNode; tono?: Tono }) {
  const clase = {
    neutro: "border-linea bg-superficie-2 text-tinta-2",
    ok: "border-ok/30 bg-ok-suave text-ok",
    alerta: "border-alerta/30 bg-alerta-suave text-alerta",
    riesgo: "border-riesgo/30 bg-riesgo-suave text-riesgo",
    acento: "border-acento/30 bg-acento-suave text-acento",
  }[tono];
  return <div className={`rounded border px-4 py-3 text-sm ${clase}`}>{children}</div>;
}

export function Definicion({ items }: { items: { k: string; v: ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
      {items.map((i) => (
        <div key={i.k} className="flex flex-col border-b border-linea/60 pb-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-tinta-3">{i.k}</dt>
          <dd className="mt-0.5 text-tinta">{i.v}</dd>
        </div>
      ))}
    </dl>
  );
}
