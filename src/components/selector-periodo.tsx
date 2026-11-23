import Link from "next/link";

// Selector de periodo para informes. Atajos y rango libre.
export function SelectorPeriodo({ ruta, actual, desde, hasta, extra }: { ruta: string; actual?: string; desde?: string; hasta?: string; extra?: Record<string, string | undefined> }) {
  const q = (p: Record<string, string | undefined>) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...extra, ...p })) if (v) u.set(k, v);
    const s = u.toString();
    return s ? `${ruta}?${s}` : ruta;
  };
  const opciones = [
    { v: "mes", t: "Mes" },
    { v: "trimestre", t: "Trimestre" },
    { v: "anio", t: "Año" },
    { v: "todo", t: "Histórico" },
  ];
  const libre = Boolean(desde && hasta);
  return (
    <div className="no-imprimir flex flex-wrap items-center gap-2">
      <div className="flex gap-1">
        {opciones.map((o) => (
          <Link key={o.v} href={q({ periodo: o.v, desde: undefined, hasta: undefined })} className={`rounded border px-3 py-1.5 text-xs font-medium ${!libre && (actual ?? "trimestre") === o.v ? "border-acento bg-acento-suave text-acento" : "border-linea text-tinta-2 hover:bg-superficie-2"}`}>
            {o.t}
          </Link>
        ))}
      </div>
      <form method="get" action={ruta} className="flex items-center gap-1.5">
        {extra
          ? Object.entries(extra)
              .filter(([, v]) => v)
              .map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)
          : null}
        <input type="date" name="desde" defaultValue={desde} className="campo !w-auto !py-1.5 text-xs" aria-label="Desde" />
        <span className="text-xs text-tinta-3">a</span>
        <input type="date" name="hasta" defaultValue={hasta} className="campo !w-auto !py-1.5 text-xs" aria-label="Hasta" />
        <button type="submit" className="rounded border border-linea-fuerte bg-superficie px-3 py-1.5 text-xs font-medium hover:bg-superficie-2">Aplicar</button>
      </form>
    </div>
  );
}
