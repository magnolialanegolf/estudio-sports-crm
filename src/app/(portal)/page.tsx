import Link from "next/link";
import { requerirSesion, veTodo } from "@/lib/acceso";
import { agenda, directoresVisibles, resumenPorDirector, serieMensual, sumarResumenes } from "@/lib/consultas";
import { Anillo, Barras, Columnas } from "@/components/graficas";
import { dineroCorto, etiqueta } from "@/lib/formato";
import { dinero, fecha, textoDias, diasHasta } from "@/lib/formato";
import { Aviso, Cifra, Etiqueta, Pagina, Tarjeta, Vacio } from "@/components/ui";
import { FiltroDirector } from "@/components/filtro-director";
import { db } from "@/lib/db";
import { filtroIncidencias } from "@/lib/incidencias";
import { startOfDay, addDays } from "date-fns";

export default async function Hoy({ searchParams }: { searchParams: Promise<{ director?: string }> }) {
  const s = await requerirSesion();
  const { director } = await searchParams;
  const global = veTodo(s);
  const directorId = global ? director || undefined : s.directorId!;

  const [alertas, resumenes, directores, serie] = await Promise.all([
    agenda(s, 30, directorId),
    resumenPorDirector(s, directorId ? [directorId] : undefined),
    global ? directoresVisibles(s) : Promise.resolve([]),
    serieMensual(s, directorId),
  ]);
  const total = sumarResumenes(resumenes);
  const hoyFecha = startOfDay(new Date());
  const incidencias = await db.incidencia.findMany({
    where: { ...filtroIncidencias(s), estado: { in: ["ABIERTA", "EN_ATENCION"] }, OR: [{ prioridad: "URGENTE" }, { asignadoAId: s.usuarioId }, { fechaLimite: { lte: addDays(hoyFecha, 7) } }] },
    include: { asignadoA: { select: { nombre: true } } },
    orderBy: [{ prioridad: "desc" }, { fechaLimite: "asc" }],
    take: 12,
  });
  const vencidos = alertas.filter((a) => a.tipo === "cobro_vencido" || a.tipo === "compromiso_vencido");
  const proximos = alertas.filter((a) => a.tipo === "cobro_proximo" || a.tipo === "compromiso_proximo");
  const renovaciones = alertas.filter((a) => a.tipo === "renovacion");

  return (
    <Pagina
      titulo="Hoy"
      subtitulo={`Vencidos y próximos 30 días · ${fecha(new Date())}`}
      acciones={global ? <FiltroDirector directores={directores} actual={directorId} ruta="/" /> : undefined}
    >
      {total.porConfirmar > 0 ? (
        <div className="mb-5">
          <Aviso tono="alerta">
            Hay {total.porConfirmar} cobros registrados sin respaldo documental. Se muestran marcados como <strong>por confirmar</strong> y no suman a la comisión devengada confirmada. Revísalos en cada contrato.
          </Aviso>
        </div>
      ) : null}

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Cifra etiqueta="Atrasado por cobrar" valor={dinero(total.vencido)} tono={total.vencido > 0 ? "riesgo" : "ok"} nota="Hitos con fecha pasada sin pago" icono="alerta" />
        <Cifra etiqueta="Por cobrar vigente" valor={dinero(total.porCobrar)} tono="acento" nota={`${dinero(total.valorVigente)} en ${total.contratosVigentes} contratos vigentes`} icono="dinero" />
        <Cifra etiqueta="Renovaciones 90 d" valor={total.renovaciones90} tono={total.renovaciones90 > 0 ? "alerta" : "neutro"} nota="Contratos vigentes por vencer" icono="renovar" />
        <Cifra etiqueta="Compromisos vencidos" valor={total.compromisosVencidos} tono={total.compromisosVencidos > 0 ? "riesgo" : "ok"} nota="Entregables y seguimientos sin cerrar" icono="tareas" />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Tarjeta titulo="Flujo de cobros" descripcion="Cobrado por mes frente a lo programado por facturar" className="xl:col-span-2">
          <Columnas categorias={serie.categorias} series={[{ nombre: "Cobrado", valores: serie.cobrado, tono: "ok" }, { nombre: "Programado", valores: serie.programado, tono: "acento" }]} alto={170} />
        </Tarjeta>
        <Tarjeta titulo="Avance y pipeline" descripcion="Cobrado sobre lo vigente y propuestas ponderadas">
          <Anillo fraccion={total.valorVigente ? Math.min(total.cobrado / (total.valorVigente + total.cobrado - total.porCobrar || 1), 1) : 0} etiqueta={`${dineroCorto(total.cobrado)} cobrado acumulado`} tono="ok" />
          <div className="mt-4">
            <Barras datos={[{ etiqueta: "Pipeline nominal", valor: total.pipelineNominal, tono: "neutro" }, { etiqueta: "Pipeline ponderado", valor: total.pipelinePonderado, tono: "acento" }, { etiqueta: "Por cobrar", valor: total.porCobrar, tono: "alerta" }]} />
          </div>
          <p className="mt-3 text-xs text-tinta-3">{total.contratosPipeline} propuestas en curso · {etiqueta("estadoContrato", "VIGENTE").toLowerCase()}s: {total.contratosVigentes}</p>
        </Tarjeta>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Tarjeta titulo="Vencidos" descripcion="Cobros y compromisos con fecha pasada">
          <ListaAlertas items={vencidos} vacio="Nada vencido." />
        </Tarjeta>
        <Tarjeta titulo="Próximos 30 días" descripcion="Facturar, cobrar y cumplir">
          <ListaAlertas items={proximos} vacio="Sin movimientos en los próximos 30 días." />
        </Tarjeta>
        <Tarjeta titulo="Incidencias y pendientes" descripcion="Urgentes, asignadas a ti o con fecha límite en 7 días" acciones={<Link href="/incidencias/nueva" className="text-xs font-medium text-acento hover:underline">Reportar</Link>}>
          {incidencias.length === 0 ? (
            <Vacio>Nada pendiente que te involucre.</Vacio>
          ) : (
            <ul className="-mx-5 divide-y divide-linea/70">
              {incidencias.map((i) => {
                const d = diasHasta(i.fechaLimite);
                return (
                  <li key={i.id}>
                    <Link href={`/incidencias/${i.id}`} className="flex items-start justify-between gap-4 px-5 py-2.5 hover:bg-superficie-2">
                      <div className="min-w-0">
                        <div className="line-clamp-2 text-sm font-medium leading-snug text-tinta">{i.titulo}</div>
                        <div className="text-xs text-tinta-2">{i.asignadoA ? `Responsable: ${i.asignadoA.nombre}` : "Sin responsable"}</div>
                      </div>
                      <div className="shrink-0 text-right">
                        <Etiqueta tono={i.prioridad === "URGENTE" ? "riesgo" : i.prioridad === "ALTA" ? "alerta" : "neutro"}>{i.prioridad.toLowerCase()}</Etiqueta>
                        {i.fechaLimite ? <div className="mt-0.5 text-xs text-tinta-3">{fecha(i.fechaLimite)} · {textoDias(d)}</div> : null}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Tarjeta>
        <Tarjeta titulo="Renovaciones" descripcion="Contratos vigentes que vencen en 90 días">
          <ListaAlertas items={renovaciones} vacio="Ningún contrato vence en los próximos 90 días." />
        </Tarjeta>
      </div>
    </Pagina>
  );
}

function ListaAlertas({ items, vacio }: { items: Awaited<ReturnType<typeof agenda>>; vacio: string }) {
  if (items.length === 0) return <Vacio>{vacio}</Vacio>;
  return (
    <ul className="-mx-5 divide-y divide-linea/70">
      {items.map((a, i) => {
        const dias = diasHasta(a.fecha);
        return (
          <li key={i}>
            <Link href={a.href} className="flex items-start justify-between gap-4 px-5 py-2.5 hover:bg-superficie-2">
              <div className="min-w-0">
                <div className="line-clamp-2 text-sm font-medium leading-snug text-tinta">{a.titulo}</div>
                <div className="text-xs text-tinta-2">{a.detalle}</div>
              </div>
              <div className="shrink-0 text-right">
                {a.monto !== undefined ? <div className="tabular text-sm text-tinta">{dinero(a.monto)}</div> : null}
                <div className="mt-0.5 flex items-center justify-end gap-2 text-xs text-tinta-3">
                  <span>{fecha(a.fecha)}</span>
                  <Etiqueta tono={a.gravedad}>{textoDias(dias)}</Etiqueta>
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
