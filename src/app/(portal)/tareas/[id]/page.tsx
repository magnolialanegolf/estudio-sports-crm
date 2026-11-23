import Link from "next/link";
import { notFound } from "next/navigation";
import { startOfDay } from "date-fns";
import { db } from "@/lib/db";
import { esProduccion, filtroCompromisos, puedeCapturar, requerirSesion } from "@/lib/acceso";
import { etiqueta, fecha, fechaLarga, diasHasta, textoDias } from "@/lib/formato";
import { Boton, Definicion, Etiqueta, Pagina, Tarjeta } from "@/components/ui";
import { FormularioReporte } from "../paneles";

// Detalle de una tarea. Producción ve marca, qué hacer, fecha y quién pidió; nada económico.
export default async function DetalleTarea({ params }: { params: Promise<{ id: string }> }) {
  const s = await requerirSesion();
  const { id } = await params;
  const t = await db.compromiso.findFirst({
    where: { id, ...filtroCompromisos(s) },
    include: {
      contrato: { select: { id: true, codigo: true, proyecto: true, tipo: true, talento: true, marca: { select: { id: true, nombre: true } }, director: { select: { nombre: true } } } },
      asignadoA: { select: { nombre: true } },
    },
  });
  if (!t) notFound();
  const hoy = startOfDay(new Date());
  const d = diasHasta(t.fecha, hoy);
  const abierta = t.estado === "PENDIENTE" || t.estado === "EN_CURSO" || t.estado === "REQUIERE_ATENCION";
  const retrasada = abierta && d !== null && d < 0;
  const produccion = esProduccion(s);
  const puedeReportar = produccion ? t.asignadoAId === s.usuarioId : puedeCapturar(s);

  const hermanas = await db.compromiso.findMany({
    where: { contratoId: t.contrato.id, id: { not: t.id }, ...filtroCompromisos(s) },
    select: { id: true, descripcion: true, fecha: true, estado: true },
    orderBy: { fecha: "asc" },
    take: 12,
  });

  return (
    <Pagina
      titulo={t.descripcion}
      subtitulo={
        <span className="flex flex-wrap items-center gap-2">
          <span>{t.contrato.marca.nombre}</span>
          <Etiqueta tono={t.estado === "CUMPLIDO" ? "ok" : t.estado === "REQUIERE_ATENCION" ? "riesgo" : t.estado === "EN_CURSO" ? "acento" : retrasada ? "riesgo" : "alerta"}>{retrasada ? "Retrasada" : etiqueta("estadoCompromiso", t.estado)}</Etiqueta>
          <Etiqueta>{etiqueta("tipoCompromiso", t.tipo)}</Etiqueta>
        </span>
      }
      acciones={
        <>
          <Boton href="/tareas">Volver a tareas</Boton>
          {!produccion ? <Boton href={`/contratos/${t.contrato.id}`}>Ver contrato</Boton> : null}
        </>
      }
    >
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Tarjeta titulo="Qué hay que hacer" className="xl:col-span-2">
          <Definicion
            items={[
              { k: "Marca", v: t.contrato.marca.nombre },
              { k: "Proyecto", v: `${t.contrato.proyecto} · ${etiqueta("tipo", t.contrato.tipo)}` },
              { k: "Fecha compromiso", v: <span className={retrasada ? "font-medium text-riesgo" : ""}>{fechaLarga(t.fecha)}{abierta && t.fecha ? ` · ${retrasada ? `retrasada ${Math.abs(d!)} d` : textoDias(d)}` : ""}</span> },
              { k: "Responsable", v: t.asignadoA?.nombre ?? t.responsable ?? "Sin asignar" },
              { k: "Lo pide", v: t.contrato.director.nombre },
              { k: "Talento", v: t.contrato.talento ?? "—" },
              { k: "Cumplida el", v: fecha(t.cumplidoEn) },
            ]}
          />
          {t.notas ? <p className="mt-4 whitespace-pre-line text-sm text-tinta-2">{t.notas}</p> : null}
          {t.reporte ? (
            <div className="mt-4 rounded border border-linea bg-superficie-2 px-4 py-3 text-sm">
              <div className="text-xs font-medium uppercase tracking-wide text-tinta-3">Reporte</div>
              <p className="mt-1 whitespace-pre-line text-tinta">{t.reporte}</p>
            </div>
          ) : null}
        </Tarjeta>

        <Tarjeta titulo="Reportar" descripcion="Marca el avance y deja constancia de lo hecho.">
          {puedeReportar ? <FormularioReporte compromisoId={t.id} estado={t.estado} reporte={t.reporte} produccion={produccion} /> : <p className="text-sm text-tinta-3">Solo el responsable asignado o el director pueden reportar esta tarea.</p>}
        </Tarjeta>

        {hermanas.length > 0 ? (
          <Tarjeta titulo="Otras tareas del mismo contrato" className="xl:col-span-3">
            <ul className="divide-y divide-linea/70 text-sm">
              {hermanas.map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-3 py-2">
                  <Link href={`/tareas/${h.id}`} className={`hover:underline ${h.estado === "CUMPLIDO" ? "text-tinta-3 line-through" : "text-acento"}`}>{h.descripcion}</Link>
                  <span className="flex items-center gap-2 text-xs text-tinta-3">
                    {fecha(h.fecha)}
                    <Etiqueta tono={h.estado === "CUMPLIDO" ? "ok" : h.fecha && h.fecha < hoy ? "riesgo" : "neutro"}>{etiqueta("estadoCompromiso", h.estado)}</Etiqueta>
                  </span>
                </li>
              ))}
            </ul>
          </Tarjeta>
        ) : null}
      </div>
    </Pagina>
  );
}
