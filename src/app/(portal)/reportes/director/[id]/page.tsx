import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requerirSesion, veComisiones, veTodo } from "@/lib/acceso";
import { construirInforme, periodoDesdeParametros } from "@/lib/reportes";
import { CuerpoInforme } from "@/components/informe";
import { SelectorPeriodo } from "@/components/selector-periodo";
import { BotonImprimir } from "@/components/formularios";
import { Boton } from "@/components/ui";
import Link from "next/link";

export default async function InformeDirector({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ periodo?: string; desde?: string; hasta?: string; comisiones?: string }> }) {
  const s = await requerirSesion();
  const { id } = await params;
  const q = await searchParams;
  if (!veTodo(s) && s.directorId !== id) notFound();
  const director = await db.director.findUnique({ where: { id } });
  if (!director) notFound();

  const puedeVerComisiones = veComisiones(s);
  const incluirComisiones = puedeVerComisiones && q.comisiones !== "0";
  const periodo = periodoDesdeParametros(q);
  const informe = await construirInforme(s, { directorIds: [id], periodo, incluirComisiones });
  const ruta = `/reportes/director/${id}`;

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="no-imprimir mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SelectorPeriodo ruta={ruta} actual={q.periodo} desde={q.desde} hasta={q.hasta} extra={{ comisiones: q.comisiones }} />
        <div className="flex flex-wrap items-center gap-2">
          {puedeVerComisiones ? (
            <Link href={`${ruta}?${new URLSearchParams({ ...(q.periodo ? { periodo: q.periodo } : {}), ...(q.desde ? { desde: q.desde } : {}), ...(q.hasta ? { hasta: q.hasta } : {}), comisiones: incluirComisiones ? "0" : "1" }).toString()}`} className="inline-flex h-9 items-center rounded-md border border-linea-fuerte bg-superficie px-3.5 text-sm font-medium shadow-sm hover:border-acento-2 hover:text-acento">
              {incluirComisiones ? "Ocultar comisiones" : "Incluir comisiones"}
            </Link>
          ) : null}
          <Boton href="/reportes">Volver</Boton>
          <BotonImprimir />
        </div>
      </div>
      <CuerpoInforme informe={informe} titulo="Informe comercial de dirección" subtitulo={director.nombre} />
    </div>
  );
}
