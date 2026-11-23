"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { registrar } from "@/lib/bitacora";
import { puedeCapturar, requerirSesion, veTodo } from "@/lib/acceso";
import { deFormulario, fechaOpcional, primerError, texto, textoRequerido, type Resultado } from "./util";

const esquemaMarca = z.object({
  nombre: textoRequerido(120),
  sector: texto(120),
  notas: texto(4000),
  directorId: texto(64),
});

export async function guardarMarca(id: string | null, _prev: Resultado, fd: FormData): Promise<Resultado> {
  const s = await requerirSesion();
  if (!puedeCapturar(s)) return { error: "Sin permiso." };
  const parse = esquemaMarca.safeParse(deFormulario(fd));
  if (!parse.success) return { error: primerError(parse.error) };
  const d = parse.data;

  try {
    if (id) {
      if (!veTodo(s)) {
        const propia = await db.cartera.findFirst({ where: { marcaId: id, directorId: s.directorId!, hasta: null } });
        if (!propia) return { error: "La marca no pertenece a tu cartera." };
      }
      await db.marca.update({ where: { id }, data: { nombre: d.nombre, sector: d.sector, notas: d.notas } });
      await registrar({ usuarioId: s.usuarioId, accion: "editar", entidad: "marca", entidadId: id, detalle: { nombre: d.nombre } });
      revalidatePath("/marcas");
      redirect(`/marcas/${id}`);
    }
    // Alta: el director la recibe en su cartera; el administrador elige el director.
    const directorId = veTodo(s) ? d.directorId : s.directorId!;
    if (!directorId) return { error: "Indica el director responsable de la marca." };
    const m = await db.marca.create({
      data: { nombre: d.nombre, sector: d.sector, notas: d.notas, carteras: { create: { directorId } } },
    });
    await registrar({ usuarioId: s.usuarioId, accion: "crear", entidad: "marca", entidadId: m.id, detalle: { nombre: d.nombre, directorId } });
    revalidatePath("/marcas");
    redirect(`/marcas/${m.id}`);
  } catch (e) {
    if (String((e as Error).message).includes("NEXT_REDIRECT")) throw e;
    if (String((e as Error).message).includes("Unique constraint")) return { error: "Ya existe una marca con ese nombre." };
    return { error: "No se pudo guardar la marca." };
  }
}

export async function eliminarMarca(id: string): Promise<Resultado> {
  const s = await requerirSesion();
  if (!puedeCapturar(s)) return { error: "Sin permiso." };
  if (!veTodo(s)) {
    const propia = await db.cartera.findFirst({ where: { marcaId: id, directorId: s.directorId!, hasta: null } });
    if (!propia) return { error: "La marca no pertenece a tu cartera." };
  }
  const n = await db.contrato.count({ where: { marcaId: id } });
  if (n > 0) return { error: "La marca tiene contratos. Elimina o reasigna los contratos antes." };
  const m = await db.marca.delete({ where: { id } });
  await registrar({ usuarioId: s.usuarioId, accion: "eliminar", entidad: "marca", entidadId: id, detalle: { nombre: m.nombre } });
  revalidatePath("/marcas");
  redirect("/marcas");
}

// ───────── Contactos ─────────

const esquemaContacto = z.object({
  nombre: textoRequerido(120),
  cargo: texto(120),
  correo: texto(160),
  telefono: texto(60),
  canalPreferido: texto(60),
  ultimaInteraccion: fechaOpcional(),
  notas: texto(2000),
});

export async function guardarContacto(marcaId: string, contactoId: string | null, _prev: Resultado, fd: FormData): Promise<Resultado> {
  const s = await requerirSesion();
  if (!puedeCapturar(s)) return { error: "Sin permiso." };
  if (!veTodo(s)) {
    const propia = await db.cartera.findFirst({ where: { marcaId, directorId: s.directorId!, hasta: null } });
    if (!propia) return { error: "La marca no pertenece a tu cartera." };
  }
  const parse = esquemaContacto.safeParse(deFormulario(fd));
  if (!parse.success) return { error: primerError(parse.error) };
  if (contactoId) {
    await db.contacto.update({ where: { id: contactoId, marcaId }, data: parse.data });
    await registrar({ usuarioId: s.usuarioId, accion: "editar", entidad: "contacto", entidadId: contactoId });
  } else {
    const c = await db.contacto.create({ data: { ...parse.data, marcaId } });
    await registrar({ usuarioId: s.usuarioId, accion: "crear", entidad: "contacto", entidadId: c.id, detalle: { marcaId } });
  }
  revalidatePath(`/marcas/${marcaId}`);
  return { ok: true };
}

export async function eliminarContacto(contactoId: string) {
  const s = await requerirSesion();
  if (!puedeCapturar(s)) return;
  const c = await db.contacto.findUnique({ where: { id: contactoId } });
  if (!c) return;
  if (!veTodo(s)) {
    const propia = await db.cartera.findFirst({ where: { marcaId: c.marcaId, directorId: s.directorId!, hasta: null } });
    if (!propia) return;
  }
  await db.contacto.delete({ where: { id: contactoId } });
  await registrar({ usuarioId: s.usuarioId, accion: "eliminar", entidad: "contacto", entidadId: contactoId });
  revalidatePath(`/marcas/${c.marcaId}`);
}
