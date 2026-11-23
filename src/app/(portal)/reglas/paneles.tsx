"use client";

import { eliminarRegla, guardarRegla, registrarPagoComision } from "@/actions/admin";
import { Formulario } from "@/components/formularios";
import { Area, Entrada, Fecha, OPCIONES, Seleccion } from "@/components/campos";

type ReglaPlano = { id: string; directorId: string; marcaId: string | null; tipo: string | null; pctCasa: number; pctDirector: number; vigenteDesde: Date; vigenteHasta: Date | null; notas: string | null };

export function FormularioRegla({ regla, directores, marcas }: { regla?: ReglaPlano; directores: { id: string; nombre: string }[]; marcas: { id: string; nombre: string }[] }) {
  const accion = guardarRegla.bind(null, regla?.id ?? null);
  return (
    <Formulario accion={accion} textoBoton={regla ? "Guardar" : "Crear regla"}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Seleccion nombre="directorId" etiqueta="Director" valor={regla?.directorId} opciones={directores.map((d) => ({ valor: d.id, texto: d.nombre }))} requerido vacio="Selecciona…" />
        <Seleccion nombre="marcaId" etiqueta="Marca" valor={regla?.marcaId} opciones={marcas.map((m) => ({ valor: m.id, texto: m.nombre }))} vacio="Todas las marcas" />
        <Seleccion nombre="tipo" etiqueta="Tipo de contrato" valor={regla?.tipo} opciones={OPCIONES.tipo} vacio="Todos los tipos" />
        <div className="grid grid-cols-2 gap-3">
          <Entrada nombre="pctCasa" etiqueta="Retención casa %" valor={regla ? Math.round(regla.pctCasa * 10000) / 100 : 20} tipo="number" paso="0.01" requerido />
          <Entrada nombre="pctDirector" etiqueta="Director %" valor={regla ? Math.round(regla.pctDirector * 10000) / 100 : ""} tipo="number" paso="0.01" requerido />
        </div>
        <Fecha nombre="vigenteDesde" etiqueta="Vigente desde" valor={regla?.vigenteDesde ?? new Date()} requerido />
        <Fecha nombre="vigenteHasta" etiqueta="Vigente hasta" valor={regla?.vigenteHasta} ayuda="Vacío = sin fecha de fin." />
        <Area nombre="notas" etiqueta="Notas" valor={regla?.notas} filas={2} className="sm:col-span-2" />
      </div>
    </Formulario>
  );
}

export function BorrarRegla({ id }: { id: string }) {
  return (
    <form
      action={eliminarRegla.bind(null, id)}
      onSubmit={(e) => {
        if (!window.confirm("¿Eliminar la regla? Las comisiones de cobros en su vigencia dejarán de calcularse. Para cambiar un porcentaje, mejor cierra su vigencia y crea una nueva.")) e.preventDefault();
      }}
    >
      <button type="submit" className="text-xs text-riesgo hover:underline">Eliminar</button>
    </form>
  );
}

export function FormularioPagoComision({ directores, contratos }: { directores: { id: string; nombre: string }[]; contratos: { id: string; directorId: string; texto: string }[] }) {
  return (
    <Formulario accion={registrarPagoComision} textoBoton="Registrar pago">
      <Seleccion nombre="directorId" etiqueta="Director" opciones={directores.map((d) => ({ valor: d.id, texto: d.nombre }))} requerido vacio="Selecciona…" />
      <Seleccion nombre="contratoId" etiqueta="Contrato relacionado" opciones={contratos.map((c) => ({ valor: c.id, texto: c.texto }))} vacio="Sin contrato específico" />
      <Entrada nombre="concepto" etiqueta="Concepto" requerido placeholder="Comisión pago bimestral 2" />
      <div className="grid grid-cols-2 gap-3">
        <Entrada nombre="monto" etiqueta="Monto" tipo="number" paso="1" requerido />
        <Seleccion nombre="modalidad" etiqueta="Modalidad" valor="EFECTIVO" opciones={OPCIONES.modalidad} />
      </div>
      <Fecha nombre="fechaPago" etiqueta="Fecha de pago" valor={new Date()} />
      <Area nombre="notas" etiqueta="Notas" filas={2} />
    </Formulario>
  );
}
