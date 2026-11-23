import { requerirSesion } from "@/lib/acceso";
import { etiqueta } from "@/lib/formato";
import { Definicion, Pagina, Tarjeta } from "@/components/ui";
import { FormularioClave } from "./formulario";

export default async function Cuenta() {
  const s = await requerirSesion();
  return (
    <Pagina titulo="Mi cuenta">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Tarjeta titulo="Datos de acceso">
          <Definicion
            items={[
              { k: "Nombre", v: s.nombre },
              { k: "Usuario", v: s.usuario },
              { k: "Rol", v: etiqueta("rol", s.rol) },
            ]}
          />
        </Tarjeta>
        <Tarjeta titulo="Cambiar contraseña" descripcion="Mínimo 12 caracteres.">
          <FormularioClave />
        </Tarjeta>
      </div>
    </Pagina>
  );
}
