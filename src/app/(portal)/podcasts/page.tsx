import Link from "next/link";
import { db } from "@/lib/db";
import { requerirAdmin } from "@/lib/acceso";
import { dinero } from "@/lib/formato";
import { Etiqueta, Pagina, Tabla, Tarjeta, Td, Th, Vacio } from "@/components/ui";
import { Plegable, Confirmar } from "@/components/formularios";
import { eliminarPodcast } from "@/actions/admin";
import { FormularioPodcast } from "./paneles";

// Catálogo de pódcast: cada programa es una unidad de negocio con sus propios contratos.
export default async function Podcasts() {
  await requerirAdmin();
  const [podcasts, huerfanos] = await Promise.all([
    db.podcast.findMany({
      include: { contratos: { select: { id: true, estado: true, monto: true, hitos: { select: { montoRecibido: true } } } } },
      orderBy: [{ activo: "desc" }, { nombre: "asc" }],
    }),
    db.contrato.count({ where: { tipo: "PODCAST", podcastId: null, estado: { notIn: ["CANCELADO"] } } }),
  ]);

  return (
    <Pagina titulo="Pódcast" subtitulo="Cada programa se mide por separado: sus contratos, lo que cobra y lo que deja." acciones={<Link href="/reportes/podcasts" className="inline-flex h-9 items-center rounded-md border border-acento bg-acento px-3.5 text-sm font-medium text-white shadow-sm hover:bg-acento-2">Ver reporte por pódcast</Link>}>
      {huerfanos > 0 ? (
        <div className="mb-5 rounded-md border border-alerta/30 bg-alerta-suave px-4 py-3 text-sm text-alerta">
          Hay {huerfanos} contrato(s) de tipo pódcast sin programa asignado. Edítalos y elige el pódcast para que cuenten en el reporte.
        </div>
      ) : null}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Tarjeta titulo="Programas" className="xl:col-span-2">
          {podcasts.length === 0 ? (
            <Vacio>Aún no hay pódcast dados de alta.</Vacio>
          ) : (
            <Tabla>
              <thead>
                <tr>
                  <Th>Programa</Th>
                  <Th derecha>Contratos vigentes</Th>
                  <Th derecha>Valor vigente</Th>
                  <Th derecha>Cobrado histórico</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {podcasts.map((p) => {
                  const vigentes = p.contratos.filter((c) => c.estado === "VIGENTE");
                  const cobrado = p.contratos.flatMap((c) => c.hitos).reduce((a, h) => a + h.montoRecibido, 0);
                  return (
                    <tr key={p.id}>
                      <Td>
                        <div className="font-medium">{p.nombre}</div>
                        <div className="text-xs text-tinta-3">{p.talento ?? "—"}</div>
                        {!p.activo ? <Etiqueta tono="neutro">inactivo</Etiqueta> : null}
                      </Td>
                      <Td derecha>{vigentes.length}</Td>
                      <Td derecha>{dinero(vigentes.reduce((a, c) => a + (c.monto ?? 0), 0))}</Td>
                      <Td derecha>{dinero(cobrado)}</Td>
                      <Td>
                        <div className="flex flex-col items-end gap-1">
                          <Plegable titulo="Editar">
                            <FormularioPodcast podcast={p} />
                          </Plegable>
                          {p.contratos.length === 0 ? <Confirmar accion={eliminarPodcast.bind(null, p.id)} texto="Eliminar" mensaje="¿Eliminar este pódcast? No tiene contratos ligados." /> : null}
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Tabla>
          )}
        </Tarjeta>
        <Tarjeta titulo="Nuevo pódcast" descripcion="Después, en cada contrato de tipo pódcast se elige el programa.">
          <FormularioPodcast />
        </Tarjeta>
      </div>
    </Pagina>
  );
}
