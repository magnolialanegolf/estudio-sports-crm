"use client";

import { eliminarPagoComision } from "@/actions/admin";

export function BorrarPagoComision({ id }: { id: string }) {
  return (
    <form
      action={eliminarPagoComision.bind(null, id)}
      onSubmit={(e) => {
        if (!window.confirm("¿Eliminar este pago de comisión registrado?")) e.preventDefault();
      }}
      className="no-imprimir flex justify-end"
    >
      <button type="submit" className="text-xs text-riesgo hover:underline">Eliminar</button>
    </form>
  );
}
