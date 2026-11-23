import { db } from "@/lib/db";
import { filtroContratos, filtroMarcas, puedeCapturar, requerirSesion, veTodo } from "@/lib/acceso";
import { redirect } from "next/navigation";
import { Pagina, Tarjeta } from "@/components/ui";
import { FormularioContrato } from "../formulario-contrato";

export default async function NuevoContrato({ searchParams }: { searchParams: Promise<{ marca?: string; renueva?: string }> }) {
  const s = await requerirSesion();
  if (!puedeCapturar(s)) redirect("/contratos");
  const { marca, renueva } = await searchParams;
  const [marcas, directores, previos, base] = await Promise.all([
    db.marca.findMany({ where: filtroMarcas(s), orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
    veTodo(s) ? db.director.findMany({ where: { activo: true }, orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }) : Promise.resolve([]),
    db.contrato.findMany({ where: { ...filtroContratos(s), renovacion: null }, select: { id: true, codigo: true, proyecto: true, marca: { select: { nombre: true } } }, orderBy: { codigo: "asc" } }),
    renueva ? db.contrato.findUnique({ where: { id: renueva } }) : Promise.resolve(null),
  ]);
  return (
    <Pagina titulo="Nuevo contrato" subtitulo="Captura la propuesta o el contrato. Los hitos de cobro y compromisos se agregan después, en el detalle.">
      <Tarjeta>
        <FormularioContrato
          global={veTodo(s)}
          marcas={marcas}
          directores={directores}
          contratosPrevios={previos.map((c) => ({ id: c.id, texto: `${c.marca.nombre} · ${c.proyecto} (${c.codigo})` }))}
          contrato={
            base
              ? {
                  marcaId: base.marcaId,
                  directorId: base.directorId,
                  tipo: base.tipo,
                  estado: "PROPUESTA",
                  proyecto: `Renovación · ${base.proyecto}`,
                  monto: base.monto,
                  duracionMeses: base.duracionMeses,
                  talento: base.talento,
                  renovacionDeId: base.id,
                }
              : { marcaId: marca }
          }
        />
      </Tarjeta>
    </Pagina>
  );
}
