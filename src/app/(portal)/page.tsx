import Link from "next/link";
import { requerirSesion, veTodo } from "@/lib/acceso";
import { agenda, directoresVisibles, resumenPorDirector, sumarResumenes } from "@/lib/consultas";
import { dinero, fecha, textoDias, diasHasta } from "@/lib/formato";
import { Aviso, Cifra, Etiqueta, Pagina, Tarjeta, Vacio } from "@/components/ui";
import { FiltroDirector } from "@/components/filtro-director";

export default async function Hoy({ searchParams }: { searchParams: Promise<{ director?: string }> }) {
  const s = await requerirSesion();
  const { director } = await searchParams;
  const global = veTodo(s);
  const directorId = global ? director || undefined : s.directorId!;

  const [alertas, resumenes, directores] = await Promise.all([
    agenda(s, 30, directorId),
    resumenPorDirector(s, directorId ? [directorId] : undefined),
    global ? directoresVisibles(s) : Promise.resolve([]),
  ]);
  const total = sumarResumenes(resumenes);
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

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Cifra etiqueta="Vencido por cobrar" valor={dinero(total.vencido)} tono={total.vencido > 0 ? "riesgo" : "neutro"} nota="Hitos con fecha pasada sin pago" />
        <Cifra etiqueta="Por cobrar vigente" valor={dinero(total.porCobrar)} tono="acento" nota="Contratos vigentes y pendientes de firma" />
        <Cifra etiqueta="Renovaciones 90 d" valor={total.renovaciones90} tono={total.renovaciones90 > 0 ? "alerta" : "neutro"} nota="Contratos vigentes por vencer" />
        <Cifra etiqueta="Compromisos vencidos" valor={total.compromisosVencidos} tono={total.compromisosVencidos > 0 ? "riesgo" : "ok"} nota="Acciones sin cerrar" />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Tarjeta titulo="Vencidos" descripcion="Cobros y compromisos con fecha pasada">
          <ListaAlertas items={vencidos} vacio="Nada vencido." />
        </Tarjeta>
        <Tarjeta titulo="Próximos 30 días" descripcion="Facturar, cobrar y cumplir">
          <ListaAlertas items={proximos} vacio="Sin movimientos en los próximos 30 días." />
        </Tarjeta>
        <Tarjeta titulo="Renovaciones" descripcion="Contratos vigentes que vencen en 90 días" className="xl:col-span-2">
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
