import { NextResponse } from "next/server";
import { format } from "date-fns";
import { Zip, ZipDeflate } from "fflate";
import { db } from "@/lib/db";
import { obtenerSesion } from "@/lib/sesion";
import { registrar } from "@/lib/bitacora";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Respaldo completo para el administrador general: todas las tablas en CSV (UTF-8 con BOM,
// abre en Excel) y todos los documentos como archivos, en un ZIP que se transmite conforme
// se genera. Pensado para guardarse fuera del portal (Drive de la empresa, disco local).

const codificador = new TextEncoder();

function celda(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object") return JSON.stringify(v);
  const s = String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function csv(filas: Record<string, unknown>[]): Uint8Array {
  if (filas.length === 0) return codificador.encode("﻿");
  const columnas = Object.keys(filas[0]);
  const lineas = [columnas.join(","), ...filas.map((f) => columnas.map((c) => celda(f[c])).join(","))];
  return codificador.encode("﻿" + lineas.join("\r\n"));
}

function limpio(nombre: string) {
  return nombre.replace(/[\\/:*?"<>|]+/g, "-").slice(0, 120);
}

export async function GET() {
  const s = await obtenerSesion();
  if (!s || s.rol !== "ADMIN_GENERAL") return new NextResponse("No autorizado", { status: 403 });
  const sello = format(new Date(), "yyyyMMdd-HHmm");

  const flujo = new ReadableStream<Uint8Array>({
    start(controlador) {
      const zip = new Zip((err, datos, final) => {
        if (err) {
          controlador.error(err);
          return;
        }
        controlador.enqueue(datos);
        if (final) controlador.close();
      });
      const agregar = (ruta: string, contenido: Uint8Array) => {
        const archivo = new ZipDeflate(ruta, { level: 6 });
        zip.add(archivo);
        archivo.push(contenido, true);
      };

      (async () => {
        const base = `respaldo-estudio-sports-${sello}`;
        const tablas: [string, () => Promise<Record<string, unknown>[]>][] = [
          ["directores", () => db.director.findMany({ orderBy: { nombre: "asc" } })],
          ["marcas", () => db.marca.findMany({ orderBy: { nombre: "asc" } })],
          ["carteras", () => db.cartera.findMany()],
          ["contactos", () => db.contacto.findMany()],
          ["contratos", () => db.contrato.findMany({ orderBy: { codigo: "asc" } })],
          ["hitos_cobro", () => db.hitoCobro.findMany()],
          ["compromisos", () => db.compromiso.findMany()],
          ["reglas_comision", () => db.reglaComision.findMany()],
          ["pagos_comision", () => db.pagoComision.findMany()],
          ["incidencias", () => db.incidencia.findMany()],
          ["comentarios_incidencia", () => db.comentarioIncidencia.findMany()],
          ["avisos", () => db.aviso.findMany()],
          // Usuarios sin contraseña ni liga de calendario: el respaldo no debe servir para entrar.
          ["usuarios", () => db.usuario.findMany({ orderBy: { usuario: "asc" }, select: { id: true, usuario: true, nombre: true, correo: true, rol: true, directorId: true, activo: true, creadoEn: true, ultimoAcceso: true } })],
          ["bitacora", () => db.bitacora.findMany({ orderBy: { fecha: "asc" } })],
          ["documentos_indice", () => db.documento.findMany({ select: { id: true, contratoId: true, hitoId: true, categoria: true, nombre: true, tipoMime: true, tamano: true, descripcion: true, subidoPorId: true, creadoEn: true } })],
        ];
        for (const [nombre, consulta] of tablas) {
          agregar(`${base}/datos/${nombre}.csv`, csv(await consulta()));
        }

        // Documentos uno por uno para no cargar todo en memoria.
        const indice = await db.documento.findMany({ select: { id: true, nombre: true, categoria: true, contrato: { select: { codigo: true, marca: { select: { nombre: true } } } } }, orderBy: { creadoEn: "asc" } });
        const usados = new Set<string>();
        for (const d of indice) {
          const doc = await db.documento.findUnique({ where: { id: d.id }, select: { contenido: true } });
          if (!doc) continue;
          let ruta = `${base}/documentos/${limpio(d.contrato.marca.nombre)}/${limpio(d.contrato.codigo)}/${d.categoria.toLowerCase()}-${limpio(d.nombre)}`;
          if (usados.has(ruta)) ruta = ruta.replace(/(\.[^.]+)?$/, `-${d.id.slice(-6)}$1`);
          usados.add(ruta);
          agregar(ruta, new Uint8Array(doc.contenido));
        }
        agregar(
          `${base}/LEEME.txt`,
          codificador.encode(
            `Respaldo completo del CRM comercial de Estudio Sports\nGenerado: ${new Date().toISOString()}\nPor: ${s.nombre} (${s.usuario})\n\n` +
              `datos/        Todas las tablas en CSV (UTF-8). Las fechas van en formato ISO.\n` +
              `documentos/   Contratos, facturas, XML y comprobantes, por marca y código de contrato.\n` +
              `usuarios.csv  No incluye contraseñas ni ligas de calendario.\n\n` +
              `Guarda este archivo fuera del portal: Google Drive de la empresa o un disco propio.\n`,
          ),
        );
        zip.end();
        await registrar({ usuarioId: s.usuarioId, accion: "crear", entidad: "respaldo", detalle: { documentos: indice.length, sello } });
      })().catch((e) => controlador.error(e));
    },
  });

  return new Response(flujo, {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="respaldo-estudio-sports-${sello}.zip"`,
      "cache-control": "no-store",
    },
  });
}
