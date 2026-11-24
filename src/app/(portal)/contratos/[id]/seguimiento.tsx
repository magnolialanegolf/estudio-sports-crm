"use client";

import { useActionState, useEffect, useRef } from "react";
import { eliminarSeguimiento, registrarSeguimiento } from "@/actions/seguimiento";
import type { Resultado } from "@/actions/util";

const TIPOS = [
  { valor: "LLAMADA", texto: "Llamada" },
  { valor: "REUNION", texto: "Reunión" },
  { valor: "CORREO", texto: "Correo" },
  { valor: "MENSAJE", texto: "Mensaje" },
  { valor: "NOTA", texto: "Nota" },
];

// Captura rápida: qué pasó y, si aplica, qué sigue y cuándo. Siempre visible, sin diálogo.
export function FormularioSeguimiento({ contratoId, hoy }: { contratoId: string; hoy: string }) {
  const accion = registrarSeguimiento.bind(null, contratoId);
  const [r, despachar, pendiente] = useActionState<Resultado, FormData>(accion, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (r?.ok) ref.current?.reset();
  }, [r]);
  return (
    <form ref={ref} action={despachar} className="rounded-md border border-linea bg-superficie-2 p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[auto_auto_1fr]">
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-tinta-3">Qué fue</span>
          <select name="tipo" defaultValue="LLAMADA" className="campo h-9 !w-auto !py-0 text-sm">
            {TIPOS.map((t) => (
              <option key={t.valor} value={t.valor}>{t.texto}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-tinta-3">Cuándo</span>
          <input type="date" name="fecha" defaultValue={hoy} className="campo h-9 !w-auto !py-0 text-sm" />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-tinta-3">Qué pasó</span>
          <input name="texto" required placeholder="Hablé con Juan; les interesa, quieren ver números el jueves." className="campo h-9 !py-0 text-sm" />
        </label>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-tinta-3">Siguiente paso (opcional)</span>
          <input name="siguientePaso" placeholder="Volver a hablar con Juan" className="campo h-9 !py-0 text-sm" />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-tinta-3">Para cuándo</span>
          <input type="date" name="siguienteFecha" className="campo h-9 !w-auto !py-0 text-sm" />
        </label>
        <button type="submit" disabled={pendiente} className="inline-flex h-9 items-center justify-center rounded-md border border-acento bg-acento px-4 text-sm font-medium text-white shadow-sm hover:bg-acento-2 disabled:opacity-60">
          {pendiente ? "Guardando…" : "Registrar"}
        </button>
      </div>
      <p className="mt-2 text-xs text-tinta-3">El siguiente paso con fecha se convierte en una tarea tuya: aparece en Hoy y en tu calendario.</p>
      {r?.error ? <p className="mt-2 rounded border border-riesgo/30 bg-riesgo-suave px-3 py-2 text-sm text-riesgo">{r.error}</p> : null}
    </form>
  );
}

export function BorrarSeguimiento({ id }: { id: string }) {
  return (
    <form
      action={eliminarSeguimiento.bind(null, id)}
      onSubmit={(e) => {
        if (!window.confirm("¿Eliminar este seguimiento?")) e.preventDefault();
      }}
      className="no-imprimir"
    >
      <button type="submit" className="text-[11px] text-tinta-3 hover:text-riesgo hover:underline">Eliminar</button>
    </form>
  );
}
