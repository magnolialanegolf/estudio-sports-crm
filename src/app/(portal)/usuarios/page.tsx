import { db } from "@/lib/db";
import { requerirAdmin } from "@/lib/acceso";
import { etiqueta, fecha } from "@/lib/formato";
import { Aviso, Etiqueta, Pagina, Tabla, Tarjeta, Td, Th } from "@/components/ui";
import { Plegable } from "@/components/formularios";
import { FormularioUsuario } from "./paneles";

export default async function Usuarios() {
  await requerirAdmin();
  const [usuarios, directores] = await Promise.all([
    db.usuario.findMany({ include: { director: { select: { nombre: true } } }, orderBy: [{ rol: "asc" }, { nombre: "asc" }] }),
    db.director.findMany({ where: { activo: true }, orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
  ]);
  return (
    <Pagina titulo="Usuarios" subtitulo="Cuentas de acceso y roles. Cada director debe quedar vinculado a su dirección comercial.">
      <div className="mb-5">
        <Aviso>
          Roles: <strong>Administrador general</strong> ve y configura todo. <strong>Director comercial</strong> ve y captura solo su cartera. <strong>Administración</strong> registra facturas y cobros de todas las carteras, sin ver comisiones. <strong>Lectura</strong> consulta el consolidado sin editar.
        </Aviso>
      </div>
      <Tarjeta titulo="Cuentas">
        <Tabla>
          <thead>
            <tr>
              <Th>Usuario</Th>
              <Th>Rol</Th>
              <Th>Dirección comercial</Th>
              <Th>Último acceso</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id}>
                <Td>
                  <div className="font-medium">{u.nombre}</div>
                  <div className="text-xs text-tinta-3">{u.usuario}{u.correo ? ` · ${u.correo}` : ""}</div>
                </Td>
                <Td>
                  <Etiqueta tono={u.rol === "ADMIN_GENERAL" ? "acento" : "neutro"}>{etiqueta("rol", u.rol)}</Etiqueta>
                  {!u.activo ? <Etiqueta tono="riesgo">inactivo</Etiqueta> : null}
                </Td>
                <Td className="text-tinta-2">{u.director?.nombre ?? "—"}</Td>
                <Td className="text-tinta-2">{u.ultimoAcceso ? fecha(u.ultimoAcceso) : "nunca"}</Td>
                <Td>
                  <div className="flex justify-end">
                    <Plegable titulo="Editar">
                      <FormularioUsuario usuario={u} directores={directores} />
                    </Plegable>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Tabla>
        <div className="mt-4">
          <Plegable titulo="Alta de usuario">
            <FormularioUsuario directores={directores} />
          </Plegable>
        </div>
      </Tarjeta>
    </Pagina>
  );
}
