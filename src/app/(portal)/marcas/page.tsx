import Link from "next/link";
import { db } from "@/lib/db";
import { filtroMarcas, puedeCapturar, requerirSesion, veTodo } from "@/lib/acceso";
import { dinero, etiqueta } from "@/lib/formato";
import { Boton, Etiqueta, Pagina, Tabla, Tarjeta, Td, Th, Vacio } from "@/components/ui";

export default async function Marcas() {
  const s = await requerirSesion();
  const marcas = await db.marca.findMany({
    where: filtroMarcas(s),
    include: {
      carteras: { where: { hasta: null }, include: { director: { select: { nombre: true } } } },
      contratos: {
        where: veTodo(s) ? {} : { directorId: s.directorId! },
        select: { id: true, estado: true, monto: true, vencimiento: true, hitos: { select: { importe: true, montoRecibido: true } } },
      },
      _count: { select: { contactos: true } },
    },
    orderBy: [{ esDemo: "asc" }, { nombre: "asc" }],
  });

  return (
    <Pagina
      titulo="Marcas"
      subtitulo={`${marcas.length} marcas en cartera`}
      acciones={
        <>
          <Boton href="/api/exportar/marcas">Exportar CSV</Boton>
          {puedeCapturar(s) ? <Boton href="/marcas/nueva" tipo="primario">Nueva marca</Boton> : null}
        </>
      }
    >
      <Tarjeta>
        {marcas.length === 0 ? (
          <Vacio>Sin marcas en la cartera.</Vacio>
        ) : (
          <Tabla>
            <thead>
              <tr>
                <Th>Marca</Th>
                {veTodo(s) ? <Th>Director</Th> : null}
                <Th>Contratos</Th>
                <Th derecha>Valor vigente</Th>
                <Th derecha>Cobrado</Th>
                <Th derecha>Por cobrar</Th>
                <Th>Situación</Th>
              </tr>
            </thead>
            <tbody>
              {marcas.map((m) => {
                const vigentes = m.contratos.filter((c) => c.estado === "VIGENTE");
                const pipeline = m.contratos.filter((c) => c.estado === "PROPUESTA" || c.estado === "PENDIENTE_FIRMA");
                const cobrado = m.contratos.flatMap((c) => c.hitos).reduce((a, h) => a + h.montoRecibido, 0);
                const porCobrar = m.contratos
                  .filter((c) => c.estado === "VIGENTE" || c.estado === "PENDIENTE_FIRMA")
                  .flatMap((c) => c.hitos)
                  .reduce((a, h) => a + Math.max(h.importe - h.montoRecibido, 0), 0);
                return (
                  <tr key={m.id} className="hover:bg-superficie-2">
                    <Td>
                      <Link href={`/marcas/${m.id}`} className="font-medium text-acento hover:underline">
                        {m.nombre}
                      </Link>
                      {m.esDemo ? <Etiqueta tono="neutro">demo</Etiqueta> : null}
                      <div className="text-xs text-tinta-3">{m.sector ?? "—"} · {m._count.contactos} contacto(s)</div>
                    </Td>
                    {veTodo(s) ? <Td className="text-tinta-2">{m.carteras.map((c) => c.director.nombre).join(", ") || "Sin asignar"}</Td> : null}
                    <Td>
                      <span className="text-tinta">{vigentes.length} vigente(s)</span>
                      <span className="text-tinta-3"> · {pipeline.length} en propuesta</span>
                    </Td>
                    <Td derecha>{dinero(vigentes.reduce((a, c) => a + (c.monto ?? 0), 0))}</Td>
                    <Td derecha>{dinero(cobrado)}</Td>
                    <Td derecha>{dinero(porCobrar)}</Td>
                    <Td>
                      <div className="flex flex-wrap gap-1">
                        {Array.from(new Set(m.contratos.map((c) => c.estado))).map((e) => (
                          <Etiqueta key={e} tono={e === "VIGENTE" ? "ok" : e === "PENDIENTE_FIRMA" ? "alerta" : e === "PROPUESTA" ? "acento" : "neutro"}>
                            {etiqueta("estadoContrato", e)}
                          </Etiqueta>
                        ))}
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Tabla>
        )}
      </Tarjeta>
    </Pagina>
  );
}
