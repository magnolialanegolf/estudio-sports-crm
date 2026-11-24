"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { registrar } from "@/lib/bitacora";
import { notificar, responsablesDeContrato } from "@/lib/avisos";
import { autorizaContrato, esProduccion, puedeCapturar, requerirSesion } from "@/lib/acceso";
import { deFormulario, fechaOpcional, primerError, texto, textoRequerido, type Resultado } from "./util";

// Seguimiento: lo que pasó con la marca (llamada, reunión, correo, nota) y, si hay, el siguiente
// paso con fecha, que nace como compromiso de seguimiento para que aparezca en Hoy y en el calendario.

const esquema = z.object({
  tipo: z.enum(["LLAMADA", "REUNION", "CORREO", "MENSAJE", "NOTA"]),
  fecha: fechaOpcional(),
  texto: textoRequerido(4000),
  siguientePaso: texto(400),
  siguienteFecha: fechaOpcional(),
});

export async function registrarSeguimiento(contratoId: string, _prev: Resultado, fd: FormData): Promise<Resultado> {
  const s = await requerirSesion();
  if (esProduccion(s) || !puedeCapturar(s)) return { error: "Sin permiso." };
  const c = await db.contrato.findUnique({ where: { id: contratoId }, select: { id: true, directorId: true, marcaId: true, marca: { select: { nombre: true } } } });
  if (!c || !autorizaContrato(s, c)) return { error: "Contrato no disponible." };
  const parse = esquema.safeParse(deFormulario(fd));
  if (!parse.success) return { error: primerError(parse.error) };
  const d = parse.data;
  if (d.siguienteFecha && !d.siguientePaso) return { error: "Escribe cuál es el siguiente paso." };

  let compromisoId: string | null = null;
  if (d.siguientePaso) {
    const k = await db.compromiso.create({
      data: { contratoId, tipo: "SEGUIMIENTO", descripcion: d.siguientePaso, fecha: d.siguienteFecha, asignadoAId: s.usuarioId, creadoPorId: s.usuarioId, notas: `Derivado del seguimiento: ${d.texto.slice(0, 200)}` },
    });
    compromisoId = k.id;
  }
  const sg = await db.seguimiento.create({
    data: { contratoId, marcaId: c.marcaId, usuarioId: s.usuarioId, tipo: d.tipo, fecha: d.fecha ?? new Date(), texto: d.texto, siguientePaso: d.siguientePaso, siguienteFecha: d.siguienteFecha, compromisoId },
  });
  // Dirección se entera del avance sin tener que preguntar.
  await notificar(await responsablesDeContrato(c.directorId), `${s.nombre} registró seguimiento en ${c.marca.nombre}: ${d.texto.slice(0, 140)}${d.siguientePaso ? ` · Siguiente: ${d.siguientePaso}` : ""}`, `/contratos/${contratoId}`, s.usuarioId);
  await registrar({ usuarioId: s.usuarioId, accion: "crear", entidad: "seguimiento", entidadId: sg.id, detalle: { contratoId, tipo: d.tipo, siguientePaso: Boolean(d.siguientePaso) } });
  revalidatePath(`/contratos/${contratoId}`);
  revalidatePath(`/marcas/${c.marcaId}`);
  revalidatePath("/tareas");
  revalidatePath("/");
  return { ok: true };
}

export async function eliminarSeguimiento(id: string) {
  const s = await requerirSesion();
  const sg = await db.seguimiento.findUnique({ where: { id }, include: { contrato: { select: { id: true, directorId: true, marcaId: true } } } });
  if (!sg || esProduccion(s) || !puedeCapturar(s) || !autorizaContrato(s, sg.contrato)) return;
  await db.seguimiento.delete({ where: { id } });
  await registrar({ usuarioId: s.usuarioId, accion: "eliminar", entidad: "seguimiento", entidadId: id, detalle: { contratoId: sg.contrato.id } });
  revalidatePath(`/contratos/${sg.contrato.id}`);
  revalidatePath(`/marcas/${sg.contrato.marcaId}`);
}
