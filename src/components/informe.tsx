import Link from "next/link";
import type { Informe } from "@/lib/reportes";
import { dinero, etiqueta, fecha, fechaLarga, diasHasta } from "@/lib/formato";
import { Barras, Columnas } from "./graficas";
import { Etiqueta, PorConfirmar, Tabla, Td, Th, Vacio } from "./ui";

// Cuerpo del informe. Se usa para el informe de un director y para el consolidado.
// Diseñado para pantalla e impresión en A4.

export function CuerpoInforme({ informe, titulo, subtitulo, comparativo }: { informe: Informe; titulo: string; subtitulo: string; comparativo?: boolean }) {
  const t = informe.total;
  const pendComision = t.comisiones.devengadaConfirmada + t.comisiones.devengadaPorConfirmar - t.comisiones.pagada;
  const varios = informe.resumenes.length > 1;

  return (
    <article className="mx-auto max-w-[1100px] rounded-lg border border-linea bg-superficie px-8 py-8 print:border-0 print:px-0 print:py-0">
      {/* Encabezado */}
      <header className="mb-8 flex flex-col gap-4 border-b-2 border-tinta pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="font-serif text-2xl tracking-wide text-tinta">Estudio Sports</div>
          <div className="mt-1 text-xs font-medium uppercase tracking-[0.2em] text-tinta-3">{titulo}</div>
        </div>
        <div className="text-sm text-tinta-2 sm:text-right">
          <div className="font-medium text-tinta">{subtitulo}</div>
          <div>Periodo: {informe.periodo.etiqueta}</div>
          <div className="text-xs text-tinta-3">Generado el {fechaLarga(informe.generadoEl)} · cifras en MXN sin IVA</div>
        </div>
      </header>

      {/* Resumen ejecutivo */}
      <Seccion titulo="1. Resumen ejecutivo">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Dato etiqueta="Valor vigente" valor={dinero(t.valorVigente)} nota={`${t.contratosVigentes} contratos vigentes · ${t.marcasActivas} marcas`} />
          <Dato etiqueta="Cobrado en el periodo" valor={dinero(informe.logros.totalCobradoPeriodo)} nota={`${informe.logros.cobrosRecibidos.length} cobros`} />
          <Dato etiqueta="Por cobrar" valor={dinero(t.porCobrar)} nota={t.vencido > 0 ? `${dinero(t.vencido)} vencido` : "Sin vencidos"} alerta={t.vencido > 0} />
          <Dato etiqueta="Pipeline ponderado" valor={dinero(t.pipelinePonderado)} nota={`${dinero(t.pipelineNominal)} nominal · ${t.contratosPipeline} propuestas`} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Dato etiqueta="Renovaciones 90 d" valor={String(t.renovaciones90)} nota="Contratos vigentes por vencer" alerta={t.renovaciones90 > 0} />
          <Dato etiqueta="Compromisos cumplidos" valor={String(informe.logros.compromisosCumplidos.length)} nota="En el periodo" />
          <Dato etiqueta="Compromisos vencidos" valor={String(t.compromisosVencidos)} nota="Abiertos con fecha pasada" alerta={t.compromisosVencidos > 0} />
          {informe.comisiones ? <Dato etiqueta="Comisiones por pagar" valor={dinero(pendComision)} nota={`${dinero(t.comisiones.pagada)} pagadas`} /> : <Dato etiqueta="Datos por confirmar" valor={String(t.porConfirmar)} nota="Cobros heredados sin respaldo" alerta={t.porConfirmar > 0} />}
        </div>
      </Seccion>

      {comparativo && varios ? (
        <Seccion titulo="2. Comparativo por director">
          <Tabla>
            <thead>
              <tr>
                <Th>Director</Th>
                <Th derecha>Marcas</Th>
                <Th derecha>Valor vigente</Th>
                <Th derecha>Cobrado</Th>
                <Th derecha>Por cobrar</Th>
                <Th derecha>Vencido</Th>
                <Th derecha>Pipeline pond.</Th>
                <Th derecha>Renov. 90 d</Th>
                {informe.comisiones ? <Th derecha>Comisión por pagar</Th> : null}
              </tr>
            </thead>
            <tbody>
              {informe.resumenes.map((r) => (
                <tr key={r.director.id}>
                  <Td className="font-medium">{r.director.nombre}{r.director.esDemo ? <Etiqueta>demo</Etiqueta> : null}</Td>
                  <Td derecha>{r.marcasActivas}</Td>
                  <Td derecha>{dinero(r.valorVigente)}</Td>
                  <Td derecha>{dinero(r.cobrado)}</Td>
                  <Td derecha>{dinero(r.porCobrar)}</Td>
                  <Td derecha className={r.vencido > 0 ? "text-riesgo" : ""}>{dinero(r.vencido)}</Td>
                  <Td derecha>{dinero(r.pipelinePonderado)}</Td>
                  <Td derecha>{r.renovaciones90}</Td>
                  {informe.comisiones ? <Td derecha>{dinero(r.comisiones.devengadaConfirmada + r.comisiones.devengadaPorConfirmar - r.comisiones.pagada)}</Td> : null}
                </tr>
              ))}
            </tbody>
          </Tabla>
        </Seccion>
      ) : null}

      <Seccion titulo={`${comparativo && varios ? 3 : 2}. Logros del periodo`}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <Sub>Contratos iniciados o ganados</Sub>
            {informe.logros.contratosGanados.length === 0 ? (
              <Vacio>Sin contratos iniciados en el periodo.</Vacio>
            ) : (
              <ul className="divide-y divide-linea/70 text-sm">
                {informe.logros.contratosGanados.map((c) => (
                  <li key={c.id} className="flex justify-between gap-3 py-1.5">
                    <span><Link href={`/contratos/${c.id}`} className="font-medium hover:underline">{c.marca}</Link> <span className="text-tinta-2">· {c.proyecto}</span>{varios ? <span className="text-xs text-tinta-3"> · {c.director}</span> : null}</span>
                    <span className="tabular whitespace-nowrap">{dinero(c.monto)}</span>
                  </li>
                ))}
              </ul>
            )}
            <Sub className="mt-5">Propuestas en curso</Sub>
            {informe.logros.propuestasEnviadas.length === 0 ? (
              <Vacio>Sin propuestas abiertas.</Vacio>
            ) : (
              <ul className="divide-y divide-linea/70 text-sm">
                {informe.logros.propuestasEnviadas.map((c) => (
                  <li key={c.id} className="flex justify-between gap-3 py-1.5">
                    <span><Link href={`/contratos/${c.id}`} className="font-medium hover:underline">{c.marca}</Link> <span className="text-tinta-2">· {c.proyecto}</span> <Etiqueta tono={c.estado === "PENDIENTE_FIRMA" ? "alerta" : "acento"}>{etiqueta("estadoContrato", c.estado)}</Etiqueta></span>
                    <span className="tabular whitespace-nowrap">{dinero(c.monto)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <Sub>Cobros recibidos</Sub>
            {informe.logros.cobrosRecibidos.length === 0 ? (
              <Vacio>Sin cobros en el periodo.</Vacio>
            ) : (
              <ul className="divide-y divide-linea/70 text-sm">
                {informe.logros.cobrosRecibidos.slice(0, 12).map((c) => (
                  <li key={c.id} className="flex justify-between gap-3 py-1.5">
                    <span><Link href={`/contratos/${c.contratoId}`} className="font-medium hover:underline">{c.marca}</Link> <span className="text-tinta-2">· {c.concepto}</span> <PorConfirmar confirmado={c.confirmado} /></span>
                    <span className="tabular whitespace-nowrap">{dinero(c.monto)} <span className="text-xs text-tinta-3">{fecha(c.fecha)}</span></span>
                  </li>
                ))}
                {informe.logros.cobrosRecibidos.length > 12 ? <li className="py-1.5 text-xs text-tinta-3">y {informe.logros.cobrosRecibidos.length - 12} más</li> : null}
              </ul>
            )}
            <Sub className="mt-5">Compromisos cumplidos con las marcas</Sub>
            {informe.logros.compromisosCumplidos.length === 0 ? (
              <Vacio>Sin compromisos cerrados en el periodo.</Vacio>
            ) : (
              <ul className="divide-y divide-linea/70 text-sm">
                {informe.logros.compromisosCumplidos.map((k) => (
                  <li key={k.id} className="flex justify-between gap-3 py-1.5">
                    <span><span className="font-medium">{k.marca}</span> <span className="text-tinta-2">· {k.descripcion}</span></span>
                    <span className="whitespace-nowrap text-xs text-tinta-3">{fecha(k.fecha)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Seccion>

      <Seccion titulo={`${comparativo && varios ? 4 : 3}. Flujo de cobros`} descripcion="Cobrado por mes frente a lo programado por facturar. Seis meses atrás, seis adelante.">
        <Columnas
          categorias={informe.mensual.categorias}
          series={[
            { nombre: "Cobrado", valores: informe.mensual.cobrado, tono: "ok" },
            { nombre: "Programado por cobrar", valores: informe.mensual.proyectado, tono: "acento" },
          ]}
        />
      </Seccion>

      <Seccion titulo={`${comparativo && varios ? 5 : 4}. Cartera por marca`}>
        <Tabla>
          <thead>
            <tr>
              <Th>Marca</Th>
              {varios ? <Th>Director</Th> : null}
              <Th derecha>Vigentes</Th>
              <Th derecha>Valor vigente</Th>
              <Th derecha>Cobrado acumulado</Th>
              <Th derecha>Por cobrar</Th>
              <Th>Próximo cobro</Th>
            </tr>
          </thead>
          <tbody>
            {informe.cartera.map((m) => (
              <tr key={m.marcaId}>
                <Td><Link href={`/marcas/${m.marcaId}`} className="font-medium hover:underline">{m.marca}</Link></Td>
                {varios ? <Td className="text-tinta-2">{m.director}</Td> : null}
                <Td derecha>{m.vigentes}</Td>
                <Td derecha>{dinero(m.valorVigente)}</Td>
                <Td derecha>{dinero(m.cobrado)}</Td>
                <Td derecha>{dinero(m.porCobrar)}</Td>
                <Td className="text-tinta-2">{fecha(m.proximoCobro)}</Td>
              </tr>
            ))}
          </tbody>
        </Tabla>
      </Seccion>

      <Seccion titulo={`${comparativo && varios ? 6 : 5}. Cobranza y pipeline`} className="salto">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <Sub>Antigüedad de saldos</Sub>
            <Barras datos={informe.antiguedad.map((a) => ({ etiqueta: a.etiqueta, valor: a.monto, tono: a.etiqueta.startsWith("Vencido") ? "riesgo" : "acento" }))} />
            {informe.vencidos.length > 0 ? (
              <>
                <Sub className="mt-5">Vencidos</Sub>
                <ul className="divide-y divide-linea/70 text-sm">
                  {informe.vencidos.map((v) => (
                    <li key={v.id} className="flex justify-between gap-3 py-1.5">
                      <span><Link href={`/contratos/${v.contratoId}`} className="font-medium hover:underline">{v.marca}</Link> <span className="text-tinta-2">· {v.concepto}</span></span>
                      <span className="tabular whitespace-nowrap text-riesgo">{dinero(v.pendiente)} <span className="text-xs">{fecha(v.fecha)}</span></span>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
          <div>
            <Sub>Pipeline por etapa</Sub>
            <Barras
              datos={informe.pipeline.flatMap((p) => [
                { etiqueta: `${etiqueta("estadoContrato", p.estado)} · nominal`, valor: p.nominal, tono: "neutro" as const, nota: `${p.cantidad} propuestas` },
                { etiqueta: `${etiqueta("estadoContrato", p.estado)} · ponderado`, valor: p.ponderado, tono: "acento" as const },
              ])}
            />
            <p className="mt-2 text-xs text-tinta-3">Ponderación: propuesta 40 %, pendiente de firma 80 %. Criterio del portal; ajustable con el administrador.</p>
            <Sub className="mt-5">Renovaciones en los próximos seis meses</Sub>
            {informe.renovaciones.length === 0 ? (
              <Vacio>Ningún contrato vigente vence en seis meses.</Vacio>
            ) : (
              <ul className="divide-y divide-linea/70 text-sm">
                {informe.renovaciones.map((r) => {
                  const d = diasHasta(r.vencimiento);
                  return (
                    <li key={r.id} className="flex justify-between gap-3 py-1.5">
                      <span>
                        <Link href={`/contratos/${r.id}`} className="font-medium hover:underline">{r.marca}</Link> <span className="text-tinta-2">· {r.proyecto}</span>
                        <div className="text-xs text-tinta-3">{r.renovacionEstado ? `Renovación: ${etiqueta("estadoContrato", r.renovacionEstado)}` : "Sin renovación registrada"}</div>
                      </span>
                      <span className="whitespace-nowrap text-right">
                        <div className="tabular">{dinero(r.monto)}</div>
                        <div className={`text-xs ${d !== null && d <= 30 ? "text-riesgo" : "text-tinta-3"}`}>{fecha(r.vencimiento)}{d !== null ? ` · ${d} d` : ""}</div>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </Seccion>

      {informe.comisiones ? (
        <Seccion titulo={`${comparativo && varios ? 7 : 6}. Comisiones del periodo`} descripcion="Devengadas sobre los cobros del periodo. Comisión = cobrado × (1 − retención de la casa) × porcentaje del director.">
          {informe.comisiones.length === 0 ? (
            <Vacio>Sin cobros en el periodo, por tanto sin comisión devengada.</Vacio>
          ) : (
            <Tabla>
              <thead>
                <tr>
                  <Th>Marca · concepto</Th>
                  <Th>Fecha</Th>
                  <Th derecha>Cobrado</Th>
                  <Th derecha>Comisión</Th>
                </tr>
              </thead>
              <tbody>
                {informe.comisiones.map((k, i) => (
                  <tr key={i}>
                    <Td><span className="font-medium">{k.marca}</span> <span className="text-tinta-2">· {k.concepto}</span> <PorConfirmar confirmado={k.confirmado} /></Td>
                    <Td>{fecha(k.fecha)}</Td>
                    <Td derecha>{dinero(k.cobrado)}</Td>
                    <Td derecha className="font-medium">{dinero(k.comision)}</Td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-medium">
                  <Td colSpan={2}>Total del periodo</Td>
                  <Td derecha>{dinero(informe.comisiones.reduce((a, k) => a + k.cobrado, 0))}</Td>
                  <Td derecha>{dinero(informe.comisiones.reduce((a, k) => a + k.comision, 0))}</Td>
                </tr>
              </tfoot>
            </Tabla>
          )}
          <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
            <div className="rounded border border-linea px-3 py-2"><div className="text-xs uppercase tracking-wide text-tinta-3">Devengada acumulada</div><div className="tabular font-medium">{dinero(t.comisiones.devengadaConfirmada + t.comisiones.devengadaPorConfirmar)}</div></div>
            <div className="rounded border border-linea px-3 py-2"><div className="text-xs uppercase tracking-wide text-tinta-3">Pagada acumulada</div><div className="tabular font-medium">{dinero(t.comisiones.pagada)}</div></div>
            <div className="rounded border border-linea px-3 py-2"><div className="text-xs uppercase tracking-wide text-tinta-3">Por pagar</div><div className="tabular font-medium">{dinero(pendComision)}</div></div>
          </div>
        </Seccion>
      ) : null}

      {informe.pendientesConfirmar.length > 0 ? (
        <Seccion titulo={`${(comparativo && varios ? 7 : 6) + (informe.comisiones ? 1 : 0)}. Datos por conciliar`} descripcion="Registros heredados con contradicciones o sin respaldo documental. Resolverlos eleva la confiabilidad del informe.">
          <ul className="space-y-2 text-sm">
            {informe.pendientesConfirmar.map((p) => (
              <li key={p.id} className="rounded border border-alerta/30 bg-alerta-suave px-3 py-2">
                <Link href={`/contratos/${p.id}`} className="font-medium hover:underline">{p.marca} · {p.proyecto}</Link>
                <div className="text-tinta-2">{p.observaciones}</div>
              </li>
            ))}
          </ul>
        </Seccion>
      ) : null}

      <footer className="mt-8 border-t border-linea pt-3 text-xs text-tinta-3">
        Nota metodológica: las cifras provienen del portal al momento de generar el informe. Los montos marcados «por confirmar» proceden del control anterior y carecen de respaldo documental; no se suman a la comisión devengada confirmada. Propuestas y pendientes de firma no son cuentas por cobrar. Especie y acciones se registran a valor de referencia.
      </footer>
    </article>
  );
}

function Seccion({ titulo, descripcion, children, className = "" }: { titulo: string; descripcion?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`mb-8 ${className}`}>
      <h2 className="mb-1 text-base font-semibold text-tinta">{titulo}</h2>
      {descripcion ? <p className="mb-3 text-xs text-tinta-3">{descripcion}</p> : <div className="mb-3" />}
      {children}
    </section>
  );
}

function Sub({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <h3 className={`mb-1.5 text-xs font-semibold uppercase tracking-wide text-tinta-3 ${className}`}>{children}</h3>;
}

function Dato({ etiqueta, valor, nota, alerta }: { etiqueta: string; valor: string; nota?: string; alerta?: boolean }) {
  return (
    <div className={`rounded border px-3 py-2 ${alerta ? "border-riesgo/40" : "border-linea"}`}>
      <div className="text-[11px] font-medium uppercase tracking-wide text-tinta-3">{etiqueta}</div>
      <div className="tabular mt-0.5 text-lg font-semibold text-tinta">{valor}</div>
      {nota ? <div className="text-xs text-tinta-2">{nota}</div> : null}
    </div>
  );
}
