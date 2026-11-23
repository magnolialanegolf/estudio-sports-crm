import { redirect } from "next/navigation";
import type { Prisma, Rol } from "@prisma/client";
import { obtenerSesion, type Sesion } from "./sesion";

// Reglas de acceso. Todo lo que toca datos pasa por aquí.

export const ROLES_GLOBALES: Rol[] = ["ADMIN_GENERAL", "ADMINISTRACION", "LECTURA"];

export function veTodo(s: Sesion) {
  return ROLES_GLOBALES.includes(s.rol);
}

export function esAdmin(s: Sesion) {
  return s.rol === "ADMIN_GENERAL";
}

// Producción ejecuta tareas asignadas; no ve montos ni comisiones.
export function esProduccion(s: Sesion) {
  return s.rol === "PRODUCCION";
}

// Rutas permitidas al rol de producción.
export const RUTAS_PRODUCCION = ["/tareas", "/cuenta"];

// Puede capturar operación comercial (marcas, contratos, hitos, compromisos).
export function puedeCapturar(s: Sesion) {
  return s.rol === "ADMIN_GENERAL" || s.rol === "DIRECTOR" || s.rol === "ADMINISTRACION";
}

// Puede registrar cobros y facturas de cualquier cartera.
export function puedeCobrar(s: Sesion) {
  return s.rol === "ADMIN_GENERAL" || s.rol === "ADMINISTRACION";
}

// Puede ver comisiones de otros directores.
export function veComisionesDeTodos(s: Sesion) {
  return s.rol === "ADMIN_GENERAL";
}

export async function requerirSesion(): Promise<Sesion> {
  const s = await obtenerSesion();
  if (!s) redirect("/ingresar");
  if (s.rol === "DIRECTOR" && !s.directorId) redirect("/ingresar?error=sin-cartera");
  return s;
}

// Vistas comerciales y financieras: producción no entra.
export async function requerirComercial(): Promise<Sesion> {
  const s = await requerirSesion();
  if (esProduccion(s)) redirect("/tareas");
  return s;
}

// Filtro de compromisos según rol: producción solo los suyos.
export function filtroCompromisos(s: Sesion): Prisma.CompromisoWhereInput {
  if (esProduccion(s)) return { asignadoAId: s.usuarioId };
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
