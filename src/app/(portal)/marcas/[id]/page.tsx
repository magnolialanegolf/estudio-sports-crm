import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { filtroMarcas, puedeCapturar, requerirSesion, veTodo } from "@/lib/acceso";
import { dinero, etiqueta, fecha } from "@/lib/formato";
import { Boton, Definicion, Etiqueta, Pagina, Tabla, Tarjeta, Td, Th, Vacio } from "@/components/ui";
import { PanelContacto, BorrarContacto } from "./paneles";

export default async function DetalleMarca({ params }: { params: Promise<{ id: string }> }) {
  const s = await requerirSesion();
  const { id } = await params;
  const m = await db.marca.findFirst({
    where: { id, ...filtroMarcas(s) },
    include: {
      carteras: { include: { director: { select: { nombre: true } } }, orderBy: { desde: "desc" } },
      contactos: { orderBy: { nombre: "asc" } },
      contratos: {
        where: veTodo(s) ? {} : { directorId: s.directorId! },
        include: { hitos: { select: { importe: true, montoRecibido: true } } },
        orderBy: [{ estado: "asc" }, { vencimiento: "desc" }],
      },
    },
  });
  if (!m) notFound();
  const puedeEditar = puedeCapturar(s);
  const actual = m.carteras.find((c) => !c.hasta);
  const contratado = m.contratos.filter((c) => c.estado !== "CANCELADO").reduce((a, c) => a + (c.monto ?? 0), 0);
  const cobrado = m.contratos.flatMap((c) => c.hitos).reduce((a, h) => a + h.montoRecibido, 0);

  return (
    <Pagina
      titulo={m.nombre}
      subtitulo={<span>{m.sector ?? "Sector sin definir"}{actual ? ` · Cartera de ${actual.director.nombre}` : " · Sin director asignado"}{m.esDemo ? " · datos de demostración" : ""}</span>}
      acciones={
        puedeEditar ? (
          <>
            <Boton href={`/contratos/nuevo?marca=${m.id}`}>Nuevo contrato</Boton>
            <Boton href={`/marcas/${m.id}/editar`} tipo="primario">Editar</Boton>
          </>
        ) : undefined
      }
    >
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Tarjeta titulo="Relación comercial">
          <Definicion
            items={[
              { k: "Contratos", v: m.contratos.length },
              { k: "Valor contratado (histórico + vigente + propuestas)", v: dinero(contratado) },
              { k: "Cobrado acumulado", v: dinero(cobrado) },
              { k: "Director actual", v: actual?.director.nombre ?? "—" },
            ]}
          />
          {m.notas ? <p className="mt-4 whitespace-pre-line text-sm text-tinta-2">{m.notas}</p> : null}
          {m.carteras.length > 1 ? (
            <div className="mt-4">
              <div className="text-xs font-medium uppercase tracking-wide text-tinta-3">Historial de asignación</div>
              <ul className="mt-1 text-sm text-tinta-2">
                {m.carteras.map((c) => (
                  <li key={c.id}>{c.director.nombre} · {fecha(c.desde)} → {c.hasta ? fecha(c.hasta) : "actual"}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </Tarjeta>

        <Tarjeta titulo="Contactos" className="xl:col-span-2" acciones={puedeEditar ? <PanelContacto marcaId={m.id} textoBoton="Agregar contacto" /> : undefined}>
          {m.contactos.length === 0 ? (
            <Vacio>Sin contactos. Captura a las personas clave de la marca.</Vacio>
          ) : (
            <Tabla>
              <thead>
                <tr>
                  <Th>Nombre</Th>
                  <Th>Cargo</Th>
                  <Th>Correo / teléfono</Th>
                  <Th>Última interacción</Th>
                  {puedeEditar ? <Th /> : null}
                </tr>
              </thead>
              <tbody>
                {m.contactos.map((k) => (
                  <tr key={k.id}>
                    <Td className="font-medium">{k.nombre}</Td>
                    <Td className="text-tinta-2">{k.cargo ?? "—"}</Td>
                    <Td className="text-tinta-2">
                      {k.correo ? <div>{k.correo}</div> : null}
                      {k.telefono ? <div>{k.telefono}</div> : null}
                      {!k.correo && !k.telefono ? "—" : null}
                      {k.canalPreferido ? <div className="text-xs text-tinta-3">Canal: {k.canalPreferido}</div> : null}
                    </Td>
                    <Td>{fecha(k.ultimaInteraccion)}{k.notas ? <div className="text-xs text-tinta-3">{k.notas}</div> : null}</Td>
                    {puedeEditar ? (
                      <Td>
                        <div className="flex items-center justify-end gap-2">
                          <PanelContacto marcaId={m.id} contacto={k} textoBoton="Editar" />
                          <BorrarContacto contactoId={k.id} />
                        </div>
                      </Td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </Tabla>
          )}
        </Tarjeta>

        <Tarjeta titulo="Contratos y propuestas" className="xl:col-span-3">
          {m.contratos.length === 0 ? (
            <Vacio>Sin contratos.</Vacio>
          ) : (
            <Tabla>
              <thead>
                <tr>
                  <Th>Proyecto</Th>
                  <Th>Tipo</Th>
                  <Th>Estado</Th>
                  <Th>Vigencia</Th>
                  <Th derecha>Monto</Th>
                  <Th derecha>Cobrado</Th>
                </tr>
              </thead>
              <tbody>
                {m.contratos.map((c) => (
                  <tr key={c.id} className="hover:bg-superficie-2">
                    <Td>
                      <Link href={`/contratos/${c.id}`} className="font-medium text-acento hover:underline">{c.proyecto}</Link>
                      <div className="text-xs text-tinta-3">{c.codigo}</div>
                    </Td>
                    <Td>{etiqueta("tipo", c.tipo)}</Td>
                    <Td><Etiqueta tono={c.estado === "VIGENTE" ? "ok" : c.estado === "PENDIENTE_FIRMA" ? "alerta" : c.estado === "PROPUESTA" ? "acento" : "neutro"}>{etiqueta("estadoContrato", c.estado)}</Etiqueta></Td>
                    <Td className="text-tinta-2">{fecha(c.inicio)} → {fecha(c.vencimiento)}</Td>
                    <Td derecha>{dinero(c.monto)}</Td>
                    <Td derecha>{dinero(c.hitos.reduce((a, h) => a + h.montoRecibido, 0))}</Td>
                  </tr>
                ))}
              </tbody>
            </Tabla>
          )}
        </Tarjeta>
      </div>
    </Pagina>
  );
}
