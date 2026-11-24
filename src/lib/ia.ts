import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

// Lectura automática de un contrato en PDF con Claude. Devuelve una propuesta
// estructurada que el director revisa y aprueba; nunca se aplica sola.

export const EsquemaPropuesta = z.object({
  resumen: z.string().describe("Dos o tres frases: qué contrata la marca y a quién."),
  marca: z.string().nullable().describe("Nombre comercial de la marca o cliente."),
  talento: z.string().nullable().describe("Talento o personas cuya imagen se contrata."),
  tipo: z.enum(["COMERCIAL", "PODCAST", "EMBAJADURIA", "OTRO"]),
  inicio: z.string().nullable().describe("Fecha de inicio en formato AAAA-MM-DD si aparece."),
  vencimiento: z.string().nullable().describe("Fecha de fin en formato AAAA-MM-DD si aparece."),
  montoSinIva: z.number().nullable().describe("Contraprestación total sin IVA en pesos, si aparece."),
  acuerdosContenido: z
    .string()
    .describe("Texto para el equipo de producción: qué se entrega, cuántas piezas, duración, dónde se publica, aprobaciones, exclusividades y restricciones. Sin montos ni comisiones."),
  entregables: z.array(
    z.object({
      descripcion: z.string().describe("Entregable concreto, por ejemplo «Mención en Instagram (historia + post)»."),
      cantidad: z.number().int().min(1),
      periodicidad: z.enum(["UNICA", "SEMANA", "QUINCENA", "MES"]).describe("UNICA si es una sola entrega; si se repite, cada cuánto."),
      fechaInicio: z.string().nullable().describe("Primera fecha en AAAA-MM-DD si el contrato la fija."),
      detalle: z.string().nullable().describe("Duración, formato, requisitos de aprobación."),
    }),
  ),
  fechasClave: z.array(z.object({ descripcion: z.string(), fecha: z.string().describe("AAAA-MM-DD") })),
  hitosCobro: z.array(
    z.object({
      concepto: z.string(),
      importe: z.number().nullable().describe("Sin IVA, en pesos."),
      fecha: z.string().nullable().describe("AAAA-MM-DD si el contrato fija fecha de facturación o pago."),
    }),
  ),
  advertencias: z.array(z.string()).describe("Dudas, cláusulas ambiguas o datos que no aparecen y conviene confirmar."),
});

export type PropuestaIa = z.infer<typeof EsquemaPropuesta>;

export function iaConfigurada() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const INSTRUCCIONES = `Eres analista contractual de una agencia mexicana de representación de talento deportivo.
Lee el contrato adjunto y extrae lo necesario para operarlo: qué entrega la agencia y el talento a la marca
(menciones, contenidos, apariciones, con cantidades, duración y fechas), las fechas clave, la vigencia,
la contraprestación y el calendario de facturación o pago si lo hay.
Reglas:
- Escribe en español de México, sobrio y preciso.
- No inventes: si un dato no está, déjalo nulo y anótalo en advertencias.
- "acuerdosContenido" lo leerá el equipo de producción: no incluyas montos ni comisiones ahí.
- Cada entregable repetido (por ejemplo "cuatro menciones mensuales") va como un solo entregable con cantidad y periodicidad.
- Fechas siempre en AAAA-MM-DD.`;

export async function analizarContratoPdf(pdf: Buffer, contexto: { marca?: string | null; proyecto?: string | null }): Promise<PropuestaIa> {
  if (!iaConfigurada()) throw new Error("El lector de contratos no está configurado (falta ANTHROPIC_API_KEY).");
  const client = new Anthropic();
  const respuesta = await client.messages.parse({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    output_config: { effort: "medium", format: zodOutputFormat(EsquemaPropuesta) },
    system: INSTRUCCIONES,
    messages: [
      {
        role: "user",
        content: [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdf.toString("base64") } },
          {
            type: "text",
            text: `Contrato registrado en el CRM como «${contexto.proyecto ?? "sin nombre"}» de la marca «${contexto.marca ?? "sin marca"}». Extrae la información para operarlo.`,
          },
        ],
      },
    ],
  });
  if (respuesta.stop_reason === "refusal") throw new Error("El modelo declinó analizar este documento.");
  if (!respuesta.parsed_output) throw new Error("No se pudo interpretar la respuesta del lector.");
  return respuesta.parsed_output;
}
