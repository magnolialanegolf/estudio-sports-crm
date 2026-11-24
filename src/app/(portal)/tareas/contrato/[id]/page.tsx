import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { startOfDay } from "date-fns";
import { db } from "@/lib/db";
import { esProduccion, filtroContratosProduccion, requerirSesion } from "@/lib/acceso";
import { etiqueta, fecha, fechaLarga, diasHasta, textoDias } from "@/lib/formato";
import { Boton, Definicion, Etiqueta, Pagina, Tabla, Tarjeta, Td, Th, Vacio } from "@/components/ui";
import { PanelCompromiso } from "@/app/(portal)/contratos/[id]/paneles";

// Expediente de producción: todo lo que necesita quien ejecuta, sin ningún dato económico.
export default async function ExpedienteProduccion({ params }: { params: Promise<{ id: string }> }) {
  const s = await requerirSesion();
  const { id } = await params;
  if (!esProduccion(s)) redirect(`/contratos/${id}`);
  const c = await db.contrato.findFirst({
    where: { id, ...filtroContratosProduccion(s) },
    select: {
      id: true,
      proyecto: true,
      tipo: true,
      estado: true,
      inicio: true,
      vencimiento: true,
      duracionMeses: true,
      talento: true,
      brief: true,
      marca: { select: { id: true, nombre: true, sector: true, contactos: { select: { nombre: true, cargo: true, correo: true, telefono: true, canalPreferido: true }, orderBy: { nombre: "asc" } } } },
      director: { select: { nombre: true } },
      compromisos: { where: { estado: { not: "CANCELADO" } }, include: { asignadoA: { select: { nombre: true } }, creadoPor: { select: { nombre: true } } }, orderBy: [{ fecha: "asc" }] },
    },
  });
  if (!c) notFound();
  const hoy = startOfDay(new Date());
  const asignables = await db.usuario.findMany({ where: { activo: true, rol: { in: ["PRODUCCION", "CONTENIDOS", "OPERATIVO", "ADMIN_GENERAL", "GERENTE_GENERAL", "DIRECTOR", "ASISTENTE_COMERCIAL"] } }, select: { id: true, nombre: true, rol: true }, orderBy: [{ rol: "asc" }, { nombre: "asc" }] });
  const entregables = c.compromisos.filter((k) => k.tipo === "ENTREGABLE");
  const cumplidos = entregables.filter((k) => k.estado === "CUMPLIDO").length;

  return (
    <Pagina
      titulo={`${c.marca.nombre} · ${c.proyecto}`}
      subtitulo={
        <span className="flex flex-wrap items-center gap-2">
          <Etiqueta tono={c.estado === "VIGENTE" ? "ok" : "alerta"}>{etiqueta("estadoContrato", c.estado)}</Etiqueta>
          <Etiqueta>{etiqueta("tipo", c.tipo)}</Etiqueta>
          <span className="text-tinta-3">· cerrado por {c.director.nombre}</span>
        </span>
      }
      acciones={<Boton href="/tareas">Volver a tareas</Boton>}
    >
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Tarjeta titulo="De qué trata" className="xl:col-span-2">
          <Definicion
            items={[
              { k: "Marca", v: `${c.marca.nombre}${c.marca.sector ? ` · ${c.marca.sector}` : ""}` },
              { k: "Talento", v: c.talento ?? "—" },
              { k: "Vigencia", v: `${fechaLarga(c.inicio)} → ${fechaLarga(c.vencimiento)}${c.duracionMeses ? ` · ${c.duracionMeses} meses` : ""}` },
              { k: "Entregables", v: entregables.length ? `${cumplidos} de ${entregables.length} cumplidos` : "Sin entregables capturados" },
            ]}
          />
          <div className="mt-4 rounded border border-linea bg-superficie-2 px-4 py-3">
            <div className="text-xs font-medium uppercase tracking-wide text-tinta-3">Acuerdos de contenido</div>
            {c.brief ? <p className="mt-1 whitespace-pre-line text-sm text-tinta">{c.brief}</p> : <p className="mt-1 text-sm text-tinta-3">El director aún no captura los acuerdos de contenido de este contrato. Pídeselos desde una actividad.</p>}
          </div>
        </Tarjeta>

        <Tarjeta titulo="Contactos de la marca">
          {c.marca.contactos.length === 0 ? (
            <Vacio>Sin contactos registrados.</Vacio>
          ) : (
            <ul className="divide-y divide-linea/70 text-sm">
              {c.marca.contactos.map((k, i) => (
                <li key={i} className="py-2">
                  <div className="font-medium">{k.nombre}</div>
                  <div className="text-xs text-tinta-2">{[k.cargo, k.correo, k.telefono, k.canalPreferido ? `Canal: ${k.canalPreferido}` : null].filter(Boolean).join(" · ") || "—"}</div>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>

        <Tarjeta
          titulo="Tareas y fechas del contrato"
          descripcion="Entregables, fechas clave y actividades. Puedes registrar actividades y asignarlas a quien corresponda."
          className="xl:col-span-3"
          acciones={<PanelCompromiso contratoId={c.id} textoBoton="Registrar actividad" asignables={asignables} />}
        >
          {c.compromisos.length === 0 ? (
            <Vacio>Sin tareas en este contrato.</Vacio>
          ) : (
            <Tabla>
              <thead>
                <tr>
                  <Th>Tarea</Th>
                  <Th>Tipo</Th>
                  <Th>Fecha</Th>
                  <Th>Responsable</Th>
                  <Th>Estado</Th>
                </tr>
              </thead>
              <tbody>
                {c.compromisos.map((k) => {
                  const d = diasHasta(k.fecha, hoy);
                  const abierta = k.estado === "PENDIENTE" || k.estado === "EN_CURSO" || k.estado === "REQUIERE_ATENCION";
                  const retrasada = abierta && d !== null && d < 0;
                  const mia = k.asignadoAId === s.usuarioId || k.creadoPorId === s.usuarioId;
                  return (
                    <tr key={k.id} className="hover:bg-superficie-2">
                      <Td>
                        {mia ? <Link href={`/tareas/${k.id}`} className="font-medium text-acento hover:underline">{k.descripcion}</Link> : <span className="font-medium">{k.descripcion}</span>}
                        {k.notas ? <div className="text-xs text-tinta-3">{k.notas}</div> : null}
                        {k.creadoPor ? <div className="text-xs text-tinta-3">Registró: {k.creadoPor.nombre}</div> : null}
                      </Td>
                      <Td className="text-tinta-2">{etiqueta("tipoCompromiso", k.tipo)}</Td>
                      <Td>
                        <div>{fecha(k.fecha)}</div>
                        {abierta && k.fecha ? <Etiqueta tono={retrasada ? "riesgo" : d !== null && d <= 7 ? "alerta" : "neutro"}>{retrasada ? `retrasada ${Math.abs(d!)} d` : textoDias(d)}</Etiqueta> : null}
                      </Td>
                      <Td className="text-tinta-2">{k.asignadoA?.nombre ?? k.responsable ?? <span className="text-tinta-3">Sin asignar</span>}</Td>
                      <Td>
                        <Etiqueta tono={k.estado === "CUMPLIDO" ? "ok" : k.estado === "REQUIERE_ATENCION" ? "riesgo" : k.estado === "EN_CURSO" ? "acento" : retrasada ? "riesgo" : "alerta"}>{retrasada && k.estado !== "REQUIERE_ATENCION" ? "Retrasada" : etiqueta("estadoCompromiso", k.estado)}</Etiqueta>
                        {k.reporte ? <div className="mt-1 max-w-xs text-xs text-tinta-2">{k.reporte.length > 90 ? `${k.reporte.slice(0, 90)}…` : k.reporte}</div> : null}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Tabla>
          )}
        </Tarjeta>
      </div>
    </Pagina>
  );
}
