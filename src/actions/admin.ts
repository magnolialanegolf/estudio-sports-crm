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
        data.debeCambiarClave = true;
      }
      await db.usuario.update({ where: { id }, data });
      await registrar({ usuarioId: s.usuarioId, accion: "editar", entidad: "usuario", entidadId: id, detalle: { usuario: d.usuario, rol: d.rol, activo: d.activo, claveCambiada: Boolean(d.clave) } });
    } else {
      if (!d.clave || d.clave.length < 12) return { error: "La contraseña inicial debe tener al menos 12 caracteres." };
      const u = await db.usuario.create({
        data: { usuario: d.usuario, nombre: d.nombre, correo: d.correo, rol: d.rol, directorId, activo: true, passwordHash: await bcrypt.hash(d.clave, 12), debeCambiarClave: true },
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

// ───────── Cartera de demostración ─────────
// Reconstruye la dirección de demostración como copia anonimizada de la cartera
// de un director real: marcas "Marca 1, 2, 3…", montos alterados, sin notas ni
// contactos. Sirve para presentar el portal sin exponer datos de terceros.

const FACTORES = [0.8, 1.15, 0.65, 1.3, 0.9, 1.2, 0.75, 1.05, 0.85, 1.1, 0.7, 1.25];
const redondear = (n: number, factor: number) => Math.max(10_000, Math.round((n * factor) / 10_000) * 10_000);

export async function regenerarDemo(_prev: Resultado, fd: FormData): Promise<Resultado> {
  const s = await requerirAdmin();
  const origenId = String(fd.get("origenId") ?? "");
  const origen = await db.director.findUnique({ where: { id: origenId, esDemo: false } });
  if (!origen) return { error: "Elige un director real como origen." };

  // Director de demostración: se reutiliza o se crea, y se vacía.
  let demo = await db.director.findFirst({ where: { esDemo: true } });
  if (!demo) demo = await db.director.create({ data: { nombre: "Dirección de demostración", esDemo: true, notas: "Director ficticio con datos anonimizados. Eliminar antes de operar." } });
  const marcasDemo = await db.marca.findMany({ where: { esDemo: true }, select: { id: true } });
  await db.$transaction([
    db.pagoComision.deleteMany({ where: { directorId: demo.id } }),
    db.reglaComision.deleteMany({ where: { directorId: demo.id } }),
    db.contrato.deleteMany({ where: { directorId: demo.id } }),
    db.cartera.deleteMany({ where: { directorId: demo.id } }),
    db.marca.deleteMany({ where: { id: { in: marcasDemo.map((m) => m.id) } } }),
  ]);
  if (!(await db.usuario.findFirst({ where: { directorId: demo.id } }))) {
    await db.usuario.create({ data: { usuario: "demo", nombre: "Director de demostración", rol: "DIRECTOR", directorId: demo.id, passwordHash: await bcrypt.hash(process.env.SEED_CLAVE_DEMO ?? "EstudioSports-Demo-2026", 12) } });
  }

  // Origen: marcas en cartera activa y sus contratos.
  const carteras = await db.cartera.findMany({ where: { directorId: origenId, hasta: null }, include: { marca: true }, orderBy: { marca: { nombre: "asc" } } });
  const contratos = await db.contrato.findMany({
    where: { directorId: origenId },
    include: { hitos: true, compromisos: true },
    orderBy: [{ marcaId: "asc" }, { inicio: "asc" }, { codigo: "asc" }],
  });
  const reglas = await db.reglaComision.findMany({ where: { directorId: origenId } });
  const pagos = await db.pagoComision.findMany({ where: { directorId: origenId } });

  const marcaNueva = new Map<string, { id: string; n: number }>();
  let n = 0;
  for (const c of carteras) {
    n += 1;
    const m = await db.marca.create({ data: { nombre: `Marca ${n}`, sector: c.marca.sector, esDemo: true } });
    marcaNueva.set(c.marcaId, { id: m.id, n });
    await db.cartera.create({ data: { marcaId: m.id, directorId: demo.id, desde: c.desde } });
  }
  // Marcas con contratos pero fuera de la cartera activa (históricas).
  for (const c of contratos) {
    if (!marcaNueva.has(c.marcaId)) {
      n += 1;
      const m = await db.marca.create({ data: { nombre: `Marca ${n}`, esDemo: true } });
      marcaNueva.set(c.marcaId, { id: m.id, n });
    }
  }

  const nombresReales = carteras.map((c) => c.marca.nombre).sort((a, b) => b.length - a.length);
  const anonimizar = (t: string | null) => {
    if (!t) return null;
    let r = t;
    for (const nombre of nombresReales) r = r.replace(new RegExp(nombre.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "la marca");
    return r;
  };
  const etiquetaTipo: Record<string, string> = { COMERCIAL: "Comercial", PODCAST: "Pódcast", EMBAJADURIA: "Embajaduría", OTRO: "Acuerdo" };

  const contratoNuevo = new Map<string, string>();
  const porMarca = new Map<string, number>();
  let i = 0;
  for (const c of contratos) {
    const factor = FACTORES[i % FACTORES.length];
    i += 1;
    const m = marcaNueva.get(c.marcaId)!;
    const k = (porMarca.get(m.id) ?? 0) + 1;
    porMarca.set(m.id, k);
    const anio = (c.inicio ?? c.vencimiento)?.getUTCFullYear();
    const proyecto = `${etiquetaTipo[c.tipo] ?? c.tipo}${anio ? ` ${anio}` : ""}${k > 1 ? ` · ${String.fromCharCode(64 + k)}` : ""}`;
    const creado = await db.contrato.create({
      data: {
        codigo: `DEMO-${m.n}-${k}`,
        marcaId: m.id,
        directorId: demo.id,
        proyecto,
        tipo: c.tipo,
        estado: c.estado,
        monto: c.monto === null ? null : redondear(c.monto, factor),
        montoConfirmado: c.montoConfirmado,
        inicio: c.inicio,
        inicioConfirmado: c.inicioConfirmado,
        vencimiento: c.vencimiento,
        vencimientoConfirmado: c.vencimientoConfirmado,
        duracionMeses: c.duracionMeses,
        talento: null,
        notas: "Datos de demostración, anonimizados.",
        hitos: {
          create: c.hitos.map((h) => ({
            concepto: anonimizar(h.concepto) ?? h.concepto,
            importe: redondear(h.importe, factor),
            modalidad: h.modalidad,
            fechaFacturar: h.fechaFacturar,
            fechaOrientativa: anonimizar(h.fechaOrientativa),
            estadoFactura: h.estadoFactura,
            estadoPago: h.estadoPago,
            montoRecibido: h.montoRecibido > 0 ? redondear(h.montoRecibido, factor) : 0,
            fechaPago: h.fechaPago,
            confirmado: h.confirmado,
          })),
        },
        compromisos: {
          create: c.compromisos.map((k2) => ({
            tipo: k2.tipo,
            descripcion: anonimizar(k2.descripcion) ?? k2.descripcion,
            fecha: k2.fecha,
            responsable: k2.responsable,
            estado: k2.estado,
            cumplidoEn: k2.cumplidoEn,
          })),
        },
      },
    });
    contratoNuevo.set(c.id, creado.id);
  }
  // Ligas de renovación entre contratos clonados.
  for (const c of contratos) {
    if (c.renovacionDeId && contratoNuevo.has(c.renovacionDeId) && contratoNuevo.has(c.id)) {
      await db.contrato.update({ where: { id: contratoNuevo.get(c.id)! }, data: { renovacionDeId: contratoNuevo.get(c.renovacionDeId)! } });
    }
  }
  for (const r of reglas) {
    await db.reglaComision.create({
      data: { directorId: demo.id, marcaId: r.marcaId ? (marcaNueva.get(r.marcaId)?.id ?? null) : null, tipo: r.tipo, pctCasa: r.pctCasa, pctDirector: r.pctDirector, vigenteDesde: r.vigenteDesde, vigenteHasta: r.vigenteHasta },
    });
  }
  let j = 0;
  for (const p of pagos) {
    const factor = FACTORES[j % FACTORES.length];
    j += 1;
    await db.pagoComision.create({
      data: { directorId: demo.id, contratoId: p.contratoId ? (contratoNuevo.get(p.contratoId) ?? null) : null, concepto: "Comisión pagada", monto: redondear(p.monto, factor), modalidad: p.modalidad, fechaPago: p.fechaPago, confirmado: p.confirmado },
    });
  }

  await registrar({ usuarioId: s.usuarioId, accion: "crear", entidad: "director", entidadId: demo.id, detalle: { demo: "regenerada", origen: origen.nombre, marcas: marcaNueva.size, contratos: contratos.length } });
  revalidatePath("/");
  revalidatePath("/directores");
  revalidatePath("/marcas");
  revalidatePath("/contratos");
  return { ok: true };
}
