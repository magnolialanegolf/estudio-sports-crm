import { NextResponse } from "next/server";
import { format } from "date-fns";
import { db } from "@/lib/db";
import { eventosDeUsuario } from "@/lib/eventos";

// Calendario personal por suscripción (Google Calendar, iPhone, Outlook).
// Se identifica por la liga privada del usuario, sin sesión. Cada quien ve lo suyo.
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const limpio = token.replace(/\.ics$/, "");
  if (!/^[a-f0-9]{48}$/.test(limpio)) return new NextResponse("No encontrado", { status: 404 });
  const u = await db.usuario.findFirst({ where: { icsToken: limpio } });
  if (!u || !u.activo) return new NextResponse("No encontrado", { status: 404 });

  const eventos = await eventosDeUsuario(u);
  const ahora = format(new Date(), "yyyyMMdd'T'HHmmss'Z'");
  const dia = (d: Date) => format(d, "yyyyMMdd");
  const esc = (t: string) => t.replace(/[\\;,]/g, (m) => `\\${m}`).replace(/\r?\n/g, "\\n");
  const L: string[] = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Estudio Sports//CRM comercial//ES", "CALSCALE:GREGORIAN", `X-WR-CALNAME:Estudio Sports · ${esc(u.nombre)}`, "X-PUBLISHED-TTL:PT1H", "REFRESH-INTERVAL;VALUE=DURATION:PT1H"];
  for (const e of eventos) {
    L.push("BEGIN:VEVENT", `UID:${e.uid}@estudiosports`, `DTSTAMP:${ahora}`, `DTSTART;VALUE=DATE:${dia(e.fecha)}`, `SUMMARY:${esc(e.titulo)}`, `DESCRIPTION:${esc(e.descripcion)}`, `CATEGORIES:${e.categoria}`, "BEGIN:VALARM", "TRIGGER:-PT15H", "ACTION:DISPLAY", `DESCRIPTION:${esc(e.titulo)}`, "END:VALARM", "END:VEVENT");
  }
  L.push("END:VCALENDAR");

  return new NextResponse(L.join("\r\n"), {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "private, max-age=300", "X-Robots-Tag": "noindex" },
  });
}
