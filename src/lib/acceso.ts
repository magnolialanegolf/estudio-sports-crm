import { redirect } from "next/navigation";
import type { Prisma, Rol } from "@prisma/client";
import { cookies } from "next/headers";
import { COOKIE_SESION, obtenerSesion, type Sesion } from "./sesion";

// Reglas de acceso. Todo lo que toca datos pasa por aquí.

export const ROLES_GLOBALES: Rol[] = ["ADMIN_GENERAL", "GERENTE_GENERAL", "ADMINISTRACION", "LECTURA"];
export const ROLES_CARTERA: Rol[] = ["DIRECTOR", "ASISTENTE_COMERCIAL"];
export const ROLES_EJECUCION: Rol[] = ["PRODUCCION", "CONTENIDOS", "OPERATIVO"];

export function veTodo(s: Sesion) {
  return ROLES_GLOBALES.includes(s.rol);
}

export function esAdmin(s: Sesion) {
  return s.rol === "ADMIN_GENERAL";
}

// Dirección general: administrador general y gerente general.
export function esDireccion(s: Sesion) {
  return s.rol === "ADMIN_GENERAL" || s.rol === "GERENTE_GENERAL";
}

// Rol ligado a la cartera de un director (director o su asistente).
export function esDeCartera(s: Sesion) {
  return ROLES_CARTERA.includes(s.rol);
}

// Ejecución (producción, contenidos, operativo): tareas asignadas; sin montos ni comisiones.
export function esProduccion(s: Sesion) {
  return ROLES_EJECUCION.includes(s.rol);
}

// Rutas permitidas al rol de producción.
export const RUTAS_PRODUCCION = ["/tareas", "/cuenta"];

// Puede capturar operación comercial (marcas, contratos, hitos, compromisos).
export function puedeCapturar(s: Sesion) {
  return s.rol === "ADMIN_GENERAL" || s.rol === "GERENTE_GENERAL" || s.rol === "DIRECTOR" || s.rol === "ASISTENTE_COMERCIAL" || s.rol === "ADMINISTRACION";
}

// Puede registrar cobros y facturas de cualquier cartera.
export function puedeCobrar(s: Sesion) {
  return s.rol === "ADMIN_GENERAL" || s.rol === "GERENTE_GENERAL" || s.rol === "ADMINISTRACION";
}

// Puede ver comisiones de otros directores.
export function veComisionesDeTodos(s: Sesion) {
  return s.rol === "ADMIN_GENERAL" || s.rol === "GERENTE_GENERAL";
}

// Puede ver comisiones (las propias o las de todos).
export function veComisiones(s: Sesion) {
  return s.rol === "DIRECTOR" || veComisionesDeTodos(s);
}

export async function requerirSesion(): Promise<Sesion> {
  const s = await obtenerSesion();
  if (!s) {
    // Cookie presente pero usuario dado de baja: se borra la cookie en una ruta y se explica.
    const jar = await cookies();
    if (jar.get(COOKIE_SESION)) redirect("/api/auth/salir?error=inactivo");
    redirect("/ingresar");
  }
  if (esDeCartera(s) && !s.directorId) redirect("/ingresar?error=sin-cartera");
  return s;
}

// Vistas comerciales y financieras: producción no entra.
export async function requerirComercial(): Promise<Sesion> {
  const s = await requerirSesion();
  if (esProduccion(s)) redirect("/tareas");
  return s;
}

// Contratos que producción puede consultar como expediente: vigentes o con tareas suyas.
export function filtroContratosProduccion(s: Sesion): Prisma.ContratoWhereInput {
  return { OR: [{ estado: "VIGENTE" }, { compromisos: { some: { OR: [{ asignadoAId: s.usuarioId }, { editorId: s.usuarioId }] } } }] };
}

// Filtro de compromisos según rol: producción solo los suyos.
export function filtroCompromisos(s: Sesion): Prisma.CompromisoWhereInput {
  // Producción: lo que tiene asignado y las actividades que registró ella misma.
  if (esProduccion(s)) return { OR: [{ asignadoAId: s.usuarioId }, { editorId: s.usuarioId }, { creadoPorId: s.usuarioId }] };
  return { contrato: filtroContratos(s) };
}

export async function requerirAdmin(): Promise<Sesion> {
  const s = await requerirSesion();
  if (!esAdmin(s)) redirect("/");
  return s;
}

// Filtros de fila. Un director solo ve su cartera.
export function filtroContratos(s: Sesion): Prisma.ContratoWhereInput {
  return veTodo(s) ? {} : { directorId: s.directorId! };
}

export function filtroMarcas(s: Sesion): Prisma.MarcaWhereInput {
  return veTodo(s)
    ? {}
    : {
        OR: [
          { carteras: { some: { directorId: s.directorId!, hasta: null } } },
          { contratos: { some: { directorId: s.directorId! } } },
        ],
      };
}

export function filtroDirector(s: Sesion): Prisma.DirectorWhereInput {
  return veTodo(s) ? {} : { id: s.directorId! };
}

// Comprueba que un director pueda tocar un contrato concreto.
export function autorizaContrato(s: Sesion, contrato: { directorId: string }) {
  if (veTodo(s)) return true;
  return contrato.directorId === s.directorId;
}
