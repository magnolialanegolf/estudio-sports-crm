"use client";

import { useActionState } from "react";
import { cambiarContrasena, type EstadoClave } from "@/actions/sesion";

export function FormularioClave() {
  const [estado, accion, pendiente] = useActionState<EstadoClave, FormData>(cambiarContrasena, undefined);
  return (
    <form action={accion} className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-tinta-3">Contraseña actual</span>
        <input name="actual" type="password" autoComplete="current-password" required className="campo" />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-tinta-3">Nueva contraseña</span>
        <input name="nueva" type="password" autoComplete="new-password" minLength={12} required className="campo" />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-tinta-3">Confirmación</span>
        <input name="confirmacion" type="password" autoComplete="new-password" minLength={12} required className="campo" />
      </label>
      {estado?.error ? <p className="rounded border border-riesgo/30 bg-riesgo-suave px-3 py-2 text-sm text-riesgo">{estado.error}</p> : null}
      {estado?.ok ? <p className="rounded border border-ok/30 bg-ok-suave px-3 py-2 text-sm text-ok">Contraseña actualizada.</p> : null}
      <button type="submit" disabled={pendiente} className="inline-flex h-9 items-center rounded-md border border-acento bg-acento px-3.5 text-sm font-medium text-white shadow-sm hover:bg-acento-2 disabled:opacity-60">
        Guardar
      </button>
    </form>
  );
}
