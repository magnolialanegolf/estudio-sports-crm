import Link from "next/link";
import { addDays, startOfDay } from "date-fns";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { esAdmin, esDeCartera, filtroContratos, puedeCobrar, requerirComercial, veTodo } from "@/lib/acceso";
import { dinero, etiqueta, fecha, diasHasta, fechaCobro, textoDias } from "@/lib/formato";
import { Aviso, Cifra, Etiqueta, Pagina, Tabla, Tarjeta, Td, Th, Vacio } from "@/components/ui";
import { Autorizar, PanelPagoRecibido, PanelSolicitud } from "./paneles";


type HitoFila = Prisma.HitoCobroGetPayload<{
  include: {
    contrato: { select: { id: true; codigo: true; proyecto: true; marca: { select: { nombre: true } }; director: { select: { nombre: true } } } };
    documentos: { select: { id: true; categoria: true; nombre: true } };
  };
}>;

function Docs({ h }: { h: HitoFila }) {
  return (
    <div className="flex flex-wrap gap-1">
      {(["FACTURA_PDF", "FACTURA_XML", "COMPROBANTE"] as const).map((cat) => {
        const d = h.documentos.find((x) => x.categoria === cat);
        return d ? (
          <a key={cat} href={`/api/documentos/${d.id}`} target="_blank" rel="noreferrer" className="rounded-full bg-ok-suave px-2 py-0.5 text-xs font-medium text-ok hover:underline" title={d.nombre}>
            {etiqueta("categoriaDocumento", cat)}
          </a>
        ) : (
          <span key={cat} className="rounded-full bg-neutro-suave px-2 py-0.5 text-xs text-tinta-3">{etiqueta("categoriaDocumento", cat)} · —</span>
        );
      })}
    </div>
  );
}

function Fila({ h, hoy, global, acciones }: { h: HitoFila; hoy: Date; global: boolean; acciones?: React.ReactNode }) {
  const d = diasHasta(fechaCobro(h), hoy);
  const atrasado = h.estadoPago !== "PAGADO" && d !== null && d < 0;
  return (
    <tr>
      <Td>
        <Link href={`/contratos/${h.contrato.id}`} className="font-medium text-acento hover:underline">{h.contrato.marca.nombre}</Link>
        <div className="text-xs text-tinta-2">{h.concepto}</div>
        {global ? <div className="text-xs text-tinta-3">{h.contrato.director.nombre}</div> : null}
      </Td>
      <Td>
        <div>{h.fechaFacturar ? fecha(h.fechaFacturar) : h.fechaOrientativa ?? "Sin fecha"}</div>
        <div className="text-xs text-tinta-3">{h.fechaVencimiento ? `Pago requerido ${fecha(h.fechaVencimiento)}` : "Pago requerido: sin fijar"}</div>
        {h.estadoPago !== "PAGADO" ? <Etiqueta tono={atrasado ? "riesgo" : d !== null && d <= 7 ? "alerta" : "neutro"}>{atrasado ? `atrasado ${Math.abs(d!)} d` : textoDias(d)}</Etiqueta> : h.fechaPago ? <div className="text-xs text-tinta-3">pagado {fecha(h.fechaPago)}</div> : null}
      </Td>
      <Td derecha>{dinero(h.importe - h.montoRecibido || h.importe)}</Td>
      <Td>
        <Docs h={h} />
        {h.folioFactura ? <div className="mt-1 text-xs text-tinta-3">Folio {h.folioFactura}</div> : null}
      </Td>
      <Td>
        <div className="text-xs text-tinta-2">
          {h.solicitadoEn ? <div>Solicitado {fecha(h.solicitadoEn)}{h.montoSolicitado && h.montoSolicitado < h.importe - h.montoRecibido ? <span className="tabular"> · {dinero(h.montoSolicitado)}</span> : null}</div> : <div className="text-tinta-3">Sin solicitar</div>}
          {h.autorizadoEn ? <div className="text-ok">Autorizado {fecha(h.autorizadoEn)}</div> : null}
          {h.estadoPago === "PAGADO" ? <Etiqueta tono="ok">Pagado</Etiqueta> : h.estadoPago === "PARCIAL" ? <Etiqueta tono="alerta">Pago parcial</Etiqueta> : null}
        </div>
      </Td>
      <Td>{acciones}</Td>
    </tr>
  );
}

function Encabezado() {
  return (
    <thead>
      <tr>
        <Th>Marca · concepto</Th>
        <Th>Facturación · pago requerido</Th>
        <Th derecha>Importe</Th>
        <Th>Factura y comprobante</Th>
        <Th>Flujo</Th>
        <Th />
      </tr>
    </thead>
  );
}

// Cola de cobros: programados por el director, por autorizar por dirección, autorizados para pagos, pagados.
export default async function Pagos({ searchParams }: { searchParams: Promise<{ ver?: string }> }) {
  const s = await requerirComercial();
  const { ver } = await searchParams;
  const hoy = startOfDay(new Date());
  const limite90 = addDays(hoy, 90);
  const admin = esAdmin(s);
  const pagos = puedeCobrar(s);
  const filtro = filtroContratos(s);

  const hitos = await db.hitoCobro.findMany({
    where: { contrato: { ...filtro, estado: { in: ["VIGENTE", "PENDIENTE_FIRMA"] } } },
    include: {
      contrato: { select: { id: true, codigo: true, proyecto: true, marca: { select: { nombre: true } }, director: { select: { nombre: true } } } },
      documentos: { select: { id: true, categoria: true, nombre: true } },
    },
    orderBy: [{ fechaFacturar: "asc" }],
  });

  const pendientes = hitos.filter((h) => h.estadoPago !== "PAGADO" && h.importe - h.montoRecibido > 0);
  const programadosTodos = pendientes.filter((h) => !h.solicitadoEn);
  const programados = ver === "todos" ? programadosTodos : programadosTodos.filter((h) => !h.fechaFacturar || h.fechaFacturar <= limite90);
  const porAutorizar = pendientes.filter((h) => h.solicitadoEn && !h.autorizadoEn);
  const autorizados = pendientes.filter((h) => h.autorizadoEn);
  const pagados = hitos.filter((h) => h.estadoPago === "PAGADO").sort((a, b) => (b.fechaPago?.getTime() ?? 0) - (a.fechaPago?.getTime() ?? 0)).slice(0, 25);
  const atrasados = pendientes.filter((h) => { const f = fechaCobro(h); return f !== null && f < hoy; });

  return (
    <Pagina titulo="Pagos" subtitulo="Programar → facturar y solicitar → autorización de dirección → registro del pago con comprobante">
      <div className="mb-5">
        <Aviso>
          {admin
            ? "Autorizas los cobros solicitados por los directores. Pagos registra el pago en cuanto ves autorizado."
            : pagos
              ? "Ves los cobros autorizados por dirección. Registra el pago con fecha y comprobante; el portal lo marca pagado y confirmado para todos."
              : "Programa el cobro en el contrato, sube factura PDF y XML y solicita autorización. Dirección autoriza y pagos registra el pago."}
        </Aviso>
      </div>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Cifra etiqueta="Atrasados" valor={dinero(atrasados.reduce((a, h) => a + h.importe - h.montoRecibido, 0))} tono={atrasados.length ? "riesgo" : "ok"} nota={`${atrasados.length} cobro(s) con fecha pasada`} icono="alerta" />
        <Cifra etiqueta="Por autorizar" valor={porAutorizar.length} tono={porAutorizar.length && admin ? "alerta" : "neutro"} nota="Solicitados por el director" icono="contratos" />
        <Cifra etiqueta="Autorizados por cobrar" valor={dinero(autorizados.reduce((a, h) => a + h.importe - h.montoRecibido, 0))} tono="acento" nota={`${autorizados.length} cobro(s)`} icono="pagos" />
        <Cifra etiqueta="Programados" valor={programadosTodos.length} nota="Sin solicitar aún" icono="calendario" />
      </div>

      <div className="space-y-5">
        {admin || porAutorizar.length ? (
          <Tarjeta titulo="Por autorizar" descripcion="Con factura adjunta, esperando a dirección">
            {porAutorizar.length === 0 ? <Vacio>Nada por autorizar.</Vacio> : (
              <Tabla>
                <Encabezado />
                <tbody>{porAutorizar.map((h) => <Fila key={h.id} h={h} hoy={hoy} global={veTodo(s)} acciones={admin ? <Autorizar hitoId={h.id} /> : null} />)}</tbody>
              </Tabla>
            )}
          </Tarjeta>
        ) : null}

        <Tarjeta titulo="Autorizados · listos para registrar pago" descripcion="Pagos registra fecha, monto y comprobante">
          {autorizados.length === 0 ? <Vacio>Sin cobros autorizados pendientes.</Vacio> : (
            <Tabla>
              <Encabezado />
              <tbody>{autorizados.map((h) => <Fila key={h.id} h={h} hoy={hoy} global={veTodo(s)} acciones={pagos || esDeCartera(s) ? <PanelPagoRecibido hitoId={h.id} pendiente={h.importe - h.montoRecibido} solicitado={h.montoSolicitado} /> : null} />)}</tbody>
            </Tabla>
          )}
        </Tarjeta>

        <Tarjeta
          titulo="Programados · sin solicitar"
          descripcion={ver === "todos" ? "Todos los cobros programados" : "Próximos 90 días. El director sube la factura y solicita autorización"}
          acciones={programadosTodos.length !== programados.length || ver === "todos" ? <Link href={ver === "todos" ? "/pagos" : "/pagos?ver=todos"} className="text-xs font-medium text-acento hover:underline">{ver === "todos" ? "Solo 90 días" : `Ver todos (${programadosTodos.length})`}</Link> : undefined}
        >
          {programados.length === 0 ? <Vacio>Sin cobros programados pendientes.</Vacio> : (
            <Tabla>
              <Encabezado />
              <tbody>{programados.map((h) => <Fila key={h.id} h={h} hoy={hoy} global={veTodo(s)} acciones={!pagos || admin ? <PanelSolicitud hitoId={h.id} marca={h.contrato.marca.nombre} concepto={h.concepto} importe={h.importe} pendiente={h.importe - h.montoRecibido} fechaFacturar={h.fechaFacturar} fechaVencimiento={h.fechaVencimiento} folio={h.folioFactura} /> : null} />)}</tbody>
            </Tabla>
          )}
        </Tarjeta>

        <Tarjeta titulo="Pagados recientes">
          {pagados.length === 0 ? <Vacio>Sin pagos registrados.</Vacio> : (
            <Tabla>
              <Encabezado />
              <tbody>{pagados.map((h) => <Fila key={h.id} h={h} hoy={hoy} global={veTodo(s)} />)}</tbody>
            </Tabla>
          )}
        </Tarjeta>
      </div>
    </Pagina>
  );
}
