"use client";

import { guardarContrato } from "@/actions/contratos";
import { Formulario } from "@/components/formularios";
import { Area, Casilla, Entrada, Fecha, OPCIONES, Seleccion } from "@/components/campos";

type ContratoBase = {
  id?: string;
  codigo?: string;
  marcaId?: string;
  directorId?: string;
  proyecto?: string;
  tipo?: string;
  podcastId?: string | null;
  estado?: string;
  monto?: number | null;
  probabilidad?: number | null;
  montoConfirmado?: boolean;
  inicio?: Date | null;
  inicioConfirmado?: boolean;
  vencimiento?: Date | null;
  vencimientoConfirmado?: boolean;
  duracionMeses?: number | null;
  talento?: string | null;
  brief?: string | null;
  documentoUrl?: string | null;
  renovacionDeId?: string | null;
  notas?: string | null;
  observaciones?: string | null;
};

export function FormularioContrato({
  contrato,
  marcas,
  directores,
  contratosPrevios,
  podcasts = [],
  global,
}: {
  contrato?: ContratoBase;
  marcas: { id: string; nombre: string }[];
  directores: { id: string; nombre: string }[];
  contratosPrevios: { id: string; texto: string }[];
  podcasts?: { id: string; nombre: string }[];
  global: boolean;
}) {
  const accion = guardarContrato.bind(null, contrato?.id ?? null);
  return (
    <Formulario accion={accion} textoBoton={contrato?.id ? "Guardar cambios" : "Crear contrato"}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Entrada nombre="codigo" etiqueta="Código" valor={contrato?.codigo} requerido placeholder="MARCA-2027" ayuda="Identificador único, en mayúsculas." />
        <Seleccion nombre="marcaId" etiqueta="Marca" valor={contrato?.marcaId} opciones={marcas.map((m) => ({ valor: m.id, texto: m.nombre }))} requerido vacio="Selecciona…" />
        {global ? (
          <Seleccion nombre="directorId" etiqueta="Director responsable" valor={contrato?.directorId} opciones={directores.map((d) => ({ valor: d.id, texto: d.nombre }))} vacio="Según cartera de la marca" />
        ) : null}
        <Entrada nombre="proyecto" etiqueta="Proyecto" valor={contrato?.proyecto} requerido className="sm:col-span-2" placeholder="Comercial 2027–2028" />
        <Seleccion nombre="tipo" etiqueta="Tipo" valor={contrato?.tipo ?? "COMERCIAL"} opciones={OPCIONES.tipo} requerido />
        <Seleccion nombre="podcastId" etiqueta="Pódcast (si es contrato de pódcast)" valor={contrato?.podcastId} opciones={podcasts.map((p) => ({ valor: p.id, texto: p.nombre }))} vacio="No aplica" ayuda="Liga el contrato al programa para medir cuánto deja cada pódcast." />
        <Seleccion nombre="estado" etiqueta="Estado" valor={contrato?.estado ?? "PROPUESTA"} opciones={OPCIONES.estadoContrato} requerido />
        <Entrada nombre="monto" etiqueta="Monto sin IVA (MXN)" valor={contrato?.monto ?? ""} tipo="number" paso="1" placeholder="0" />
        <Entrada nombre="probabilidad" etiqueta="Avance de cierre (%)" valor={contrato?.probabilidad ?? ""} tipo="number" paso="1" placeholder="Según etapa" ayuda="Vacío usa el de la etapa: prospecto 10, propuesta 40, por firmar 80. Pondera el pipeline." />
        <Entrada nombre="duracionMeses" etiqueta="Duración (meses)" valor={contrato?.duracionMeses ?? ""} tipo="number" paso="1" />
        <Fecha nombre="inicio" etiqueta="Inicio" valor={contrato?.inicio} />
        <Fecha nombre="vencimiento" etiqueta="Vencimiento" valor={contrato?.vencimiento} />
        <Entrada nombre="talento" etiqueta="Talento" valor={contrato?.talento} placeholder="Nombre(s) del talento" />
        <Entrada nombre="documentoUrl" etiqueta="Liga al contrato firmado" valor={contrato?.documentoUrl} tipo="url" placeholder="https://…" className="sm:col-span-2" />
        <Seleccion nombre="renovacionDeId" etiqueta="Renueva al contrato" valor={contrato?.renovacionDeId} opciones={contratosPrevios.map((c) => ({ valor: c.id, texto: c.texto }))} vacio="No es renovación" className="sm:col-span-2 lg:col-span-3" />
      </div>
      <div className="grid grid-cols-1 gap-2 rounded border border-linea bg-superficie-2 p-3 sm:grid-cols-3">
        <Casilla nombre="montoConfirmado" etiqueta="Monto confirmado" valor={contrato?.montoConfirmado} ayuda="Hay contrato o propuesta que lo respalda." />
        <Casilla nombre="inicioConfirmado" etiqueta="Inicio confirmado" valor={contrato?.inicioConfirmado} />
        <Casilla nombre="vencimientoConfirmado" etiqueta="Vencimiento confirmado" valor={contrato?.vencimientoConfirmado} />
      </div>
      <Area nombre="brief" etiqueta="Acuerdos de contenido (visible para producción)" valor={contrato?.brief} filas={4} ayuda="De qué trata, qué se acordó entregar, dónde, con quién, formatos y restricciones. Sin montos ni comisiones: esto sí lo ve producción." />
      <Area nombre="notas" etiqueta="Notas internas" valor={contrato?.notas} ayuda="Solo comercial y administración." />
      <Area nombre="observaciones" etiqueta="Observaciones de conciliación" valor={contrato?.observaciones} filas={2} ayuda="Contradicciones o datos por confirmar con la marca." />
    </Formulario>
  );
}
