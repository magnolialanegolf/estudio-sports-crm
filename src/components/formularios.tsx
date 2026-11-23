"use client";

import { useActionState, useState, type ReactNode } from "react";
import type { Resultado } from "@/actions/util";

// Envoltorio de formulario con estado de acción y mensajes. Se usa con acciones ya ligadas (bind).
export function Formulario({
  accion,
  children,
  textoBoton = "Guardar",
  alGuardar,
  className = "",
}: {
  accion: (prev: Resultado, fd: FormData) => Promise<Resultado>;
  children: ReactNode;
  textoBoton?: string;
  alGuardar?: () => void;
  className?: string;
}) {
  const [estado, despachar, pendiente] = useActionState<Resultado, FormData>(async (prev, fd) => {
    const r = await accion(prev, fd);
    if (r?.ok && alGuardar) alGuardar();
    return r;
  }, undefined);
  return (
    <form action={despachar} className={`space-y-3 ${className}`}>
      {children}
      {estado?.error ? <p className="rounded border border-riesgo/30 bg-riesgo-suave px-3 py-2 text-sm text-riesgo">{estado.error}</p> : null}
      {estado?.ok ? <p className="rounded border border-ok/30 bg-ok-suave px-3 py-2 text-sm text-ok">Guardado.</p> : null}
      <div className="flex justify-end gap-2 pt-1">
        <button type="submit" disabled={pendiente} className="rounded border border-acento bg-acento px-3.5 py-2 text-sm font-medium text-white hover:bg-[#182e4b] disabled:opacity-60">
          {pendiente ? "Guardando…" : textoBoton}
        </button>
      </div>
    </form>
  );
}

// Panel plegable para formularios secundarios (alta de hito, compromiso, contacto).
export function Plegable({ titulo, children, abiertoInicial = false }: { titulo: string; children: ReactNode; abiertoInicial?: boolean }) {
  const [abierto, setAbierto] = useState(abiertoInicial);
  return (
    <div className="no-imprimir rounded border border-dashed border-linea-fuerte">
      <button type="button" onClick={() => setAbierto((v) => !v)} className="flex w-full items-center justify-between px-4 py-2 text-left text-sm font-medium text-acento hover:bg-superficie-2">
        <span>{titulo}</span>
        <span aria-hidden className="text-tinta-3">{abierto ? "−" : "+"}</span>
      </button>
      {abierto ? <div className="border-t border-linea px-4 py-3">{children}</div> : null}
    </div>
  );
}

export function Confirmar({ accion, texto, mensaje = "¿Confirmas la eliminación? Esta acción queda en bitácora." }: { accion: () => Promise<void>; texto: string; mensaje?: string }) {
  return (
    <form
      action={accion}
      onSubmit={(e) => {
        if (!window.confirm(mensaje)) e.preventDefault();
      }}
    >
      <button type="submit" className="rounded border border-riesgo/40 px-2.5 py-1 text-xs font-medium text-riesgo hover:bg-riesgo-suave">
        {texto}
      </button>
    </form>
  );
}

export function BotonImprimir() {
  return (
    <button type="button" onClick={() => window.print()} className="no-imprimir rounded border border-linea-fuerte bg-superficie px-3.5 py-2 text-sm font-medium text-tinta hover:bg-superficie-2">
      Imprimir / PDF
    </button>
  );
}
