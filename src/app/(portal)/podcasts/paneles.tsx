"use client";

import { guardarPodcast } from "@/actions/admin";
import { Formulario } from "@/components/formularios";
import { Area, Casilla, Entrada } from "@/components/campos";

type Podcast = { id?: string; nombre?: string; talento?: string | null; descripcion?: string | null; activo?: boolean };

export function FormularioPodcast({ podcast }: { podcast?: Podcast }) {
  const accion = guardarPodcast.bind(null, podcast?.id ?? null);
  return (
    <Formulario accion={accion} textoBoton={podcast?.id ? "Guardar" : "Crear pódcast"}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Entrada nombre="nombre" etiqueta="Nombre del programa" valor={podcast?.nombre} requerido placeholder="La Jugada" />
        <Entrada nombre="talento" etiqueta="Talento" valor={podcast?.talento} placeholder="Luis García, Christian Martinoli" />
        <Area nombre="descripcion" etiqueta="Descripción" valor={podcast?.descripcion} filas={2} className="sm:col-span-2" />
        {podcast?.id ? (
          <div className="flex items-end">
            <Casilla nombre="activo" etiqueta="Activo" valor={podcast.activo ?? true} ayuda="Inactivo deja de aparecer en el formulario de contratos." />
          </div>
        ) : null}
      </div>
    </Formulario>
  );
}
