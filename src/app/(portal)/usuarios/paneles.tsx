"use client";

import type { Usuario } from "@prisma/client";
import { guardarUsuario } from "@/actions/admin";
import { Formulario } from "@/components/formularios";
import { Casilla, Entrada, OPCIONES, Seleccion } from "@/components/campos";

export function FormularioUsuario({ usuario, directores }: { usuario?: Usuario; directores: { id: string; nombre: string }[] }) {
  const accion = guardarUsuario.bind(null, usuario?.id ?? null);
  return (
    <Formulario accion={accion} textoBoton={usuario ? "Guardar" : "Crear usuario"}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Entrada nombre="usuario" etiqueta="Usuario" valor={usuario?.usuario} requerido ayuda="Minúsculas, sin espacios." />
        <Entrada nombre="nombre" etiqueta="Nombre" valor={usuario?.nombre} requerido />
        <Entrada nombre="correo" etiqueta="Correo de Google Workspace" valor={usuario?.correo} tipo="email" ayuda="Con este correo entra con Google. Debe ser el de la empresa." />
        <Seleccion nombre="rol" etiqueta="Rol" valor={usuario?.rol ?? "DIRECTOR"} opciones={OPCIONES.rol} requerido />
        <Seleccion nombre="directorId" etiqueta="Dirección comercial" valor={usuario?.directorId} opciones={directores.map((d) => ({ valor: d.id, texto: d.nombre }))} vacio="No aplica" ayuda="Obligatoria para el rol director." />
        <Entrada nombre="clave" etiqueta={usuario ? "Nueva contraseña" : "Contraseña inicial"} tipo="password" ayuda={usuario ? "Vacío = sin cambio. Mínimo 12 caracteres." : "Mínimo 12 caracteres. Pide al usuario cambiarla al ingresar."} />
        {usuario ? <Casilla nombre="activo" etiqueta="Activo" valor={usuario.activo} /> : null}
      </div>
    </Formulario>
  );
}
