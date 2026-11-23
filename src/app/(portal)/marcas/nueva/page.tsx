import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { puedeCapturar, requerirSesion, veTodo } from "@/lib/acceso";
import { Pagina, Tarjeta } from "@/components/ui";
import { FormularioMarca } from "../formulario-marca";

export default async function NuevaMarca() {
  const s = await requerirSesion();
  if (!puedeCapturar(s)) redirect("/marcas");
  const directores = veTodo(s) ? await db.director.findMany({ where: { activo: true }, orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }) : [];
  return (
    <Pagina titulo="Nueva marca" subtitulo={veTodo(s) ? "La marca se asigna a la cartera del director indicado." : "La marca quedará en tu cartera."}>
      <Tarjeta>
        <FormularioMarca directores={directores} global={veTodo(s)} />
      </Tarjeta>
    </Pagina>
  );
}
