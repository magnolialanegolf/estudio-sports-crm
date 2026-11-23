import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { filtroMarcas, puedeCapturar, requerirSesion, veTodo } from "@/lib/acceso";
import { Boton, Pagina, Tarjeta } from "@/components/ui";
import { FormularioMarca } from "../../formulario-marca";

export default async function EditarMarca({ params }: { params: Promise<{ id: string }> }) {
  const s = await requerirSesion();
  const { id } = await params;
  if (!puedeCapturar(s)) redirect(`/marcas/${id}`);
  const m = await db.marca.findFirst({ where: { id, ...filtroMarcas(s) } });
  if (!m) notFound();
  return (
    <Pagina titulo={`Editar · ${m.nombre}`} acciones={<Boton href={`/marcas/${id}`}>Volver</Boton>}>
      <Tarjeta>
        <FormularioMarca marca={m} directores={[]} global={veTodo(s)} />
      </Tarjeta>
    </Pagina>
  );
}
