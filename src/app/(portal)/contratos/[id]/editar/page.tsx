import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { autorizaContrato, filtroContratos, filtroMarcas, puedeCapturar, requerirSesion, veTodo } from "@/lib/acceso";
import { Boton, Pagina, Tarjeta } from "@/components/ui";
import { FormularioContrato } from "../../formulario-contrato";
import { eliminarContrato } from "@/actions/contratos";
import { Confirmar } from "@/components/formularios";

export default async function EditarContrato({ params }: { params: Promise<{ id: string }> }) {
  const s = await requerirSesion();
  const { id } = await params;
  const c = await db.contrato.findUnique({ where: { id } });
  if (!c || !autorizaContrato(s, c)) notFound();
  if (!puedeCapturar(s)) redirect(`/contratos/${id}`);
  const [marcas, directores, previos] = await Promise.all([
    db.marca.findMany({ where: filtroMarcas(s), orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
    veTodo(s) ? db.director.findMany({ where: { activo: true }, orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }) : Promise.resolve([]),
    db.contrato.findMany({
      where: { ...filtroContratos(s), id: { not: id }, OR: [{ renovacion: null }, { renovacion: { id } }] },
      select: { id: true, codigo: true, proyecto: true, marca: { select: { nombre: true } } },
      orderBy: { codigo: "asc" },
    }),
  ]);
  return (
    <Pagina
      titulo={`Editar · ${c.codigo}`}
      acciones={
        <>
          <Boton href={`/contratos/${id}`}>Volver al detalle</Boton>
          <Confirmar accion={eliminarContrato.bind(null, id)} texto="Eliminar contrato" mensaje="Se eliminarán también sus hitos y compromisos. ¿Continuar?" />
        </>
      }
    >
      <Tarjeta>
        <FormularioContrato global={veTodo(s)} marcas={marcas} directores={directores} contratosPrevios={previos.map((p) => ({ id: p.id, texto: `${p.marca.nombre} · ${p.proyecto} (${p.codigo})` }))} contrato={c} />
      </Tarjeta>
    </Pagina>
  );
}
