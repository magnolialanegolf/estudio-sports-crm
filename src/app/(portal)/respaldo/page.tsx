import { db } from "@/lib/db";
import { requerirAdmin } from "@/lib/acceso";
import { diasHasta, fecha } from "@/lib/formato";
import { Boton, Pagina, Tarjeta, Vacio } from "@/components/ui";

export default async function Respaldo() {
  await requerirAdmin();
  const [documentos, tamano, ultimos] = await Promise.all([
    db.documento.count(),
    db.documento.aggregate({ _sum: { tamano: true } }),
    db.bitacora.findMany({ where: { entidad: "respaldo" }, include: { usuario: { select: { nombre: true } } }, orderBy: { fecha: "desc" }, take: 8 }),
  ]);
  const mb = ((tamano._sum.tamano ?? 0) / 1024 / 1024).toFixed(1);
  const ultimo = ultimos[0];
  const diasDesde = ultimo ? -(diasHasta(ultimo.fecha) ?? 0) : null;

  return (
    <Pagina titulo="Respaldo" subtitulo="Copia completa de datos y documentos para guardar fuera del portal" acciones={<Boton href="/api/respaldo" tipo="primario">Descargar respaldo completo</Boton>}>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Tarjeta titulo="Qué incluye" className="xl:col-span-2">
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-tinta-2">
            <li>Todas las tablas en CSV, legibles en Excel: marcas, contactos, directores, contratos, hitos de cobro, compromisos, reglas y pagos de comisión, incidencias, avisos, usuarios y bitácora.</li>
            <li>
              Los {documentos} documentos del portal ({mb} MB): contratos, facturas, XML y comprobantes, organizados por marca y contrato.
            </li>
            <li>Un archivo LEEME con la fecha, quién lo generó y cómo está organizado.</li>
            <li>No incluye contraseñas ni ligas privadas de calendario.</li>
          </ul>
          <div className="mt-4 rounded-md border border-linea bg-superficie-2 px-4 py-3 text-sm text-tinta-2">
            <strong className="text-tinta">Rutina recomendada.</strong> Descargar cada semana y guardarlo en la carpeta de Google Drive de la empresa. La base de datos tiene además recuperación propia a cualquier momento reciente; esta copia es la que queda en manos de Estudio Sports, independiente del proveedor.
          </div>
        </Tarjeta>
        <Tarjeta titulo="Últimos respaldos" descripcion={ultimo ? `Último hace ${diasDesde} día(s)` : "Aún no se ha descargado ninguno"}>
          {ultimos.length === 0 ? (
            <Vacio>Sin respaldos registrados.</Vacio>
          ) : (
            <ul className="-mx-5 divide-y divide-linea/70 text-sm">
              {ultimos.map((b) => (
                <li key={b.id} className="flex items-center justify-between px-5 py-2">
                  <span>{fecha(b.fecha)}</span>
                  <span className="text-xs text-tinta-3">{b.usuario?.nombre ?? "—"}</span>
                </li>
              ))}
            </ul>
          )}
          {diasDesde !== null && diasDesde > 7 ? <p className="mt-3 text-xs font-medium text-alerta">Han pasado más de 7 días desde el último respaldo.</p> : null}
        </Tarjeta>
      </div>
    </Pagina>
  );
}
