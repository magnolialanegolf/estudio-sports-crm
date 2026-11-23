import { z } from "zod";

// Utilidades de captura compartidas por las acciones de servidor.

export const texto = (max = 2000) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? null : typeof v === "string" ? v.trim() : v), z.string().max(max).nullable());

export const textoRequerido = (max = 200) => z.string().trim().min(1, "Campo obligatorio.").max(max);

export const entero = () =>
  z.preprocess((v) => {
    if (v === "" || v === null || v === undefined) return null;
    const n = Number(String(v).replace(/[^\d.-]/g, ""));
    return Number.isFinite(n) ? Math.round(n) : NaN;
  }, z.number().int().min(0).nullable());

export const enteroRequerido = () =>
  z.preprocess((v) => {
    const n = Number(String(v ?? "").replace(/[^\d.-]/g, ""));
    return Number.isFinite(n) ? Math.round(n) : NaN;
  }, z.number().int().min(0, "Debe ser un número positivo."));

export const fechaOpcional = () =>
  z.preprocess((v) => {
    if (v === "" || v === null || v === undefined) return null;
    const d = new Date(`${v}T12:00:00.000Z`);
    return Number.isNaN(d.getTime()) ? NaN : d;
  }, z.date().nullable());

export const fechaRequerida = () =>
  z.preprocess((v) => {
    const d = new Date(`${v}T12:00:00.000Z`);
    return Number.isNaN(d.getTime()) ? NaN : d;
  }, z.date());

// Porcentaje capturado como "25" o "25 %" → 0.25
export const porcentajeFraccion = () =>
  z.preprocess((v) => {
    const n = Number(String(v ?? "").replace(/[^\d.]/g, ""));
    return Number.isFinite(n) ? n / 100 : NaN;
  }, z.number().min(0).max(1));

export const casilla = () => z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());

export function deFormulario(fd: FormData): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  for (const [k, v] of fd.entries()) o[k] = v;
  return o;
}

export type Resultado = { error?: string; ok?: boolean } | undefined;

export function primerError(e: z.ZodError): string {
  const i = e.issues[0];
  return i ? `${i.path.join(".") || "formulario"}: ${i.message}` : "Datos inválidos.";
}
