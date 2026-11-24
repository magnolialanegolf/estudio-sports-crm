import { db } from "@/lib/db";
import { esProduccion, filtroContratos, filtroContratosProduccion, filtroMarcas, requerirSesion } from "@/lib/acceso";
import { Pagina, Tarjeta } from "@/components/ui";
import { FormularioIncidencia } from "../paneles";

export default async function NuevaIncidencia({ searchParams }: { searchParams: Promise<{ contrato?: string }> }) {
  const s = await requerirSesion();
  const { contrato } = await searchParams;
  const [usuarios, contratos, marcas] = await Promise.all([
    db.usuario.findMany({ where: { activo: true }, select: { id: true, nombre: true, rol: true }, orderBy: [{ rol: "asc" }, { nombre: "asc" }] }),
    db.contrato.findMany({ where: esProduccion(s) ? filtroContratosProduccion(s) : filtroContratos(s), select: { id: true, proyecto: true, marca: { select: { nombre: true } } }, orderBy: [{ marca: { nombre: "asc" } }] }),
    esProduccion(s) ? Promise.resolve([]) : db.marca.findMany({ where: filtroMarcas(s), select: { id: true, nombre: true }, orderBy: { nombre: "asc" } }),
  ]);
  return (
    <Pagina titulo="Reportar incidencia o pendiente" subtitulo="Describe qué pasa, a quién le toca y para cuándo. La persona asignada recibe aviso; dirección se entera de lo urgente y de los problemas.">
      <Tarjeta>
        <FormularioIncidencia usuarios={usuarios} contratos={contratos.map((c) => ({ id: c.id, texto: `${c.marca.nombre} · ${c.proyecto}` }))} marcas={marcas} contratoInicial={contrato} />
      </Tarjeta>
    </Pagina>
  );
}
