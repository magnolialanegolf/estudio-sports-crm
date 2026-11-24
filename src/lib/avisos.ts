import { db } from "./db";
import { correoConfigurado, enviarCorreo } from "./correo";

// Avisos dentro del portal (campana) y, si el envío está conectado, por correo a quien lo tenga activo.
// Un aviso por destinatario; quien actúa no se avisa a sí mismo.

export async function notificar(destinatarios: (string | null | undefined)[], texto: string, href: string | null, excluir?: string | null) {
  const ids = Array.from(new Set(destinatarios.filter((d): d is string => !!d && d !== excluir)));
  if (ids.length === 0) return;
  const mensaje = texto.slice(0, 300);
  await db.aviso.createMany({ data: ids.map((usuarioId) => ({ usuarioId, texto: mensaje, href })) });
  if (!correoConfigurado()) return;
  const usuarios = await db.usuario.findMany({ where: { id: { in: ids }, activo: true, avisosPorCorreo: true, correo: { not: null } }, select: { nombre: true, correo: true } });
  await Promise.allSettled(usuarios.map((u) => enviarCorreo({ para: u.correo!, nombre: u.nombre, asunto: `Estudio Sports · ${mensaje.slice(0, 90)}`, texto: mensaje, href })));
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
