"use client";

import { useState } from "react";
import type { Compromiso, HitoCobro } from "@prisma/client";
import { cambiarEstadoCompromiso, eliminarCompromiso, eliminarHito, guardarCompromiso, guardarHito, registrarPago } from "@/actions/contratos";
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

export function PanelPago({ hitoId, pendiente }: { hitoId: string; pendiente: number }) {
  const [abierto, setAbierto] = useState(false);
  const accion = registrarPago.bind(null, hitoId);
  return (
    <>
      <BotonPanel onClick={() => setAbierto(true)} tono="primario">Registrar pago</BotonPanel>
      <Dialogo titulo="Registrar pago recibido" abierto={abierto} cerrar={() => setAbierto(false)}>
        <form
          action={async (fd) => {
            await accion(fd);
            setAbierto(false);
          }}
          className="space-y-3"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Entrada nombre="monto" etiqueta="Monto recibido" valor={pendiente} tipo="number" paso="1" requerido />
            <Fecha nombre="fecha" etiqueta="Fecha de pago" valor={new Date()} />
            <Entrada nombre="folio" etiqueta="Folio de factura" placeholder="Opcional" />
          </div>
          <div className="flex justify-end">
            <button type="submit" className="rounded border border-acento bg-acento px-3.5 py-2 text-sm font-medium text-white">Registrar</button>
          </div>
        </form>
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

export function PanelCompromiso({ contratoId, compromiso, textoBoton }: { contratoId: string; compromiso?: Compromiso; textoBoton: string }) {
  const [abierto, setAbierto] = useState(false);
  const accion = guardarCompromiso.bind(null, contratoId, compromiso?.id ?? null);
  return (
    <>
      <BotonPanel onClick={() => setAbierto(true)} tono={compromiso ? "neutro" : "primario"}>{textoBoton}</BotonPanel>
      <Dialogo titulo={compromiso ? "Editar compromiso" : "Nuevo compromiso"} abierto={abierto} cerrar={() => setAbierto(false)}>
        <Formulario accion={accion} alGuardar={() => setAbierto(false)}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Entrada nombre="descripcion" etiqueta="Descripción" valor={compromiso?.descripcion} requerido className="sm:col-span-2" placeholder="Dos menciones en redes al mes, presencia en evento…" />
            <Seleccion nombre="tipo" etiqueta="Tipo" valor={compromiso?.tipo ?? "ENTREGABLE"} opciones={OPCIONES.tipoCompromiso} />
            <Seleccion nombre="estado" etiqueta="Estado" valor={compromiso?.estado ?? "PENDIENTE"} opciones={OPCIONES.estadoCompromiso} />
            <Fecha nombre="fecha" etiqueta="Fecha compromiso" valor={compromiso?.fecha} />
            <Entrada nombre="responsable" etiqueta="Responsable" valor={compromiso?.responsable} placeholder="Talento, director, marca…" />
            <Area nombre="notas" etiqueta="Notas" valor={compromiso?.notas} filas={2} className="sm:col-span-2" />
          </div>
        </Formulario>
      </Dialogo>
    </>
  );
}

export function AccionesCompromiso({ compromisoId, estado }: { compromisoId: string; estado: string }) {
  const abierto = estado === "PENDIENTE" || estado === "EN_CURSO";
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
