"use client";

import { useState } from "react";
import { autorizarCobro, registrarPagoCobro, solicitarAutorizacion } from "@/actions/cobros";
import { Formulario } from "@/components/formularios";
import { Entrada, Fecha } from "@/components/campos";

function Dialogo({ titulo, abierto, cerrar, children }: { titulo: string; abierto: boolean; cerrar: () => void; children: React.ReactNode }) {
  if (!abierto) return null;
  return (
    <div className="fixed inset-0 z-30 flex items-start justify-center overflow-y-auto bg-black/30 px-4 py-10" onClick={cerrar}>
      <div className="w-full max-w-xl rounded-lg border border-linea bg-superficie shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-linea px-5 py-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-tinta-2">{titulo}</h3>
          <button type="button" onClick={cerrar} className="text-sm text-tinta-3 hover:text-tinta">Cerrar</button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

const boton = "no-imprimir rounded border px-2.5 py-1 text-xs font-medium";

// Director: adjunta factura y solicita autorización.
export function PanelSolicitud({ hitoId, fechaFacturar, folio }: { hitoId: string; fechaFacturar: Date | null; folio: string | null }) {
  const [abierto, setAbierto] = useState(false);
  const accion = solicitarAutorizacion.bind(null, hitoId);
  return (
    <>
      <button type="button" onClick={() => setAbierto(true)} className={`${boton} border-acento bg-acento text-white`}>Facturar y solicitar</button>
      <Dialogo titulo="Factura y solicitud de autorización" abierto={abierto} cerrar={() => setAbierto(false)}>
        <Formulario accion={accion} textoBoton="Solicitar autorización" alGuardar={() => setAbierto(false)}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Entrada nombre="folio" etiqueta="Folio de factura" valor={folio} />
            <Fecha nombre="fechaFacturar" etiqueta="Fecha de facturación" valor={fechaFacturar ?? new Date()} />
            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-tinta-3">Factura PDF</span>
              <input name="facturaPdf" type="file" accept="application/pdf" className="campo !py-1.5 text-sm" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-tinta-3">Factura XML (CFDI)</span>
              <input name="facturaXml" type="file" accept=".xml,application/xml,text/xml" className="campo !py-1.5 text-sm" />
            </label>
          </div>
          <p className="text-xs text-tinta-3">Dirección recibe el aviso y autoriza. Si ya adjuntaste la factura en el contrato, puedes solicitar sin volver a subirla.</p>
        </Formulario>
      </Dialogo>
    </>
  );
}

// Administrador general: autoriza o regresa.
export function Autorizar({ hitoId }: { hitoId: string }) {
  const [regresar, setRegresar] = useState(false);
  return (
    <div className="no-imprimir flex flex-col items-end gap-1">
      <form action={autorizarCobro.bind(null, hitoId, "autorizar")}>
        <button type="submit" className={`${boton} border-ok/40 text-ok hover:bg-ok-suave`}>Autorizar</button>
      </form>
      {regresar ? (
        <form action={autorizarCobro.bind(null, hitoId, "regresar")} className="flex items-center gap-1">
          <input name="motivo" placeholder="Motivo" className="campo !w-40 !py-1 text-xs" />
          <button type="submit" className={`${boton} border-riesgo/40 text-riesgo`}>Regresar</button>
        </form>
      ) : (
        <button type="button" onClick={() => setRegresar(true)} className="text-xs text-tinta-3 hover:underline">Regresar al director</button>
      )}
    </div>
  );
}

// Pagos: registra el pago con comprobante.
export function PanelPagoRecibido({ hitoId, pendiente }: { hitoId: string; pendiente: number }) {
  const [abierto, setAbierto] = useState(false);
  const accion = registrarPagoCobro.bind(null, hitoId);
  return (
    <>
      <button type="button" onClick={() => setAbierto(true)} className={`${boton} border-acento bg-acento text-white`}>Registrar pago</button>
      <Dialogo titulo="Registrar pago recibido" abierto={abierto} cerrar={() => setAbierto(false)}>
        <Formulario accion={accion} textoBoton="Marcar pagado" alGuardar={() => setAbierto(false)}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Entrada nombre="monto" etiqueta="Monto recibido" valor={pendiente} tipo="number" paso="1" requerido />
            <Fecha nombre="fecha" etiqueta="Fecha de pago" valor={new Date()} requerido />
            <Entrada nombre="folio" etiqueta="Folio de factura" placeholder="Si cambió" />
            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-tinta-3">Comprobante (PDF o imagen)</span>
              <input name="comprobante" type="file" accept="application/pdf,image/png,image/jpeg" className="campo !py-1.5 text-sm" />
            </label>
          </div>
          <p className="text-xs text-tinta-3">El pago queda confirmado y visible para el director y dirección.</p>
        </Formulario>
      </Dialogo>
    </>
  );
}
