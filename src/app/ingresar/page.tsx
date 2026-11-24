import type { Metadata } from "next";
import { FormularioIngreso } from "./formulario";
import { Mascota } from "@/components/marca";

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
        <div className="mb-8 flex flex-col items-center text-center">
          <Mascota alto={84} color="#00345e" className="mb-4" />
          <div className="titulo-marca text-3xl text-acento">Estudio Sports</div>
          <div className="etiqueta-marca mt-1 text-[10px] text-naranja">CRM comercial</div>
        </div>
        <div className="tarjeta rounded-xl border border-linea bg-superficie p-6">
          <FormularioIngreso destino={destino} aviso={error === "sin-cartera" ? "La cuenta no tiene una cartera asignada." : undefined} />
        </div>
        <p className="mt-6 text-center text-xs text-tinta-3">Acceso restringido. La actividad queda registrada en bitácora.</p>
      </div>
    </main>
  );
}
