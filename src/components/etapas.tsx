import type { EtapaEntregable } from "@prisma/client";
import { DUENO_ETAPA, ETAPAS, ETIQUETA_ETAPA, tonoEtapa } from "@/lib/produccion";
import { fecha } from "@/lib/formato";
import { Etiqueta } from "./ui";

// Chip compacto con la etapa actual del entregable.
export function ChipEtapa({ etapa }: { etapa: EtapaEntregable }) {
  return <Etiqueta tono={tonoEtapa(etapa)}>{ETIQUETA_ETAPA[etapa]}</Etiqueta>;
}

// Recorrido completo: qué etapa va, quién la ejecuta y cuándo se cumplió cada una.
export function Recorrido({ etapa, fechas, responsables }: { etapa: EtapaEntregable; fechas: Partial<Record<EtapaEntregable, Date | null>>; responsables: Partial<Record<EtapaEntregable, string | null>> }) {
  const actual = ETAPAS.indexOf(etapa);
  return (
    <ol className="grid grid-cols-6 gap-1">
      {ETAPAS.map((e, i) => {
        const hecha = i < actual || etapa === "PUBLICADO";
        const activa = i === actual && etapa !== "PUBLICADO";
        return (
          <li key={e} className="min-w-0">
            <div className={`h-1.5 rounded ${hecha ? "bg-ok" : activa ? "bg-naranja" : "bg-neutro-suave"}`} />
            <div className={`mt-1.5 truncate text-xs font-medium ${hecha ? "text-ok" : activa ? "text-naranja" : "text-tinta-3"}`}>{ETIQUETA_ETAPA[e]}</div>
            <div className="truncate text-[11px] text-tinta-3">{responsables[e] ?? DUENO_ETAPA[e]}</div>
            {fechas[e] ? <div className="text-[11px] text-tinta-3">{fecha(fechas[e]!)}</div> : null}
          </li>
        );
      })}
    </ol>
  );
}
