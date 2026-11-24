import Link from "next/link";
import { notFound } from "next/navigation";
import { format, startOfDay } from "date-fns";
import { db } from "@/lib/db";
import { esProduccion, requerirSesion } from "@/lib/acceso";
import { filtroIncidencias } from "@/lib/incidencias";
import { etiqueta, fecha, fechaLarga, diasHasta, textoDias } from "@/lib/formato";
import { Boton, Definicion, Etiqueta, Pagina, Tarjeta, Vacio } from "@/components/ui";
import { FormularioActualizacion } from "../paneles";
import { tonoEstadoInc, tonoPrioridad } from "../page";

export default async function DetalleIncidencia({ params }: { params: Promise<{ id: string }> }) {
  const s = await requerirSesion();
  const { id } = await params;
  const i = await db.incidencia.findFirst({
    where: { id, ...filtroIncidencias(s) },
    include: {
      reportadoPor: { select: { nombre: true, rol: true } },
      asignadoA: { select: { id: true, nombre: true } },
      contrato: { select: { id: true, proyecto: true, marca: { select: { nombre: true } } } },
      marca: { select: { id: true, nombre: true } },
      comentarios: { include: { usuario: { select: { nombre: true } } }, orderBy: { creadoEn: "asc" } },
    },
  });
  if (!i) notFound();
  const hoy = startOfDay(new Date());
  const d = diasHasta(i.fechaLimite, hoy);
  const abierta = i.estado === "ABIERTA" || i.estado === "EN_ATENCION";
  const usuarios = await db.usuario.findMany({ where: { activo: true }, select: { id: true, nombre: true, rol: true }, orderBy: [{ rol: "asc" }, { nombre: "asc" }] });

  return (
    <Pagina
      titulo={i.titulo}
      subtitulo={
        <span className="flex flex-wrap items-center gap-2">
          <Etiqueta tono={tonoEstadoInc[i.estado]}>{etiqueta("estadoIncidencia", i.estado)}</Etiqueta>
          <Etiqueta tono={tonoPrioridad[i.prioridad]}>{etiqueta("prioridad", i.prioridad)}</Etiqueta>
          <Etiqueta>{etiqueta("tipoIncidencia", i.tipo)}</Etiqueta>
        </span>
      }
      acciones={<Boton href="/incidencias">Volver</Boton>}
    >
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Tarjeta titulo="Detalle" className="xl:col-span-2">
          <Definicion
            items={[
              { k: "Reportó", v: `${i.reportadoPor.nombre} · ${etiqueta("rol", i.reportadoPor.rol)} · ${fecha(i.creadoEn)}` },
              { k: "Responsable", v: i.asignadoA?.nombre ?? "Sin asignar" },
              { k: "Fecha límite", v: <span className={abierta && d !== null && d < 0 ? "font-medium text-riesgo" : ""}>{fechaLarga(i.fechaLimite)}{abierta && i.fechaLimite ? ` · ${textoDias(d)}` : ""}</span> },
              { k: "Resuelta el", v: fecha(i.resueltoEn) },
              {
                k: "Relacionado con",
                v: i.contrato ? (
                  <Link href={esProduccion(s) ? `/tareas/contrato/${i.contrato.id}` : `/contratos/${i.contrato.id}`} className="text-acento hover:underline">{i.contrato.marca.nombre} · {i.contrato.proyecto}</Link>
                ) : i.marca ? (
                  esProduccion(s) ? i.marca.nombre : <Link href={`/marcas/${i.marca.id}`} className="text-acento hover:underline">{i.marca.nombre}</Link>
                ) : (
                  "—"
                ),
              },
            ]}
          />
          {i.descripcion ? <p className="mt-4 whitespace-pre-line text-sm text-tinta">{i.descripcion}</p> : null}
          <div className="mt-6">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-tinta-3">Seguimiento</h3>
            {i.comentarios.length === 0 ? (
              <Vacio>Sin comentarios aún.</Vacio>
            ) : (
              <ul className="space-y-2">
                {i.comentarios.map((c) => (
                  <li key={c.id} className="rounded border border-linea bg-superficie-2 px-4 py-2.5 text-sm">
                    <div className="text-xs text-tinta-3">{c.usuario.nombre} · {format(c.creadoEn, "dd/MM/yyyy HH:mm")}</div>
                    <p className="mt-0.5 whitespace-pre-line text-tinta">{c.texto}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Tarjeta>
        <Tarjeta titulo="Actualizar" descripcion="Cambia estado, prioridad o responsable y deja un comentario.">
          <FormularioActualizacion incidencia={{ id: i.id, estado: i.estado, prioridad: i.prioridad, asignadoAId: i.asignadoA?.id ?? null, fechaLimite: i.fechaLimite }} usuarios={usuarios} />
        </Tarjeta>
      </div>
    </Pagina>
  );
}
