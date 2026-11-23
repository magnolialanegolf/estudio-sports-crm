import Link from "next/link";
import type { EstadoContrato } from "@prisma/client";
import { db } from "@/lib/db";
import { filtroContratos, puedeCapturar, requerirSesion, veTodo } from "@/lib/acceso";
import { dinero, etiqueta, fecha, diasHasta } from "@/lib/formato";
import { Boton, Etiqueta, Pagina, PorConfirmar, Tabla, Tarjeta, Td, Th, Vacio } from "@/components/ui";

const ESTADOS: EstadoContrato[] = ["VIGENTE", "PENDIENTE_FIRMA", "PROPUESTA", "FINALIZADO", "CANCELADO"];

export default async function Contratos({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const s = await requerirSesion();
  const { estado } = await searchParams;
  const filtroEstado = ESTADOS.includes(estado as EstadoContrato) ? (estado as EstadoContrato) : undefined;

  const contratos = await db.contrato.findMany({
    where: { ...filtroContratos(s), ...(filtroEstado ? { estado: filtroEstado } : { estado: { not: "CANCELADO" } }) },
    include: {
      marca: { select: { nombre: true, esDemo: true } },
      director: { select: { nombre: true } },
      hitos: { select: { importe: true, montoRecibido: true } },
      renovacion: { select: { id: true, estado: true } },
    },
    orderBy: [{ marca: { esDemo: "asc" } }, { estado: "asc" }, { vencimiento: "asc" }, { marca: { nombre: "asc" } }],
  });

  const orden: Record<EstadoContrato, number> = { VIGENTE: 0, PENDIENTE_FIRMA: 1, PROPUESTA: 2, FINALIZADO: 3, CANCELADO: 4 };
  contratos.sort((a, b) => Number(a.marca.esDemo) - Number(b.marca.esDemo) || orden[a.estado] - orden[b.estado]);

  return (
    <Pagina
      titulo="Contratos"
      subtitulo="Vigencias, montos y avance de cobro"
      acciones={
        <>
          <Boton href="/api/exportar/contratos">Exportar CSV</Boton>
          {puedeCapturar(s) ? <Boton href="/contratos/nuevo" tipo="primario">Nuevo contrato</Boton> : null}
        </>
      }
    >
      <div className="no-imprimir mb-4 flex flex-wrap gap-1.5">
        <Link href="/contratos" className={`rounded border px-3 py-1 text-xs font-medium ${!filtroEstado ? "border-acento bg-acento-suave text-acento" : "border-linea text-tinta-2 hover:bg-superficie-2"}`}>
          Activos e históricos
        </Link>
        {ESTADOS.map((e) => (
          <Link
            key={e}
            href={`/contratos?estado=${e}`}
            className={`rounded border px-3 py-1 text-xs font-medium ${filtroEstado === e ? "border-acento bg-acento-suave text-acento" : "border-linea text-tinta-2 hover:bg-superficie-2"}`}
          >
            {etiqueta("estadoContrato", e)}
          </Link>
        ))}
      </div>

      <Tarjeta>
        {contratos.length === 0 ? (
          <Vacio>Sin contratos con ese estado.</Vacio>
        ) : (
          <Tabla>
            <thead>
              <tr>
                <Th>Contrato</Th>
                {veTodo(s) ? <Th>Director</Th> : null}
                <Th>Tipo</Th>
                <Th>Estado</Th>
                <Th>Vigencia</Th>
                <Th derecha>Monto</Th>
                <Th derecha>Cobrado</Th>
                <Th>Avance</Th>
                {puedeCapturar(s) ? <Th /> : null}
              </tr>
            </thead>
            <tbody>
              {contratos.map((c) => {
                const cobrado = c.hitos.reduce((a, h) => a + h.montoRecibido, 0);
                const avance = c.monto ? Math.min(cobrado / c.monto, 1) : 0;
                const dias = diasHasta(c.vencimiento);
                const tonoVenc = c.estado === "VIGENTE" && dias !== null ? (dias <= 30 ? "riesgo" : dias <= 90 ? "alerta" : "neutro") : "neutro";
                return (
                  <tr key={c.id} className="hover:bg-superficie-2">
                    <Td>
                      <Link href={`/contratos/${c.id}`} className="font-medium text-acento hover:underline">
                        {c.marca.nombre} · {c.proyecto}
                      </Link>
                      <div className="text-xs text-tinta-3">{c.codigo}</div>
                    </Td>
                    {veTodo(s) ? <Td className="text-tinta-2">{c.director.nombre}</Td> : null}
                    <Td>{etiqueta("tipo", c.tipo)}</Td>
                    <Td>
                      <Etiqueta tono={c.estado === "VIGENTE" ? "ok" : c.estado === "PENDIENTE_FIRMA" ? "alerta" : c.estado === "PROPUESTA" ? "acento" : "neutro"}>
                        {etiqueta("estadoContrato", c.estado)}
                      </Etiqueta>
                    </Td>
                    <Td>
                      <div className="text-tinta">
                        {fecha(c.inicio)} → <span className={tonoVenc === "riesgo" ? "text-riesgo font-medium" : tonoVenc === "alerta" ? "text-alerta font-medium" : ""}>{fecha(c.vencimiento)}</span>
                      </div>
                      <div className="flex gap-1 text-xs text-tinta-3">
                        {c.duracionMeses ? `${c.duracionMeses} meses` : "duración por definir"}
                        {!c.inicioConfirmado || !c.vencimientoConfirmado ? <PorConfirmar confirmado={false} /> : null}
                      </div>
                    </Td>
                    <Td derecha>
                      {dinero(c.monto)}
                      {c.monto !== null && !c.montoConfirmado ? <div><PorConfirmar confirmado={false} /></div> : null}
                    </Td>
                    <Td derecha>{dinero(cobrado)}</Td>
                    <Td>
                      <div className="h-1.5 w-28 overflow-hidden rounded bg-neutro-suave">
                        <div className="h-full bg-acento" style={{ width: `${Math.round(avance * 100)}%` }} />
                      </div>
                      <div className="mt-0.5 text-xs text-tinta-3">{Math.round(avance * 100)} %</div>
                    </Td>
                    {puedeCapturar(s) ? (
                      <Td>
                        <Link href={`/contratos/${c.id}/editar`} className="no-imprimir text-xs text-acento hover:underline">Editar</Link>
                      </Td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </Tabla>
        )}
      </Tarjeta>
    </Pagina>
  );
}
