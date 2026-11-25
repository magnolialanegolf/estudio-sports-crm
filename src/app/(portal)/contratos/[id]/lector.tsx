"use client";

import { useActionState, useState } from "react";
import { analizarDocumento, aplicarPropuesta, descartarPropuesta } from "@/actions/ia";
import type { PropuestaIa } from "@/lib/ia";
import type { Resultado } from "@/actions/util";
import { Seleccion } from "@/components/campos";

export function BotonAnalizar({ documentoId, configurado }: { documentoId: string; configurado: boolean }) {
  const [estado, setEstado] = useState<{ cargando?: boolean; error?: string }>({});
  if (!configurado) return <span className="text-xs text-tinta-3" title="Falta ANTHROPIC_API_KEY en el entorno">Lector no configurado</span>;
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={estado.cargando}
        onClick={async () => {
          setEstado({ cargando: true });
          const r = await analizarDocumento(documentoId);
          setEstado({ error: r?.error });
        }}
        className="no-imprimir inline-flex h-7 items-center rounded-md border border-acento/40 bg-acento-suave px-2.5 text-xs font-medium text-acento hover:bg-acento hover:text-white disabled:opacity-60"
      >
        {estado.cargando ? "Leyendo el contrato…" : "Volver a leer"}
      </button>
      {estado.error ? <span className="text-xs text-riesgo">{estado.error}</span> : null}
    </span>
  );
}

type Asignable = { id: string; nombre: string; rol: string };

const campo = "campo h-8 !py-0 text-sm";
const etiqueta = "block text-[11px] font-medium uppercase tracking-wide text-tinta-3";

function Casilla({ nombre, defecto = true, titulo }: { nombre: string; defecto?: boolean; titulo?: string }) {
  return <input type="checkbox" name={nombre} defaultChecked={defecto} title={titulo} className="mt-2 h-4 w-4 shrink-0 accent-[var(--acento)]" />;
}

// Ventana que aparece al subir el contrato: lo que el lector identificó, cada cosa con su casilla
// y editable, para aprobar de una vez lo que entra a acciones, pagos y calendario.
export function PanelPropuesta({ contratoId, propuesta, fechaPropuesta, tieneHitos, asignables }: { contratoId: string; propuesta: PropuestaIa; fechaPropuesta: string; tieneHitos: boolean; asignables: Asignable[] }) {
  const accion = aplicarPropuesta.bind(null, contratoId);
  const [r, despachar, pendiente] = useActionState<Resultado, FormData>(accion, undefined);
  const [abierto, setAbierto] = useState(true);
  const produccion = asignables.filter((u) => ["PRODUCCION", "CONTENIDOS", "OPERATIVO"].includes(u.rol));
  const totalPiezas = propuesta.entregables.reduce((a, e) => a + e.cantidad, 0);

  if (!abierto) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-acento/30 bg-acento-suave/50 px-4 py-3 text-sm">
        <span>
          <strong>Lectura del contrato pendiente de revisar</strong> · {propuesta.entregables.length} tipo(s) de entregable, {propuesta.fechasClave.length} fecha(s) clave, {propuesta.hitosCobro.length} cobro(s). Nada se ha aplicado.
        </span>
        <span className="flex items-center gap-3">
          <button type="button" onClick={() => setAbierto(true)} className="inline-flex h-8 items-center rounded-md border border-acento bg-acento px-3 text-xs font-medium text-white hover:bg-acento-2">Revisar</button>
          <form action={descartarPropuesta.bind(null, contratoId)}>
            <button type="submit" className="text-xs text-tinta-3 hover:text-riesgo hover:underline">Descartar</button>
          </form>
        </span>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8">
      <div className="w-full max-w-5xl rounded-xl border border-linea bg-superficie shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-linea px-6 py-4">
          <div>
            <h2 className="text-base font-semibold uppercase tracking-wide text-acento">El portal leyó el contrato</h2>
            <p className="mt-0.5 text-sm text-tinta-2">Esto es lo que identificó. Corrige lo que haga falta, quita lo que no aplique y aprueba: lo marcado se agrega a acciones, pagos y calendario. Generado el {fechaPropuesta}.</p>
          </div>
          <button type="button" onClick={() => setAbierto(false)} className="shrink-0 text-sm text-tinta-3 hover:text-tinta">Cerrar por ahora</button>
        </div>

        <form action={despachar}>
          <div className="max-h-[70vh] space-y-6 overflow-y-auto px-6 py-5">
            <section className="rounded-md border border-linea bg-superficie-2 px-4 py-3 text-sm">
              <div className={etiqueta}>Resumen</div>
              <p className="mt-1 text-tinta">{propuesta.resumen}</p>
              <p className="mt-1 text-xs text-tinta-2">
                {propuesta.marca ? `Marca: ${propuesta.marca} · ` : ""}{propuesta.talento ? `Talento: ${propuesta.talento} · ` : ""}Vigencia: {propuesta.inicio ?? "—"} → {propuesta.vencimiento ?? "—"}{propuesta.montoSinIva ? ` · Monto sin IVA: $${propuesta.montoSinIva.toLocaleString("es-MX")}` : ""}
              </p>
              <label className="mt-2 flex items-start gap-2 text-sm">
                <Casilla nombre="datos" />
                <span className="mt-1">Completar talento, vigencia y monto del contrato si están vacíos</span>
              </label>
            </section>

            <section>
              <label className="flex items-start gap-2">
                <Casilla nombre="brief" />
                <span className="mt-1 text-sm font-medium">Acuerdos de contenido para producción</span>
              </label>
              <textarea name="acuerdosContenido" rows={5} defaultValue={propuesta.acuerdosContenido} className="campo mt-2 text-sm" />
            </section>

            <section>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Acciones a realizar · {propuesta.entregables.length} tipo(s), {totalPiezas} pieza(s)</h3>
                <span className="text-xs text-tinta-3">Cada tipo genera tantas tareas como su cantidad, con fechas según periodicidad.</span>
              </div>
              {propuesta.entregables.length === 0 ? (
                <p className="text-sm text-tinta-3">No identificó entregables.</p>
              ) : (
                <div className="space-y-2">
                  {propuesta.entregables.map((e, i) => (
                    <div key={i} className="grid grid-cols-[auto_1fr] gap-3 rounded-md border border-linea px-3 py-2">
                      <Casilla nombre={`e${i}_incluir`} />
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_5rem_8rem_9rem]">
                        <label>
                          <span className={etiqueta}>Entregable</span>
                          <input name={`e${i}_descripcion`} defaultValue={e.descripcion} className={campo} />
                        </label>
                        <label>
                          <span className={etiqueta}>Cantidad</span>
                          <input name={`e${i}_cantidad`} type="number" min={1} max={60} defaultValue={e.cantidad} className={campo} />
                        </label>
                        <label>
                          <span className={etiqueta}>Cada</span>
                          <select name={`e${i}_periodicidad`} defaultValue={e.periodicidad} className={campo}>
                            <option value="UNICA">Una sola vez</option>
                            <option value="SEMANA">Semana</option>
                            <option value="QUINCENA">Quincena</option>
                            <option value="MES">Mes</option>
                          </select>
                        </label>
                        <label>
                          <span className={etiqueta}>Primera fecha</span>
                          <input name={`e${i}_fechaInicio`} type="date" defaultValue={e.fechaInicio ?? ""} className={campo} />
                        </label>
                        {e.detalle ? <p className="text-xs text-tinta-3 sm:col-span-4">{e.detalle}</p> : null}
                      </div>
                    </div>
                  ))}
                  <div className="grid grid-cols-1 gap-3 rounded-md border border-dashed border-linea-fuerte px-3 py-3 sm:grid-cols-2">
                    <Seleccion nombre="asignadoAId" etiqueta="Quién produce estas acciones" opciones={produccion.map((u) => ({ valor: u.id, texto: u.nombre }))} vacio="Asignar después" />
                    <Seleccion nombre="editorId" etiqueta="Quién edita" opciones={produccion.map((u) => ({ valor: u.id, texto: u.nombre }))} vacio="Asignar después" />
                    <p className="text-xs text-tinta-3 sm:col-span-2">Las acciones nacen «por autorizar»: tú las liberas a producción con un clic desde el contrato.</p>
                  </div>
                </div>
              )}
            </section>

            <section>
              <h3 className="mb-2 text-sm font-semibold">Fechas clave · {propuesta.fechasClave.length}</h3>
              {propuesta.fechasClave.length === 0 ? (
                <p className="text-sm text-tinta-3">No identificó fechas clave.</p>
              ) : (
                <div className="space-y-2">
                  {propuesta.fechasClave.map((k, i) => (
                    <div key={i} className="grid grid-cols-[auto_1fr_10rem] gap-3 rounded-md border border-linea px-3 py-2">
                      <Casilla nombre={`k${i}_incluir`} />
                      <input name={`k${i}_descripcion`} defaultValue={k.descripcion} className={campo} />
                      <input name={`k${i}_fecha`} type="date" defaultValue={k.fecha} className={campo} />
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Pagos · {propuesta.hitosCobro.length}</h3>
                {tieneHitos ? <span className="text-xs text-alerta">El contrato ya tiene hitos de cobro; revisa que no se dupliquen.</span> : null}
              </div>
              {propuesta.hitosCobro.length === 0 ? (
                <p className="text-sm text-tinta-3">No identificó calendario de cobro.</p>
              ) : (
                <div className="space-y-2">
                  {propuesta.hitosCobro.map((h, i) => (
                    <div key={i} className="grid grid-cols-[auto_1fr_9rem_10rem] gap-3 rounded-md border border-linea px-3 py-2">
                      <Casilla nombre={`h${i}_incluir`} defecto={!tieneHitos} />
                      <input name={`h${i}_concepto`} defaultValue={h.concepto} className={campo} />
                      <input name={`h${i}_importe`} type="number" min={0} defaultValue={h.importe ?? ""} placeholder="Importe sin IVA" className={campo} />
                      <input name={`h${i}_fecha`} type="date" defaultValue={h.fecha ?? ""} className={campo} />
                    </div>
                  ))}
                  <p className="text-xs text-tinta-3">Los pagos entran como hitos de cobro «por confirmar» y aparecen en Pagos y en el calendario.</p>
                </div>
              )}
            </section>

            {propuesta.advertencias.length ? (
              <section className="rounded-md border border-alerta/30 bg-alerta-suave px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-alerta">Confirmar contra el documento</div>
                <ul className="mt-1 list-disc pl-4 text-xs text-tinta-2">{propuesta.advertencias.map((a, i) => <li key={i}>{a}</li>)}</ul>
              </section>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-linea px-6 py-4">
            <button type="submit" formAction={descartarPropuesta.bind(null, contratoId)} className="text-sm text-tinta-3 hover:text-riesgo hover:underline">Descartar la lectura</button>
            <div className="flex items-center gap-3">
              {r?.error ? <span className="text-sm text-riesgo">{r.error}</span> : null}
              <button type="submit" disabled={pendiente} className="inline-flex h-10 items-center rounded-md border border-acento bg-acento px-5 text-sm font-medium text-white shadow-sm hover:bg-acento-2 disabled:opacity-60">
                {pendiente ? "Aplicando…" : "Aprobar y agregar lo marcado"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
