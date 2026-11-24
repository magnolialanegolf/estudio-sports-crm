import { NextResponse } from "next/server";
import { format } from "date-fns";
import { db } from "@/lib/db";
import type { Sesion } from "@/lib/sesion";
import { esProduccion, filtroCompromisos, filtroContratos } from "@/lib/acceso";

// Calendario personal por suscripción (Google Calendar, iPhone, Outlook).
// Se identifica por la liga privada del usuario, sin sesión. Cada quien ve lo suyo.
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const limpio = token.replace(/\.ics$/, "");
  if (!/^[a-f0-9]{48}$/.test(limpio)) return new NextResponse("No encontrado", { status: 404 });
  const u = await db.usuario.findFirst({ where: { icsToken: limpio }, include: { director: { select: { activo: true } } } });
  if (!u || !u.activo) return new NextResponse("No encontrado", { status: 404 });

  const s: Sesion = { usuarioId: u.id, usuario: u.usuario, nombre: u.nombre, rol: u.rol, directorId: u.directorId };
  const produccion = esProduccion(s);
  const filtro = filtroContratos(s);

  const [compromisos, hitos, vencimientos] = await Promise.all([
    db.compromiso.findMany({
      where: { ...filtroCompromisos(s), ...(produccion ? { etapa: { not: "POR_AUTORIZAR" } } : {}), fecha: { not: null }, estado: { in: ["PENDIENTE", "EN_CURSO", "REQUIERE_ATENCION"] } },
      include: { contrato: { select: { proyecto: true, marca: { select: { nombre: true } } } }, asignadoA: { select: { nombre: true } } },
    }),
    produccion
      ? Promise.resolve([])
      : db.hitoCobro.findMany({
          where: { contrato: { ...filtro, estado: { in: ["VIGENTE", "PENDIENTE_FIRMA"] } }, fechaFacturar: { not: null }, estadoPago: { not: "PAGADO" } },
          include: { contrato: { select: { marca: { select: { nombre: true } } } } },
        }),
    produccion ? Promise.resolve([]) : db.contrato.findMany({ where: { ...filtro, estado: "VIGENTE", vencimiento: { not: null } }, select: { id: true, proyecto: true, vencimiento: true, marca: { select: { nombre: true } } } }),
  ]);

  const ahora = format(new Date(), "yyyyMMdd'T'HHmmss'Z'");
  const dia = (d: Date) => format(d, "yyyyMMdd");
  const esc = (t: string) => t.replace(/[\\;,]/g, (m) => `\\${m}`).replace(/\r?\n/g, "\\n");
  const L: string[] = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Estudio Sports//CRM comercial//ES", "CALSCALE:GREGORIAN", `X-WR-CALNAME:Estudio Sports · ${esc(u.nombre)}`, "X-PUBLISHED-TTL:PT1H", "REFRESH-INTERVAL;VALUE=DURATION:PT1H"];
  const evento = (uid: string, fecha: Date, titulo: string, desc: string, cat: string) => {
    L.push("BEGIN:VEVENT", `UID:${uid}@estudiosports`, `DTSTAMP:${ahora}`, `DTSTART;VALUE=DATE:${dia(fecha)}`, `SUMMARY:${esc(titulo)}`, `DESCRIPTION:${esc(desc)}`, `CATEGORIES:${cat}`, "BEGIN:VALARM", "TRIGGER:-PT15H", "ACTION:DISPLAY", `DESCRIPTION:${esc(titulo)}`, "END:VALARM", "END:VEVENT");
  };
  for (const k of compromisos) {
    const pref = k.tipo === "FECHA_CLAVE" ? "Fecha clave" : k.tipo === "ENTREGABLE" ? "Entregable" : "Seguimiento";
    evento(`compromiso-${k.id}`, k.fecha!, `${pref} · ${k.contrato.marca.nombre} · ${k.descripcion}`, [k.contrato.proyecto, k.asignadoA ? `Responsable: ${k.asignadoA.nombre}` : k.responsable ? `Responsable: ${k.responsable}` : "", k.notas ?? ""].filter(Boolean).join("\n"), "Acciones");
  }
  for (const h of hitos) evento(`hito-${h.id}`, h.fechaFacturar!, `Facturar · ${h.contrato.marca.nombre} · ${h.concepto} · $${h.importe.toLocaleString("es-MX")}`, h.notas ?? "", "Cobros");
  for (const c of vencimientos) evento(`vence-${c.id}`, c.vencimiento!, `Vence contrato · ${c.marca.nombre} · ${c.proyecto}`, "Preparar renovación.", "Contratos");
  L.push("END:VCALENDAR");

  return new NextResponse(L.join("\r\n"), {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "private, max-age=300", "X-Robots-Tag": "noindex" },
  });
}
