import Link from "next/link";
import { requerirSesion, veComisionesDeTodos, veTodo } from "@/lib/acceso";
import { directoresVisibles } from "@/lib/consultas";
import { Aviso, Pagina, Tarjeta } from "@/components/ui";

export default async function Reportes() {
  const s = await requerirSesion();
  const global = veTodo(s);
  const directores = await directoresVisibles(s);

  return (
    <Pagina titulo="Reportes" subtitulo="Informes generados al momento con los datos del portal. Imprimibles en PDF desde el navegador.">
      <div className="mb-5">
        <Aviso>
          Cada informe se construye con la información viva al abrirlo: no hay versiones desactualizadas. El envío automático por correo a los socios se habilita en la siguiente fase, una vez definidos remitente y periodicidad con Estudio Sports.
        </Aviso>
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Tarjeta titulo="Informe del director comercial" descripcion="Para presentar a los socios: alcances, logros, cartera, cobros, pipeline y renovaciones de una dirección.">
          <ul className="divide-y divide-linea/70 text-sm">
            {directores.map((d) => (
              <li key={d.id} className="flex items-center justify-between py-2.5">
                <span className="font-medium">{d.nombre}{d.esDemo ? <span className="ml-2 text-xs text-tinta-3">demo</span> : null}</span>
                <span className="flex gap-3 text-xs">
                  <Link href={`/reportes/director/${d.id}?periodo=mes`} className="text-acento hover:underline">Mes</Link>
                  <Link href={`/reportes/director/${d.id}?periodo=trimestre`} className="text-acento hover:underline">Trimestre</Link>
                  <Link href={`/reportes/director/${d.id}?periodo=anio`} className="text-acento hover:underline">Año</Link>
                </span>
              </li>
            ))}
          </ul>
        </Tarjeta>
        {global ? (
          <Tarjeta titulo="Informe consolidado de Estudio Sports" descripcion="Para el administrador general y los socios: toda la empresa y el comparativo por director.">
            <div className="flex flex-wrap gap-2 text-sm">
              <Link href="/reportes/consolidado?periodo=mes" className="inline-flex h-9 items-center rounded-md border border-linea-fuerte bg-superficie px-3.5 text-sm font-medium shadow-sm hover:border-acento-2 hover:text-acento">Mes en curso</Link>
              <Link href="/reportes/consolidado?periodo=trimestre" className="inline-flex h-9 items-center rounded-md border border-linea-fuerte bg-superficie px-3.5 text-sm font-medium shadow-sm hover:border-acento-2 hover:text-acento">Trimestre</Link>
              <Link href="/reportes/consolidado?periodo=anio" className="inline-flex h-9 items-center rounded-md border border-linea-fuerte bg-superficie px-3.5 text-sm font-medium shadow-sm hover:border-acento-2 hover:text-acento">Año</Link>
              <Link href="/reportes/consolidado?periodo=todo" className="inline-flex h-9 items-center rounded-md border border-linea-fuerte bg-superficie px-3.5 text-sm font-medium shadow-sm hover:border-acento-2 hover:text-acento">Histórico</Link>
            </div>
            {!veComisionesDeTodos(s) ? <p className="mt-3 text-xs text-tinta-3">Tu rol no incluye comisiones; el informe las omite.</p> : null}
          </Tarjeta>
        ) : null}
        {global ? (
          <Tarjeta titulo="Reporte por pódcast" descripcion="Cuánto deja cada programa: marcas, cobrado, comisiones y neto para la casa, por periodo.">
            <div className="flex flex-wrap gap-2 text-sm">
              <Link href="/reportes/podcasts?periodo=mes" className="inline-flex h-9 items-center rounded-md border border-linea-fuerte bg-superficie px-3.5 text-sm font-medium shadow-sm hover:border-acento-2 hover:text-acento">Mes</Link>
              <Link href="/reportes/podcasts?periodo=trimestre" className="inline-flex h-9 items-center rounded-md border border-linea-fuerte bg-superficie px-3.5 text-sm font-medium shadow-sm hover:border-acento-2 hover:text-acento">Trimestre</Link>
              <Link href="/reportes/podcasts?periodo=anio" className="inline-flex h-9 items-center rounded-md border border-linea-fuerte bg-superficie px-3.5 text-sm font-medium shadow-sm hover:border-acento-2 hover:text-acento">Año</Link>
              <Link href="/reportes/podcasts?periodo=todo" className="inline-flex h-9 items-center rounded-md border border-linea-fuerte bg-superficie px-3.5 text-sm font-medium shadow-sm hover:border-acento-2 hover:text-acento">Histórico</Link>
            </div>
          </Tarjeta>
        ) : (
          <Tarjeta titulo="Exportaciones" descripcion="Datos de tu cartera en CSV para Excel.">
            <div className="flex flex-wrap gap-2 text-sm">
              <Link href="/api/exportar/contratos" className="inline-flex h-9 items-center rounded-md border border-linea-fuerte bg-superficie px-3.5 text-sm font-medium shadow-sm hover:border-acento-2 hover:text-acento">Contratos</Link>
              <Link href="/api/exportar/hitos" className="inline-flex h-9 items-center rounded-md border border-linea-fuerte bg-superficie px-3.5 text-sm font-medium shadow-sm hover:border-acento-2 hover:text-acento">Hitos de cobro</Link>
              <Link href="/api/exportar/comisiones" className="inline-flex h-9 items-center rounded-md border border-linea-fuerte bg-superficie px-3.5 text-sm font-medium shadow-sm hover:border-acento-2 hover:text-acento">Comisiones</Link>
              <Link href="/api/exportar/calendario.ics" className="inline-flex h-9 items-center rounded-md border border-linea-fuerte bg-superficie px-3.5 text-sm font-medium shadow-sm hover:border-acento-2 hover:text-acento">Calendario ICS</Link>
            </div>
          </Tarjeta>
        )}
      </div>
    </Pagina>
  );
}
