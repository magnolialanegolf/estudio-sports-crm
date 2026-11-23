import Link from "next/link";
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, isToday, parse, startOfMonth, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { db } from "@/lib/db";
import { filtroContratos, requerirSesion, veTodo } from "@/lib/acceso";
import { directoresVisibles } from "@/lib/consultas";
import { dineroCorto, mesAnio } from "@/lib/formato";
import { Boton, Pagina, Tarjeta } from "@/components/ui";
import { FiltroDirector } from "@/components/filtro-director";

export default async function Calendario({ searchParams }: { searchParams: Promise<{ mes?: string; director?: string; capa?: string }> }) {
  const s = await requerirSesion();
  const { mes, director, capa } = await searchParams;
  const global = veTodo(s);
  const directorId = global ? director || undefined : undefined;
  const base = mes ? parse(mes, "yyyy-MM", new Date()) : new Date();
  const inicioMes = startOfMonth(Number.isNaN(base.getTime()) ? new Date() : base);
  const finMes = endOfMonth(inicioMes);
  const desde = startOfWeek(inicioMes, { weekStartsOn: 1 });
  const hasta = endOfWeek(finMes, { weekStartsOn: 1 });
  const verCobros = capa !== "acciones";
  const verAcciones = capa !== "cobros";
  const filtro = directorId ? { directorId } : filtroContratos(s);

  const [hitos, compromisos, vencimientos, directores] = await Promise.all([
    verCobros
      ? db.hitoCobro.findMany({
          where: { contrato: { ...filtro, estado: { in: ["VIGENTE", "PENDIENTE_FIRMA"] } }, fechaFacturar: { gte: desde, lte: hasta } },
          include: { contrato: { select: { id: true, marca: { select: { nombre: true } } } } },
        })
      : [],
    verAcciones
      ? db.compromiso.findMany({
          where: { contrato: filtro, fecha: { gte: desde, lte: hasta } },
          include: { contrato: { select: { id: true, marca: { select: { nombre: true } } } } },
        })
      : [],
    db.contrato.findMany({ where: { ...filtro, estado: "VIGENTE", vencimiento: { gte: desde, lte: hasta } }, select: { id: true, proyecto: true, marca: { select: { nombre: true } }, vencimiento: true } }),
    global ? directoresVisibles(s) : Promise.resolve([]),
  ]);

  const dias = eachDayOfInterval({ start: desde, end: hasta });
  const clave = (d: Date) => format(d, "yyyy-MM-dd");
  const porDia = new Map<string, { tipo: "cobro" | "accion" | "vencimiento"; texto: string; href: string; tono: string; monto?: number }[]>();
  const agregar = (d: Date, e: { tipo: "cobro" | "accion" | "vencimiento"; texto: string; href: string; tono: string; monto?: number }) => {
    const k = clave(d);
    if (!porDia.has(k)) porDia.set(k, []);
    porDia.get(k)!.push(e);
  };
  for (const h of hitos) agregar(h.fechaFacturar!, { tipo: "cobro", texto: `${h.contrato.marca.nombre} · ${h.concepto}`, href: `/contratos/${h.contrato.id}`, tono: h.estadoPago === "PAGADO" ? "ok" : "acento", monto: h.importe });
  for (const k of compromisos) agregar(k.fecha!, { tipo: "accion", texto: `${k.contrato.marca.nombre} · ${k.descripcion}`, href: `/contratos/${k.contrato.id}`, tono: k.estado === "CUMPLIDO" ? "ok" : "alerta" });
  for (const c of vencimientos) agregar(c.vencimiento!, { tipo: "vencimiento", texto: `Vence · ${c.marca.nombre} · ${c.proyecto}`, href: `/contratos/${c.id}`, tono: "riesgo" });

  const q = (m: Date, extra?: Record<string, string | undefined>) => {
    const p = new URLSearchParams({ mes: format(m, "yyyy-MM") });
    if (directorId) p.set("director", directorId);
    if (capa) p.set("capa", capa);
    for (const [k, v] of Object.entries(extra ?? {})) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    return `/calendario?${p.toString()}`;
  };
  const totalCobros = hitos.filter((h) => isSameMonth(h.fechaFacturar!, inicioMes)).reduce((a, h) => a + h.importe, 0);

  const colorChip: Record<string, string> = {
    ok: "bg-ok-suave text-ok",
    acento: "bg-acento-suave text-acento",
    alerta: "bg-alerta-suave text-alerta",
    riesgo: "bg-riesgo-suave text-riesgo",
  };

  return (
    <Pagina
      titulo="Calendario"
      subtitulo={`Dos capas: acciones acordadas y cobros por facturar · ${dineroCorto(totalCobros)} MXN programados en ${mesAnio(inicioMes)}`}
      acciones={
        <>
          {global ? <FiltroDirector directores={directores} actual={directorId} ruta="/calendario" extra={{ mes: format(inicioMes, "yyyy-MM"), capa }} /> : null}
          <Boton href={`/api/exportar/calendario.ics${directorId ? `?director=${directorId}` : ""}`}>Descargar ICS</Boton>
        </>
      }
    >
      <Tarjeta>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Link href={q(addMonths(inicioMes, -1))} className="rounded border border-linea-fuerte px-2.5 py-1 text-sm hover:bg-superficie-2" aria-label="Mes anterior">←</Link>
            <h2 className="min-w-44 text-center text-base font-semibold capitalize">{mesAnio(inicioMes)}</h2>
            <Link href={q(addMonths(inicioMes, 1))} className="rounded border border-linea-fuerte px-2.5 py-1 text-sm hover:bg-superficie-2" aria-label="Mes siguiente">→</Link>
            <Link href={q(new Date())} className="ml-2 text-xs text-acento hover:underline">Hoy</Link>
          </div>
          <div className="flex gap-1 text-xs">
            {[
              { v: undefined, t: "Ambas capas" },
              { v: "cobros", t: "Solo cobros" },
              { v: "acciones", t: "Solo acciones" },
            ].map((o) => (
              <Link key={o.t} href={q(inicioMes, { capa: o.v })} className={`rounded border px-3 py-1 font-medium ${(capa ?? undefined) === o.v ? "border-acento bg-acento-suave text-acento" : "border-linea text-tinta-2 hover:bg-superficie-2"}`}>
                {o.t}
              </Link>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-7 border-l border-t border-linea text-xs">
          {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
            <div key={d} className="border-r border-b border-linea bg-superficie-2 px-2 py-1 font-semibold uppercase tracking-wide text-tinta-3">{d}</div>
          ))}
          {dias.map((d) => {
            const eventos = porDia.get(clave(d)) ?? [];
            const fuera = !isSameMonth(d, inicioMes);
            return (
              <div key={clave(d)} className={`min-h-24 border-r border-b border-linea p-1.5 ${fuera ? "bg-fondo text-tinta-3" : "bg-superficie"}`}>
                <div className={`mb-1 text-right text-[11px] ${isToday(d) ? "font-bold text-acento" : ""}`}>{format(d, "d", { locale: es })}</div>
                <div className="space-y-1">
                  {eventos.slice(0, 4).map((e, i) => (
                    <Link key={i} href={e.href} title={e.texto} className={`block truncate rounded px-1.5 py-0.5 text-[11px] leading-tight ${colorChip[e.tono]}`}>
                      {e.tipo === "cobro" && e.monto !== undefined ? <span className="tabular font-medium">{dineroCorto(e.monto)} · </span> : null}
                      {e.texto}
                    </Link>
                  ))}
                  {eventos.length > 4 ? <div className="px-1 text-[11px] text-tinta-3">+{eventos.length - 4} más</div> : null}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-tinta-2">
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-acento" /> Cobro por facturar</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-ok" /> Cobrado o cumplido</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-alerta" /> Acción acordada</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-riesgo" /> Vencimiento de contrato</span>
        </div>
      </Tarjeta>
    </Pagina>
  );
}
