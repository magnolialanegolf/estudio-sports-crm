import Link from "next/link";
import { startOfDay } from "date-fns";
import { requerirSesion, veTodo } from "@/lib/acceso";
import { antiguedad, directoresVisibles, hitosVisibles } from "@/lib/consultas";
import { dinero, etiqueta, fecha, diasHasta, fechaCobro, textoDias } from "@/lib/formato";
import { Boton, Cifra, Etiqueta, Pagina, PorConfirmar, Tabla, Tarjeta, Td, Th, Vacio } from "@/components/ui";
import { FiltroDirector } from "@/components/filtro-director";
import { Barras } from "@/components/graficas";

export default async function Cobranza({ searchParams }: { searchParams: Promise<{ director?: string }> }) {
  const s = await requerirSesion();
  const { director } = await searchParams;
  const global = veTodo(s);
  const directorId = global ? director || undefined : undefined;

  const [hitos, directores] = await Promise.all([
    hitosVisibles(s, { contrato: { estado: { in: ["VIGENTE", "PENDIENTE_FIRMA"] } }, estadoPago: { not: "PAGADO" } }, directorId),
    global ? directoresVisibles(s) : Promise.resolve([]),
  ]);
  const hoy = startOfDay(new Date());
  const pendientes = hitos.filter((h) => h.importe - h.montoRecibido > 0);
  const tramos = antiguedad(pendientes, hoy);
  const vencido = tramos.slice(0, 3).reduce((a, t) => a + t.monto, 0);
  const total = pendientes.reduce((a, h) => a + (h.importe - h.montoRecibido), 0);
  const sujetoFirma = pendientes.filter((h) => h.estadoPago === "SUJETO_A_FIRMA").reduce((a, h) => a + (h.importe - h.montoRecibido), 0);

  return (
    <Pagina
      titulo="Cobranza"
      subtitulo="Hitos pendientes de contratos vigentes y pendientes de firma, por antigüedad"
      acciones={
        <>
          {global ? <FiltroDirector directores={directores} actual={directorId} ruta="/cobranza" /> : null}
          <Boton href={`/api/exportar/cobranza${directorId ? `?director=${directorId}` : ""}`}>Exportar CSV</Boton>
        </>
      }
    >
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Cifra etiqueta="Vencido" valor={dinero(vencido)} tono={vencido > 0 ? "riesgo" : "ok"} />
        <Cifra etiqueta="Por cobrar total" valor={dinero(total)} tono="acento" nota="Incluye programado y sujeto a firma" />
        <Cifra etiqueta="Sujeto a firma" valor={dinero(sujetoFirma)} nota="No es cuenta por cobrar hasta la firma" />
        <Cifra etiqueta="Hitos pendientes" valor={pendientes.length} />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Tarjeta titulo="Antigüedad" descripcion="Monto pendiente por tramo">
          <Barras datos={tramos.map((t) => ({ etiqueta: t.etiqueta, valor: t.monto, tono: t.etiqueta.startsWith("Vencido") ? "riesgo" : "acento" }))} />
        </Tarjeta>
        <Tarjeta titulo="Detalle" className="xl:col-span-2">
          {pendientes.length === 0 ? (
            <Vacio>Sin hitos pendientes.</Vacio>
          ) : (
            <Tabla>
              <thead>
                <tr>
                  <Th>Marca · concepto</Th>
                  {global ? <Th>Director</Th> : null}
                  <Th>Fecha</Th>
                  <Th>Factura</Th>
                  <Th>Pago</Th>
                  <Th derecha>Pendiente</Th>
                </tr>
              </thead>
              <tbody>
                {pendientes.map((h) => {
                  const dias = diasHasta(fechaCobro(h), hoy);
                  const tono = dias === null ? "neutro" : dias < 0 ? "riesgo" : dias <= 30 ? "alerta" : "neutro";
                  return (
                    <tr key={h.id} className="hover:bg-superficie-2">
                      <Td>
                        <Link href={`/contratos/${h.contrato.id}`} className="font-medium text-acento hover:underline">
                          {h.contrato.marca.nombre}
                        </Link>
                        <div className="text-xs text-tinta-2">{h.concepto}</div>
                        {h.modalidad !== "EFECTIVO" ? <Etiqueta>{etiqueta("modalidad", h.modalidad)}</Etiqueta> : null}
                      </Td>
                      {global ? <Td className="text-tinta-2">{h.contrato.director.nombre}</Td> : null}
                      <Td>
                        <div>{h.fechaFacturar ? fecha(h.fechaFacturar) : h.fechaOrientativa ?? "Sin fecha"}</div>
                        {h.fechaVencimiento ? <div className="text-xs text-tinta-3">Pago requerido {fecha(h.fechaVencimiento)}</div> : null}
                        <Etiqueta tono={tono}>{textoDias(dias)}</Etiqueta>
                      </Td>
                      <Td className="text-tinta-2">{etiqueta("estadoFactura", h.estadoFactura)}</Td>
                      <Td>
                        <div>{etiqueta("estadoPago", h.estadoPago)}</div>
                        <PorConfirmar confirmado={h.confirmado} />
                      </Td>
                      <Td derecha>{dinero(h.importe - h.montoRecibido)}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </Tabla>
          )}
        </Tarjeta>
      </div>
    </Pagina>
  );
}
