import Link from "next/link";
import { db } from "@/lib/db";
import { requerirSesion, veComisionesDeTodos, veTodo } from "@/lib/acceso";
import { comisionesPorHito } from "@/lib/comisiones";
import { reglasPara } from "@/lib/consultas";
import { periodoDesdeParametros } from "@/lib/reportes";
import { dinero, dineroCorto, etiqueta, fecha } from "@/lib/formato";
import { Aviso, Cifra, Etiqueta, Pagina, Tabla, Tarjeta, Td, Th, Vacio } from "@/components/ui";
import { Barras } from "@/components/graficas";
import { SelectorPeriodo } from "@/components/selector-periodo";
import { redirect } from "next/navigation";

// Cuánto deja cada pódcast: cada programa es independiente de los contratos comerciales
// y tiene marcas, condiciones y comisiones propias.
export default async function ReportePodcasts({ searchParams }: { searchParams: Promise<{ periodo?: string; desde?: string; hasta?: string }> }) {
  const s = await requerirSesion();
  if (!veTodo(s)) redirect("/reportes");
  const p = await searchParams;
  const periodo = periodoDesdeParametros({ ...p, periodo: p.periodo ?? "anio" });
  const conComisiones = veComisionesDeTodos(s);

  const [podcasts, sinPrograma, reglas, pagosComision] = await Promise.all([
    db.podcast.findMany({
      include: {
        contratos: {
          where: { estado: { not: "CANCELADO" } },
          include: { marca: { select: { nombre: true } }, director: { select: { nombre: true } }, hitos: true },
          orderBy: [{ estado: "asc" }, { inicio: "desc" }],
        },
      },
      orderBy: [{ activo: "desc" }, { nombre: "asc" }],
    }),
    db.contrato.findMany({ where: { tipo: "PODCAST", podcastId: null, estado: { not: "CANCELADO" } }, include: { marca: { select: { nombre: true } }, director: { select: { nombre: true } }, hitos: true } }),
    conComisiones ? reglasPara(s) : Promise.resolve([]),
    conComisiones ? db.pagoComision.findMany({ select: { hitoId: true, monto: true } }) : Promise.resolve([]),
  ]);

  const enPeriodo = (d: Date | null) => !!d && d >= periodo.desde && d <= periodo.hasta;
  type Contrato = (typeof podcasts)[number]["contratos"][number];
  const medir = (contratos: Contrato[]) => {
    const hitos = contratos.flatMap((c) => c.hitos.map((h) => ({ ...h, contrato: { id: c.id, directorId: c.directorId, marcaId: c.marcaId, tipo: c.tipo, inicio: c.inicio } })));
    const cobradoPeriodo = hitos.filter((h) => h.montoRecibido > 0 && enPeriodo(h.fechaPago ?? h.fechaFacturar)).reduce((a, h) => a + h.montoRecibido, 0);
    const cobradoTotal = hitos.reduce((a, h) => a + h.montoRecibido, 0);
    const porCobrar = contratos.filter((c) => c.estado === "VIGENTE" || c.estado === "PENDIENTE_FIRMA").flatMap((c) => c.hitos).reduce((a, h) => a + Math.max(h.importe - h.montoRecibido, 0), 0);
    const vigentes = contratos.filter((c) => c.estado === "VIGENTE");
    const comision = conComisiones ? comisionesPorHito(hitos.filter((h) => enPeriodo(h.fechaPago ?? h.fechaFacturar)), reglas, pagosComision).reduce((a, c) => a + c.comision, 0) : 0;
    return {
      contratos: contratos.length,
      vigentes: vigentes.length,
      marcas: new Set(contratos.map((c) => c.marca.nombre)).size,
      valorVigente: vigentes.reduce((a, c) => a + (c.monto ?? 0), 0),
      cobradoPeriodo,
      cobradoTotal,
      porCobrar,
      comision,
      neto: cobradoPeriodo - comision,
    };
  };

  const filas = [
    ...podcasts.map((pc) => ({ id: pc.id, nombre: pc.nombre, talento: pc.talento, activo: pc.activo, contratos: pc.contratos, m: medir(pc.contratos) })),
    ...(sinPrograma.length ? [{ id: "sin", nombre: "Sin programa asignado", talento: null, activo: true, contratos: sinPrograma as Contrato[], m: medir(sinPrograma as Contrato[]) }] : []),
  ].sort((a, b) => b.m.cobradoPeriodo - a.m.cobradoPeriodo);
  const total = filas.reduce((a, f) => ({ cobradoPeriodo: a.cobradoPeriodo + f.m.cobradoPeriodo, comision: a.comision + f.m.comision, porCobrar: a.porCobrar + f.m.porCobrar, vigentes: a.vigentes + f.m.vigentes }), { cobradoPeriodo: 0, comision: 0, porCobrar: 0, vigentes: 0 });

  return (
    <Pagina titulo="Reporte por pódcast" subtitulo={`Qué deja cada programa · ${periodo.etiqueta}`} acciones={<SelectorPeriodo ruta="/reportes/podcasts" actual={p.periodo ?? "anio"} desde={p.desde} hasta={p.hasta} />}>
      {filas.length === 0 ? (
        <Aviso>
          No hay pódcast dados de alta ni contratos de tipo pódcast. Da de alta los programas en <Link href="/podcasts" className="underline">Pódcast</Link> y asígnalos en cada contrato.
        </Aviso>
      ) : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Cifra etiqueta="Cobrado en el periodo" valor={dinero(total.cobradoPeriodo)} tono="ok" icono="dinero" nota="Todos los pódcast" />
            {conComisiones ? <Cifra etiqueta="Comisiones del periodo" valor={dinero(total.comision)} nota="Devengadas sobre esos cobros" /> : <Cifra etiqueta="Contratos vigentes" valor={total.vigentes} />}
            {conComisiones ? <Cifra etiqueta="Neto para la casa" valor={dinero(total.cobradoPeriodo - total.comision)} tono="acento" nota="Cobrado menos comisiones" /> : <Cifra etiqueta="Programas" valor={filas.length} />}
            <Cifra etiqueta="Por cobrar" valor={dinero(total.porCobrar)} tono="alerta" nota="Contratos vigentes y por firmar" />
          </div>

          <div className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
            <Tarjeta titulo="Cobrado por programa" descripcion={periodo.etiqueta}>
              <Barras datos={filas.map((f) => ({ etiqueta: f.nombre, valor: f.m.cobradoPeriodo, tono: f.id === "sin" ? "neutro" : "ok" }))} formato={dineroCorto} />
            </Tarjeta>
            <Tarjeta titulo="Comparativo" className="xl:col-span-2">
              <Tabla>
                <thead>
                  <tr>
                    <Th>Programa</Th>
                    <Th derecha>Marcas</Th>
                    <Th derecha>Vigentes</Th>
                    <Th derecha>Valor vigente</Th>
                    <Th derecha>Cobrado periodo</Th>
                    {conComisiones ? <Th derecha>Comisión</Th> : null}
                    {conComisiones ? <Th derecha>Neto casa</Th> : null}
                    <Th derecha>Por cobrar</Th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map((f) => (
                    <tr key={f.id}>
                      <Td>
                        <div className="font-medium">{f.nombre}</div>
                        <div className="text-xs text-tinta-3">{f.talento ?? ""}</div>
                      </Td>
                      <Td derecha>{f.m.marcas}</Td>
                      <Td derecha>{f.m.vigentes}</Td>
                      <Td derecha>{dinero(f.m.valorVigente)}</Td>
                      <Td derecha className="font-medium">{dinero(f.m.cobradoPeriodo)}</Td>
                      {conComisiones ? <Td derecha>{dinero(f.m.comision)}</Td> : null}
                      {conComisiones ? <Td derecha className="font-medium text-acento">{dinero(f.m.neto)}</Td> : null}
                      <Td derecha>{dinero(f.m.porCobrar)}</Td>
                    </tr>
                  ))}
                </tbody>
              </Tabla>
            </Tarjeta>
          </div>

          {filas.map((f) => (
            <div key={f.id} className="mb-5">
              <Tarjeta titulo={f.nombre} descripcion={`${f.m.contratos} contrato(s) · cobrado histórico ${dinero(f.m.cobradoTotal)}`}>
                {f.contratos.length === 0 ? (
                  <Vacio>Sin contratos ligados a este programa.</Vacio>
                ) : (
                  <Tabla>
                    <thead>
                      <tr>
                        <Th>Marca · proyecto</Th>
                        <Th>Director</Th>
                        <Th>Estado</Th>
                        <Th>Vigencia</Th>
                        <Th derecha>Monto</Th>
                        <Th derecha>Cobrado</Th>
                        <Th derecha>Pendiente</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {f.contratos.map((c) => {
                        const cobrado = c.hitos.reduce((a, h) => a + h.montoRecibido, 0);
                        const pend = c.hitos.reduce((a, h) => a + Math.max(h.importe - h.montoRecibido, 0), 0);
                        return (
                          <tr key={c.id}>
                            <Td>
                              <Link href={`/contratos/${c.id}`} className="font-medium text-acento hover:underline">{c.marca.nombre}</Link>
                              <div className="text-xs text-tinta-2">{c.proyecto}</div>
                            </Td>
                            <Td className="text-tinta-2">{c.director.nombre}</Td>
                            <Td><Etiqueta tono={c.estado === "VIGENTE" ? "ok" : c.estado === "PENDIENTE_FIRMA" ? "alerta" : c.estado === "PROPUESTA" ? "acento" : "neutro"}>{etiqueta("estadoContrato", c.estado)}</Etiqueta></Td>
                            <Td className="text-xs text-tinta-2">{fecha(c.inicio)} → {fecha(c.vencimiento)}</Td>
                            <Td derecha>{dinero(c.monto)}</Td>
                            <Td derecha>{dinero(cobrado)}</Td>
                            <Td derecha>{dinero(pend)}</Td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Tabla>
                )}
              </Tarjeta>
            </div>
          ))}
        </>
      )}
    </Pagina>
  );
}
