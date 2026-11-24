import type { EtapaEntregable } from "@prisma/client";

// Cadena interna de un entregable: comercial lo acuerda → producción lo graba →
// edición lo edita → se publica o entrega → comercial cobra. Cada traspaso avisa
// a quien sigue y queda registrado con fecha y persona.

export const ETAPAS: EtapaEntregable[] = ["POR_AUTORIZAR", "POR_PRODUCIR", "GRABADO", "EN_EDICION", "EDITADO", "PUBLICADO"];

export const ETIQUETA_ETAPA: Record<EtapaEntregable, string> = {
  POR_AUTORIZAR: "Por autorizar",
  POR_PRODUCIR: "Por producir",
  GRABADO: "Grabado",
  EN_EDICION: "En edición",
  EDITADO: "Editado",
  PUBLICADO: "Publicado",
};

// Quién ejecuta cada etapa, para que el stepper lo diga en lenguaje de la empresa.
export const DUENO_ETAPA: Record<EtapaEntregable, string> = {
  POR_AUTORIZAR: "Comercial",
  POR_PRODUCIR: "Producción",
  GRABADO: "Producción",
  EN_EDICION: "Edición",
  EDITADO: "Edición",
  PUBLICADO: "Comercial",
};

// Texto del botón que lleva a la siguiente etapa.
export const ACCION_SIGUIENTE: Record<EtapaEntregable, string | null> = {
  POR_AUTORIZAR: "Autorizar ejecución",
  POR_PRODUCIR: "Marcar grabado",
  GRABADO: "Tomar para edición",
  EN_EDICION: "Edición lista",
  EDITADO: "Publicado / entregado",
  PUBLICADO: null,
};

export function siguiente(e: EtapaEntregable): EtapaEntregable | null {
  const i = ETAPAS.indexOf(e);
  return i >= 0 && i < ETAPAS.length - 1 ? ETAPAS[i + 1] : null;
}

export function anterior(e: EtapaEntregable): EtapaEntregable | null {
  const i = ETAPAS.indexOf(e);
  return i > 0 ? ETAPAS[i - 1] : null;
}

export type Actor = { esComercial: boolean; esAsignado: boolean; esEditor: boolean };

// Reglas de quién puede mover un entregable. Comercial (director, asistente, dirección)
// puede todo; producción avanza lo suyo; edición avanza lo que edita.
export function puedeMover(actor: Actor, de: EtapaEntregable, a: EtapaEntregable): boolean {
  if (actor.esComercial) return true;
  // Sin autorización comercial, producción y edición no mueven nada.
  if (de === "POR_AUTORIZAR" || a === "POR_AUTORIZAR") return false;
  const avance = siguiente(de) === a;
  const regreso = anterior(de) === a;
  if (avance) {
    if (de === "POR_PRODUCIR") return actor.esAsignado;
    if (de === "GRABADO") return actor.esEditor || actor.esAsignado;
    if (de === "EN_EDICION") return actor.esEditor;
    if (de === "EDITADO") return actor.esAsignado || actor.esEditor;
  }
  if (regreso) {
    // Edición puede regresar a producción algo que no sirve; producción puede retomar lo grabado.
    if (de === "EN_EDICION" || de === "EDITADO") return actor.esEditor;
    if (de === "GRABADO") return actor.esAsignado;
  }
  return false;
}

export function tonoEtapa(e: EtapaEntregable): "neutro" | "alerta" | "acento" | "ok" {
  if (e === "PUBLICADO") return "ok";
  if (e === "EDITADO") return "acento";
  if (e === "POR_PRODUCIR") return "alerta";
  if (e === "POR_AUTORIZAR") return "neutro";
  return "neutro";
}

// En cancha de quién está un entregable abierto: la persona (o el área, si no hay nadie asignado)
// que debe mover la siguiente etapa. Es lo que ven comercial y dirección para saber a quién preguntar.
export function enCanchaDe(k: {
  tipo: string;
  estado: string;
  etapa: EtapaEntregable;
  asignadoA?: { nombre: string } | null;
  editor?: { nombre: string } | null;
  contrato: { director: { nombre: string } };
}): { quien: string; area: string; sinAsignar: boolean } | null {
  if (k.tipo !== "ENTREGABLE" || k.estado === "CUMPLIDO" || k.estado === "CANCELADO") return null;
  if (k.etapa === "POR_AUTORIZAR") return { quien: k.contrato.director.nombre, area: "Comercial · autorizar", sinAsignar: false };
  if (k.etapa === "POR_PRODUCIR") return { quien: k.asignadoA?.nombre ?? "Producción, sin asignar", area: "Producción", sinAsignar: !k.asignadoA };
  if (k.etapa === "GRABADO" || k.etapa === "EN_EDICION") return { quien: k.editor?.nombre ?? "Edición, sin editor", area: "Edición", sinAsignar: !k.editor };
  if (k.etapa === "EDITADO") return { quien: k.contrato.director.nombre, area: "Comercial", sinAsignar: false };
  return null;
}
