import Link from "next/link";
import { redirect } from "next/navigation";
import { esAdmin, requerirSesion, veTodo } from "@/lib/acceso";
import { resumenPorDirector, sumarResumenes } from "@/lib/consultas";
import { dinero, dineroCorto } from "@/lib/formato";
import { Aviso, Boton, Cifra, Etiqueta, Pagina, Tabla, Tarjeta, Td, Th } from "@/components/ui";
import { Barras } from "@/components/graficas";

// Tablero del administrador general: consolidado y comparativo por director.
export default async function Tablero() {
  const s = await requerirSesion();
  if (!veTodo(s)) redirect("/");
  const admin = esAdmin(s);
  const resumenes = await resumenPorDirector(s);
  const total = sumarResumenes(resumenes);
  const reales = resumenes.filter((r) => !r.director.esDemo);
  const hayDemo = resumenes.some((r) => r.director.esDemo);
  const pendienteComision = total.comisiones.devengadaConfirmada + total.comisiones.devengadaPorConfirmar - total.comisiones.pagada;

  return (
    <Pagina
      titulo="Tablero"
      subtitulo="Consolidado de Estudio Sports y comparativo por director comercial"
      acciones={
        <>
          <Boton href="/reportes/consolidado">Informe consolidado</Boton>
          <Boton href="/reportes">Reportes</Boton>
        </>
      }
    >
      {hayDemo ? (
        <div className="mb-5">
          <Aviso>Las cifras incluyen la dirección de demostración, marcada como <strong>demo</strong>. Elimínala en Directores cuando ya no se necesite.</Aviso>
        </div>
      ) : null}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Cifra etiqueta="Valor vigente" valor={dinero(total.valorVigente)} nota={`${total.contratosVigentes} contratos vigentes`} tono="acento" />
        <Cifra etiqueta="Por cobrar" valor={dinero(total.porCobrar)} nota={total.vencido > 0 ? `${dinero(total.vencido)} vencido` : "Sin vencidos"} tono={total.vencido > 0 ? "riesgo" : "ok"} />
        <Cifra etiqueta="Pipeline ponderado" valor={dinero(total.pipelinePonderado)} nota={`${dinero(total.pipelineNominal)} nominal · ${total.contratosPipeline} propuestas`} />
        {admin ? (
          <Cifra etiqueta="Comisiones por pagar" valor={dinero(pendienteComision)} nota={`${dinero(total.comisiones.pagada)} ya pagadas`} tono={pendienteComision > 0 ? "alerta" : "neutro"} />
        ) : (
          <Cifra etiqueta="Renovaciones 90 d" valor={total.renovaciones90} tono={total.renovaciones90 > 0 ? "alerta" : "neutro"} />
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Tarjeta titulo="Cobrado vs por cobrar" descripcion="Por director, contratos vigentes y pendientes de firma">
          <Barras
            datos={resumenes.flatMap((r) => [
              { etiqueta: `${r.director.nombre} · cobrado`, valor: r.cobrado, tono: "ok" as const },
              { etiqueta: `${r.director.nombre} · por cobrar`, valor: r.porCobrar, tono: "acento" as const },
            ])}
          />
        </Tarjeta>
        <Tarjeta titulo="Pipeline" descripcion="Nominal y ponderado por etapa">
          <Barras
            datos={resumenes.flatMap((r) => [
              { etiqueta: `${r.director.nombre} · nominal`, valor: r.pipelineNominal, tono: "neutro" as const },
              { etiqueta: `${r.director.nombre} · ponderado`, valor: r.pipelinePonderado, tono: "acento" as const },
            ])}
          />
        </Tarjeta>

        <Tarjeta titulo="Comparativo por director" className="xl:col-span-2">
          <Tabla>
            <thead>
              <tr>
                <Th>Director</Th>
                <Th derecha>Marcas</Th>
                <Th derecha>Vigentes</Th>
                <Th derecha>Valor vigente</Th>
                <Th derecha>Cobrado</Th>
                <Th derecha>Por cobrar</Th>
                <Th derecha>Vencido</Th>
                <Th derecha>Pipeline pond.</Th>
                <Th derecha>Renov. 90 d</Th>
                <Th derecha>Comp. vencidos</Th>
                {admin ? <Th derecha>Comisión por pagar</Th> : null}
                <Th />
              </tr>
            </thead>
            <tbody>
              {resumenes.map((r) => {
                const pend = r.comisiones.devengadaConfirmada + r.comisiones.devengadaPorConfirmar - r.comisiones.pagada;
                return (
                  <tr key={r.director.id} className="hover:bg-superficie-2">
                    <Td>
                      <div className="font-medium">{r.director.nombre}</div>
                      <div className="flex gap-1">
                        {r.director.esDemo ? <Etiqueta>demo</Etiqueta> : null}
                        {r.porConfirmar > 0 ? <Etiqueta tono="alerta">{r.porConfirmar} cobros por confirmar</Etiqueta> : null}
                      </div>
                    </Td>
                    <Td derecha>{r.marcasActivas}</Td>
                    <Td derecha>{r.contratosVigentes}</Td>
                    <Td derecha>{dinero(r.valorVigente)}</Td>
                    <Td derecha>{dinero(r.cobrado)}</Td>
                    <Td derecha>{dinero(r.porCobrar)}</Td>
                    <Td derecha className={r.vencido > 0 ? "text-riesgo font-medium" : ""}>{dinero(r.vencido)}</Td>
                    <Td derecha>{dinero(r.pipelinePonderado)}</Td>
                    <Td derecha className={r.renovaciones90 > 0 ? "text-alerta font-medium" : ""}>{r.renovaciones90}</Td>
                    <Td derecha className={r.compromisosVencidos > 0 ? "text-riesgo font-medium" : ""}>{r.compromisosVencidos}</Td>
                    {admin ? <Td derecha>{dinero(pend)}</Td> : null}
                    <Td>
                      <div className="flex justify-end gap-2 text-xs">
                        <Link href={`/?director=${r.director.id}`} className="text-acento hover:underline">Hoy</Link>
                        <Link href={`/reportes/director/${r.director.id}`} className="text-acento hover:underline">Informe</Link>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="font-medium">
                <Td>Total {hayDemo ? "(incluye demo)" : ""}</Td>
                <Td derecha>{total.marcasActivas}</Td>
                <Td derecha>{total.contratosVigentes}</Td>
                <Td derecha>{dinero(total.valorVigente)}</Td>
                <Td derecha>{dinero(total.cobrado)}</Td>
                <Td derecha>{dinero(total.porCobrar)}</Td>
                <Td derecha>{dinero(total.vencido)}</Td>
                <Td derecha>{dinero(total.pipelinePonderado)}</Td>
                <Td derecha>{total.renovaciones90}</Td>
                <Td derecha>{total.compromisosVencidos}</Td>
                {admin ? <Td derecha>{dinero(pendienteComision)}</Td> : null}
                <Td />
              </tr>
            </tfoot>
          </Tabla>
          {reales.length === 1 ? (
            <p className="mt-3 text-xs text-tinta-3">Con un solo director real el comparativo no es significativo. El valor del tablero crece al incorporar a los demás directores. Cifras: {dineroCorto(total.valorVigente)} vigente.</p>
          ) : null}
        </Tarjeta>
      </div>
    </Pagina>
  );
}
