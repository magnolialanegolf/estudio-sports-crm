import Link from "next/link";
import type { EstadoContrato } from "@prisma/client";
import { db } from "@/lib/db";
import { filtroContratos, filtroMarcas, puedeCapturar, requerirComercial, veTodo } from "@/lib/acceso";
import { avance, directoresVisibles, PONDERACION } from "@/lib/consultas";
import { dinero, dineroCorto, etiqueta, fecha } from "@/lib/formato";
import { Boton, Cifra, Etiqueta, Pagina, Tabla, Tarjeta, Td, Th } from "@/components/ui";
import { Barras } from "@/components/graficas";
import { BarraFiltros, condicionBusqueda } from "@/components/filtros";

// El proceso completo, de izquierda a derecha: prospecto → propuesta → firma → vigente.
const ETAPAS: { estado: EstadoContrato; descripcion: string; tono: "neutro" | "acento" | "alerta" | "ok" }[] = [
  { estado: "PROSPECTO", descripcion: "Marca identificada, sin propuesta", tono: "neutro" },
  { estado: "PROPUESTA", descripcion: "Propuesta enviada o en negociación", tono: "acento" },
  { estado: "PENDIENTE_FIRMA", descripcion: "Acuerdo cerrado, contrato por firmar", tono: "alerta" },
  { estado: "VIGENTE", descripcion: "Firmado: producción y cobros en curso", tono: "ok" },
];
const ABIERTAS: EstadoContrato[] = ["PROSPECTO", "PROPUESTA", "PENDIENTE_FIRMA"];

export default async function Pipeline({ searchParams }: { searchParams: Promise<{ q?: string; director?: string; marca?: string }> }) {
  const s = await requerirComercial();
  const { q, director, marca } = await searchParams;
  const global = veTodo(s);
  const directorId = global ? director || undefined : undefined;

  const [contratos, directores, marcas] = await Promise.all([
    db.contrato.findMany({
      where: {
        ...(directorId ? { directorId } : filtroContratos(s)),
        ...(marca ? { marcaId: marca } : {}),
        ...condicionBusqueda(q),
        estado: { in: ETAPAS.map((e) => e.estado) },
      },
      include: {
        marca: { select: { nombre: true } },
        director: { select: { id: true, nombre: true } },
        hitos: { select: { importe: true, montoRecibido: true } },
        compromisos: { select: { estado: true, tipo: true } },
      },
      orderBy: [{ monto: "desc" }, { marca: { nombre: "asc" } }],
    }),
    global ? directoresVisibles(s) : Promise.resolve([]),
    db.marca.findMany({ where: filtroMarcas(s), select: { id: true, nombre: true }, orderBy: [{ esDemo: "asc" }, { nombre: "asc" }] }),
  ]);

  const abiertos = contratos.filter((c) => ABIERTAS.includes(c.estado));
  const vigentes = contratos.filter((c) => c.estado === "VIGENTE");
  const nominal = abiertos.reduce((a, c) => a + (c.monto ?? 0), 0);
  const ponderado = Math.round(abiertos.reduce((a, c) => a + (c.monto ?? 0) * avance(c), 0));
  const valorVigente = vigentes.reduce((a, c) => a + (c.monto ?? 0), 0);

  // Ponderado por director, solo para quien ve todo.
  const porDirector = global
    ? Array.from(
        abiertos.reduce((m, c) => {
          const k = c.director.nombre;
          m.set(k, (m.get(k) ?? 0) + (c.monto ?? 0) * avance(c));
          return m;
        }, new Map<string, number>()),
      )
        .map(([etiqueta, valor]) => ({ etiqueta, valor: Math.round(valor), tono: "acento" as const }))
        .sort((a, b) => b.valor - a.valor)
    : [];

  return (
    <Pagina
      titulo="Pipeline"
      subtitulo="Qué se está vendiendo, cuánto vale y qué tan cerca está de cerrarse."
      acciones={puedeCapturar(s) ? <Boton href="/contratos/nuevo" tipo="primario">Nuevo prospecto</Boton> : undefined}
    >
      <BarraFiltros ruta="/pipeline" q={q} director={directorId} directores={global ? directores : undefined} marca={marca} marcas={marcas} />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Cifra etiqueta="Oportunidades abiertas" valor={abiertos.length} icono="pipeline" nota={`${abiertos.filter((c) => !c.monto).length} sin monto`} />
        <Cifra etiqueta="Valor nominal" valor={dinero(nominal)} nota="Suma de montos sin IVA en prospecto, propuesta y por firmar" />
        <Cifra etiqueta="Valor ponderado" valor={dinero(ponderado)} tono="acento" nota="Monto × porcentaje de avance de cada contrato" />
        <Cifra etiqueta="Vigente" valor={dinero(valorVigente)} tono="ok" nota={`${vigentes.length} contrato(s) firmados`} />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Tarjeta titulo="Cómo se pondera" descripcion="Cada etapa tiene un porcentaje de avance. Se puede ajustar contrato por contrato al editarlo." className="xl:col-span-2">
          <Tabla>
            <thead>
              <tr>
                <Th>Etapa</Th>
                <Th derecha>Contratos</Th>
                <Th derecha>Valor nominal</Th>
                <Th derecha>Avance</Th>
                <Th derecha>Ponderado</Th>
              </tr>
            </thead>
            <tbody>
              {ETAPAS.filter((e) => e.estado !== "VIGENTE").map((e) => {
                const cs = contratos.filter((c) => c.estado === e.estado);
                const n = cs.reduce((a, c) => a + (c.monto ?? 0), 0);
                const p = Math.round(cs.reduce((a, c) => a + (c.monto ?? 0) * avance(c), 0));
                const ajustados = cs.filter((c) => c.probabilidad !== null).length;
                return (
                  <tr key={e.estado}>
                    <Td>
                      <Etiqueta tono={e.tono}>{etiqueta("estadoContrato", e.estado)}</Etiqueta>
                      <div className="mt-0.5 text-xs text-tinta-3">{e.descripcion}</div>
                    </Td>
                    <Td derecha>{cs.length}</Td>
                    <Td derecha>{dinero(n)}</Td>
                    <Td derecha>
                      {Math.round(PONDERACION[e.estado] * 100)} %
                      {ajustados ? <div className="text-xs text-tinta-3">{ajustados} ajustado(s)</div> : null}
                    </Td>
                    <Td derecha className="font-medium">{dinero(p)}</Td>
                  </tr>
                );
              })}
              <tr className="font-semibold">
                <Td>Total abierto</Td>
                <Td derecha>{abiertos.length}</Td>
                <Td derecha>{dinero(nominal)}</Td>
                <Td derecha>{nominal ? Math.round((ponderado / nominal) * 100) : 0} %</Td>
                <Td derecha>{dinero(ponderado)}</Td>
              </tr>
            </tbody>
          </Tabla>
        </Tarjeta>
        {global ? (
          <Tarjeta titulo="Ponderado por director" descripcion="Oportunidades abiertas">
            {porDirector.length ? <Barras datos={porDirector} formato={dineroCorto} /> : <p className="py-4 text-center text-xs text-tinta-3">Sin oportunidades abiertas</p>}
          </Tarjeta>
        ) : (
          <Tarjeta titulo="Lectura" descripcion="Para el director">
            <p className="text-sm text-tinta-2">
              El ponderado es lo que razonablemente se puede esperar cerrar con lo que hay hoy en la cartera. Mueve un contrato de etapa al editarlo, y ajusta su porcentaje si una negociación va mejor o peor que lo normal de su etapa.
            </p>
          </Tarjeta>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {ETAPAS.map((e) => {
          const cs = contratos.filter((c) => c.estado === e.estado);
          const n = cs.reduce((a, c) => a + (c.monto ?? 0), 0);
          return (
            <Tarjeta key={e.estado} titulo={`${etiqueta("estadoContrato", e.estado)} · ${cs.length}`} descripcion={`${dinero(n)}${e.estado !== "VIGENTE" ? ` · ponderado ${dinero(Math.round(cs.reduce((a, c) => a + (c.monto ?? 0) * avance(c), 0)))}` : ""}`}>
              {cs.length === 0 ? (
                <p className="py-4 text-center text-xs text-tinta-3">Sin registros</p>
              ) : (
                <ul className="-mx-5 divide-y divide-linea/70">
                  {cs.map((c) => {
                    const cobrado = c.hitos.reduce((a, h) => a + h.montoRecibido, 0);
                    const entregables = c.compromisos.filter((k) => k.tipo === "ENTREGABLE" && k.estado !== "CANCELADO");
                    const cumplidos = entregables.filter((k) => k.estado === "CUMPLIDO").length;
                    const pct = Math.round(avance(c) * 100);
                    return (
                      <li key={c.id} className="px-5 py-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <Link href={`/contratos/${c.id}`} className="font-medium text-acento hover:underline">{c.marca.nombre}</Link>
                            <div className="truncate text-sm text-tinta-2" title={c.proyecto}>{c.proyecto}</div>
                          </div>
                          <div className="shrink-0 text-right">
                            <div className="tabular font-medium">{c.monto ? dinero(c.monto) : <span className="text-tinta-3">sin monto</span>}</div>
                            {e.estado !== "VIGENTE" && c.monto ? <div className="tabular text-xs text-tinta-3">pond. {dinero(Math.round(c.monto * avance(c)))}</div> : null}
                          </div>
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-tinta-3">
                          {e.estado !== "VIGENTE" ? (
                            <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium ${c.probabilidad !== null ? "bg-naranja/15 text-naranja" : "bg-neutro-suave text-tinta-2"}`} title={c.probabilidad !== null ? "Porcentaje ajustado en el contrato" : "Porcentaje de la etapa"}>
                              {pct} % {c.probabilidad !== null ? "ajustado" : ""}
                            </span>
                          ) : null}
                          <Etiqueta>{etiqueta("tipo", c.tipo)}</Etiqueta>
                          {global ? <span>· {c.director.nombre}</span> : null}
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
