"use client";

import { useActionState } from "react";
import { cambiarEstadoCompromiso, reportarCompromiso } from "@/actions/contratos";
import type { Resultado } from "@/actions/util";

export function FormularioReporte({ compromisoId, estado, reporte, produccion }: { compromisoId: string; estado: string; reporte: string | null; produccion: boolean }) {
  const accion = reportarCompromiso.bind(null, compromisoId);
  const [r, despachar, pendiente] = useActionState<Resultado, FormData>(accion, undefined);
  const abierta = estado === "PENDIENTE" || estado === "EN_CURSO" || estado === "REQUIERE_ATENCION";
  return (
    <form key={`${estado}-${reporte ?? ""}`} action={despachar} className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-tinta-3">Estado</span>
        <select name="estado" defaultValue={estado} className="campo">
          <option value="PENDIENTE">Pendiente</option>
          <option value="EN_CURSO">En curso</option>
          <option value="REQUIERE_ATENCION">Requiere atención · me falta algo o va retrasado</option>
          <option value="CUMPLIDO">Cumplido</option>
          {!produccion ? <option value="CANCELADO">Cancelado</option> : null}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-tinta-3">Reporte</span>
        <textarea name="reporte" rows={4} defaultValue={reporte ?? ""} className="campo" placeholder={produccion ? "Qué se hizo, dónde se publicó, liga o evidencia. Si va retrasado, por qué y para cuándo." : "Observaciones para producción o para el expediente."} />
      </label>
      {r?.error ? <p className="rounded border border-riesgo/30 bg-riesgo-suave px-3 py-2 text-sm text-riesgo">{r.error}</p> : null}
      {r?.ok ? <p className="rounded border border-ok/30 bg-ok-suave px-3 py-2 text-sm text-ok">Reporte guardado.</p> : null}
      <button type="submit" disabled={pendiente} className="inline-flex h-10 w-full items-center justify-center rounded-md border border-acento bg-acento px-3.5 text-sm font-medium text-white shadow-sm hover:bg-acento-2 disabled:opacity-60">
        {pendiente ? "Guardando…" : abierta ? "Guardar reporte" : "Actualizar"}
      </button>
    </form>
  );
}

export function ReportarRapido({ compromisoId }: { compromisoId: string }) {
  return (
    <form action={cambiarEstadoCompromiso.bind(null, compromisoId, "CUMPLIDO")} className="no-imprimir flex justify-end">
      <button type="submit" className="rounded border border-ok/40 px-2.5 py-1 text-xs font-medium text-ok hover:bg-ok-suave">Marcar cumplida</button>
    </form>
  );
}
