import { db } from "./db";

// Avisos dentro del portal. Un aviso por destinatario; quien actúa no se avisa a sí mismo.

export async function notificar(destinatarios: (string | null | undefined)[], texto: string, href: string | null, excluir?: string | null) {
  const ids = Array.from(new Set(destinatarios.filter((d): d is string => !!d && d !== excluir)));
  if (ids.length === 0) return;
  await db.aviso.createMany({ data: ids.map((usuarioId) => ({ usuarioId, texto: texto.slice(0, 300), href })) });
}

// Usuarios responsables de un contrato: los del director de la cartera y los administradores generales.
export async function responsablesDeContrato(directorId: string): Promise<string[]> {
  const usuarios = await db.usuario.findMany({
    where: { activo: true, OR: [{ directorId }, { rol: { in: ["ADMIN_GENERAL", "GERENTE_GENERAL"] } }] },
    select: { id: true },
  });
  return usuarios.map((u) => u.id);
}

export async function avisosSinLeer(usuarioId: string) {
  return db.aviso.count({ where: { usuarioId, leido: false } });
}
