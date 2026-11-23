"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { registrar } from "@/lib/bitacora";
import { requerirAdmin } from "@/lib/acceso";
import { casilla, deFormulario, enteroRequerido, fechaOpcional, fechaRequerida, porcentajeFraccion, primerError, texto, textoRequerido, type Resultado } from "./util";

// Acciones exclusivas del administrador general: directores, carteras, reglas, usuarios, pagos de comisión.

// ───────── Directores ─────────

const esquemaDirector = z.object({ nombre: textoRequerido(120), correo: texto(160), notas: texto(2000), activo: casilla() });

export async function guardarDirector(id: string | null, _prev: Resultado, fd: FormData): Promise<Resultado> {
  const s = await requerirAdmin();
  const parse = esquemaDirector.safeParse({ ...deFormulario(fd), activo: fd.get("activo") ?? (id ? undefined : "on") });
  if (!parse.success) return { error: primerError(parse.error) };
  const d = { ...parse.data, activo: id ? parse.data.activo : true };
  if (id) {
    await db.director.update({ where: { id }, data: d });
    await registrar({ usuarioId: s.usuarioId, accion: "editar", entidad: "director", entidadId: id, detalle: { nombre: d.nombre, activo: d.activo } });
  } else {
    const n = await db.director.create({ data: d });
    await registrar({ usuarioId: s.usuarioId, accion: "crear", entidad: "director", entidadId: n.id, detalle: { nombre: d.nombre } });
  }
  revalidatePath("/directores");
  return { ok: true };
}

export async function eliminarDirectorDemo(id: string) {
  const s = await requerirAdmin();
  const dir = await db.director.findUnique({ where: { id } });
  if (!dir?.esDemo) return; // solo se borra la demostración; un director real se desactiva
  const marcas = await db.marca.findMany({ where: { esDemo: true, carteras: { some: { directorId: id } } }, select: { id: true } });
  await db.$transaction([
    db.pagoComision.deleteMany({ where: { directorId: id } }),
    db.reglaComision.deleteMany({ where: { directorId: id } }),
    db.contrato.deleteMany({ where: { directorId: id } }),
    db.cartera.deleteMany({ where: { directorId: id } }),
    db.marca.deleteMany({ where: { id: { in: marcas.map((m) => m.id) } } }),
    db.usuario.deleteMany({ where: { directorId: id } }),
    db.director.delete({ where: { id } }),
  ]);
  await registrar({ usuarioId: s.usuarioId, accion: "eliminar", entidad: "director", entidadId: id, detalle: { nombre: dir.nombre, demo: true } });
  revalidatePath("/");
  revalidatePath("/directores");
  revalidatePath("/marcas");
}

// ───────── Carteras ─────────

export async function asignarMarca(fd: FormData) {
  const s = await requerirAdmin();
  const marcaId = String(fd.get("marcaId") ?? "");
  const directorId = String(fd.get("directorId") ?? "");
  const desdeStr = String(fd.get("desde") ?? "");
  if (!marcaId || !directorId) return;
  const desde = desdeStr ? new Date(`${desdeStr}T12:00:00.000Z`) : new Date();
  await db.$transaction([
    db.cartera.updateMany({ where: { marcaId, hasta: null }, data: { hasta: desde } }),
    db.cartera.create({ data: { marcaId, directorId, desde } }),
  ]);
  await registrar({ usuarioId: s.usuarioId, accion: "editar", entidad: "cartera", entidadId: marcaId, detalle: { directorId, desde: desde.toISOString() } });
  revalidatePath("/directores");
  revalidatePath("/marcas");
}

// ───────── Reglas de comisión ─────────

const esquemaRegla = z.object({
  directorId: textoRequerido(64),
  marcaId: texto(64),
  tipo: z.preprocess((v) => (v === "" ? null : v), z.enum(["COMERCIAL", "PODCAST", "EMBAJADURIA", "OTRO"]).nullable()),
  pctCasa: porcentajeFraccion(),
  pctDirector: porcentajeFraccion(),
  vigenteDesde: fechaRequerida(),
  vigenteHasta: fechaOpcional(),
  notas: texto(1000),
});

export async function guardarRegla(id: string | null, _prev: Resultado, fd: FormData): Promise<Resultado> {
  const s = await requerirAdmin();
  const parse = esquemaRegla.safeParse(deFormulario(fd));
  if (!parse.success) return { error: primerError(parse.error) };
  const d = { ...parse.data, marcaId: parse.data.marcaId || null };
  if (d.vigenteHasta && d.vigenteHasta < d.vigenteDesde) return { error: "La vigencia termina antes de empezar." };
  if (id) {
    await db.reglaComision.update({ where: { id }, data: d });
    await registrar({ usuarioId: s.usuarioId, accion: "editar", entidad: "regla", entidadId: id, detalle: { ...d, vigenteDesde: d.vigenteDesde.toISOString(), vigenteHasta: d.vigenteHasta?.toISOString() ?? null } });
  } else {
    const r = await db.reglaComision.create({ data: d });
    await registrar({ usuarioId: s.usuarioId, accion: "crear", entidad: "regla", entidadId: r.id, detalle: { ...d, vigenteDesde: d.vigenteDesde.toISOString(), vigenteHasta: d.vigenteHasta?.toISOString() ?? null } });
  }
  revalidatePath("/reglas");
  revalidatePath("/comisiones");
  return { ok: true };
}

export async function eliminarRegla(id: string) {
  const s = await requerirAdmin();
  await db.reglaComision.delete({ where: { id } });
  await registrar({ usuarioId: s.usuarioId, accion: "eliminar", entidad: "regla", entidadId: id });
  revalidatePath("/reglas");
  revalidatePath("/comisiones");
}

// ───────── Pagos de comisión ─────────

const esquemaPagoComision = z.object({
  directorId: textoRequerido(64),
  contratoId: texto(64),
  concepto: textoRequerido(200),
  monto: enteroRequerido(),
  modalidad: z.enum(["EFECTIVO", "ESPECIE", "ACCIONES"]),
  fechaPago: fechaOpcional(),
  notas: texto(1000),
});

export async function registrarPagoComision(_prev: Resultado, fd: FormData): Promise<Resultado> {
  const s = await requerirAdmin();
  const parse = esquemaPagoComision.safeParse(deFormulario(fd));
  if (!parse.success) return { error: primerError(parse.error) };
  const p = await db.pagoComision.create({ data: { ...parse.data, contratoId: parse.data.contratoId || null, confirmado: true } });
  await registrar({ usuarioId: s.usuarioId, accion: "crear", entidad: "pagoComision", entidadId: p.id, detalle: { monto: parse.data.monto, directorId: parse.data.directorId } });
  revalidatePath("/comisiones");
  revalidatePath("/tablero");
  return { ok: true };
}

export async function eliminarPagoComision(id: string) {
  const s = await requerirAdmin();
  await db.pagoComision.delete({ where: { id } });
  await registrar({ usuarioId: s.usuarioId, accion: "eliminar", entidad: "pagoComision", entidadId: id });
  revalidatePath("/comisiones");
}

// ───────── Usuarios ─────────

const esquemaUsuario = z.object({
  usuario: z.string().trim().toLowerCase().min(3).max(40).regex(/^[a-z0-9._-]+$/, "Solo letras, números, punto, guion y guion bajo."),
  nombre: textoRequerido(120),
  correo: texto(160),
  rol: z.enum(["ADMIN_GENERAL", "DIRECTOR", "ADMINISTRACION", "LECTURA"]),
  directorId: texto(64),
  clave: z.string().max(256).optional(),
  activo: casilla(),
});

export async function guardarUsuario(id: string | null, _prev: Resultado, fd: FormData): Promise<Resultado> {
  const s = await requerirAdmin();
  const parse = esquemaUsuario.safeParse({ ...deFormulario(fd), activo: fd.get("activo") ?? (id ? undefined : "on") });
  if (!parse.success) return { error: primerError(parse.error) };
  const d = parse.data;
  if (d.rol === "DIRECTOR" && !d.directorId) return { error: "Un usuario con rol director debe vincularse a una dirección comercial." };
  const directorId = d.rol === "DIRECTOR" ? d.directorId : null;
  try {
    if (id) {
      const data: Record<string, unknown> = { usuario: d.usuario, nombre: d.nombre, correo: d.correo, rol: d.rol, directorId, activo: d.activo };
      if (d.clave && d.clave.length > 0) {
        if (d.clave.length < 12) return { error: "La contraseña debe tener al menos 12 caracteres." };
        data.passwordHash = await bcrypt.hash(d.clave, 12);
      }
      await db.usuario.update({ where: { id }, data });
      await registrar({ usuarioId: s.usuarioId, accion: "editar", entidad: "usuario", entidadId: id, detalle: { usuario: d.usuario, rol: d.rol, activo: d.activo, claveCambiada: Boolean(d.clave) } });
    } else {
      if (!d.clave || d.clave.length < 12) return { error: "La contraseña inicial debe tener al menos 12 caracteres." };
      const u = await db.usuario.create({
        data: { usuario: d.usuario, nombre: d.nombre, correo: d.correo, rol: d.rol, directorId, activo: true, passwordHash: await bcrypt.hash(d.clave, 12) },
      });
      await registrar({ usuarioId: s.usuarioId, accion: "crear", entidad: "usuario", entidadId: u.id, detalle: { usuario: d.usuario, rol: d.rol } });
    }
  } catch (e) {
    if (String((e as Error).message).includes("Unique constraint")) return { error: "Ese nombre de usuario ya existe." };
    return { error: "No se pudo guardar el usuario." };
  }
  revalidatePath("/usuarios");
  return { ok: true };
}
