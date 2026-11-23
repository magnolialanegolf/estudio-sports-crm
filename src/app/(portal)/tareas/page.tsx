import Link from "next/link";
import { startOfDay, addDays } from "date-fns";
import { db } from "@/lib/db";
import { esProduccion, filtroCompromisos, requerirSesion, veTodo } from "@/lib/acceso";
import { etiqueta, fecha, diasHasta, textoDias } from "@/lib/formato";
import { Aviso, Cifra, Etiqueta, Pagina, Tabla, Tarjeta, Td, Th, Vacio } from "@/components/ui";
import { ReportarRapido } from "./paneles";

// Tareas: compromisos con las marcas y seguimientos, vistos como trabajo por hacer.
// Producción ve solo lo que tiene asignado y sin ningún dato económico.
export default async function Tareas({ searchParams }: { searchParams: Promise<{ ver?: string; asignado?: string }> }) {
  const s = await requerirSesion();
  const { ver, asignado } = await searchParams;
  const hoy = startOfDay(new Date());
  const produccion = esProduccion(s);
  const filtro = filtroCompromisos(s);
  const soloAbiertas = ver !== "todas";

  const [tareas, asignables] = await Promise.all([
    db.compromiso.findMany({
      where: {
        ...filtro,
        ...(soloAbiertas ? { estado: { in: ["PENDIENTE", "EN_CURSO", "REQUIERE_ATENCION"] } } : {}),
        ...(asignado ? { asignadoAId: asignado } : {}),
      },
      include: {
        contrato: { select: { id: true, codigo: true, proyecto: true, marca: { select: { nombre: true } }, director: { select: { nombre: true } } } },
        asignadoA: { select: { id: true, nombre: true } },
      },
      orderBy: [{ estado: "asc" }, { fecha: "asc" }],
    }),
    produccion ? Promise.resolve([]) : db.usuario.findMany({ where: { activo: true, rol: { in: ["PRODUCCION", "ADMIN_GENERAL", "DIRECTOR"] } }, select: { id: true, nombre: true, rol: true }, orderBy: { nombre: "asc" } }),
  ]);

  const abiertas = tareas.filter((t) => t.estado === "PENDIENTE" || t.estado === "EN_CURSO" || t.estado === "REQUIERE_ATENCION");
  const retrasadas = abiertas.filter((t) => t.fecha && t.fecha < hoy);
  const estaSemana = abiertas.filter((t) => t.fecha && t.fecha >= hoy && t.fecha <= addDays(hoy, 7));
  const sinFecha = abiertas.filter((t) => !t.fecha);
  const sinAsignar = abiertas.filter((t) => !t.asignadoAId && t.tipo === "ENTREGABLE");

  return (
    <Pagina
      titulo={produccion ? "Mis tareas" : "Tareas"}
      subtitulo={produccion ? "Lo que tienes que producir, con marca y fecha. Reporta cada una al terminarla." : "Compromisos con las marcas y seguimientos, por fecha y responsable"}
      acciones={
        <div className="flex flex-wrap gap-2">
          <Link href="/tareas" className={`rounded border px-3 py-1.5 text-xs font-medium ${soloAbiertas ? "border-acento bg-acento-suave text-acento" : "border-linea text-tinta-2"}`}>Abiertas</Link>
          <Link href="/tareas?ver=todas" className={`rounded border px-3 py-1.5 text-xs font-medium ${!soloAbiertas ? "border-acento bg-acento-suave text-acento" : "border-linea text-tinta-2"}`}>Todas</Link>
          {!produccion && asignables.length > 0 ? (
            <form method="get" action="/tareas" className="flex items-center gap-1.5">
              {!soloAbiertas ? <input type="hidden" name="ver" value="todas" /> : null}
              <select name="asignado" defaultValue={asignado ?? ""} className="campo !w-auto !py-1.5 text-xs">
                <option value="">Cualquier responsable</option>
                {asignables.map((u) => (
                  <option key={u.id} value={u.id}>{u.nombre}</option>
                ))}
              </select>
              <button type="submit" className="rounded border border-linea-fuerte bg-superficie px-3 py-1.5 text-xs font-medium hover:bg-superficie-2">Filtrar</button>
            </form>
          ) : null}
        </div>
      }
    >
      {produccion && retrasadas.length > 0 ? (
        <div className="mb-5">
          <Aviso tono="riesgo">Tienes {retrasadas.length} tarea(s) con fecha vencida sin reportar. Repórtalas como cumplidas o avisa al director del retraso.</Aviso>
        </div>
      ) : null}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Cifra etiqueta="Retrasadas" valor={retrasadas.length} tono={retrasadas.length > 0 ? "riesgo" : "ok"} nota="Fecha pasada sin cumplir" />
        <Cifra etiqueta="Esta semana" valor={estaSemana.length} tono={estaSemana.length > 0 ? "alerta" : "neutro"} nota="Próximos 7 días" />
        <Cifra etiqueta="Abiertas" valor={abiertas.length} nota={`${sinFecha.length} sin fecha`} />
        {produccion ? (
          <Cifra etiqueta="Cumplidas" valor={tareas.filter((t) => t.estado === "CUMPLIDO").length} tono="ok" nota={soloAbiertas ? "Ver en «Todas»" : "En la lista"} />
        ) : (
          <Cifra etiqueta="Entregables sin responsable" valor={sinAsignar.length} tono={sinAsignar.length > 0 ? "alerta" : "ok"} nota="Asígnalos desde el contrato" />
        )}
      </div>

      <Tarjeta>
        {tareas.length === 0 ? (
          <Vacio>{produccion ? "No tienes tareas asignadas." : "Sin tareas con ese filtro."}</Vacio>
        ) : (
          <Tabla>
            <thead>
              <tr>
                <Th>Marca · tarea</Th>
                <Th>Fecha</Th>
                <Th>Responsable</Th>
                {veTodo(s) ? <Th>Director</Th> : null}
                <Th>Estado</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {tareas.map((t) => {
                const d = diasHasta(t.fecha, hoy);
                const abierta = t.estado === "PENDIENTE" || t.estado === "EN_CURSO" || t.estado === "REQUIERE_ATENCION";
                const retrasada = abierta && d !== null && d < 0;
                return (
                  <tr key={t.id} className="hover:bg-superficie-2">
                    <Td>
                      <Link href={`/tareas/${t.id}`} className="font-medium text-acento hover:underline">{t.contrato.marca.nombre}</Link>
                      <div className={t.estado === "CUMPLIDO" ? "text-tinta-3 line-through" : "text-tinta"}>{t.descripcion}</div>
                      <div className="text-xs text-tinta-3">{etiqueta("tipoCompromiso", t.tipo)}{produccion ? "" : ` · ${t.contrato.proyecto}`}</div>
                    </Td>
                    <Td>
                      <div>{fecha(t.fecha)}</div>
                      {abierta ? <Etiqueta tono={retrasada ? "riesgo" : d !== null && d <= 7 ? "alerta" : "neutro"}>{retrasada ? `retrasada ${Math.abs(d!)} d` : textoDias(d)}</Etiqueta> : null}
                    </Td>
                    <Td className="text-tinta-2">{t.asignadoA?.nombre ?? t.responsable ?? <span className="text-tinta-3">Sin asignar</span>}</Td>
                    {veTodo(s) ? <Td className="text-tinta-2">{t.contrato.director.nombre}</Td> : null}
                    <Td>
                      <Etiqueta tono={t.estado === "CUMPLIDO" ? "ok" : t.estado === "REQUIERE_ATENCION" ? "riesgo" : t.estado === "EN_CURSO" ? "acento" : t.estado === "CANCELADO" ? "neutro" : retrasada ? "riesgo" : "alerta"}>{retrasada ? "Retrasada" : etiqueta("estadoCompromiso", t.estado)}</Etiqueta>
                      {t.cumplidoEn ? <div className="text-xs text-tinta-3">{fecha(t.cumplidoEn)}</div> : null}
                    </Td>
                    <Td>{abierta ? <ReportarRapido compromisoId={t.id} /> : null}</Td>
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
