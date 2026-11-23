// Gráficas en SVG servidas desde el servidor. Sin dependencias, imprimibles.
import { dineroCorto } from "@/lib/formato";

type Tono = "acento" | "ok" | "alerta" | "riesgo" | "neutro";
const COLOR: Record<Tono, string> = {
  acento: "var(--acento)",
  ok: "var(--ok)",
  alerta: "var(--alerta)",
  riesgo: "var(--riesgo)",
  neutro: "var(--linea-fuerte)",
};

export function Barras({
  datos,
  formato = dineroCorto,
  alto = 28,
}: {
  datos: { etiqueta: string; valor: number; tono?: Tono; nota?: string }[];
  formato?: (n: number) => string;
  alto?: number;
}) {
  const max = Math.max(...datos.map((d) => d.valor), 1);
  return (
    <div className="space-y-2">
      {datos.map((d) => (
        <div key={d.etiqueta} className="grid grid-cols-[minmax(0,12rem)_minmax(0,1fr)_auto] items-center gap-3 text-sm">
          <div className="line-clamp-2 text-xs leading-tight text-tinta-2 sm:text-sm" title={d.etiqueta}>
            {d.etiqueta}
          </div>
          <svg viewBox="0 0 100 10" preserveAspectRatio="none" width="100%" style={{ display: "block", width: "100%", height: alto * 0.45 }} aria-hidden>
            <rect x="0" y="0" width="100" height="10" fill="var(--neutro-suave)" />
            <rect x="0" y="0" width={(d.valor / max) * 100} height="10" fill={COLOR[d.tono ?? "acento"]} />
          </svg>
          <div className="tabular w-20 text-right text-tinta" title={d.nota}>
            {formato(d.valor)}
          </div>
        </div>
      ))}
    </div>
  );
}

// Barras agrupadas por mes (dos series), para calendarios de cobro proyectado vs cobrado.
export function Columnas({
  series,
  categorias,
  alto = 180,
}: {
  categorias: string[];
  series: { nombre: string; valores: number[]; tono: Tono }[];
  alto?: number;
}) {
  const max = Math.max(...series.flatMap((s) => s.valores), 1);
  const n = categorias.length;
  const ancho = 100;
  const grupo = ancho / n;
  const barra = (grupo * 0.7) / series.length;
  return (
    <div>
      <svg viewBox={`0 0 ${ancho} 60`} preserveAspectRatio="none" width="100%" style={{ display: "block", width: "100%", height: alto }} aria-hidden>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1="0" x2={ancho} y1={60 - f * 56} y2={60 - f * 56} stroke="var(--linea)" strokeWidth="0.2" />
        ))}
        {categorias.map((_, i) =>
          series.map((s, j) => {
            const h = (s.valores[i] / max) * 56;
            const x = i * grupo + grupo * 0.15 + j * barra;
            return <rect key={`${i}-${j}`} x={x} y={60 - h} width={barra * 0.9} height={h} fill={COLOR[s.tono]} />;
          }),
        )}
      </svg>
      <div className="grid text-center text-[11px] text-tinta-3" style={{ gridTemplateColumns: `repeat(${n}, minmax(0,1fr))` }}>
        {categorias.map((c) => (
          <div key={c} className="truncate">
            {c}
          </div>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-4 text-xs text-tinta-2">
        {series.map((s) => (
          <span key={s.nombre} className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: COLOR[s.tono] }} />
            {s.nombre}
          </span>
        ))}
      </div>
    </div>
  );
}

// Anillo de proporción (por ejemplo cobrado / contratado).
export function Anillo({ fraccion, etiqueta, tono = "acento" }: { fraccion: number; etiqueta: string; tono?: Tono }) {
  const f = Math.max(0, Math.min(1, fraccion));
  const r = 16;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 40 40" className="h-16 w-16" aria-hidden>
        <circle cx="20" cy="20" r={r} fill="none" stroke="var(--neutro-suave)" strokeWidth="5" />
        <circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          stroke={COLOR[tono]}
          strokeWidth="5"
          strokeDasharray={`${c * f} ${c}`}
          transform="rotate(-90 20 20)"
          strokeLinecap="butt"
        />
        <text x="20" y="23" textAnchor="middle" fontSize="8" fill="var(--tinta)" fontWeight="600">
          {Math.round(f * 100)}%
        </text>
      </svg>
      <div className="text-sm text-tinta-2">{etiqueta}</div>
    </div>
  );
}
