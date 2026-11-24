import { db } from "@/lib/db";
import { requerirAdmin } from "@/lib/acceso";
import { etiqueta, fecha, porcentaje } from "@/lib/formato";
import { Aviso, Etiqueta, Pagina, Tabla, Tarjeta, Td, Th, Vacio } from "@/components/ui";
import { Plegable } from "@/components/formularios";
import { FormularioRegla, BorrarRegla, FormularioPagoComision } from "./paneles";

export default async function Reglas() {
  await requerirAdmin();
  const [reglas, directores, marcas, contratos] = await Promise.all([
    db.reglaComision.findMany({ include: { director: { select: { nombre: true } }, marca: { select: { nombre: true } } }, orderBy: [{ director: { nombre: "asc" } }, { marcaId: "asc" }, { vigenteDesde: "asc" }] }),
    db.director.findMany({ where: { activo: true }, orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
    db.marca.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
    db.contrato.findMany({ orderBy: { codigo: "asc" }, select: { id: true, codigo: true, directorId: true, marca: { select: { nombre: true } } } }),
  ]);

  return (
    <Pagina titulo="Reglas de comisión" subtitulo="Solo el administrador general fija las reglas. Los directores las ven, no las editan.">
      <div className="mb-5">
        <Aviso>
          Cómo se aplica: para cada cobro se toma la regla <strong>más específica</strong> vigente en la fecha de pago (director + marca + tipo, luego director + marca, luego director + tipo, luego director). Comisión = cobrado × (1 − retención de la casa) × porcentaje del director. Un cambio de porcentaje se registra como nueva regla con fecha; las comisiones ya devengadas no se reescriben. <strong>La comisión se devenga por cada cobro</strong>: si la marca paga mensual, semestral, anual o todo el contrato de una vez, la comisión sigue el mismo ritmo y se paga cobro por cobro desde Comisiones. Conviene una regla por tipo de contrato: menciones y cápsulas comerciales, pódcast y embajadurías suelen llevar porcentajes distintos.
        </Aviso>
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Tarjeta titulo="Reglas vigentes e históricas" className="xl:col-span-2">
          {reglas.length === 0 ? (
            <Vacio>Sin reglas. Sin regla, los cobros no generan comisión.</Vacio>
          ) : (
            <Tabla>
              <thead>
                <tr>
                  <Th>Director</Th>
                  <Th>Alcance</Th>
                  <Th derecha>Casa</Th>
                  <Th derecha>Director</Th>
                  <Th>Vigencia</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {reglas.map((r) => {
                  const vigente = !r.vigenteHasta || r.vigenteHasta >= new Date();
                  return (
                    <tr key={r.id}>
                      <Td className="font-medium">{r.director.nombre}</Td>
                      <Td>
                        <div>{r.marca?.nombre ?? <span className="text-tinta-2">Todas las marcas</span>}{r.tipo ? ` · ${etiqueta("tipo", r.tipo)}` : ""}</div>
                        {r.notas ? <div className="text-xs text-tinta-3">{r.notas}</div> : null}
                      </Td>
                      <Td derecha>{porcentaje(Number(r.pctCasa))}</Td>
                      <Td derecha className="font-medium">{porcentaje(Number(r.pctDirector))}</Td>
                      <Td>
                        <div>{fecha(r.vigenteDesde)} → {r.vigenteHasta ? fecha(r.vigenteHasta) : "abierta"}</div>
                        <Etiqueta tono={vigente ? "ok" : "neutro"}>{vigente ? "vigente" : "histórica"}</Etiqueta>
                      </Td>
                      <Td>
                        <div className="flex flex-col items-end gap-1">
                          <Plegable titulo="Editar">
                            <FormularioRegla regla={{ ...r, pctCasa: Number(r.pctCasa), pctDirector: Number(r.pctDirector) }} directores={directores} marcas={marcas} />
                          </Plegable>
                          <BorrarRegla id={r.id} />
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Tabla>
          )}
          <div className="mt-4">
            <Plegable titulo="Nueva regla">
              <FormularioRegla directores={directores} marcas={marcas} />
            </Plegable>
          </div>
        </Tarjeta>

        <Tarjeta titulo="Registrar pago de comisión" descripcion="Lo pagado se registra; lo devengado se calcula.">
          <FormularioPagoComision directores={directores} contratos={contratos.map((c) => ({ id: c.id, directorId: c.directorId, texto: `${c.marca.nombre} · ${c.codigo}` }))} />
        </Tarjeta>
      </div>
    </Pagina>
  );
}
