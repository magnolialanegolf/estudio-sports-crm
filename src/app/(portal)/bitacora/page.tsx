import Link from "next/link";
import { format } from "date-fns";
import { db } from "@/lib/db";
import { requerirAdmin } from "@/lib/acceso";
import { Etiqueta, Pagina, Tabla, Tarjeta, Td, Th, Vacio } from "@/components/ui";

const POR_PAGINA = 50;

export default async function Bitacora({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  await requerirAdmin();
  const { p } = await searchParams;
  const pagina = Math.max(1, Number(p ?? 1) || 1);
  const [registros, total] = await Promise.all([
    db.bitacora.findMany({ include: { usuario: { select: { nombre: true, usuario: true } } }, orderBy: { fecha: "desc" }, skip: (pagina - 1) * POR_PAGINA, take: POR_PAGINA }),
    db.bitacora.count(),
  ]);
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  return (
    <Pagina titulo="Bitácora" subtitulo={`${total} movimientos registrados. Quién hizo qué y cuándo.`}>
      <Tarjeta>
        {registros.length === 0 ? (
          <Vacio>Sin movimientos.</Vacio>
        ) : (
          <Tabla>
            <thead>
              <tr>
                <Th>Fecha</Th>
                <Th>Usuario</Th>
                <Th>Acción</Th>
                <Th>Entidad</Th>
                <Th>Detalle</Th>
              </tr>
            </thead>
            <tbody>
              {registros.map((r) => (
                <tr key={r.id}>
                  <Td className="tabular whitespace-nowrap text-tinta-2">{format(r.fecha, "dd/MM/yyyy HH:mm")}</Td>
                  <Td>{r.usuario ? <span>{r.usuario.nombre} <span className="text-xs text-tinta-3">({r.usuario.usuario})</span></span> : <span className="text-tinta-3">—</span>}</Td>
                  <Td><Etiqueta tono={r.accion === "eliminar" ? "riesgo" : r.accion === "crear" ? "ok" : "neutro"}>{r.accion}</Etiqueta></Td>
                  <Td className="text-tinta-2">{r.entidad}{r.entidadId ? <span className="text-xs text-tinta-3"> · {r.entidadId.slice(-6)}</span> : null}</Td>
                  <Td className="max-w-md break-words font-mono text-xs text-tinta-2">{r.detalle ? JSON.stringify(r.detalle) : "—"}</Td>
                </tr>
              ))}
            </tbody>
          </Tabla>
        )}
        {paginas > 1 ? (
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-tinta-3">Página {pagina} de {paginas}</span>
            <div className="flex gap-2">
              {pagina > 1 ? <Link href={`/bitacora?p=${pagina - 1}`} className="text-acento hover:underline">Anterior</Link> : null}
              {pagina < paginas ? <Link href={`/bitacora?p=${pagina + 1}`} className="text-acento hover:underline">Siguiente</Link> : null}
            </div>
          </div>
        ) : null}
      </Tarjeta>
    </Pagina>
  );
}
