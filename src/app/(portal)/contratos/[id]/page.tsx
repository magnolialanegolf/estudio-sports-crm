import Link from "next/link";
import { notFound } from "next/navigation";
import { startOfDay } from "date-fns";
import { db } from "@/lib/db";
import { autorizaContrato, puedeCapturar, requerirSesion, veComisionesDeTodos, veTodo } from "@/lib/acceso";
import { reglasPara } from "@/lib/consultas";
import { comisionesPorHito, comisionProyectada } from "@/lib/comisiones";
import { dinero, etiqueta, fecha, fechaLarga, diasHasta, textoDias, porcentaje } from "@/lib/formato";
import { Aviso, Boton, Cifra, Definicion, Etiqueta, Pagina, PorConfirmar, Tabla, Tarjeta, Td, Th, Vacio } from "@/components/ui";
import { Anillo } from "@/components/graficas";
import { LineaTiempo } from "./linea-tiempo";
import { PanelHito, PanelCompromiso, PanelPago, AccionesCompromiso, BorrarHito } from "./paneles";

export default async function DetalleContrato({ params }: { params: Promise<{ id: string }> }) {
  const s = await requerirSesion();
  const { id } = await params;
  const c = await db.contrato.findUnique({
    where: { id },
    include: {
      marca: true,
      director: true,
      hitos: { orderBy: [{ fechaFacturar: "asc" }, { creadoEn: "asc" }] },
      compromisos: { orderBy: [{ estado: "asc" }, { fecha: "asc" }] },
      renovacionDe: { select: { id: true, codigo: true, proyecto: true } },
      renovacion: { select: { id: true, codigo: true, proyecto: true, estado: true } },
    },
  });
  if (!c || !autorizaContrato(s, c)) notFound();

  const hoy = startOfDay(new Date());
  const cobrado = c.hitos.reduce((a, h) => a + h.montoRecibido, 0);
  const cobradoConfirmado = c.hitos.filter((h) => h.confirmado).reduce((a, h) => a + h.montoRecibido, 0);
  const pendiente = c.hitos.reduce((a, h) => a + Math.max(h.importe - h.montoRecibido, 0), 0);
  const programado = c.hitos.reduce((a, h) => a + h.importe, 0);
  const diferencia = c.monto !== null ? programado - c.monto : null;
  const dias = diasHasta(c.vencimiento, hoy);
  const puedeEditar = puedeCapturar(s);
  const veComision = s.rol === "DIRECTOR" || veComisionesDeTodos(s);

  const reglas = veComision ? await reglasPara(s, c.directorId) : [];
  const ctx = { id: c.id, directorId: c.directorId, marcaId: c.marcaId, tipo: c.tipo, inicio: c.inicio };
  const comisiones = veComision ? comisionesPorHito(c.hitos.map((h) => ({ ...h, contrato: ctx })), reglas) : [];
  const comisionDevengada = comisiones.reduce((a, k) => a + k.comision, 0);
  const comisionProyectadaTotal = veComision ? c.hitos.reduce((a, h) => a + comisionProyectada(h, ctx, reglas), 0) : 0;
  const sinRegla = comisiones.some((k) => !k.regla);

  return (
    <Pagina
      titulo={`${c.marca.nombre} · ${c.proyecto}`}
      subtitulo={
        <span className="flex flex-wrap items-center gap-2">
          <span>{c.codigo}</span>
          <Etiqueta tono={c.estado === "VIGENTE" ? "ok" : c.estado === "PENDIENTE_FIRMA" ? "alerta" : c.estado === "PROPUESTA" ? "acento" : "neutro"}>{etiqueta("estadoContrato", c.estado)}</Etiqueta>
          <Etiqueta>{etiqueta("tipo", c.tipo)}</Etiqueta>
          {veTodo(s) ? <span className="text-tinta-3">· {c.director.nombre}</span> : null}
        </span>
      }
      acciones={
        <>
          <Boton href={`/marcas/${c.marcaId}`}>Ver marca</Boton>
          {puedeEditar && c.estado === "VIGENTE" && !c.renovacion ? <Boton href={`/contratos/nuevo?renueva=${c.id}`}>Preparar renovación</Boton> : null}
          {puedeEditar ? <Boton href={`/contratos/${c.id}/editar`} tipo="primario">Editar</Boton> : null}
        </>
      }
    >
      {c.observaciones ? (
        <div className="mb-5">
          <Aviso tono="alerta">
            <strong>Por conciliar:</strong> {c.observaciones}
          </Aviso>
        </div>
      ) : null}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Cifra etiqueta="Monto sin IVA" valor={dinero(c.monto)} nota={<PorConfirmar confirmado={c.montoConfirmado} />} />
        <Cifra etiqueta="Cobrado" valor={dinero(cobrado)} tono="ok" nota={cobradoConfirmado !== cobrado ? `${dinero(cobradoConfirmado)} con respaldo` : "Todo con respaldo"} />
        <Cifra etiqueta="Pendiente de cobro" valor={dinero(pendiente)} tono={pendiente > 0 ? "acento" : "neutro"} />
        <Cifra
          etiqueta="Vencimiento"
          valor={<span className="text-lg">{fecha(c.vencimiento)}</span>}
          tono={c.estado === "VIGENTE" && dias !== null && dias <= 30 ? "riesgo" : c.estado === "VIGENTE" && dias !== null && dias <= 90 ? "alerta" : "neutro"}
          nota={c.estado === "VIGENTE" ? textoDias(dias) : etiqueta("estadoContrato", c.estado)}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Tarjeta titulo="Datos del contrato" className="xl:col-span-2">
          <Definicion
            items={[
              { k: "Marca", v: <Link href={`/marcas/${c.marcaId}`} className="text-acento hover:underline">{c.marca.nombre}</Link> },
              { k: "Director", v: c.director.nombre },
              { k: "Inicio", v: <span className="flex gap-2">{fechaLarga(c.inicio)} <PorConfirmar confirmado={c.inicioConfirmado} /></span> },
              { k: "Vencimiento", v: <span className="flex gap-2">{fechaLarga(c.vencimiento)} <PorConfirmar confirmado={c.vencimientoConfirmado} /></span> },
              { k: "Duración", v: c.duracionMeses ? `${c.duracionMeses} meses` : "Por definir" },
              { k: "Talento", v: c.talento ?? "—" },
              { k: "Documento firmado", v: c.documentoUrl ? <a href={c.documentoUrl} className="text-acento hover:underline" target="_blank" rel="noreferrer">Abrir</a> : <span className="text-tinta-3">Sin liga registrada</span> },
              {
                k: "Renovación",
                v: c.renovacion ? (
                  <Link href={`/contratos/${c.renovacion.id}`} className="text-acento hover:underline">{c.renovacion.proyecto} · {etiqueta("estadoContrato", c.renovacion.estado)}</Link>
                ) : c.renovacionDe ? (
                  <span>Renueva a <Link href={`/contratos/${c.renovacionDe.id}`} className="text-acento hover:underline">{c.renovacionDe.proyecto}</Link></span>
                ) : (
                  <span className="text-tinta-3">Sin renovación registrada</span>
                ),
              },
            ]}
          />
          {c.notas ? <p className="mt-4 whitespace-pre-line text-sm text-tinta-2">{c.notas}</p> : null}
        </Tarjeta>

        <Tarjeta titulo="Avance">
          <Anillo fraccion={c.monto ? cobrado / c.monto : 0} etiqueta={`Cobrado sobre ${dinero(c.monto)}`} tono="ok" />
          <div className="mt-4 space-y-1 text-sm">
            <div className="flex justify-between gap-3"><span className="text-tinta-2">Programado en hitos</span><span className="tabular whitespace-nowrap">{dinero(programado)}</span></div>
            {diferencia !== null && diferencia !== 0 ? (
              <div className="flex justify-between gap-3 text-alerta"><span>Diferencia contra monto</span><span className="tabular">{diferencia > 0 ? "+" : ""}{dinero(diferencia)}</span></div>
            ) : null}
            {veComision ? (
              <>
                <div className="mt-3 flex justify-between gap-3 border-t border-linea pt-2"><span className="text-tinta-2">Comisión devengada</span><span className="tabular whitespace-nowrap font-medium">{dinero(comisionDevengada)}</span></div>
                <div className="flex justify-between gap-3"><span className="text-tinta-2">Comisión por cobrar</span><span className="tabular whitespace-nowrap">{dinero(comisionProyectadaTotal)}</span></div>
                {sinRegla ? <Etiqueta tono="riesgo">Hay cobros sin regla de comisión</Etiqueta> : null}
              </>
            ) : null}
          </div>
        </Tarjeta>

        <Tarjeta titulo="Línea de tiempo" descripcion="Vigencia, cobros y compromisos" className="xl:col-span-3">
          <LineaTiempo inicio={c.inicio} vencimiento={c.vencimiento} hitos={c.hitos.map((h) => ({ fecha: h.fechaFacturar ?? h.fechaPago, pagado: h.estadoPago === "PAGADO", importe: h.importe, concepto: h.concepto }))} compromisos={c.compromisos.map((k) => ({ fecha: k.fecha, estado: k.estado, descripcion: k.descripcion }))} />
        </Tarjeta>

        <Tarjeta titulo="Hitos de cobro" descripcion="Calendario de facturación y pagos" className="xl:col-span-3">
          {c.hitos.length === 0 ? (
            <Vacio>Sin hitos de cobro. Agrega el calendario de facturación.</Vacio>
          ) : (
            <Tabla>
              <thead>
                <tr>
                  <Th>Concepto</Th>
                  <Th>Fecha a facturar</Th>
                  <Th>Factura</Th>
                  <Th>Pago</Th>
                  <Th derecha>Importe</Th>
                  <Th derecha>Recibido</Th>
                  {veComision ? <Th derecha>Comisión</Th> : null}
                  {puedeEditar ? <Th /> : null}
                </tr>
              </thead>
              <tbody>
                {c.hitos.map((h) => {
                  const d = diasHasta(h.fechaFacturar, hoy);
                  const pendienteH = h.importe - h.montoRecibido;
                  const tono = h.estadoPago === "PAGADO" ? "ok" : d === null ? "neutro" : d < 0 ? "riesgo" : d <= 30 ? "alerta" : "neutro";
                  const k = comisiones.find((x) => x.hitoId === h.id);
                  return (
                    <tr key={h.id} className="hover:bg-superficie-2">
                      <Td>
                        <div className="font-medium">{h.concepto}</div>
                        <div className="flex flex-wrap gap-1">
                          {h.modalidad !== "EFECTIVO" ? <Etiqueta>{etiqueta("modalidad", h.modalidad)}</Etiqueta> : null}
                          <PorConfirmar confirmado={h.confirmado} />
                        </div>
                        {h.notas ? <div className="mt-0.5 text-xs text-tinta-3">{h.notas}</div> : null}
                      </Td>
                      <Td>
                        <div>{h.fechaFacturar ? fecha(h.fechaFacturar) : h.fechaOrientativa ?? "Sin fecha"}</div>
                        {h.fechaFacturar && h.fechaOrientativa ? <div className="text-xs text-tinta-3">{h.fechaOrientativa}</div> : null}
                        {h.estadoPago !== "PAGADO" ? <Etiqueta tono={tono}>{textoDias(d)}</Etiqueta> : null}
                      </Td>
                      <Td className="text-tinta-2">
                        {etiqueta("estadoFactura", h.estadoFactura)}
                        {h.folioFactura ? <div className="text-xs text-tinta-3">Folio {h.folioFactura}</div> : null}
                      </Td>
                      <Td>
                        <Etiqueta tono={h.estadoPago === "PAGADO" ? "ok" : h.estadoPago === "PARCIAL" ? "alerta" : "neutro"}>{etiqueta("estadoPago", h.estadoPago)}</Etiqueta>
                        {h.fechaPago ? <div className="text-xs text-tinta-3">{fecha(h.fechaPago)}</div> : null}
                      </Td>
                      <Td derecha>{dinero(h.importe)}</Td>
                      <Td derecha>
                        {dinero(h.montoRecibido)}
                        {pendienteH > 0 && h.montoRecibido > 0 ? <div className="text-xs text-tinta-3">faltan {dinero(pendienteH)}</div> : null}
                      </Td>
                      {veComision ? (
                        <Td derecha>
                          {k ? (
                            <>
                              <div>{dinero(k.comision)}</div>
                              <div className="whitespace-nowrap text-xs text-tinta-3">{k.regla ? `${porcentaje(k.regla.pctDirector)} tras ${porcentaje(k.regla.pctCasa)}` : "sin regla"}</div>
                            </>
                          ) : (
                            <span className="text-tinta-3">—</span>
                          )}
                        </Td>
                      ) : null}
                      {puedeEditar ? (
                        <Td>
                          <div className="flex flex-col items-end gap-1">
                            {pendienteH > 0 ? <PanelPago hitoId={h.id} pendiente={pendienteH} /> : null}
                            <PanelHito contratoId={c.id} hito={h} textoBoton="Editar" />
                            <BorrarHito hitoId={h.id} />
                          </div>
                        </Td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="font-medium">
                  <Td colSpan={4}>Total</Td>
                  <Td derecha>{dinero(programado)}</Td>
                  <Td derecha>{dinero(cobrado)}</Td>
                  {veComision ? <Td derecha>{dinero(comisionDevengada)}</Td> : null}
                  {puedeEditar ? <Td /> : null}
                </tr>
              </tfoot>
            </Tabla>
          )}
          {puedeEditar ? (
            <div className="mt-4">
              <PanelHito contratoId={c.id} textoBoton="Agregar hito de cobro" />
            </div>
          ) : null}
        </Tarjeta>

        <Tarjeta titulo="Compromisos y acciones" descripcion="Entregables acordados con la marca y seguimientos internos" className="xl:col-span-3">
          {c.compromisos.length === 0 ? (
            <Vacio>Sin compromisos registrados. Captura aquí lo acordado con la marca.</Vacio>
          ) : (
            <Tabla>
              <thead>
                <tr>
                  <Th>Compromiso</Th>
                  <Th>Tipo</Th>
                  <Th>Fecha</Th>
                  <Th>Responsable</Th>
                  <Th>Estado</Th>
                  {puedeEditar ? <Th /> : null}
                </tr>
              </thead>
              <tbody>
                {c.compromisos.map((k) => {
                  const d = diasHasta(k.fecha, hoy);
                  const abierto = k.estado === "PENDIENTE" || k.estado === "EN_CURSO";
                  return (
                    <tr key={k.id} className="hover:bg-superficie-2">
                      <Td>
                        <div className={k.estado === "CUMPLIDO" ? "text-tinta-3 line-through" : "font-medium"}>{k.descripcion}</div>
                        {k.notas ? <div className="text-xs text-tinta-3">{k.notas}</div> : null}
                      </Td>
                      <Td className="text-tinta-2">{etiqueta("tipoCompromiso", k.tipo)}</Td>
                      <Td>
                        <div>{fecha(k.fecha)}</div>
                        {abierto && k.fecha ? <Etiqueta tono={d !== null && d < 0 ? "riesgo" : d !== null && d <= 7 ? "alerta" : "neutro"}>{textoDias(d)}</Etiqueta> : null}
                      </Td>
                      <Td className="text-tinta-2">{k.responsable ?? "—"}</Td>
                      <Td>
                        <Etiqueta tono={k.estado === "CUMPLIDO" ? "ok" : k.estado === "EN_CURSO" ? "acento" : k.estado === "CANCELADO" ? "neutro" : "alerta"}>{etiqueta("estadoCompromiso", k.estado)}</Etiqueta>
                      </Td>
                      {puedeEditar ? (
                        <Td>
                          <div className="flex flex-col items-end gap-1">
                            <AccionesCompromiso compromisoId={k.id} estado={k.estado} />
                            <PanelCompromiso contratoId={c.id} compromiso={k} textoBoton="Editar" />
                          </div>
                        </Td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </Tabla>
          )}
          {puedeEditar ? (
            <div className="mt-4">
              <PanelCompromiso contratoId={c.id} textoBoton="Agregar compromiso" />
            </div>
          ) : null}
        </Tarjeta>
      </div>
    </Pagina>
  );
}
