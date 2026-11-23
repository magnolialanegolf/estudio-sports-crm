"use client";

import { useActionState } from "react";
import { ingresar, type EstadoIngreso } from "@/actions/sesion";

export function FormularioIngreso({ destino, aviso }: { destino?: string; aviso?: string }) {
  const [estado, accion, pendiente] = useActionState<EstadoIngreso, FormData>(ingresar, undefined);
  const error = estado?.error ?? aviso;
  return (
    <form action={accion} className="space-y-4">
      {destino ? <input type="hidden" name="destino" value={destino} /> : null}
      <label className="block">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-tinta-3">Usuario</span>
        <input name="usuario" autoComplete="username" required autoFocus className="campo" />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-tinta-3">Contraseña</span>
        <input name="clave" type="password" autoComplete="current-password" required className="campo" />
      </label>
      {error ? (
        <p role="alert" className="rounded border border-riesgo/30 bg-riesgo-suave px-3 py-2 text-sm text-riesgo">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pendiente}
        className="w-full rounded border border-acento bg-acento px-3.5 py-2 text-sm font-medium text-white hover:bg-[#182e4b] disabled:opacity-60"
      >
        {pendiente ? "Verificando…" : "Ingresar"}
      </button>
    </form>
  );
}
