import { addMonths, startOfDay, startOfMonth } from "date-fns";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { fecha } from "@/lib/formato";

// Línea de tiempo en SVG: barra de vigencia, marcadores de cobro y compromisos, línea de hoy.
export function LineaTiempo({
  inicio,
  vencimiento,
  hitos,
  compromisos,
}: {
  inicio: Date | null;
  vencimiento: Date | null;
  hitos: { fecha: Date | null; pagado: boolean; importe: number; concepto: string }[];
  compromisos: { fecha: Date | null; estado: string; descripcion: string }[];
}) {
  const hoy = startOfDay(new Date());
  const fechas = [inicio, vencimiento, ...hitos.map((h) => h.fecha), ...compromisos.map((k) => k.fecha), hoy].filter((d): d is Date => !!d);
  if (fechas.length < 2) {
    return <p className="text-sm text-tinta-3">Captura inicio, vencimiento o fechas de cobro para ver la línea de tiempo.</p>;
  }
  const min = startOfMonth(new Date(Math.min(...fechas.map((d) => d.getTime()))));
  const max = addMonths(startOfMonth(new Date(Math.max(...fechas.map((d) => d.getTime())))), 1);
  const rango = max.getTime() - min.getTime();
  const x = (d: Date) => ((d.getTime() - min.getTime()) / rango) * 100;

  // Marcas de meses (máximo 12 etiquetas)
  const meses: Date[] = [];
  for (let d = min; d < max; d = addMonths(d, 1)) meses.push(d);
  const paso = Math.max(1, Math.ceil(meses.length / 8));

  return (
    <div>
      <svg viewBox="0 0 100 26" preserveAspectRatio="none" className="h-28 w-full" role="img" aria-label="Línea de tiempo del contrato">
        {meses.map((m, i) => (
          <line key={i} x1={x(m)} x2={x(m)} y1="2" y2="24" stroke="var(--linea)" strokeWidth="0.15" />
        ))}
        {inicio && vencimiento ? <rect x={x(inicio)} y="10" width={Math.max(x(vencimiento) - x(inicio), 0.3)} height="4" fill="var(--acento-suave)" stroke="var(--acento)" strokeWidth="0.15" /> : null}
        {hitos.map((h, i) =>
          h.fecha ? (
            <g key={`h${i}`}>
              <title>{`${h.concepto} · ${fecha(h.fecha)}`}</title>
              <circle cx={x(h.fecha)} cy="12" r="1.2" fill={h.pagado ? "var(--ok)" : h.fecha < hoy ? "var(--riesgo)" : "var(--acento)"} />
            </g>
          ) : null,
        )}
        {compromisos.map((k, i) =>
          k.fecha ? (
            <g key={`k${i}`}>
              <title>{`${k.descripcion} · ${fecha(k.fecha)}`}</title>
              <rect x={x(k.fecha) - 0.8} y="18" width="1.6" height="1.6" fill={k.estado === "CUMPLIDO" ? "var(--ok)" : k.fecha < hoy ? "var(--riesgo)" : "var(--alerta)"} />
            </g>
          ) : null,
        )}
        <line x1={x(hoy)} x2={x(hoy)} y1="1" y2="25" stroke="var(--tinta)" strokeWidth="0.3" strokeDasharray="0.8 0.6" />
      </svg>
      <div className="relative h-5 text-[11px] text-tinta-3">
        {meses
          .filter((_, i) => i % paso === 0)
          .map((m, i) => (
            <span key={i} className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${x(m)}%` }}>
              {format(m, "MMM yy", { locale: es })}
            </span>
          ))}
      </div>
      <div className="mt-1 flex flex-wrap gap-4 text-xs text-tinta-2">
        <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2 w-5 border border-acento bg-acento-suave" /> Vigencia</span>
        <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-ok" /> Cobro pagado</span>
        <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-acento" /> Cobro previsto</span>
        <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-riesgo" /> Cobro vencido</span>
        <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2 w-2 bg-alerta" /> Compromiso</span>
        <span className="inline-flex items-center gap-1.5"><span className="inline-block h-3 w-0 border-l border-dashed border-tinta" /> Hoy</span>
      </div>
    </div>
  );
}
