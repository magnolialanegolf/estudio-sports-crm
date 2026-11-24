import Link from "next/link";

// Barra de filtros común a Pipeline, Marcas y Contratos: buscador, director (visión global) y marca.
// Navega por querystring, así cada vista filtrada se puede compartir por liga y se imprime tal cual.
export type Opcion = { id: string; nombre: string; esDemo?: boolean };

export function BarraFiltros({
  ruta,
  q,
  director,
  directores,
  marca,
  marcas,
  tipo,
  tipos,
  extra,
  placeholder = "Buscar marca, proyecto, talento o código…",
}: {
  ruta: string;
  q?: string;
  director?: string;
  directores?: Opcion[];
  marca?: string;
  marcas?: Opcion[];
  tipo?: string;
  tipos?: { valor: string; texto: string }[];
  extra?: Record<string, string | undefined>;
  placeholder?: string;
}) {
  const activo = Boolean(q || director || marca || tipo);
  const campo = "campo h-9 !py-0 text-sm";
  return (
    <form method="get" action={ruta} className="no-imprimir mb-4 flex flex-wrap items-end gap-2">
      {extra
        ? Object.entries(extra)
            .filter(([, v]) => v)
            .map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)
        : null}
      <label className="block min-w-[16rem] flex-1">
        <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-tinta-3">Buscar</span>
        <input name="q" defaultValue={q ?? ""} placeholder={placeholder} className={campo} />
      </label>
      {directores ? (
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-tinta-3">Director</span>
          <select name="director" defaultValue={director ?? ""} className={`${campo} !w-auto max-w-[14rem]`}>
            <option value="">Todos</option>
            {directores.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nombre}
                {d.esDemo ? " (demo)" : ""}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {marcas ? (
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-tinta-3">Marca</span>
          <select name="marca" defaultValue={marca ?? ""} className={`${campo} !w-auto max-w-[14rem]`}>
            <option value="">Todas</option>
            {marcas.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {tipos ? (
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-tinta-3">Tipo</span>
          <select name="tipo" defaultValue={tipo ?? ""} className={`${campo} !w-auto`}>
            <option value="">Todos</option>
            {tipos.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.texto}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <button type="submit" className="inline-flex h-9 items-center rounded-md border border-acento bg-acento px-3.5 text-sm font-medium text-white shadow-sm hover:bg-acento-2">
        Filtrar
      </button>
      {activo ? (
        <Link href={ruta} className="inline-flex h-9 items-center rounded-md border border-linea-fuerte bg-superficie px-3.5 text-sm font-medium text-tinta-2 hover:text-acento">
          Limpiar
        </Link>
      ) : null}
    </form>
  );
}

// Condición Prisma para el buscador: marca, proyecto, talento o código.
export function condicionBusqueda(q?: string) {
  const t = (q ?? "").trim();
  if (!t) return {};
  return {
    OR: [
      { marca: { nombre: { contains: t, mode: "insensitive" as const } } },
      { proyecto: { contains: t, mode: "insensitive" as const } },
      { talento: { contains: t, mode: "insensitive" as const } },
      { codigo: { contains: t, mode: "insensitive" as const } },
    ],
  };
}
