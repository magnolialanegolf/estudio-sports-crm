"use server";

import { revalidatePath } from "next/cache";
import type { EtapaEntregable } from "@prisma/client";
import { endOfMonth, startOfMonth, format } from "date-fns";
import { es } from "date-fns/locale";
import { db } from "@/lib/db";
import { registrar } from "@/lib/bitacora";
import { notificar, responsablesDeContrato } from "@/lib/avisos";
import { autorizaContrato, esProduccion, puedeCapturar, requerirSesion } from "@/lib/acceso";
import { anterior, ETAPAS, ETIQUETA_ETAPA, puedeMover, siguiente } from "@/lib/produccion";
import type { Resultado } from "./util";

function revalidar(contratoId: string, compromisoId: string) {
  revalidatePath(`/tareas/${compromisoId}`);
  revalidatePath("/tareas");
  revalidatePath(`/tareas/contrato/${contratoId}`);
  revalidatePath(`/contratos/${contratoId}`);
  revalidatePath("/avisos");
  revalidatePath("/");
}

// Mueve un entregable a otra etapa de la cadena, deja constancia y avisa a quien sigue.
export async function avanzarEntregable(compromisoId: string, _prev: Resultado, fd: FormData): Promise<Resultado> {
  const s = await requerirSesion();
  const k = await db.compromiso.findUnique({
    where: { id: compromisoId },
    include: { contrato: { select: { id: true, directorId: true, marca: { select: { nombre: true } } } }, asignadoA: { select: { nombre: true } }, editor: { select: { nombre: true } } },
  });
  if (!k) return { error: "Tarea no encontrada." };
  if (k.tipo !== "ENTREGABLE") return { error: "Solo los entregables recorren la cadena de producción." };
  const a = String(fd.get("aEtapa") ?? "") as EtapaEntregable;
  if (!ETAPAS.includes(a)) return { error: "Etapa inválida." };
  const nota = String(fd.get("nota") ?? "").trim().slice(0, 1000) || null;
  const liga = String(fd.get("liga") ?? "").trim().slice(0, 500) || null;

  const actor = {
    esComercial: !esProduccion(s) && puedeCapturar(s) && autorizaContrato(s, k.contrato),
    esAsignado: k.asignadoAId === s.usuarioId,
    esEditor: k.editorId === s.usuarioId,
  };
  if (!puedeMover(actor, k.etapa, a)) return { error: "No te corresponde mover este entregable a esa etapa." };
  const regreso = anterior(k.etapa) === a || ETAPAS.indexOf(a) < ETAPAS.indexOf(k.etapa);
  if (regreso && !nota) return { error: "Para regresar una etapa, explica por qué." };

  const ahora = new Date();
  await db.$transaction([
    db.compromiso.update({
      where: { id: compromisoId },
      data: {
        etapa: a,
        etapaDesde: ahora,
        liga: liga ?? k.liga,
        autorizadoEn: a === "POR_AUTORIZAR" ? null : (k.autorizadoEn ?? ahora),
        autorizadoPorId: a === "POR_AUTORIZAR" ? null : (k.autorizadoPorId ?? s.usuarioId),
        grabadoEn: a === "GRABADO" ? ahora : ETAPAS.indexOf(a) < ETAPAS.indexOf("GRABADO") ? null : k.grabadoEn,
        editadoEn: a === "EDITADO" ? ahora : ETAPAS.indexOf(a) < ETAPAS.indexOf("EDITADO") ? null : k.editadoEn,
        publicadoEn: a === "PUBLICADO" ? ahora : null,
        estado: a === "PUBLICADO" ? "CUMPLIDO" : k.estado === "CUMPLIDO" || k.estado === "PENDIENTE" ? "EN_CURSO" : k.estado,
        cumplidoEn: a === "PUBLICADO" ? (k.cumplidoEn ?? ahora) : null,
        reporte: nota ? `${k.reporte ? `${k.reporte}\n` : ""}[${ETIQUETA_ETAPA[a]}] ${nota}` : k.reporte,
      },
    }),
    db.avanceCompromiso.create({ data: { compromisoId, usuarioId: s.usuarioId, deEtapa: k.etapa, aEtapa: a, nota } }),
  ]);

  // Avisos: a quien sigue en la cadena y al comercial que la pidió.
  const marca = k.contrato.marca.nombre;
  const href = `/tareas/${compromisoId}`;
  const comercial = await responsablesDeContrato(k.contrato.directorId);
  if (regreso) {
    await notificar([k.asignadoAId, k.editorId, ...comercial], `${s.nombre} regresó a «${ETIQUETA_ETAPA[a]}»: ${marca} · ${k.descripcion}. Motivo: ${nota}`, href, s.usuarioId);
  } else if (a === "POR_PRODUCIR" && k.etapa === "POR_AUTORIZAR") {
    await notificar([k.asignadoAId, k.editorId], `${s.nombre} autorizó la ejecución: ${marca} · ${k.descripcion}${k.fecha ? ` · para el ${k.fecha.toLocaleDateString("es-MX", { day: "numeric", month: "short" })}` : ""}. Ya está en tu calendario.`, href, s.usuarioId);
    if (!k.asignadoAId) await notificar(comercial, `Autorizado sin responsable de producción: ${marca} · ${k.descripcion}. Asigna a alguien.`, href, s.usuarioId);
  } else if (a === "GRABADO") {
    if (k.editorId) await notificar([k.editorId], `Listo para editar: ${marca} · ${k.descripcion} (grabó ${s.nombre})`, href, s.usuarioId);
    await notificar(comercial, k.editorId ? `${s.nombre} grabó ${marca} · ${k.descripcion}; pasa a edición con ${k.editor?.nombre}.` : `${s.nombre} grabó ${marca} · ${k.descripcion}. Falta asignar editor.`, href, s.usuarioId);
  } else if (a === "EN_EDICION") {
    await notificar([k.asignadoAId, ...comercial], `${s.nombre} tomó para edición: ${marca} · ${k.descripcion}`, href, s.usuarioId);
  } else if (a === "EDITADO") {
    await notificar([k.asignadoAId, ...comercial], `Edición lista, por publicar o autorizar: ${marca} · ${k.descripcion}${liga ? ` · ${liga}` : ""}`, href, s.usuarioId);
  } else if (a === "PUBLICADO") {
    const [total, cumplidos] = await Promise.all([
      db.compromiso.count({ where: { contratoId: k.contrato.id, tipo: "ENTREGABLE", estado: { not: "CANCELADO" } } }),
      db.compromiso.count({ where: { contratoId: k.contrato.id, tipo: "ENTREGABLE", estado: "CUMPLIDO" } }),
    ]);
    await notificar([k.asignadoAId, k.editorId, ...comercial], `Entregable publicado: ${marca} · ${k.descripcion} (${cumplidos} de ${total} del contrato)${liga ? ` · ${liga}` : ""}`, href, s.usuarioId);
    // Si con este quedan completos los entregables del mes, comercial debe revisar el cobro.
    if (k.fecha) {
      const pendientesMes = await db.compromiso.count({
        where: { contratoId: k.contrato.id, tipo: "ENTREGABLE", estado: { notIn: ["CUMPLIDO", "CANCELADO"] }, fecha: { gte: startOfMonth(k.fecha), lte: endOfMonth(k.fecha) } },
      });
      if (pendientesMes === 0) {
        const hito = await db.hitoCobro.findFirst({ where: { contratoId: k.contrato.id, estadoPago: { notIn: ["PAGADO"] }, solicitadoEn: null }, orderBy: [{ fechaFacturar: "asc" }] });
        const mes = format(k.fecha, "MMMM yyyy", { locale: es });
        await notificar(
          [...comercial, ...(await db.usuario.findMany({ where: { activo: true, rol: "ADMIN_GENERAL" }, select: { id: true } })).map((u) => u.id)],
          `Entregables de ${mes} completos en ${marca}. ${hito ? `Procede facturar «${hito.concepto}» por $${hito.importe.toLocaleString("es-MX")}.` : "Revisa si procede facturar."}`,
          "/pagos",
          null,
        );
      }
    }
  }
  await registrar({ usuarioId: s.usuarioId, accion: "editar", entidad: "compromiso", entidadId: compromisoId, detalle: { etapa: a, de: k.etapa, nota: Boolean(nota), liga: Boolean(liga) } });
  revalidar(k.contrato.id, compromisoId);
  return { ok: true };
}

// Autoriza de una vez todos los entregables por autorizar de un contrato (la serie completa).
export async function autorizarEntregables(contratoId: string) {
  const s = await requerirSesion();
  const c = await db.contrato.findUnique({ where: { id: contratoId }, select: { id: true, directorId: true, marca: { select: { nombre: true } } } });
  if (!c || esProduccion(s) || !puedeCapturar(s) || !autorizaContrato(s, c)) return;
  const pendientes = await db.compromiso.findMany({ where: { contratoId, tipo: "ENTREGABLE", etapa: "POR_AUTORIZAR", estado: { notIn: ["CUMPLIDO", "CANCELADO"] } }, select: { id: true, asignadoAId: true, editorId: true, descripcion: true } });
  if (pendientes.length === 0) return;
  const ahora = new Date();
  await db.$transaction([
    db.compromiso.updateMany({ where: { id: { in: pendientes.map((p) => p.id) } }, data: { etapa: "POR_PRODUCIR", etapaDesde: ahora, autorizadoEn: ahora, autorizadoPorId: s.usuarioId, estado: "EN_CURSO" } }),
    db.avanceCompromiso.createMany({ data: pendientes.map((p) => ({ compromisoId: p.id, usuarioId: s.usuarioId, deEtapa: "POR_AUTORIZAR" as const, aEtapa: "POR_PRODUCIR" as const, nota: "Autorización en bloque" })) }),
  ]);
  const porPersona = new Map<string, number>();
  for (const p of pendientes) for (const u of [p.asignadoAId, p.editorId]) if (u) porPersona.set(u, (porPersona.get(u) ?? 0) + 1);
  for (const [usuarioId, n] of porPersona) await notificar([usuarioId], `${s.nombre} autorizó la ejecución de ${n} entregable(s) en ${c.marca.nombre}. Ya están en tu calendario.`, "/tareas", s.usuarioId);
  if (pendientes.some((p) => !p.asignadoAId)) await notificar(await responsablesDeContrato(c.directorId), `Hay entregables autorizados sin responsable de producción en ${c.marca.nombre}. Asígnalos.`, `/contratos/${contratoId}`, s.usuarioId);
  await registrar({ usuarioId: s.usuarioId, accion: "editar", entidad: "contrato", entidadId: contratoId, detalle: { autorizacionEntregables: pendientes.length } });
  revalidar(contratoId, pendientes[0].id);
}

export async function siguienteEtapa(e: EtapaEntregable) {
  return siguiente(e);
}
