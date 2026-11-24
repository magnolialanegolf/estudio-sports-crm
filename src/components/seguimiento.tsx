import Link from "next/link";
import type { TipoSeguimiento } from "@prisma/client";
import { fecha } from "@/lib/formato";
import { Etiqueta, Vacio } from "./ui";
import { BorrarSeguimiento } from "@/app/(portal)/contratos/[id]/seguimiento";

export const ETIQUETA_SEGUIMIENTO: Record<TipoSeguimiento, string> = { LLAMADA: "Llamada", REUNION: "Reunión", CORREO: "Correo", MENSAJE: "Mensaje", NOTA: "Nota" };

export type FilaSeguimiento = {
  id: string;
  tipo: TipoSeguimiento;
  fecha: Date;
  texto: string;
  siguientePaso: string | null;
  siguienteFecha: Date | null;
  usuario: { nombre: string } | null;
  compromiso?: { id: string; estado: string } | null;
  contrato?: { id: string; proyecto: string } | null;
};

// Línea de seguimiento: lo más reciente arriba, con quién lo registró y qué sigue.
export function ListaSeguimiento({ items, puedeEditar, vacio = "Sin seguimiento registrado. Anota aquí cada llamada, reunión o avance." }: { items: FilaSeguimiento[]; puedeEditar: boolean; vacio?: string }) {
  if (items.length === 0) return <Vacio>{vacio}</Vacio>;
  return (
    <ol className="relative ml-2 border-l border-linea pl-5">
      {items.map((sg) => (
        <li key={sg.id} className="relative py-2.5">
          <span className="absolute -left-[27px] top-4 h-2.5 w-2.5 rounded-full border-2 border-superficie bg-acento" aria-hidden />
          <div className="flex flex-wrap items-center gap-2 text-xs text-tinta-3">
            <Etiqueta>{ETIQUETA_SEGUIMIENTO[sg.tipo]}</Etiqueta>
            <span>{fecha(sg.fecha)}</span>
            <span>· {sg.usuario?.nombre ?? "—"}</span>
            {sg.contrato ? (
              <Link href={`/contratos/${sg.contrato.id}`} className="text-acento hover:underline">· {sg.contrato.proyecto}</Link>
            ) : null}
            {puedeEditar ? <span className="ml-auto"><BorrarSeguimiento id={sg.id} /></span> : null}
          </div>
          <p className="mt-0.5 whitespace-pre-line text-sm text-tinta">{sg.texto}</p>
          {sg.siguientePaso ? (
            <p className="mt-1 text-xs">
              <span className="font-medium text-naranja">Siguiente:</span> {sg.siguientePaso}
              {sg.siguienteFecha ? ` · ${fecha(sg.siguienteFecha)}` : ""}
              {sg.compromiso ? (
                <Link href={`/tareas/${sg.compromiso.id}`} className={`ml-2 ${sg.compromiso.estado === "CUMPLIDO" ? "text-ok" : "text-acento"} hover:underline`}>
                  {sg.compromiso.estado === "CUMPLIDO" ? "hecho" : "ver tarea"}
                </Link>
              ) : null}
            </p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
