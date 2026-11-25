import { format } from "date-fns";
import { db } from "./db";
import { eventosDeUsuario, type Evento } from "./eventos";
import { urlPortal } from "./correo";
import { googleConfigurado } from "./google";
import { registrar } from "./bitacora";

// Sincronización de ida y vuelta con Google Calendar, cuenta por cuenta. Cada persona conecta su
// Google (personal o de empresa) una vez; el portal crea un calendario aparte llamado «Estudio
// Sports» y solo toca ese. Lo que el portal sabe se escribe ahí; lo que la persona mueve o agrega
// ahí desde el celular regresa al portal. Los demás calendarios de la persona no se tocan.

// Permiso mínimo: solo calendarios creados por la propia aplicación. Google no entrega el calendario personal.
export const ALCANCE_CALENDARIO = "https://www.googleapis.com/auth/calendar.app.created";
const NOMBRE_CALENDARIO = "Estudio Sports";
const MINUTOS_ENTRE_SINCRONIZACIONES = 10;

export function calendarioPushConfigurado() {
  return googleConfigurado();
}

async function accessToken(refreshToken: string): Promise<string> {
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken, client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET! }),
    cache: "no-store",
  });
  if (!r.ok) throw new Error("Google ya no acepta la conexión de esta cuenta. Vuelve a conectar tu calendario.");
  return ((await r.json()) as { access_token: string }).access_token;
}

async function api<T>(token: string, ruta: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`https://www.googleapis.com/calendar/v3${ruta}`, { ...init, headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...(init?.headers ?? {}) }, cache: "no-store" });
  if (r.status === 204) return undefined as T;
  if (!r.ok) throw new Error(`Google Calendar respondió ${r.status} en ${ruta.split("?")[0]}.`);
  return (await r.json()) as T;
}

// Calendario propio del portal dentro de la cuenta: se crea una vez y se recuerda su id.
async function calendarioDe(token: string, usuarioId: string, actual: string | null): Promise<string> {
  if (actual) {
    try {
      await api(token, `/calendars/${encodeURIComponent(actual)}`);
      return actual;
    } catch {
      /* lo borraron: se crea de nuevo */
    }
  }
  const lista = await api<{ items?: { id: string; summary?: string; accessRole?: string }[] }>(token, "/users/me/calendarList");
  const existente = lista.items?.find((c) => c.summary === NOMBRE_CALENDARIO && c.accessRole === "owner");
  const id = existente?.id ?? (await api<{ id: string }>(token, "/calendars", { method: "POST", body: JSON.stringify({ summary: NOMBRE_CALENDARIO, description: "Pendientes, cobros y vencimientos del CRM comercial de Estudio Sports. Lo que muevas o agregues aquí se refleja en el portal.", timeZone: "America/Mexico_City" }) })).id;
  await db.usuario.update({ where: { id: usuarioId }, data: { calendarioGoogleId: id } });
  return id;
}

type EventoGoogle = { id: string; status?: string; summary?: string; description?: string; start?: { date?: string; dateTime?: string }; end?: { date?: string; dateTime?: string }; extendedProperties?: { private?: Record<string, string> } };

const diaDe = (s?: { date?: string; dateTime?: string }) => s?.date ?? s?.dateTime?.slice(0, 10) ?? null;
const fechaDe = (dia: string) => new Date(`${dia}T12:00:00.000Z`);

function cuerpo(e: Evento) {
  const dia = format(e.fecha, "yyyy-MM-dd");
  const siguiente = format(new Date(e.fecha.getTime() + 86_400_000), "yyyy-MM-dd");
  return {
    summary: e.titulo,
    description: `${e.descripcion}${e.descripcion ? "\n\n" : ""}${urlPortal()}${e.href}`,
    start: { date: dia },
    end: { date: siguiente },
    reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 15 * 60 }] },
    extendedProperties: { private: { esUid: e.uid, esCategoria: e.categoria } },
  };
}

export type ResultadoSincronizacion = { creados: number; actualizados: number; eliminados: number; recibidos: number; movidos: number; total: number };

// 1) Lo que cambió en el celular entra al portal. 2) Lo que el portal sabe se escribe en el calendario.
export async function sincronizarCalendarioDe(usuarioId: string): Promise<ResultadoSincronizacion> {
  const u = await db.usuario.findUnique({ where: { id: usuarioId } });
  if (!u || !u.activo) throw new Error("Usuario no disponible.");
  if (!u.googleRefreshToken) throw new Error("Tu Google Calendar no está conectado.");
  if (!u.sincronizarCalendario) throw new Error("La sincronización está desactivada en tu cuenta.");
  const token = await accessToken(u.googleRefreshToken);
  const calId = await calendarioDe(token, u.id, u.calendarioGoogleId);

  // Todo lo que hay en el calendario del portal, incluido lo que la persona agregó a mano.
  const existentes = new Map<string, EventoGoogle>();
  const sinUid: EventoGoogle[] = [];
  let pageToken: string | undefined;
  do {
    const q = new URLSearchParams({ maxResults: "2500", showDeleted: "false", singleEvents: "true" });
    if (pageToken) q.set("pageToken", pageToken);
    const r = await api<{ items?: EventoGoogle[]; nextPageToken?: string }>(token, `/calendars/${encodeURIComponent(calId)}/events?${q.toString()}`);
    for (const it of r.items ?? []) {
      if (it.status === "cancelled") continue;
      const uid = it.extendedProperties?.private?.esUid;
      if (uid) existentes.set(uid, it);
      else sinUid.push(it);
    }
    pageToken = r.nextPageToken;
  } while (pageToken);

  // Del celular al portal: fechas movidas en pendientes del portal.
  let movidos = 0;
  for (const [uid, ev] of existentes) {
    const dia = diaDe(ev.start);
    if (!dia) continue;
    if (uid.startsWith("compromiso-")) {
      const k = await db.compromiso.findUnique({ where: { id: uid.slice(11) }, select: { id: true, fecha: true, contratoId: true, estado: true } });
      if (!k || !k.fecha || k.estado === "CUMPLIDO" || k.estado === "CANCELADO") continue;
      if (format(k.fecha, "yyyy-MM-dd") !== dia) {
        await db.compromiso.update({ where: { id: k.id }, data: { fecha: fechaDe(dia) } });
        await registrar({ usuarioId, accion: "editar", entidad: "compromiso", entidadId: k.id, detalle: { fecha: dia, origen: "Google Calendar" } });
        movidos += 1;
      }
    } else if (uid.startsWith("incidencia-")) {
      const i = await db.incidencia.findUnique({ where: { id: uid.slice(11) }, select: { id: true, fechaLimite: true, estado: true } });
      if (!i || !i.fechaLimite || (i.estado !== "ABIERTA" && i.estado !== "EN_ATENCION")) continue;
      if (format(i.fechaLimite, "yyyy-MM-dd") !== dia) {
        await db.incidencia.update({ where: { id: i.id }, data: { fechaLimite: fechaDe(dia) } });
        await registrar({ usuarioId, accion: "editar", entidad: "incidencia", entidadId: i.id, detalle: { fechaLimite: dia, origen: "Google Calendar" } });
        movidos += 1;
      }
    }
  }

  // Del celular al portal: algo nuevo escrito en el calendario «Estudio Sports» entra como pendiente propio.
  let recibidos = 0;
  for (const ev of sinUid) {
    const dia = diaDe(ev.start);
    const titulo = (ev.summary ?? "").trim();
    if (!titulo) continue;
    const i = await db.incidencia.create({
      data: { titulo: titulo.slice(0, 200), descripcion: ev.description?.slice(0, 2000) || "Agregado desde el calendario del celular.", tipo: "PENDIENTE", prioridad: "MEDIA", estado: "ABIERTA", reportadoPorId: usuarioId, asignadoAId: usuarioId, fechaLimite: dia ? fechaDe(dia) : null },
    });
    await api(token, `/calendars/${encodeURIComponent(calId)}/events/${encodeURIComponent(ev.id)}`, { method: "PATCH", body: JSON.stringify({ extendedProperties: { private: { esUid: `incidencia-${i.id}`, esCategoria: "Pendientes" } } }) });
    existentes.set(`incidencia-${i.id}`, ev);
    await registrar({ usuarioId, accion: "crear", entidad: "incidencia", entidadId: i.id, detalle: { origen: "Google Calendar", titulo } });
    recibidos += 1;
  }

  // Del portal al celular.
  const eventos = await eventosDeUsuario(u);
  let creados = 0;
  let actualizados = 0;
  let eliminados = 0;
  const vistos = new Set<string>();
  for (const e of eventos) {
    vistos.add(e.uid);
    const b = cuerpo(e);
    const ex = existentes.get(e.uid);
    if (!ex) {
      await api(token, `/calendars/${encodeURIComponent(calId)}/events`, { method: "POST", body: JSON.stringify(b) });
      creados += 1;
    } else if (ex.summary !== b.summary || diaDe(ex.start) !== b.start.date || (ex.description ?? "") !== b.description) {
      // Si la persona le puso hora en el celular, se respeta: solo se actualizan título y texto.
      const conHora = Boolean(ex.start?.dateTime);
      const parche = conHora ? { summary: b.summary, description: b.description, extendedProperties: b.extendedProperties } : b;
      await api(token, `/calendars/${encodeURIComponent(calId)}/events/${encodeURIComponent(ex.id)}`, { method: "PATCH", body: JSON.stringify(parche) });
      actualizados += 1;
    }
  }
  for (const [uid, ex] of existentes) {
    if (vistos.has(uid)) continue;
    await api(token, `/calendars/${encodeURIComponent(calId)}/events/${encodeURIComponent(ex.id)}`, { method: "DELETE" });
    eliminados += 1;
  }
  await db.usuario.update({ where: { id: usuarioId }, data: { calendarioSincronizadoEn: new Date(), calendarioError: null } });
  return { creados, actualizados, eliminados, recibidos, movidos, total: eventos.length };
}

// Al navegar: si está conectado y pasaron diez minutos, corre en segundo plano.
export async function sincronizarSiToca(usuarioId: string) {
  if (!calendarioPushConfigurado()) return;
  const u = await db.usuario.findUnique({ where: { id: usuarioId }, select: { googleRefreshToken: true, sincronizarCalendario: true, calendarioSincronizadoEn: true } });
  if (!u?.googleRefreshToken || !u.sincronizarCalendario) return;
  if (u.calendarioSincronizadoEn && Date.now() - u.calendarioSincronizadoEn.getTime() < MINUTOS_ENTRE_SINCRONIZACIONES * 60_000) return;
  try {
    await sincronizarCalendarioDe(usuarioId);
  } catch (e) {
    await db.usuario.update({ where: { id: usuarioId }, data: { calendarioError: (e as Error).message.slice(0, 300) } }).catch(() => undefined);
  }
}
