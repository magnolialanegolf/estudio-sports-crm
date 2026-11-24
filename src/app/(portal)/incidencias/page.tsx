import Link from "next/link";
import { startOfDay } from "date-fns";
import { db } from "@/lib/db";
import { requerirSesion, veTodo } from "@/lib/acceso";
import { filtroIncidencias } from "@/lib/incidencias";
import { etiqueta, fecha, diasHasta, textoDias } from "@/lib/formato";
import { Boton, Cifra, Etiqueta, Pagina, Tabla, Tarjeta, Td, Th, Vacio } from "@/components/ui";

export const tonoPrioridad = { BAJA: "neutro", MEDIA: "acento", ALTA: "alerta", URGENTE: "riesgo" } as const;
export const tonoEstadoInc = { ABIERTA: "alerta", EN_ATENCION: "acento", RESUELTA: "ok", CERRADA: "neutro" } as const;

export default async function Incidencias({ searchParams }: { searchParams: Promise<{ ver?: string }> }) {
  const s = await requerirSesion();
  const { ver } = await searchParams;
  const hoy = startOfDay(new Date());
  const soloAbiertas = ver !== "todas";
  const lista = await db.incidencia.findMany({
    where: { ...filtroIncidencias(s), ...(soloAbiertas ? { estado: { in: ["ABIERTA", "EN_ATENCION"] } } : {}) },
    include: { reportadoPor: { select: { nombre: true } }, asignadoA: { select: { nombre: true } }, contrato: { select: { id: true, proyecto: true, marca: { select: { nombre: true } } } }, marca: { select: { nombre: true } }, _count: { select: { comentarios: true } } },
    orderBy: [{ estado: "asc" }, { prioridad: "desc" }, { fechaLimite: "asc" }, { creadoEn: "desc" }],
  });
  const orden = { URGENTE: 0, ALTA: 1, MEDIA: 2, BAJA: 3 };
  lista.sort((a, b) => (a.estado === b.estado ? orden[a.prioridad] - orden[b.prioridad] : 0));
  const abiertas = lista.filter((i) => i.estado === "ABIERTA" || i.estado === "EN_ATENCION");
  const urgentes = abiertas.filter((i) => i.prioridad === "URGENTE");
  const vencidas = abiertas.filter((i) => i.fechaLimite && i.fechaLimite < hoy);
  const mias = abiertas.filter((i) => i.asignadoAId === s.usuarioId);

  return (
    <Pagina
      titulo="Incidencias y pendientes"
      subtitulo="Problemas, pendientes y solicitudes de cualquier nivel, con responsable, prioridad y fecha límite"
      acciones={
        <>
          <Link href="/incidencias" className={`rounded border px-3 py-1.5 text-xs font-medium ${soloAbiertas ? "border-acento bg-acento-suave text-acento" : "border-linea text-tinta-2"}`}>Abiertas</Link>
          <Link href="/incidencias?ver=todas" className={`rounded border px-3 py-1.5 text-xs font-medium ${!soloAbiertas ? "border-acento bg-acento-suave text-acento" : "border-linea text-tinta-2"}`}>Todas</Link>
          <Boton href="/incidencias/nueva" tipo="primario">Reportar</Boton>
        </>
      }
    >
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Cifra etiqueta="Urgentes" valor={urgentes.length} tono={urgentes.length ? "riesgo" : "ok"} nota="Abiertas con prioridad urgente" />
        <Cifra etiqueta="Vencidas" valor={vencidas.length} tono={vencidas.length ? "riesgo" : "ok"} nota="Fecha límite pasada" />
        <Cifra etiqueta="Asignadas a mí" valor={mias.length} tono={mias.length ? "alerta" : "neutro"} />
        <Cifra etiqueta="Abiertas" valor={abiertas.length} nota={veTodo(s) ? "De toda la empresa" : "Que te involucran"} />
      </div>
      <Tarjeta>
        {lista.length === 0 ? (
          <Vacio>Sin incidencias. Reporta un pendiente, un problema o una solicitud y asígnalo a quien corresponda.</Vacio>
        ) : (
          <Tabla>
            <thead>
              <tr>
                <Th>Asunto</Th>
                <Th>Tipo</Th>
                <Th>Prioridad</Th>
                <Th>Responsable</Th>
                <Th>Fecha límite</Th>
                <Th>Estado</Th>
              </tr>
            </thead>
            <tbody>
              {lista.map((i) => {
                const d = diasHasta(i.fechaLimite, hoy);
                const abierta = i.estado === "ABIERTA" || i.estado === "EN_ATENCION";
                const vencida = abierta && d !== null && d < 0;
                return (
                  <tr key={i.id} className="hover:bg-superficie-2">
                    <Td>
                      <Link href={`/incidencias/${i.id}`} className="font-medium text-acento hover:underline">{i.titulo}</Link>
                      <div className="text-xs text-tinta-3">
                        {i.contrato ? `${i.contrato.marca.nombre} · ${i.contrato.proyecto} · ` : i.marca ? `${i.marca.nombre} · ` : ""}reportó {i.reportadoPor.nombre} · {fecha(i.creadoEn)}{i._count.comentarios ? ` · ${i._count.comentarios} comentario(s)` : ""}
                      </div>
                    </Td>
                    <Td className="text-tinta-2">{etiqueta("tipoIncidencia", i.tipo)}</Td>
                    <Td><Etiqueta tono={tonoPrioridad[i.prioridad]}>{etiqueta("prioridad", i.prioridad)}</Etiqueta></Td>
                    <Td className="text-tinta-2">{i.asignadoA?.nombre ?? <span className="text-tinta-3">Sin asignar</span>}</Td>
                    <Td>
                      <div>{fecha(i.fechaLimite)}</div>
                      {abierta && i.fechaLimite ? <Etiqueta tono={vencida ? "riesgo" : d !== null && d <= 3 ? "alerta" : "neutro"}>{vencida ? `vencida ${Math.abs(d!)} d` : textoDias(d)}</Etiqueta> : null}
                    </Td>
                    <Td><Etiqueta tono={tonoEstadoInc[i.estado]}>{etiqueta("estadoIncidencia", i.estado)}</Etiqueta></Td>
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
