"use client";

import { useState } from "react";
import type { Contacto } from "@prisma/client";
import { eliminarContacto, guardarContacto } from "@/actions/marcas";
import { Formulario } from "@/components/formularios";
import { Area, Entrada, Fecha } from "@/components/campos";

export function PanelContacto({ marcaId, contacto, textoBoton }: { marcaId: string; contacto?: Contacto; textoBoton: string }) {
  const [abierto, setAbierto] = useState(false);
  const accion = guardarContacto.bind(null, marcaId, contacto?.id ?? null);
  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className={`no-imprimir rounded border px-2.5 py-1 text-xs font-medium ${contacto ? "border-linea-fuerte bg-superficie text-tinta hover:bg-superficie-2" : "border-acento bg-acento text-white"}`}
      >
        {textoBoton}
      </button>
      {abierto ? (
        <div className="fixed inset-0 z-30 flex items-start justify-center overflow-y-auto bg-black/30 px-4 py-10" onClick={() => setAbierto(false)}>
          <div className="w-full max-w-xl rounded-lg border border-linea bg-superficie shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-linea px-5 py-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-tinta-2">{contacto ? "Editar contacto" : "Nuevo contacto"}</h3>
              <button type="button" onClick={() => setAbierto(false)} className="text-sm text-tinta-3 hover:text-tinta">Cerrar</button>
            </div>
            <div className="px-5 py-4">
              <Formulario accion={accion} alGuardar={() => setAbierto(false)}>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Entrada nombre="nombre" etiqueta="Nombre" valor={contacto?.nombre} requerido className="sm:col-span-2" />
                  <Entrada nombre="cargo" etiqueta="Cargo" valor={contacto?.cargo} />
                  <Entrada nombre="canalPreferido" etiqueta="Canal preferido" valor={contacto?.canalPreferido} placeholder="Correo, WhatsApp, llamada…" />
                  <Entrada nombre="correo" etiqueta="Correo" valor={contacto?.correo} tipo="email" />
                  <Entrada nombre="telefono" etiqueta="Teléfono" valor={contacto?.telefono} />
                  <Fecha nombre="ultimaInteraccion" etiqueta="Última interacción" valor={contacto?.ultimaInteraccion} />
                  <Area nombre="notas" etiqueta="Notas" valor={contacto?.notas} filas={2} className="sm:col-span-2" />
                </div>
              </Formulario>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function BorrarContacto({ contactoId }: { contactoId: string }) {
  return (
    <form
      action={eliminarContacto.bind(null, contactoId)}
      onSubmit={(e) => {
        if (!window.confirm("¿Eliminar este contacto?")) e.preventDefault();
      }}
    >
      <button type="submit" className="no-imprimir text-xs text-riesgo hover:underline">Eliminar</button>
    </form>
  );
}
