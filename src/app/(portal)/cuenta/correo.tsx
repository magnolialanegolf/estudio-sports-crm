"use client";

import { useActionState } from "react";
import { cambiarAvisosPorCorreo, enviarCorreoPrueba } from "@/actions/cuenta";
import type { Resultado } from "@/actions/util";

export function PanelCorreo({ correo, activo, configurado }: { correo: string | null; activo: boolean; configurado: boolean }) {
  const [r, probar, pendiente] = useActionState<Resultado>(enviarCorreoPrueba, undefined);
  return (
    <div className="space-y-4 text-sm">
      <div>
        <div className="text-xs font-medium uppercase tracking-wide text-tinta-3">Correo registrado</div>
        <div className="mt-0.5">{correo ?? <span className="text-tinta-3">Sin correo. El administrador lo captura en Usuarios.</span>}</div>
      </div>
      <form action={cambiarAvisosPorCorreo} className="flex items-center justify-between gap-3 rounded-md border border-linea bg-superficie-2 px-4 py-3">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="avisosPorCorreo" defaultChecked={activo} className="h-4 w-4 accent-[var(--acento)]" />
          <span>Recibir los avisos también por correo</span>
        </label>
        <button type="submit" className="inline-flex h-8 items-center rounded-md border border-linea-fuerte bg-superficie px-3 text-xs font-medium hover:border-acento-2 hover:text-acento">Guardar</button>
      </form>
      <p className="text-xs text-tinta-3">
        {configurado ? "El envío de correo está activo en este entorno." : "El envío de correo aún no está conectado en este entorno. Los avisos llegan en la campana y las fechas al calendario del celular; en cuanto se conecte, también por correo."}
      </p>
      {configurado && correo ? (
        <form action={probar} className="space-y-2">
          <button type="submit" disabled={pendiente} className="inline-flex h-9 items-center rounded-md border border-linea-fuerte bg-superficie px-3.5 text-sm font-medium shadow-sm hover:border-acento-2 hover:text-acento disabled:opacity-60">
            {pendiente ? "Enviando…" : "Enviarme un correo de prueba"}
          </button>
          {r?.error ? <p className="rounded border border-riesgo/30 bg-riesgo-suave px-3 py-2 text-sm text-riesgo">{r.error}</p> : null}
          {r?.ok ? <p className="rounded border border-ok/30 bg-ok-suave px-3 py-2 text-sm text-ok">Enviado. Revisa tu bandeja.</p> : null}
        </form>
      ) : null}
    </div>
  );
}
