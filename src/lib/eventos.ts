import { db } from "./db";
import type { Sesion } from "./sesion";
import { esProduccion, filtroCompromisos, filtroContratos } from "./acceso";

// Eventos del calendario personal de un usuario: los mismos para la liga de suscripción (ICS)
// y para la sincronización push a Google Calendar. Cada quien ve solo lo suyo.

export type Evento = { uid: string; fecha: Date; titulo: string; descripcion: string; categoria: "Acciones" | "Cobros" | "Contratos" | "Pendientes"; href: string };

export async function eventosDeUsuario(u: { id: string; usuario: string; nombre: string; rol: Sesion["rol"]; directorId: string | null }): Promise<Evento[]> {
  const s: Sesion = { usuarioId: u.id, usuario: u.usuario, nombre: u.nombre, rol: u.rol, directorId: u.directorId };
  const produccion = esProduccion(s);
  const filtro = filtroContratos(s);

  const [compromisos, hitos, vencimientos, pendientes] = await Promise.all([
    db.compromiso.findMany({
      where: { ...filtroCompromisos(s), ...(produccion ? { etapa: { not: "POR_AUTORIZAR" } } : {}), fecha: { not: null }, estado: { in: ["PENDIENTE", "EN_CURSO", "REQUIERE_ATENCION"] } },
      include: { contrato: { select: { id: true, proyecto: true, marca: { select: { nombre: true } } } }, asignadoA: { select: { nombre: true } } },
    }),
    produccion
      ? Promise.resolve([])
      : db.hitoCobro.findMany({
          where: { contrato: { ...filtro, estado: { in: ["VIGENTE", "PENDIENTE_FIRMA"] } }, fechaFacturar: { not: null }, estadoPago: { not: "PAGADO" } },
          include: { contrato: { select: { id: true, marca: { select: { nombre: true } } } } },
        }),
    produccion ? Promise.resolve([]) : db.contrato.findMany({ where: { ...filtro, estado: "VIGENTE", vencimiento: { not: null } }, select: { id: true, proyecto: true, vencimiento: true, marca: { select: { nombre: true } } } }),
    db.incidencia.findMany({ where: { asignadoAId: u.id, fechaLimite: { not: null }, estado: { in: ["ABIERTA", "EN_ATENCION"] } }, select: { id: true, titulo: true, descripcion: true, fechaLimite: true, prioridad: true } }),
  ]);

  const eventos: Evento[] = [];
  for (const k of compromisos) {
    const pref = k.tipo === "FECHA_CLAVE" ? "Fecha clave" : k.tipo === "ENTREGABLE" ? "Entregable" : "Seguimiento";
    eventos.push({
      uid: `compromiso-${k.id}`,
      fecha: k.fecha!,
      titulo: `${pref} · ${k.contrato.marca.nombre} · ${k.descripcion}`,
      descripcion: [k.contrato.proyecto, k.asignadoA ? `Responsable: ${k.asignadoA.nombre}` : k.responsable ? `Responsable: ${k.responsable}` : "", k.notas ?? ""].filter(Boolean).join("\n"),
      categoria: "Acciones",
      href: `/tareas/${k.id}`,
    });
  }
  for (const h of hitos) eventos.push({ uid: `hito-${h.id}`, fecha: h.fechaFacturar!, titulo: `Facturar · ${h.contrato.marca.nombre} · ${h.concepto} · $${h.importe.toLocaleString("es-MX")}`, descripcion: h.notas ?? "", categoria: "Cobros", href: "/pagos" });
  for (const i of pendientes) eventos.push({ uid: `incidencia-${i.id}`, fecha: i.fechaLimite!, titulo: `Pendiente · ${i.titulo}`, descripcion: `${i.descripcion ?? ""}${i.prioridad === "URGENTE" ? "\nUrgente" : ""}`.trim(), categoria: "Pendientes", href: `/incidencias/${i.id}` });
  for (const c of vencimientos) eventos.push({ uid: `vence-${c.id}`, fecha: c.vencimiento!, titulo: `Vence contrato · ${c.marca.nombre} · ${c.proyecto}`, descripcion: "Preparar renovación.", categoria: "Contratos", href: `/contratos/${c.id}` });
  return eventos;
}
