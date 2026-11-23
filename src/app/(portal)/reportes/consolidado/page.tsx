import { redirect } from "next/navigation";
import { requerirSesion, veComisionesDeTodos, veTodo } from "@/lib/acceso";
import { construirInforme, periodoDesdeParametros } from "@/lib/reportes";
import { CuerpoInforme } from "@/components/informe";
import { SelectorPeriodo } from "@/components/selector-periodo";
import { BotonImprimir } from "@/components/formularios";
import { Boton } from "@/components/ui";

export default async function InformeConsolidado({ searchParams }: { searchParams: Promise<{ periodo?: string; desde?: string; hasta?: string; comisiones?: string }> }) {
  const s = await requerirSesion();
  if (!veTodo(s)) redirect("/reportes");
  const q = await searchParams;
  const periodo = periodoDesdeParametros(q);
  const incluirComisiones = veComisionesDeTodos(s) && q.comisiones !== "0";
  const informe = await construirInforme(s, { periodo, incluirComisiones });

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="no-imprimir mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SelectorPeriodo ruta="/reportes/consolidado" actual={q.periodo} desde={q.desde} hasta={q.hasta} extra={{ comisiones: q.comisiones }} />
        <div className="flex flex-wrap items-center gap-2">
          <Boton href="/reportes">Volver</Boton>
          <BotonImprimir />
        </div>
      </div>
      <CuerpoInforme informe={informe} titulo="Informe consolidado" subtitulo="Dirección general · todas las carteras" comparativo />
    </div>
  );
}
