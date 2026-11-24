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
        {estado.cargando ? "Leyendo el contrato…" : "Leer con IA"}
      </button>
      {estado.error ? <span className="text-xs text-riesgo">{estado.error}</span> : null}
    </span>
  );
}

type Asignable = { id: string; nombre: string; rol: string };

function Caja({ nombre, etiqueta, defecto = true, ayuda }: { nombre: string; etiqueta: string; defecto?: boolean; ayuda?: string }) {
  return (
    <label className="flex items-start gap-2 text-sm">
      <input type="checkbox" name={nombre} defaultChecked={defecto} className="mt-1 h-4 w-4 accent-[var(--acento)]" />
      <span>
        {etiqueta}
        {ayuda ? <span className="block text-xs text-tinta-3">{ayuda}</span> : null}
      </span>
    </label>
  );
}

export function PanelPropuesta({ contratoId, propuesta, fechaPropuesta, tieneHitos, asignables }: { contratoId: string; propuesta: PropuestaIa; fechaPropuesta: string; tieneHitos: boolean; asignables: Asignable[] }) {
  const accion = aplicarPropuesta.bind(null, contratoId);
  const [r, despachar, pendiente] = useActionState<Resultado, FormData>(accion, undefined);
  return (
    <section className="tarjeta rounded-xl border border-acento/30 bg-acento-suave/40">
      <div className="flex items-start justify-between gap-3 border-b border-acento/20 px-5 py-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-acento">Lectura del contrato · propuesta para aprobar</h2>
          <p className="mt-0.5 text-xs text-tinta-2">Generada el {fechaPropuesta}. Nada se aplica hasta que lo apruebes. Revisa contra el documento.</p>
        </div>
        <form action={descartarPropuesta.bind(null, contratoId)}>
          <button type="submit" className="text-xs text-tinta-3 hover:text-riesgo hover:underline">Descartar</button>
        </form>
      </div>
      <div className="grid grid-cols-1 gap-5 px-5 py-4 xl:grid-cols-2">
        <div className="space-y-4 text-sm">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-tinta-3">Resumen</div>
            <p className="mt-0.5 text-tinta">{propuesta.resumen}</p>
            <p className="mt-1 text-xs text-tinta-2">
              {propuesta.marca ? `Marca: ${propuesta.marca} · ` : ""}{propuesta.talento ? `Talento: ${propuesta.talento} · ` : ""}Vigencia: {propuesta.inicio ?? "—"} → {propuesta.vencimiento ?? "—"}{propuesta.montoSinIva ? ` · Monto sin IVA: $${propuesta.montoSinIva.toLocaleString("es-MX")}` : ""}
            </p>
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-tinta-3">Acuerdos de contenido (para producción)</div>
            <p className="mt-0.5 whitespace-pre-line rounded border border-linea bg-superficie px-3 py-2 text-tinta">{propuesta.acuerdosContenido}</p>
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-tinta-3">Entregables detectados</div>
            {propuesta.entregables.length === 0 ? (
              <p className="text-xs text-tinta-3">Ninguno.</p>
            ) : (
              <ul className="mt-1 divide-y divide-linea/70 rounded border border-linea bg-superficie">
                {propuesta.entregables.map((e, i) => (
                  <li key={i} className="px-3 py-1.5">
                    <span className="font-medium">{e.descripcion}</span> · {e.cantidad} {e.periodicidad === "UNICA" ? "vez" : `cada ${e.periodicidad === "SEMANA" ? "semana" : e.periodicidad === "QUINCENA" ? "quincena" : "mes"}`}{e.fechaInicio ? ` desde ${e.fechaInicio}` : ""}
                    {e.detalle ? <div className="text-xs text-tinta-3">{e.detalle}</div> : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
          {propuesta.fechasClave.length ? (
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-tinta-3">Fechas clave</div>
              <ul className="mt-1 text-xs text-tinta-2">{propuesta.fechasClave.map((k, i) => <li key={i}>{k.fecha} · {k.descripcion}</li>)}</ul>
            </div>
          ) : null}
          {propuesta.hitosCobro.length ? (
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-tinta-3">Calendario de cobro detectado</div>
              <ul className="mt-1 text-xs text-tinta-2">{propuesta.hitosCobro.map((h, i) => <li key={i}>{h.fecha ?? "sin fecha"} · {h.concepto}{h.importe ? ` · $${h.importe.toLocaleString("es-MX")}` : ""}</li>)}</ul>
            </div>
          ) : null}
          {propuesta.advertencias.length ? (
            <div className="rounded border border-alerta/30 bg-alerta-suave px-3 py-2">
              <div className="text-xs font-medium uppercase tracking-wide text-alerta">Confirmar contra el documento</div>
              <ul className="mt-1 list-disc pl-4 text-xs text-tinta-2">{propuesta.advertencias.map((a, i) => <li key={i}>{a}</li>)}</ul>
            </div>
          ) : null}
        </div>
        <form action={despachar} className="space-y-3 self-start rounded-lg border border-linea bg-superficie p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-tinta-2">Qué aplicar</div>
          <Caja nombre="brief" etiqueta="Acuerdos de contenido" ayuda="Sustituye el campo que ve producción." />
          <Caja nombre="datos" etiqueta="Datos del contrato que falten" ayuda="Talento, vigencia y monto solo si están vacíos." />
          <Caja nombre="entregables" etiqueta={`Crear ${propuesta.entregables.reduce((a, e) => a + e.cantidad, 0)} entregables como tareas`} ayuda="Con fechas según cantidad y periodicidad." />
          <Caja nombre="fechas" etiqueta={`Crear ${propuesta.fechasClave.length} fechas clave`} defecto={propuesta.fechasClave.length > 0} />
          <Caja nombre="hitos" etiqueta={`Crear ${propuesta.hitosCobro.length} hitos de cobro`} defecto={false} ayuda={tieneHitos ? "El contrato ya tiene hitos; no se crean." : "Quedan marcados por confirmar."} />
          <Seleccion nombre="asignadoAId" etiqueta="Asignar entregables a" opciones={asignables.map((u) => ({ valor: u.id, texto: u.nombre }))} vacio="Sin asignar" />
          {r?.error ? <p className="rounded border border-riesgo/30 bg-riesgo-suave px-3 py-2 text-sm text-riesgo">{r.error}</p> : null}
          <button type="submit" disabled={pendiente} className="inline-flex h-9 w-full items-center justify-center rounded-md border border-acento bg-acento text-sm font-medium text-white shadow-sm hover:bg-acento-2 disabled:opacity-60">
            {pendiente ? "Aplicando…" : "Aprobar y aplicar"}
          </button>
        </form>
      </div>
    </section>
  );
}
