"use client";

import type { Director } from "@prisma/client";
import { asignarMarca, eliminarDirectorDemo, guardarDirector, regenerarDemo } from "@/actions/admin";
import { Formulario } from "@/components/formularios";
import { Area, Casilla, Entrada, Fecha, Seleccion } from "@/components/campos";

export function FormularioDirector({ director }: { director?: Director }) {
  const accion = guardarDirector.bind(null, director?.id ?? null);
  return (
    <Formulario accion={accion} textoBoton={director ? "Guardar" : "Crear director"}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Entrada nombre="nombre" etiqueta="Nombre" valor={director?.nombre} requerido />
        <Entrada nombre="correo" etiqueta="Correo" valor={director?.correo} tipo="email" />
        <Area nombre="notas" etiqueta="Notas" valor={director?.notas} filas={2} className="sm:col-span-2" />
        {director ? <Casilla nombre="activo" etiqueta="Activo" valor={director.activo} ayuda="Un director inactivo conserva historial pero no puede ingresar." /> : null}
      </div>
    </Formulario>
  );
}

export function FormularioAsignacion({ marcas, directores }: { marcas: { id: string; nombre: string; actual: string | null }[]; directores: { id: string; nombre: string }[] }) {
  return (
    <form action={asignarMarca} className="space-y-3">
      <Seleccion nombre="marcaId" etiqueta="Marca" opciones={marcas.map((m) => ({ valor: m.id, texto: `${m.nombre}${m.actual ? ` (hoy: ${m.actual})` : ""}` }))} requerido vacio="Selecciona…" />
      <Seleccion nombre="directorId" etiqueta="Nuevo director" opciones={directores.map((d) => ({ valor: d.id, texto: d.nombre }))} requerido vacio="Selecciona…" />
      <Fecha nombre="desde" etiqueta="Desde" valor={new Date()} />
      <div className="flex justify-end">
        <button type="submit" className="rounded border border-acento bg-acento px-3.5 py-2 text-sm font-medium text-white">Asignar</button>
      </div>
    </form>
  );
}

export function BorrarDemo({ id }: { id: string }) {
  return (
    <form
      action={eliminarDirectorDemo.bind(null, id)}
      onSubmit={(e) => {
        if (!window.confirm("Se eliminarán el director de demostración, sus marcas, contratos y usuario. ¿Continuar?")) e.preventDefault();
      }}
    >
      <button type="submit" className="rounded border border-riesgo/40 px-2.5 py-1 text-xs font-medium text-riesgo hover:bg-riesgo-suave">Eliminar demostración</button>
    </form>
  );
}

export function FormularioDemo({ directores }: { directores: { id: string; nombre: string }[] }) {
  return (
    <Formulario accion={regenerarDemo} textoBoton="Regenerar demostración">
      <Seleccion nombre="origenId" etiqueta="Copiar y anonimizar la cartera de" opciones={directores.map((d) => ({ valor: d.id, texto: d.nombre }))} requerido vacio="Selecciona…" />
    </Formulario>
  );
}
