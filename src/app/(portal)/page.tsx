import Link from "next/link";
import { puedeCapturar, requerirSesion, veTodo } from "@/lib/acceso";
import { agenda, directoresVisibles, resumenPorDirector, serieMensual, sumarResumenes } from "@/lib/consultas";
import { Columnas } from "@/components/graficas";
import { dinero, fecha, textoDias, diasHasta } from "@/lib/formato";
import { Aviso, Cifra, Etiqueta, Pagina, Tarjeta, Vacio } from "@/components/ui";
import { Icono } from "@/components/iconos";
import { FiltroDirector } from "@/components/filtro-director";
import { db } from "@/lib/db";
import { filtroIncidencias } from "@/lib/incidencias";
import { startOfDay, addDays } from "date-fns";

// Hoy: una sola lista de lo que hay que atender, en orden de urgencia, y cuatro números.
// Lo demás (gráficas, pipeline, renovaciones) va debajo, como contexto.

type Pendiente = {
  clave: string;
  clase: "Cobro" | "Entregable" | "Incidencia" | "Renovación" | "Por confirmar";
  titulo: string;
  detalle: string;
  fecha: Date | null;
  monto?: number;
  gravedad: "riesgo" | "alerta" | "neutro";
  href: string;
};

const CLASE: Record<Pendiente["clase"], "riesgo" | "alerta" | "acento" | "neutro" | "ok"> = {
  Cobro: "acento",
  Entregable: "alerta",
  Incidencia: "riesgo",
  Renovación: "neutro",
  "Por confirmar": "neutro",
};

export default async function Hoy({ searchParams }: { searchParams: Promise<{ director?: string }> }) {
  const s = await requerirSesion();
  const { director } = await searchParams;
  const global = veTodo(s);
  const directorId = global ? director || undefined : s.directorId!;
  const hoyFecha = startOfDay(new Date());

  const [alertas, resumenes, directores, serie, incidencias] = await Promise.all([
    agenda(s, 30, directorId),
    resumenPorDirector(s, directorId ? [directorId] : undefined),
    global ? directoresVisibles(s) : Promise.resolve([]),
    serieMensual(s, directorId),
    db.incidencia.findMany({
      where: { ...filtroIncidencias(s), estado: { in: ["ABIERTA", "EN_ATENCION"] }, OR: [{ prioridad: "URGENTE" }, { asignadoAId: s.usuarioId }, { fechaLimite: { lte: addDays(hoyFecha, 7) } }] },
      include: { asignadoA: { select: { nombre: true } } },
      orderBy: [{ prioridad: "desc" }, { fechaLimite: "asc" }],
      take: 12,
    }),
  ]);
  const total = sumarResumenes(resumenes);

  const pendientes: Pendiente[] = [
    ...alertas
      .filter((a) => a.tipo !== "por_confirmar" && a.tipo !== "incidencia")
      .map((a, i) => ({
        clave: `a${i}`,
        clase: (a.tipo.startsWith("cobro") ? "Cobro" : a.tipo === "renovacion" ? "Renovación" : "Entregable") as Pendiente["clase"],
        titulo: a.titulo,
        detalle: a.detalle,
        fecha: a.fecha,
        monto: a.monto,
        gravedad: (a.gravedad === "riesgo" ? "riesgo" : a.gravedad === "alerta" ? "alerta" : "neutro") as Pendiente["gravedad"],
        href: a.href,
      })),
    ...incidencias.map((i) => ({
      clave: `i${i.id}`,
      clase: "Incidencia" as const,
      titulo: i.titulo,
      detalle: i.asignadoA ? `Responsable: ${i.asignadoA.nombre}` : "Sin responsable",
      fecha: i.fechaLimite,
      gravedad: (i.prioridad === "URGENTE" || (i.fechaLimite && i.fechaLimite < hoyFecha) ? "riesgo" : i.prioridad === "ALTA" ? "alerta" : "neutro") as Pendiente["gravedad"],
      href: `/incidencias/${i.id}`,
    })),
  ];
  const peso = { riesgo: 0, alerta: 1, neutro: 2 };
  pendientes.sort((a, b) => peso[a.gravedad] - peso[b.gravedad] || (a.fecha?.getTime() ?? Infinity) - (b.fecha?.getTime() ?? Infinity));
  const limite7 = addDays(hoyFecha, 7);
  const ahora = pendientes.filter((p) => p.gravedad === "riesgo" || (p.fecha && p.fecha <= limite7));
  const despues = pendientes.filter((p) => !ahora.includes(p));
  const puede = puedeCapturar(s);

  return (
    <Pagina
      titulo="Hoy"
      subtitulo={`Lo que hay que atender · ${fecha(new Date())}`}
      acciones={global ? <FiltroDirector directores={directores} actual={directorId} ruta="/" /> : undefined}
    >
      {puede ? (
        <div className="no-imprimir mb-5 flex flex-wrap gap-2">
          <Accion href="/marcas/nueva" icono="marcas">Nueva marca</Accion>
          <Accion href="/contratos/nuevo" icono="pipeline">Nuevo prospecto o contrato</Accion>
          <Accion href="/pagos" icono="pagos">Facturar un cobro</Accion>
          <Accion href="/incidencias/nueva" icono="incidencias">Reportar un problema</Accion>
        </div>
      ) : null}

      {total.porConfirmar > 0 ? (
        <div className="mb-5">
          <Aviso tono="alerta">
            Hay {total.porConfirmar} cobros registrados sin factura ni comprobante. Aparecen como <strong>por confirmar</strong> y no suman a la comisión confirmada.
          </Aviso>
        </div>
      ) : null}

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Cifra etiqueta="Atrasado por cobrar" valor={dinero(total.vencido)} tono={total.vencido > 0 ? "riesgo" : "ok"} nota="Ya pasó la fecha y no hay pago" icono="alerta" />
        <Cifra etiqueta="Por cobrar" valor={dinero(total.porCobrar)} tono="acento" nota={`En ${total.contratosVigentes} contratos vigentes`} icono="dinero" />
        <Cifra etiqueta="Pipeline ponderado" valor={dinero(total.pipelinePonderado)} tono="neutro" nota={`${total.contratosPipeline} oportunidades · ${dinero(total.pipelineNominal)} nominal`} icono="pipeline" />
        <Cifra etiqueta="Pendientes vencidos" valor={total.compromisosVencidos} tono={total.compromisosVencidos > 0 ? "riesgo" : "ok"} nota="Entregables y seguimientos sin cerrar" icono="tareas" />
      </div>

      <div className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Tarjeta titulo="Atender ahora" descripcion="Atrasado, urgente o con fecha en los próximos 7 días" className="xl:col-span-2">
          <Lista items={ahora} vacio="Nada atrasado ni urgente. Buen día." />
        </Tarjeta>
        <Tarjeta titulo="Después" descripcion="De 8 a 30 días">
          <Lista items={despues} vacio="Sin movimientos entre 8 y 30 días." compacta />
        </Tarjeta>
      </div>

      <Tarjeta titulo="Flujo de cobros" descripcion="Cobrado por mes frente a lo programado por facturar" acciones={<Link href="/cobranza" className="text-xs font-medium text-acento hover:underline">Ver cobranza</Link>}>
        <Columnas categorias={serie.categorias} series={[{ nombre: "Cobrado", valores: serie.cobrado, tono: "ok" }, { nombre: "Programado", valores: serie.programado, tono: "acento" }]} alto={170} />
      </Tarjeta>
    </Pagina>
  );
}

function Accion({ href, icono, children }: { href: string; icono: keyof typeof Icono; children: React.ReactNode }) {
  const I = Icono[icono];
  return (
    <Link href={href} className="inline-flex h-9 items-center gap-2 rounded-md border border-linea-fuerte bg-superficie px-3.5 text-sm font-medium text-tinta shadow-sm hover:border-acento-2 hover:text-acento">
      <I className="h-4 w-4" />
      {children}
    </Link>
  );
}

function Lista({ items, vacio, compacta }: { items: Pendiente[]; vacio: string; compacta?: boolean }) {
  if (items.length === 0) return <Vacio>{vacio}</Vacio>;
  return (
    <ul className="-mx-5 divide-y divide-linea/70">
      {items.map((p) => {
        const dias = diasHasta(p.fecha);
        return (
          <li key={p.clave}>
            <Link href={p.href} className="flex items-start justify-between gap-4 px-5 py-2.5 hover:bg-superficie-2">
              <div className="flex min-w-0 items-start gap-3">
                <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${p.gravedad === "riesgo" ? "bg-riesgo" : p.gravedad === "alerta" ? "bg-alerta" : "bg-linea-fuerte"}`} aria-hidden />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Etiqueta tono={CLASE[p.clase]}>{p.clase}</Etiqueta>
                    <span className="line-clamp-2 text-sm font-medium leading-snug text-tinta">{p.titulo}</span>
                  </div>
                  {!compacta ? <div className="mt-0.5 text-xs text-tinta-2">{p.detalle}</div> : null}
                </div>
              </div>
              <div className="shrink-0 text-right">
                {p.monto !== undefined ? <div className="tabular text-sm text-tinta">{dinero(p.monto)}</div> : null}
                <div className="mt-0.5 text-xs text-tinta-3">
                  {p.fecha ? fecha(p.fecha) : "sin fecha"}
                  {dias !== null ? <span className={dias < 0 ? " font-medium text-riesgo" : ""}> · {textoDias(dias)}</span> : null}
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
