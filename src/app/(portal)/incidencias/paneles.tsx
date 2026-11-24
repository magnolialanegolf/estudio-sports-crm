"use client";

import { actualizarIncidencia, crearIncidencia } from "@/actions/incidencias";
import { Formulario } from "@/components/formularios";
import { Area, Entrada, Fecha, Seleccion } from "@/components/campos";

const ROL: Record<string, string> = { ADMIN_GENERAL: "dirección", GERENTE_GENERAL: "gerencia", DIRECTOR: "director", ASISTENTE_COMERCIAL: "asistente", ADMINISTRACION: "pagos", PRODUCCION: "producción", CONTENIDOS: "contenidos", OPERATIVO: "operativo", LECTURA: "lectura" };
const TIPOS = [
  { valor: "PENDIENTE", texto: "Pendiente" },
  { valor: "INCIDENCIA", texto: "Incidencia" },
  { valor: "PROBLEMA", texto: "Problema" },
  { valor: "SOLICITUD", texto: "Solicitud" },
];
const PRIORIDADES = [
  { valor: "BAJA", texto: "Baja" },
  { valor: "MEDIA", texto: "Media" },
  { valor: "ALTA", texto: "Alta" },
  { valor: "URGENTE", texto: "Urgente" },
];
const ESTADOS = [
  { valor: "ABIERTA", texto: "Abierta" },
  { valor: "EN_ATENCION", texto: "En atención" },
  { valor: "RESUELTA", texto: "Resuelta" },
  { valor: "CERRADA", texto: "Cerrada" },
];

type Usuario = { id: string; nombre: string; rol: string };

export function FormularioIncidencia({ usuarios, contratos, marcas, contratoInicial }: { usuarios: Usuario[]; contratos: { id: string; texto: string }[]; marcas: { id: string; nombre: string }[]; contratoInicial?: string }) {
  return (
    <Formulario accion={crearIncidencia} textoBoton="Reportar">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Entrada nombre="titulo" etiqueta="Asunto" requerido className="sm:col-span-2" placeholder="Falta el logo de la marca para la mención; la factura fue rechazada; el talento no puede el 3 de diciembre…" />
        <Seleccion nombre="tipo" etiqueta="Tipo" valor="PENDIENTE" opciones={TIPOS} />
        <Seleccion nombre="prioridad" etiqueta="Prioridad" valor="MEDIA" opciones={PRIORIDADES} ayuda="Urgente avisa a dirección de inmediato." />
        <Seleccion nombre="asignadoAId" etiqueta="Responsable" opciones={usuarios.map((u) => ({ valor: u.id, texto: `${u.nombre} · ${ROL[u.rol] ?? u.rol}` }))} vacio="Sin asignar aún" />
        <Fecha nombre="fechaLimite" etiqueta="Fecha límite" />
        <Seleccion nombre="contratoId" etiqueta="Contrato relacionado" valor={contratoInicial} opciones={contratos.map((c) => ({ valor: c.id, texto: c.texto }))} vacio="Ninguno" />
        {marcas.length ? <Seleccion nombre="marcaId" etiqueta="Marca relacionada" opciones={marcas.map((m) => ({ valor: m.id, texto: m.nombre }))} vacio="Ninguna" /> : null}
        <Area nombre="descripcion" etiqueta="Descripción" filas={4} className="sm:col-span-2" ayuda="Qué pasa, qué se necesita y qué se espera de la persona responsable." />
      </div>
    </Formulario>
  );
}

export function FormularioActualizacion({ incidencia, usuarios }: { incidencia: { id: string; estado: string; prioridad: string; asignadoAId: string | null; fechaLimite: Date | null }; usuarios: Usuario[] }) {
  const accion = actualizarIncidencia.bind(null, incidencia.id);
  return (
    <Formulario accion={accion} textoBoton="Guardar">
      <Seleccion nombre="estado" etiqueta="Estado" valor={incidencia.estado} opciones={ESTADOS} />
      <Seleccion nombre="prioridad" etiqueta="Prioridad" valor={incidencia.prioridad} opciones={PRIORIDADES} />
      <Seleccion nombre="asignadoAId" etiqueta="Responsable" valor={incidencia.asignadoAId} opciones={usuarios.map((u) => ({ valor: u.id, texto: `${u.nombre} · ${ROL[u.rol] ?? u.rol}` }))} vacio="Sin asignar" />
      <Fecha nombre="fechaLimite" etiqueta="Fecha límite" valor={incidencia.fechaLimite} />
      <Area nombre="comentario" etiqueta="Comentario" filas={3} ayuda="Qué se hizo, qué falta o por qué cambia." />
    </Formulario>
  );
}
