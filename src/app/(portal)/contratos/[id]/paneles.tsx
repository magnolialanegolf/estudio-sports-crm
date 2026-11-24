"use client";

import { useState } from "react";
import type { Compromiso, HitoCobro } from "@prisma/client";
import { cambiarEstadoCompromiso, eliminarCompromiso, eliminarHito, guardarCompromiso, guardarHito } from "@/actions/contratos";
import { Formulario } from "@/components/formularios";
import { Area, Casilla, Entrada, Fecha, OPCIONES, Seleccion } from "@/components/campos";

function Dialogo({ titulo, abierto, cerrar, children }: { titulo: string; abierto: boolean; cerrar: () => void; children: React.ReactNode }) {
  if (!abierto) return null;
  return (
    <div className="fixed inset-0 z-30 flex items-start justify-center overflow-y-auto bg-black/30 px-4 py-10" onClick={cerrar}>
      <div className="w-full max-w-2xl rounded-lg border border-linea bg-superficie shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-linea px-5 py-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-tinta-2">{titulo}</h3>
          <button type="button" onClick={cerrar} className="text-sm text-tinta-3 hover:text-tinta">Cerrar</button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

function BotonPanel({ onClick, children, tono = "neutro" }: { onClick: () => void; children: React.ReactNode; tono?: "neutro" | "primario" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`no-imprimir rounded border px-2.5 py-1 text-xs font-medium ${tono === "primario" ? "border-acento bg-acento text-white" : "border-linea-fuerte bg-superficie text-tinta hover:bg-superficie-2"}`}
    >
      {children}
    </button>
  );
}

export function PanelHito({ contratoId, hito, textoBoton }: { contratoId: string; hito?: HitoCobro; textoBoton: string }) {
  const [abierto, setAbierto] = useState(false);
  const accion = guardarHito.bind(null, contratoId, hito?.id ?? null);
  return (
    <>
      <BotonPanel onClick={() => setAbierto(true)} tono={hito ? "neutro" : "primario"}>{textoBoton}</BotonPanel>
      <Dialogo titulo={hito ? "Editar hito de cobro" : "Nuevo hito de cobro"} abierto={abierto} cerrar={() => setAbierto(false)}>
        <Formulario accion={accion} alGuardar={() => setAbierto(false)}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Entrada nombre="concepto" etiqueta="Concepto" valor={hito?.concepto} requerido className="sm:col-span-2" placeholder="Primer 50 %, Mensualidad 3 de 12…" />
            <Entrada nombre="importe" etiqueta="Importe sin IVA" valor={hito?.importe} tipo="number" paso="1" requerido />
            <Seleccion nombre="modalidad" etiqueta="Modalidad" valor={hito?.modalidad ?? "EFECTIVO"} opciones={OPCIONES.modalidad} />
            <Fecha nombre="fechaFacturar" etiqueta="Fecha a facturar" valor={hito?.fechaFacturar} />
            <Entrada nombre="fechaOrientativa" etiqueta="Fecha orientativa (texto)" valor={hito?.fechaOrientativa} placeholder="Febrero 2027" />
            <Seleccion nombre="estadoFactura" etiqueta="Estado de factura" valor={hito?.estadoFactura ?? "POR_EMITIR"} opciones={OPCIONES.estadoFactura} />
            <Entrada nombre="folioFactura" etiqueta="Folio de factura" valor={hito?.folioFactura} />
            <Seleccion nombre="estadoPago" etiqueta="Estado de pago" valor={hito?.estadoPago ?? "POR_COBRAR"} opciones={OPCIONES.estadoPago} />
            <Entrada nombre="montoRecibido" etiqueta="Monto recibido" valor={hito?.montoRecibido ?? 0} tipo="number" paso="1" />
            <Fecha nombre="fechaPago" etiqueta="Fecha de pago" valor={hito?.fechaPago} />
            <div className="flex items-end">
              <Casilla nombre="confirmado" etiqueta="Dato confirmado" valor={hito?.confirmado} ayuda="Respaldado por factura o comprobante." />
            </div>
            <Area nombre="notas" etiqueta="Notas" valor={hito?.notas} filas={2} className="sm:col-span-2" />
          </div>
        </Formulario>
      </Dialogo>
    </>
  );
}

export function BorrarHito({ hitoId }: { hitoId: string }) {
  return (
    <form
      action={eliminarHito.bind(null, hitoId)}
      onSubmit={(e) => {
        if (!window.confirm("¿Eliminar este hito de cobro?")) e.preventDefault();
      }}
    >
      <button type="submit" className="no-imprimir text-xs text-riesgo hover:underline">Eliminar</button>
    </form>
  );
}

type Asignable = { id: string; nombre: string; rol: string };

export function PanelCompromiso({ contratoId, compromiso, textoBoton, asignables }: { contratoId: string; compromiso?: Compromiso; textoBoton: string; asignables: Asignable[] }) {
  const [abierto, setAbierto] = useState(false);
  const accion = guardarCompromiso.bind(null, contratoId, compromiso?.id ?? null);
  const etiquetaRol: Record<string, string> = { PRODUCCION: "producción", CONTENIDOS: "contenidos", OPERATIVO: "operativo", ADMIN_GENERAL: "dirección", GERENTE_GENERAL: "gerencia", DIRECTOR: "director", ASISTENTE_COMERCIAL: "asistente" };
  return (
    <>
      <BotonPanel onClick={() => setAbierto(true)} tono={compromiso ? "neutro" : "primario"}>{textoBoton}</BotonPanel>
      <Dialogo titulo={compromiso ? "Editar compromiso" : "Nuevo compromiso"} abierto={abierto} cerrar={() => setAbierto(false)}>
        <Formulario accion={accion} alGuardar={() => setAbierto(false)}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Entrada nombre="descripcion" etiqueta="Descripción" valor={compromiso?.descripcion} requerido className="sm:col-span-2" placeholder="Mención en redes, presencia en evento, contenido para pódcast…" />
            <Seleccion nombre="tipo" etiqueta="Tipo" valor={compromiso?.tipo ?? "ENTREGABLE"} opciones={OPCIONES.tipoCompromiso} />
            <Seleccion nombre="estado" etiqueta="Estado" valor={compromiso?.estado ?? "PENDIENTE"} opciones={OPCIONES.estadoCompromiso} />
            <Fecha nombre="fecha" etiqueta="Fecha compromiso" valor={compromiso?.fecha} />
            <Seleccion
              nombre="asignadoAId"
              etiqueta="Responsable (usuario del portal)"
              valor={compromiso?.asignadoAId}
              opciones={asignables.map((u) => ({ valor: u.id, texto: `${u.nombre} · ${etiquetaRol[u.rol] ?? u.rol}` }))}
              vacio="Sin asignar"
              ayuda="La persona asignada lo ve en sus tareas y lo reporta."
            />
            <Entrada nombre="responsable" etiqueta="Responsable externo (texto)" valor={compromiso?.responsable} placeholder="Talento, agencia, la marca…" />
            {!compromiso ? (
              <div className="grid grid-cols-2 gap-3 rounded border border-linea bg-superficie-2 p-3 sm:col-span-2">
                <Entrada nombre="repetirCantidad" etiqueta="Repetir · cantidad" tipo="number" paso="1" placeholder="4" ayuda="Genera varias tareas a partir de la fecha." />
                <Seleccion nombre="repetirCada" etiqueta="Repetir · cada" opciones={[{ valor: "SEMANA", texto: "Semana" }, { valor: "QUINCENA", texto: "Quincena" }, { valor: "MES", texto: "Mes" }]} vacio="No repetir" />
              </div>
            ) : null}
            <Area nombre="notas" etiqueta="Instrucciones" valor={compromiso?.notas} filas={2} className="sm:col-span-2" ayuda="Lo que la persona responsable necesita saber para ejecutar." />
          </div>
        </Formulario>
      </Dialogo>
    </>
  );
}

export function AccionesCompromiso({ compromisoId, estado }: { compromisoId: string; estado: string }) {
  const abierto = estado === "PENDIENTE" || estado === "EN_CURSO" || estado === "REQUIERE_ATENCION";
  return (
    <div className="no-imprimir flex items-center gap-2">
      {abierto ? (
        <form action={cambiarEstadoCompromiso.bind(null, compromisoId, "CUMPLIDO")}>
          <button type="submit" className="rounded border border-ok/40 px-2.5 py-1 text-xs font-medium text-ok hover:bg-ok-suave">Marcar cumplido</button>
        </form>
      ) : (
        <form action={cambiarEstadoCompromiso.bind(null, compromisoId, "PENDIENTE")}>
          <button type="submit" className="rounded border border-linea-fuerte px-2.5 py-1 text-xs font-medium text-tinta-2 hover:bg-superficie-2">Reabrir</button>
        </form>
      )}
      <form
        action={eliminarCompromiso.bind(null, compromisoId)}
        onSubmit={(e) => {
          if (!window.confirm("¿Eliminar este compromiso?")) e.preventDefault();
        }}
      >
        <button type="submit" className="text-xs text-riesgo hover:underline">Eliminar</button>
      </form>
    </div>
  );
}
