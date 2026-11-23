import type { Metadata } from "next";
import { FormularioIngreso } from "./formulario";

export const metadata: Metadata = { title: "Ingresar" };

export default async function PaginaIngresar({
  searchParams,
}: {
  searchParams: Promise<{ destino?: string; error?: string }>;
}) {
  const { destino, error } = await searchParams;
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="font-serif text-2xl tracking-wide text-tinta">Estudio Sports</div>
          <div className="mt-1 text-xs font-medium uppercase tracking-[0.2em] text-tinta-3">CRM comercial</div>
        </div>
        <div className="rounded-lg border border-linea bg-superficie p-6">
          <FormularioIngreso destino={destino} aviso={error === "sin-cartera" ? "La cuenta no tiene una cartera asignada." : undefined} />
        </div>
        <p className="mt-6 text-center text-xs text-tinta-3">Acceso restringido. La actividad queda registrada en bitácora.</p>
      </div>
    </main>
  );
}
