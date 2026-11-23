"use client";

import { guardarMarca } from "@/actions/marcas";
import { Formulario } from "@/components/formularios";
import { Area, Entrada, Seleccion } from "@/components/campos";

export function FormularioMarca({
  marca,
  directores,
  global,
}: {
  marca?: { id: string; nombre: string; sector: string | null; notas: string | null };
  directores: { id: string; nombre: string }[];
  global: boolean;
}) {
  const accion = guardarMarca.bind(null, marca?.id ?? null);
  return (
    <Formulario accion={accion} textoBoton={marca ? "Guardar cambios" : "Crear marca"}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Entrada nombre="nombre" etiqueta="Nombre" valor={marca?.nombre} requerido />
        <Entrada nombre="sector" etiqueta="Sector" valor={marca?.sector} placeholder="Automotriz, alimentos…" />
        {global && !marca ? (
          <Seleccion nombre="directorId" etiqueta="Director responsable" opciones={directores.map((d) => ({ valor: d.id, texto: d.nombre }))} requerido vacio="Selecciona…" className="sm:col-span-2" />
        ) : null}
        <Area nombre="notas" etiqueta="Notas" valor={marca?.notas} className="sm:col-span-2" />
      </div>
    </Formulario>
  );
}
