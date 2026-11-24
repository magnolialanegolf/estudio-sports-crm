import Link from "next/link";
import { startOfDay } from "date-fns";
import type { EtapaEntregable } from "@prisma/client";
import { db } from "@/lib/db";
import { filtroContratos, requerirComercial, veTodo } from "@/lib/acceso";
import { directoresVisibles } from "@/lib/consultas";
import { enCanchaDe, ETAPAS, ETIQUETA_ETAPA } from "@/lib/produccion";
import { fecha, diasHasta, textoDias } from "@/lib/formato";
import { Cifra, Etiqueta, Pagina, Tabla, Tarjeta, Td, Th, Vacio } from "@/components/ui";
import { ChipEtapa } from "@/components/etapas";
import { Barras } from "@/components/graficas";

// Cadena de producción vista por comercial y dirección: cada entregable abierto, en qué etapa va,
// en cancha de quién está, cuántos días lleva ahí y por qué, si alguien lo explicó.
export default async function Produccion({ searchParams }: { searchParams: Promise<{ director?: string; quien?: string; ver?: string }> }) {
  const s = await requerirComercial();
  const { director, quien, ver } = await searchParams;
  const global = veTodo(s);
  const directorId = global ? director || undefined : undefined;
  const hoy = startOfDay(new Date());

  const [entregables, directores] = await Promise.all([
    db.compromiso.findMany({
      where: {
        contrato: directorId ? { directorId } : filtroContratos(s),
        tipo: "ENTREGABLE",
        ...(ver === "todos" ? {} : { estado: { in: ["PENDIENTE", "EN_CURSO", "REQUIERE_ATENCION"] } }),
      },
      include: {
        contrato: { select: { id: true, proyecto: true, marca: { select: { nombre: true } }, director: { select: { id: true, nombre: true } } } },
        asignadoA: { select: { id: true, nombre: true } },
        editor: { select: { id: true, nombre: true } },
        avances: { orderBy: { fecha: "desc" }, take: 1, include: { usuario: { select: { nombre: true } } } },
      },
      orderBy: [{ fecha: "asc" }],
    }),
    global ? directoresVisibles(s) : Promise.resolve([]),
  ]);

  const filas = entregables
    .map((k) => {
      const cancha = enCanchaDe(k);
      const d = diasHasta(k.fecha, hoy);
      const retraso = k.estado !== "CUMPLIDO" && d !== null && d < 0 ? Math.abs(d) : 0;
      const enEtapa = Math.max(0, Math.floor((hoy.getTime() - startOfDay(k.etapaDesde).getTime()) / 86_400_000));
      const ultimo = k.avances[0];
      const motivo = k.estado === "REQUIERE_ATENCION" ? k.reporte?.split("\n").pop() ?? "Requiere atención" : ultimo?.nota ?? null;
      return { k, cancha, d, retraso, enEtapa, ultimo, motivo };
    })
    .filter((f) => !quien || f.cancha?.quien === quien);
  filas.sort((a, b) => b.retraso - a.retraso || (a.k.fecha?.getTime() ?? Infinity) - (b.k.fecha?.getTime() ?? Infinity));

  const abiertos = filas.filter((f) => f.cancha);
  const retrasados = abiertos.filter((f) => f.retraso > 0);
  const atencion = abiertos.filter((f) => f.k.estado === "REQUIERE_ATENCION");
  const sinAsignar = abiertos.filter((f) => f.cancha?.sinAsignar);
  const porEtapa = ETAPAS.filter((e) => e !== "PUBLICADO").map((e) => ({ etiqueta: ETIQUETA_ETAPA[e], valor: abiertos.filter((f) => f.k.etapa === e).length, tono: (e === "POR_PRODUCIR" ? "alerta" : e === "EDITADO" ? "acento" : "neutro") as "alerta" | "acento" | "neutro" }));
  const porPersona = Array.from(
    abiertos.reduce((m, f) => {
      const q = f.cancha!.quien;
      const v = m.get(q) ?? { abiertos: 0, retrasados: 0 };
      v.abiertos += 1;
      if (f.retraso > 0) v.retrasados += 1;
      m.set(q, v);
      return m;
    }, new Map<string, { abiertos: number; retrasados: number }>()),
  ).sort((a, b) => b[1].retrasados - a[1].retrasados || b[1].abiertos - a[1].abiertos);

  const liga = (extra: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const todo = { director: directorId, quien, ver, ...extra };
    for (const [k, v] of Object.entries(todo)) if (v) p.set(k, v);
    const qs = p.toString();
    return qs ? `/produccion?${qs}` : "/produccion";
  };

  return (
    <Pagina
      titulo="Producción"
      subtitulo="Cada entregable abierto: en qué etapa va, en cancha de quién está y desde cuándo."
      acciones={
        <form method="get" action="/produccion" className="no-imprimir flex flex-wrap items-center gap-2">
          {quien ? <input type="hidden" name="quien" value={quien} /> : null}
          {ver ? <input type="hidden" name="ver" value={ver} /> : null}
          {global ? (
            <select name="director" defaultValue={directorId ?? ""} className="campo h-9 !w-auto max-w-[14rem] !py-0 text-sm">
              <option value="">Todos los directores</option>
              {directores.map((d) => (
                <option key={d.id} value={d.id}>{d.nombre}{d.esDemo ? " (demo)" : ""}</option>
              ))}
            </select>
          ) : null}
          <button type="submit" className="inline-flex h-9 items-center rounded-md border border-linea-fuerte bg-superficie px-3.5 text-sm font-medium shadow-sm hover:border-acento-2 hover:text-acento">Aplicar</button>
          <Link href={liga({ ver: ver === "todos" ? undefined : "todos" })} className="inline-flex h-9 items-center rounded-md border border-linea px-3.5 text-sm font-medium text-tinta-2 hover:bg-superficie-2">{ver === "todos" ? "Solo abiertos" : "Incluir publicados"}</Link>
        </form>
      }
    >
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Cifra etiqueta="Entregables abiertos" valor={abiertos.length} icono="tareas" nota="En producción, edición o por publicar" />
        <Cifra etiqueta="Retrasados" valor={retrasados.length} tono={retrasados.length ? "riesgo" : "ok"} icono="alerta" nota="Pasó la fecha comprometida con la marca" />
        <Cifra etiqueta="Requieren atención" valor={atencion.length} tono={atencion.length ? "alerta" : "ok"} nota="Alguien avisó que algo falta" />
        <Cifra etiqueta="Sin responsable" valor={sinAsignar.length} tono={sinAsignar.length ? "alerta" : "ok"} nota="Nadie los puede mover" />
      </div>

      <div className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Tarjeta titulo="Por etapa" descripcion="Dónde está el trabajo hoy">
          <Barras datos={porEtapa} formato={(n) => String(n)} />
        </Tarjeta>
        <Tarjeta titulo="En cancha de" descripcion="Quién tiene qué, y cuánto de eso va tarde" className="xl:col-span-2">
          {porPersona.length === 0 ? (
            <Vacio>Nada abierto.</Vacio>
          ) : (
            <ul className="-mx-5 divide-y divide-linea/70 text-sm">
              {porPersona.map(([nombre, v]) => (
                <li key={nombre} className="flex items-center justify-between gap-3 px-5 py-2">
                  <Link href={liga({ quien: quien === nombre ? undefined : nombre })} className={`font-medium hover:underline ${quien === nombre ? "text-naranja" : "text-acento"}`}>{nombre}</Link>
                  <span className="flex items-center gap-2">
                    <span className="text-tinta-2">{v.abiertos} abierto(s)</span>
                    {v.retrasados ? <Etiqueta tono="riesgo">{v.retrasados} retrasado(s)</Etiqueta> : <Etiqueta tono="ok">en tiempo</Etiqueta>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>
      </div>

      <Tarjeta titulo={quien ? `Entregables en cancha de ${quien}` : "Todos los entregables"} acciones={quien ? <Link href={liga({ quien: undefined })} className="text-xs font-medium text-acento hover:underline">Quitar filtro</Link> : undefined}>
        {filas.length === 0 ? (
          <Vacio>Sin entregables con ese filtro.</Vacio>
        ) : (
          <Tabla>
            <thead>
              <tr>
                <Th>Marca · entregable</Th>
                <Th>Fecha con la marca</Th>
                <Th>Etapa</Th>
                <Th>En cancha de</Th>
                <Th>Último movimiento · motivo</Th>
                {global ? <Th>Director</Th> : null}
              </tr>
            </thead>
            <tbody>
              {filas.map(({ k, cancha, d, retraso, enEtapa, ultimo, motivo }) => (
                <tr key={k.id} className={`hover:bg-superficie-2 ${retraso > 0 ? "bg-riesgo-suave/40" : ""}`}>
                  <Td>
                    <Link href={`/tareas/${k.id}`} className="font-medium text-acento hover:underline">{k.contrato.marca.nombre}</Link>
                    <div className={k.estado === "CUMPLIDO" ? "text-tinta-3 line-through" : "text-tinta"}>{k.descripcion}</div>
                    <div className="text-xs text-tinta-3">{k.contrato.proyecto}</div>
                  </Td>
                  <Td>
                    <div>{fecha(k.fecha)}</div>
                    {cancha ? <Etiqueta tono={retraso > 0 ? "riesgo" : d !== null && d <= 7 ? "alerta" : "neutro"}>{retraso > 0 ? `retrasado ${retraso} d` : textoDias(d)}</Etiqueta> : null}
                  </Td>
                  <Td>
                    <ChipEtapa etapa={k.etapa} />
                    {cancha ? <div className="mt-0.5 text-xs text-tinta-3">{enEtapa === 0 ? "desde hoy" : `${enEtapa} d en esta etapa`}</div> : k.publicadoEn ? <div className="mt-0.5 text-xs text-tinta-3">{fecha(k.publicadoEn)}</div> : null}
                  </Td>
                  <Td>
                    {cancha ? (
                      <>
                        <div className={`font-medium ${cancha.sinAsignar ? "text-alerta" : retraso > 0 ? "text-riesgo" : "text-tinta"}`}>{cancha.quien}</div>
                        <div className="text-xs text-tinta-3">{cancha.area}</div>
                      </>
                    ) : (
                      <span className="text-xs text-tinta-3">Cerrado</span>
                    )}
                  </Td>
                  <Td>
                    {ultimo ? <div className="text-xs text-tinta-2">{fecha(ultimo.fecha)} · {ultimo.usuario?.nombre ?? "—"}: {ETIQUETA_ETAPA[ultimo.deEtapa as EtapaEntregable]} → {ETIQUETA_ETAPA[ultimo.aEtapa as EtapaEntregable]}</div> : <div className="text-xs text-tinta-3">Sin movimientos</div>}
                    {motivo ? <div className={`mt-0.5 max-w-sm text-xs ${k.estado === "REQUIERE_ATENCION" ? "font-medium text-riesgo" : "text-tinta-2"}`}>{motivo.length > 140 ? `${motivo.slice(0, 140)}…` : motivo}</div> : null}
                  </Td>
                  {global ? <Td className="text-tinta-2">{k.contrato.director.nombre}</Td> : null}
                </tr>
              ))}
            </tbody>
          </Tabla>
        )}
      </Tarjeta>
    </Pagina>
  );
}
