"use client";

import { useActionState, useState } from "react";
import { pagarComisionHito } from "@/actions/admin";
import type { Resultado } from "@/actions/util";
import { Entrada, Fecha, OPCIONES, Seleccion } from "@/components/campos";

// Administrador general: paga la comisión que generó un cobro concreto.
export function PanelPagarComision({ hitoId, pendiente, concepto }: { hitoId: string; pendiente: number; concepto: string }) {
  const [abierto, setAbierto] = useState(false);
  const accion = pagarComisionHito.bind(null, hitoId);
  const [r, despachar, enviando] = useActionState<Resultado, FormData>(accion, undefined);
  if (r?.ok && abierto) setAbierto(false);
  return (
    <>
      <button type="button" onClick={() => setAbierto(true)} className="no-imprimir rounded border border-acento/40 px-2.5 py-1 text-xs font-medium text-acento hover:bg-acento-suave">
        Pagar comisión
      </button>
      {abierto ? (
        <div className="fixed inset-0 z-30 flex items-start justify-center overflow-y-auto bg-black/30 px-4 py-10" onClick={() => setAbierto(false)}>
          <div className="w-full max-w-md rounded-lg border border-linea bg-superficie shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-linea px-5 py-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-tinta-2">Pagar comisión</h3>
              <button type="button" onClick={() => setAbierto(false)} className="text-sm text-tinta-3 hover:text-tinta">Cerrar</button>
            </div>
            <form action={despachar} className="space-y-3 px-5 py-4">
              <p className="text-sm text-tinta-2">{concepto}</p>
              <div className="grid grid-cols-2 gap-3">
                <Entrada nombre="monto" etiqueta="Monto pagado" valor={pendiente} tipo="number" paso="1" requerido ayuda="Precargado con lo pendiente de este cobro." />
                <Fecha nombre="fechaPago" etiqueta="Fecha de pago" valor={new Date()} requerido />
                <Seleccion nombre="modalidad" etiqueta="Modalidad" valor="EFECTIVO" opciones={OPCIONES.modalidad} />
                <Entrada nombre="notas" etiqueta="Notas" placeholder="Referencia, transferencia…" />
              </div>
              {r?.error ? <p className="rounded border border-riesgo/30 bg-riesgo-suave px-3 py-2 text-sm text-riesgo">{r.error}</p> : null}
              <button type="submit" disabled={enviando} className="inline-flex h-10 w-full items-center justify-center rounded-md border border-acento bg-acento px-3.5 text-sm font-medium text-white shadow-sm hover:bg-acento-2 disabled:opacity-60">
                {enviando ? "Guardando…" : "Registrar pago de comisión"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
