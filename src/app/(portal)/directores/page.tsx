import { db } from "@/lib/db";
import { requerirAdmin } from "@/lib/acceso";
import { fecha } from "@/lib/formato";
import { Etiqueta, Pagina, Tabla, Tarjeta, Td, Th, Vacio } from "@/components/ui";
import { Plegable } from "@/components/formularios";
import { FormularioDirector, FormularioAsignacion, BorrarDemo } from "./paneles";

export default async function Directores() {
  await requerirAdmin();
  const [directores, marcas] = await Promise.all([
    db.director.findMany({
      include: {
        carteras: { where: { hasta: null }, include: { marca: { select: { id: true, nombre: true } } } },
        usuarios: { select: { usuario: true, activo: true } },
        _count: { select: { contratos: true } },
      },
      orderBy: [{ esDemo: "asc" }, { activo: "desc" }, { nombre: "asc" }],
    }),
    db.marca.findMany({ include: { carteras: { where: { hasta: null }, include: { director: { select: { nombre: true } } } } }, orderBy: { nombre: "asc" } }),
  ]);

  return (
    <Pagina titulo="Directores comerciales" subtitulo="Altas, carteras y asignación de marcas. Un director real nunca se elimina: se desactiva para conservar su historial.">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Tarjeta titulo="Directores" className="xl:col-span-2">
          {directores.length === 0 ? (
            <Vacio>Sin directores.</Vacio>
          ) : (
            <Tabla>
              <thead>
                <tr>
                  <Th>Director</Th>
                  <Th>Marcas en cartera</Th>
                  <Th derecha>Contratos</Th>
                  <Th>Usuarios</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {directores.map((d) => (
                  <tr key={d.id}>
                    <Td>
                      <div className="font-medium">{d.nombre}</div>
                      <div className="flex gap-1 text-xs text-tinta-3">
                        {d.correo ?? ""}
                        {!d.activo ? <Etiqueta>inactivo</Etiqueta> : null}
                        {d.esDemo ? <Etiqueta>demo</Etiqueta> : null}
                      </div>
                      {d.notas ? <div className="text-xs text-tinta-3">{d.notas}</div> : null}
                    </Td>
                    <Td className="text-tinta-2">{d.carteras.map((c) => c.marca.nombre).join(", ") || "—"}</Td>
                    <Td derecha>{d._count.contratos}</Td>
                    <Td className="text-tinta-2">{d.usuarios.map((u) => `${u.usuario}${u.activo ? "" : " (inactivo)"}`).join(", ") || "sin usuario"}</Td>
                    <Td>
                      <div className="flex flex-col items-end gap-1">
                        <Plegable titulo="Editar">
                          <FormularioDirector director={d} />
                        </Plegable>
                        {d.esDemo ? <BorrarDemo id={d.id} /> : null}
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Tabla>
          )}
          <div className="mt-4">
            <Plegable titulo="Alta de director comercial">
              <FormularioDirector />
            </Plegable>
          </div>
        </Tarjeta>

        <Tarjeta titulo="Asignar marca" descripcion="La asignación anterior se cierra en la fecha indicada y queda en el historial.">
          <FormularioAsignacion marcas={marcas.map((m) => ({ id: m.id, nombre: m.nombre, actual: m.carteras[0]?.director.nombre ?? null }))} directores={directores.filter((d) => d.activo).map((d) => ({ id: d.id, nombre: d.nombre }))} />
          <div className="mt-5">
            <div className="mb-1 text-xs font-medium uppercase tracking-wide text-tinta-3">Asignación actual</div>
            <ul className="divide-y divide-linea/70 text-sm">
              {marcas.map((m) => (
                <li key={m.id} className="flex justify-between py-1.5">
                  <span>{m.nombre}</span>
                  <span className="text-tinta-2">{m.carteras[0] ? `${m.carteras[0].director.nombre} · desde ${fecha(m.carteras[0].desde)}` : "Sin asignar"}</span>
                </li>
              ))}
            </ul>
          </div>
        </Tarjeta>
      </div>
    </Pagina>
  );
}
