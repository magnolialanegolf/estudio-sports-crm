"use client";

import { useActionState, useRef } from "react";
import { eliminarDocumento, subirDocumento } from "@/actions/documentos";
import type { Resultado } from "@/actions/util";

export function SubirDocumento({ contratoId }: { contratoId: string }) {
  const accion = subirDocumento.bind(null, contratoId);
  const ref = useRef<HTMLFormElement>(null);
  const [r, despachar, pendiente] = useActionState<Resultado, FormData>(async (prev, fd) => {
    const res = await accion(prev, fd);
    if (res?.ok) ref.current?.reset();
    return res;
  }, undefined);
  return (
    <form ref={ref} action={despachar} className="no-imprimir flex flex-col gap-2 sm:flex-row sm:items-end">
      <label className="block flex-1">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-tinta-3">Archivo (PDF, PNG o JPG, máximo 10 MB)</span>
        <input name="archivo" type="file" accept="application/pdf,image/png,image/jpeg" required className="campo !py-1.5 text-sm file:mr-3 file:rounded file:border file:border-linea-fuerte file:bg-superficie file:px-2.5 file:py-1 file:text-xs file:font-medium" />
      </label>
      <label className="block flex-1">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-tinta-3">Descripción</span>
        <input name="descripcion" className="campo !py-1.5 text-sm" placeholder="Contrato firmado, anexo de entregables…" />
      </label>
      <button type="submit" disabled={pendiente} className="rounded border border-acento bg-acento px-3.5 py-2 text-sm font-medium text-white disabled:opacity-60">
        {pendiente ? "Subiendo…" : "Subir"}
      </button>
      {r?.error ? <p className="text-sm text-riesgo sm:ml-2">{r.error}</p> : null}
    </form>
  );
}

export function BorrarDocumento({ id }: { id: string }) {
  return (
    <form
      action={eliminarDocumento.bind(null, id)}
      onSubmit={(e) => {
        if (!window.confirm("¿Eliminar este documento?")) e.preventDefault();
      }}
    >
      <button type="submit" className="no-imprimir text-xs text-riesgo hover:underline">Eliminar</button>
    </form>
  );
}
