import type { Prisma } from "@prisma/client";
import { esDeCartera, veTodo } from "./acceso";
import type { Sesion } from "./sesion";

// Visibilidad de incidencias: lo que reporté, lo que tengo asignado y lo de mi cartera;
// dirección, gerencia y administración ven todo.
export function filtroIncidencias(s: Sesion): Prisma.IncidenciaWhereInput {
  if (veTodo(s)) return {};
  const propias: Prisma.IncidenciaWhereInput[] = [{ reportadoPorId: s.usuarioId }, { asignadoAId: s.usuarioId }];
  if (esDeCartera(s) && s.directorId) propias.push({ contrato: { directorId: s.directorId } });
  return { OR: propias };
}

