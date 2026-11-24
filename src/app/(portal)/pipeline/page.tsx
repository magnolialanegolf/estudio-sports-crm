import Link from "next/link";
import type { EstadoContrato } from "@prisma/client";
import { db } from "@/lib/db";
import { filtroContratos, puedeCapturar, requerirComercial, veTodo } from "@/lib/acceso";
import { PONDERACION } from "@/lib/consultas";
import { dinero, etiqueta, fecha } from "@/lib/formato";
import { Boton, Etiqueta, Pagina, Tarjeta } from "@/components/ui";

// El proceso completo, de izquierda a derecha: prospecto → propuesta → firma → vigente.
const ETAPAS: { estado: EstadoContrato; descripcion: string; tono: "neutro" | "acento" | "alerta" | "ok" }[] = [
  { estado: "PROSPECTO", descripcion: "Marca identificada, sin propuesta", tono: "neutro" },
  { estado: "PROPUESTA", descripcion: "Propuesta enviada o en negociación", tono: "acento" },
  { estado: "PENDIENTE_FIRMA", descripcion: "Acuerdo cerrado, contrato por firmar", tono: "alerta" },
  { estado: "VIGENTE", descripcion: "Firmado: producción y cobros en curso", tono: "ok" },
];

export default async function Pipeline() {
  const s = await requerirComercial();
  const contratos = await db.contrato.findMany({
    where: { ...filtroContratos(s), estado: { in: ETAPAS.map((e) => e.estado) } },
    include: {
      marca: { select: { nombre: true } },
      director: { select: { nombre: true } },
      hitos: { select: { importe: true, montoRecibido: true } },
      compromisos: { select: { estado: true, tipo: true } },
    },
    orderBy: [{ vencimiento: "asc" }, { marca: { nombre: "asc" } }],
  });

  return (
    <Pagina
      titulo="Pipeline"
      subtitulo="Del prospecto al contrato vigente. Cambia la etapa editando el contrato."
      acciones={puedeCapturar(s) ? <Boton href="/contratos/nuevo" tipo="primario">Nuevo prospecto</Boton> : undefined}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {ETAPAS.map((e) => {
          const cs = contratos.filter((c) => c.estado === e.estado);
          const nominal = cs.reduce((a, c) => a + (c.monto ?? 0), 0);
          return (
            <Tarjeta key={e.estado} titulo={`${etiqueta("estadoContrato", e.estado)} · ${cs.length}`} descripcion={`${e.descripcion} · ${dinero(nominal)}${e.estado !== "VIGENTE" ? ` · ponderado ${dinero(Math.round(nominal * PONDERACION[e.estado]))}` : ""}`}>
              {cs.length === 0 ? (
                <p className="py-4 text-center text-xs text-tinta-3">Sin registros</p>
              ) : (
                <ul className="-mx-5 divide-y divide-linea/70">
                  {cs.map((c) => {
                    const cobrado = c.hitos.reduce((a, h) => a + h.montoRecibido, 0);
                    const entregables = c.compromisos.filter((k) => k.tipo === "ENTREGABLE" && k.estado !== "CANCELADO");
                    const cumplidos = entregables.filter((k) => k.estado === "CUMPLIDO").length;
                    return (
                      <li key={c.id} className="px-5 py-2.5">
                        <Link href={`/contratos/${c.id}`} className="font-medium text-acento hover:underline">{c.marca.nombre}</Link>
                        <div className="text-sm text-tinta-2">{c.proyecto}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-tinta-3">
                          <span className="tabular">{dinero(c.monto)}</span>
                          <Etiqueta>{etiqueta("tipo", c.tipo)}</Etiqueta>
                          {veTodo(s) ? <span>· {c.director.nombre}</span> : null}
                        </div>
                        {e.estado === "VIGENTE" ? (
                          <div className="mt-1 text-xs text-tinta-3">
                            Cobrado {c.monto ? Math.round((cobrado / c.monto) * 100) : 0} % · Entregables {cumplidos}/{entregables.length} · vence {fecha(c.vencimiento)}
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Tarjeta>
          );
        })}
      </div>
    </Pagina>
  );
}
