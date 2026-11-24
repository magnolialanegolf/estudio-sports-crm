import Link from "next/link";
import { notFound } from "next/navigation";
import { startOfDay } from "date-fns";
import { db } from "@/lib/db";
import { esProduccion, filtroCompromisos, puedeCapturar, requerirSesion } from "@/lib/acceso";
import { etiqueta, fecha, fechaLarga, diasHasta, textoDias } from "@/lib/formato";
import { Boton, Definicion, Etiqueta, Pagina, Tarjeta } from "@/components/ui";
import { FormularioReporte } from "../paneles";
import { FormularioAvance, type Movimiento } from "../avance";
import { Recorrido } from "@/components/etapas";
import { ACCION_SIGUIENTE, anterior, enCanchaDe, ETIQUETA_ETAPA, puedeMover, siguiente } from "@/lib/produccion";
import { autorizaContrato } from "@/lib/acceso";

// Detalle de una tarea. Producción ve marca, qué hacer, fecha y quién pidió; nada económico.
export default async function DetalleTarea({ params }: { params: Promise<{ id: string }> }) {
  const s = await requerirSesion();
  const { id } = await params;
  const t = await db.compromiso.findFirst({
    where: { id, ...filtroCompromisos(s) },
    include: {
      contrato: { select: { id: true, codigo: true, directorId: true, proyecto: true, tipo: true, talento: true, marca: { select: { id: true, nombre: true } }, director: { select: { nombre: true } } } },
      asignadoA: { select: { nombre: true } },
      editor: { select: { nombre: true } },
      avances: { orderBy: { fecha: "desc" }, include: { usuario: { select: { nombre: true } } } },
    },
  });
  if (!t) notFound();
  const hoy = startOfDay(new Date());
  const d = diasHasta(t.fecha, hoy);
  const abierta = t.estado === "PENDIENTE" || t.estado === "EN_CURSO" || t.estado === "REQUIERE_ATENCION";
  const retrasada = abierta && d !== null && d < 0;
  const produccion = esProduccion(s);
  const puedeReportar = produccion ? t.asignadoAId === s.usuarioId || t.editorId === s.usuarioId || t.creadoPorId === s.usuarioId : puedeCapturar(s);
  const esEntregable = t.tipo === "ENTREGABLE" && t.estado !== "CANCELADO";
  const actor = { esComercial: !produccion && puedeCapturar(s) && autorizaContrato(s, t.contrato), esAsignado: t.asignadoAId === s.usuarioId, esEditor: t.editorId === s.usuarioId };
  const movimientos: Movimiento[] = [];
  if (esEntregable) {
    const sig = siguiente(t.etapa);
    if (sig && puedeMover(actor, t.etapa, sig)) movimientos.push({ a: sig, texto: ACCION_SIGUIENTE[t.etapa]! });
    const ant = anterior(t.etapa);
    if (ant && puedeMover(actor, t.etapa, ant)) movimientos.push({ a: ant, texto: `Regresar a «${ETIQUETA_ETAPA[ant]}»`, regreso: true });
  }
  const cancha = enCanchaDe(t);
  const quienHizo = (etapa: string) => t.avances.find((a) => a.aEtapa === etapa)?.usuario?.nombre ?? null;

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
          <Boton href={`/incidencias/nueva?contrato=${t.contrato.id}`}>Reportar incidencia</Boton>
          {produccion ? <Boton href={`/tareas/contrato/${t.contrato.id}`}>Ver expediente</Boton> : <Boton href={`/contratos/${t.contrato.id}`}>Ver contrato</Boton>}
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
              { k: "Produce", v: t.asignadoA?.nombre ?? t.responsable ?? "Sin asignar" },
              { k: "Edita", v: t.editor?.nombre ?? "Sin editor" },
              ...(cancha ? [{ k: "En cancha de", v: <span className={`font-medium ${cancha.sinAsignar ? "text-alerta" : "text-acento"}`}>{cancha.quien} · {cancha.area}</span> }] : []),
              { k: "Lo pide", v: t.contrato.director.nombre },
              { k: "Talento", v: t.contrato.talento ?? "—" },
              { k: "Cumplida el", v: fecha(t.cumplidoEn) },
            ]}
          />
          {esEntregable ? (
            <div className="mt-5 rounded-md border border-linea bg-superficie-2 px-4 py-3">
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-tinta-3">Cadena de producción</div>
              <Recorrido etapa={t.etapa} fechas={{ GRABADO: t.grabadoEn, EDITADO: t.editadoEn, PUBLICADO: t.publicadoEn, EN_EDICION: t.avances.find((a) => a.aEtapa === "EN_EDICION")?.fecha ?? null, POR_PRODUCIR: t.creadoEn }} responsables={{ POR_PRODUCIR: t.asignadoA?.nombre ?? null, GRABADO: quienHizo("GRABADO") ?? t.asignadoA?.nombre ?? null, EN_EDICION: t.editor?.nombre ?? null, EDITADO: quienHizo("EDITADO") ?? t.editor?.nombre ?? null, PUBLICADO: quienHizo("PUBLICADO") ?? t.contrato.director.nombre }} />
              {t.liga ? <a href={t.liga} target="_blank" rel="noreferrer" className="mt-2 block truncate text-xs text-acento hover:underline">{t.liga}</a> : null}
            </div>
          ) : null}
          {t.notas ? <p className="mt-4 whitespace-pre-line text-sm text-tinta-2">{t.notas}</p> : null}
          {t.reporte ? (
            <div className="mt-4 rounded border border-linea bg-superficie-2 px-4 py-3 text-sm">
              <div className="text-xs font-medium uppercase tracking-wide text-tinta-3">Reporte</div>
              <p className="mt-1 whitespace-pre-line text-tinta">{t.reporte}</p>
            </div>
          ) : null}
        </Tarjeta>

        {esEntregable ? (
          <Tarjeta titulo="Mover en la cadena" descripcion="Al mover, se avisa a quien sigue y queda registrado.">
            <FormularioAvance compromisoId={t.id} movimientos={movimientos} liga={t.liga} />
          </Tarjeta>
        ) : null}
        <Tarjeta titulo={esEntregable ? "Avisar un problema" : "Reportar"} descripcion={esEntregable ? "Si falta algo o va retrasado, márcalo aquí y explica." : "Marca el avance y deja constancia de lo hecho."}>
          {puedeReportar ? <FormularioReporte compromisoId={t.id} estado={t.estado} reporte={t.reporte} produccion={produccion} /> : <p className="text-sm text-tinta-3">Solo el responsable asignado o el director pueden reportar esta tarea.</p>}
        </Tarjeta>

        {t.avances.length > 0 ? (
          <Tarjeta titulo="Historial de la cadena" descripcion="Quién movió qué y cuándo" className="xl:col-span-3">
            <ul className="divide-y divide-linea/70 text-sm">
              {t.avances.map((a) => (
                <li key={a.id} className="flex flex-wrap items-start justify-between gap-2 py-2">
                  <div>
                    <span className="font-medium">{a.usuario?.nombre ?? "—"}</span> movió de «{ETIQUETA_ETAPA[a.deEtapa]}» a «{ETIQUETA_ETAPA[a.aEtapa]}»
                    {a.nota ? <div className="text-xs text-tinta-2">{a.nota}</div> : null}
                  </div>
                  <span className="text-xs text-tinta-3">{fecha(a.fecha)}</span>
                </li>
              ))}
            </ul>
          </Tarjeta>
        ) : null}
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
