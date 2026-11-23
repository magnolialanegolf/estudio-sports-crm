import type { Prisma } from "@prisma/client";
import { db } from "./db";

// Registro de auditoría. Se escribe en cada mutación y en cada ingreso.
export async function registrar(args: {
  usuarioId: string | null;
  accion: "crear" | "editar" | "eliminar" | "ingresar" | "salir" | "contraseña";
  entidad: string;
  entidadId?: string | null;
  detalle?: Prisma.InputJsonValue;
}) {
  try {
    await db.bitacora.create({
      data: {
        usuarioId: args.usuarioId,
        accion: args.accion,
        entidad: args.entidad,
        entidadId: args.entidadId ?? null,
        detalle: args.detalle,
      },
    });
  } catch (e) {
    console.error("No se pudo escribir en la bitácora", e);
  }
}
