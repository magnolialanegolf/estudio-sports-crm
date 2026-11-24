"use client";

import { useActionState, useState } from "react";
import type { EtapaEntregable } from "@prisma/client";
import { avanzarEntregable } from "@/actions/produccion";
import type { Resultado } from "@/actions/util";

export type Movimiento = { a: EtapaEntregable; texto: string; regreso?: boolean };

// Botones de la cadena: avanzar en un clic; regresar pide motivo.
export function FormularioAvance({ compromisoId, movimientos, liga }: { compromisoId: string; movimientos: Movimiento[]; liga: string | null }) {
  const accion = avanzarEntregable.bind(null, compromisoId);
  const [r, despachar, pendiente] = useActionState<Resultado, FormData>(accion, undefined);
  const [regresando, setRegresando] = useState<Movimiento | null>(null);
  const avances = movimientos.filter((m) => !m.regreso);
  const regresos = movimientos.filter((m) => m.regreso);
  if (movimientos.length === 0) return <p className="text-sm text-tinta-3">No tienes movimientos pendientes en este entregable.</p>;
  return (
    <div className="space-y-3">
      {avances.map((m) => (
        <form key={m.a} action={despachar} className="space-y-2">
          <input type="hidden" name="aEtapa" value={m.a} />
          {m.a === "EDITADO" || m.a === "PUBLICADO" ? (
            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-tinta-3">Liga o evidencia</span>
              <input name="liga" defaultValue={liga ?? ""} placeholder="https://… (Drive, Instagram, YouTube)" className="campo" />
            </label>
          ) : null}
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-tinta-3">Nota para quien sigue (opcional)</span>
            <input name="nota" placeholder="Dónde quedó el material, qué cuidar, pendientes…" className="campo" />
          </label>
          <button type="submit" disabled={pendiente} className="inline-flex h-10 w-full items-center justify-center rounded-md border border-acento bg-acento px-3.5 text-sm font-medium text-white shadow-sm hover:bg-acento-2 disabled:opacity-60">
            {pendiente ? "Guardando…" : m.texto}
          </button>
        </form>
      ))}
      {regresos.length ? (
        <div className="border-t border-linea pt-3">
          {regresando ? (
            <form action={despachar} className="space-y-2">
              <input type="hidden" name="aEtapa" value={regresando.a} />
              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-tinta-3">Motivo del regreso</span>
                <input name="nota" required placeholder="Qué falta o qué hay que repetir" className="campo" autoFocus />
              </label>
              <div className="flex gap-2">
                <button type="submit" disabled={pendiente} className="inline-flex h-9 flex-1 items-center justify-center rounded-md border border-riesgo/40 px-3 text-sm font-medium text-riesgo hover:bg-riesgo-suave disabled:opacity-60">
                  {regresando.texto}
                </button>
                <button type="button" onClick={() => setRegresando(null)} className="inline-flex h-9 items-center rounded-md border border-linea-fuerte px-3 text-sm text-tinta-2">Cancelar</button>
              </div>
            </form>
          ) : (
            <div className="flex flex-wrap gap-2">
              {regresos.map((m) => (
                <button key={m.a} type="button" onClick={() => setRegresando(m)} className="text-xs text-tinta-3 hover:text-riesgo hover:underline">
                  {m.texto}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}
      {r?.error ? <p className="rounded border border-riesgo/30 bg-riesgo-suave px-3 py-2 text-sm text-riesgo">{r.error}</p> : null}
      {r?.ok ? <p className="rounded border border-ok/30 bg-ok-suave px-3 py-2 text-sm text-ok">Movimiento registrado y avisado.</p> : null}
    </div>
  );
}

// Un solo botón para la lista: avanza a la siguiente etapa sin nota.
export function BotonAvance({ compromisoId, a, texto }: { compromisoId: string; a: EtapaEntregable; texto: string }) {
  const accion = avanzarEntregable.bind(null, compromisoId);
  const [r, despachar, pendiente] = useActionState<Resultado, FormData>(accion, undefined);
  return (
    <form action={despachar} className="no-imprimir flex flex-col items-end gap-1">
      <input type="hidden" name="aEtapa" value={a} />
      <button type="submit" disabled={pendiente} className="rounded border border-acento/40 px-2.5 py-1 text-xs font-medium text-acento hover:bg-acento-suave disabled:opacity-60">
        {pendiente ? "…" : texto}
      </button>
      {r?.error ? <span className="max-w-[12rem] text-right text-[11px] text-riesgo">{r.error}</span> : null}
    </form>
  );
}
