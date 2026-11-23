import Link from "next/link";
import { db } from "@/lib/db";
import { requerirSesion, veComisionesDeTodos, veTodo } from "@/lib/acceso";
import { comisionesPorHito } from "@/lib/comisiones";
import { directoresVisibles, hitosVisibles, reglasPara, resumenPorDirector, sumarResumenes } from "@/lib/consultas";
import { dinero, etiqueta, fecha, porcentaje } from "@/lib/formato";
import { Aviso, Boton, Cifra, Etiqueta, Pagina, PorConfirmar, Tabla, Tarjeta, Td, Th, Vacio } from "@/components/ui";
import { FiltroDirector } from "@/components/filtro-director";
import { BorrarPagoComision } from "./paneles";

export default async function Comisiones({ searchParams }: { searchParams: Promise<{ director?: string }> }) {
  const s = await requerirSesion();
  const { director } = await searchParams;

  // Administración y lectura ven cobros pero no comisiones de otros, salvo autorización del dueño.
  if (veTodo(s) && !veComisionesDeTodos(s)) {
    return (
      <Pagina titulo="Comisiones">
        <Aviso>Las comisiones de los directores solo son visibles para el administrador general.</Aviso>
      </Pagina>
    );
  }

  const global = veComisionesDeTodos(s);
  const directorId = global ? director || undefined : s.directorId!;
  const [directores, resumenes] = await Promise.all([
    global ? directoresVisibles(s) : Promise.resolve([]),
    resumenPorDirector(s, directorId ? [directorId] : undefined),
  ]);
  const total = sumarResumenes(resumenes);

  const [hitos, pagos] = await Promise.all([
    hitosVisibles(s, { montoRecibido: { gt: 0 } }, directorId),
    db.pagoComision.findMany({
      where: directorId ? { directorId } : {},
      include: { director: { select: { nombre: true } } },
      orderBy: [{ fechaPago: "desc" }],
    }),
  ]);
  const reglas = directorId ? await reglasPara(s, directorId) : await reglasPara(s);
  const porHito = comisionesPorHito(hitos, reglas);
  const contratoPorId = new Map(hitos.map((h) => [h.contrato.id, h.contrato]));

  return (
    <Pagina
      titulo="Comisiones"
      subtitulo="Devengada = cobrado × (1 − retención de la casa) × porcentaje del director. Nunca se captura a mano."
      acciones={
        <>
          {global ? <FiltroDirector directores={directores} actual={directorId} ruta="/comisiones" /> : null}
          <Boton href={`/api/exportar/comisiones${directorId ? `?director=${directorId}` : ""}`}>Exportar CSV</Boton>
        </>
      }
    >
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Cifra etiqueta="Devengada confirmada" valor={dinero(total.comisiones.devengadaConfirmada)} tono="ok" nota="Sobre cobros con respaldo" />
        <Cifra etiqueta="Devengada por confirmar" valor={dinero(total.comisiones.devengadaPorConfirmar)} tono="alerta" nota="Sobre cobros heredados sin respaldo" />
        <Cifra etiqueta="Pagada al director" valor={dinero(total.comisiones.pagada)} nota="Registros de pago" />
        <Cifra
          etiqueta="Pendiente de pago"
          valor={dinero(total.comisiones.devengadaConfirmada + total.comisiones.devengadaPorConfirmar - total.comisiones.pagada)}
          tono="acento"
          nota="Devengada menos pagada"
        />
        <Cifra etiqueta="Proyectada" valor={dinero(total.comisiones.proyectada)} nota="Si se cobra todo lo pendiente" />
      </div>

      {total.comisiones.sinRegla > 0 ? (
        <div className="mb-5">
          <Aviso tono="riesgo">
            Hay {dinero(total.comisiones.sinRegla)} cobrados sin regla de comisión aplicable. El administrador general debe fijar la regla en <Link href="/reglas" className="underline">Reglas de comisión</Link>.
          </Aviso>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">
        <Tarjeta titulo="Devengada por cobro" className="xl:col-span-3">
          {porHito.length === 0 ? (
            <Vacio>Sin cobros registrados.</Vacio>
          ) : (
            <Tabla>
              <thead>
                <tr>
                  <Th>Marca · concepto</Th>
                  <Th>Fecha</Th>
                  <Th derecha>Cobrado</Th>
                  <Th>Regla</Th>
                  <Th derecha>Comisión</Th>
                </tr>
              </thead>
              <tbody>
                {porHito.map((c) => {
                  const k = contratoPorId.get(c.contratoId)!;
                  return (
                    <tr key={c.hitoId} className="hover:bg-superficie-2">
                      <Td>
                        <Link href={`/contratos/${c.contratoId}`} className="font-medium text-acento hover:underline">
                          {k.marca.nombre}
                        </Link>
                        <div className="text-xs text-tinta-2">{c.concepto}</div>
                        <div className="flex gap-1">
                          {c.modalidad !== "EFECTIVO" ? <Etiqueta>{etiqueta("modalidad", c.modalidad)}</Etiqueta> : null}
                          <PorConfirmar confirmado={c.confirmado} />
                        </div>
                      </Td>
                      <Td>{fecha(c.fecha)}</Td>
                      <Td derecha>{dinero(c.montoCobrado)}</Td>
                      <Td className="text-xs text-tinta-2">
                        {c.regla ? `${porcentaje(c.regla.pctDirector)} tras ${porcentaje(c.regla.pctCasa)}` : <Etiqueta tono="riesgo">sin regla</Etiqueta>}
                      </Td>
                      <Td derecha className="font-medium">{dinero(c.comision)}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </Tabla>
          )}
        </Tarjeta>
        <Tarjeta titulo="Pagos de comisión registrados" className="xl:col-span-2">
          {pagos.length === 0 ? (
            <Vacio>Sin pagos registrados.</Vacio>
          ) : (
            <Tabla>
              <thead>
                <tr>
                  <Th>Concepto</Th>
                  <Th>Fecha</Th>
                  <Th derecha>Monto</Th>
                  {global ? <Th /> : null}
                </tr>
              </thead>
              <tbody>
                {pagos.map((p) => (
                  <tr key={p.id}>
                    <Td>
                      <div className="font-medium">{p.concepto}</div>
                      {global ? <div className="text-xs text-tinta-3">{p.director.nombre}</div> : null}
                      <div className="flex gap-1">
                        {p.modalidad !== "EFECTIVO" ? <Etiqueta>{etiqueta("modalidad", p.modalidad)}</Etiqueta> : null}
                        <PorConfirmar confirmado={p.confirmado} />
                      </div>
                    </Td>
                    <Td>{fecha(p.fechaPago)}</Td>
                    <Td derecha>{dinero(p.monto)}</Td>
                    {global ? <Td><BorrarPagoComision id={p.id} /></Td> : null}
                  </tr>
                ))}
              </tbody>
            </Tabla>
          )}
        </Tarjeta>
      </div>
    </Pagina>
  );
}
