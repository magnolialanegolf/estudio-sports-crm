import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { obtenerSesion } from "@/lib/sesion";
import { autorizaContrato, esProduccion } from "@/lib/acceso";
import { registrar } from "@/lib/bitacora";

// Entrega un documento adjunto a quien tiene acceso al contrato. Producción no accede.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const s = await obtenerSesion();
  if (!s || esProduccion(s)) return new NextResponse("No autorizado", { status: 401 });
  const { id } = await params;
  const d = await db.documento.findUnique({ where: { id }, include: { contrato: { select: { directorId: true, codigo: true } } } });
  if (!d || !autorizaContrato(s, d.contrato)) return new NextResponse("No encontrado", { status: 404 });
  const descargar = req.nextUrl.searchParams.get("descargar") === "1";
  await registrar({ usuarioId: s.usuarioId, accion: "editar", entidad: "documento", entidadId: d.id, detalle: { acceso: descargar ? "descarga" : "vista", contrato: d.contrato.codigo } });
  const nombre = encodeURIComponent(d.nombre);
  return new NextResponse(new Uint8Array(d.contenido), {
    headers: {
      "Content-Type": d.tipoMime,
      "Content-Length": String(d.tamano),
      "Content-Disposition": `${descargar ? "attachment" : "inline"}; filename*=UTF-8''${nombre}`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
