// Selector de director para roles con visión global. Navegación por querystring.
export function FiltroDirector({
  directores,
  actual,
  ruta,
  extra,
}: {
  directores: { id: string; nombre: string; esDemo: boolean }[];
  actual?: string;
  ruta: string;
  extra?: Record<string, string | undefined>;
}) {
  return (
    <form method="get" action={ruta} className="no-imprimir flex max-w-full flex-wrap items-center gap-2">
      {extra
        ? Object.entries(extra)
            .filter(([, v]) => v)
            .map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)
        : null}
      <label className="text-xs font-medium uppercase tracking-wide text-tinta-3" htmlFor="director">
        Director
      </label>
      <select id="director" name="director" defaultValue={actual ?? ""} className="campo h-9 !w-auto max-w-[12rem] !py-0 text-sm">
        <option value="">Todos</option>
        {directores.map((d) => (
          <option key={d.id} value={d.id}>
            {d.nombre}
            {d.esDemo ? " (demo)" : ""}
          </option>
        ))}
      </select>
      <button type="submit" className="inline-flex h-9 items-center rounded-md border border-linea-fuerte bg-superficie px-3.5 text-sm font-medium shadow-sm hover:border-acento-2 hover:text-acento">
        Aplicar
      </button>
    </form>
  );
}
