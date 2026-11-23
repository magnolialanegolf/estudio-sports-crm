import { headers } from "next/headers";
import { db } from "@/lib/db";
import { esProduccion, requerirSesion } from "@/lib/acceso";
import { etiqueta } from "@/lib/formato";
import { Boton, Definicion, Pagina, Tarjeta } from "@/components/ui";
import { FormularioClave } from "./formulario";
import { desactivarLigaCalendario, renovarLigaCalendario } from "@/actions/calendario";

export default async function Cuenta() {
  const s = await requerirSesion();
  const u = await db.usuario.findUnique({ where: { id: s.usuarioId }, select: { icsToken: true } });
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? "https";
  const liga = u?.icsToken ? `${proto}://${host}/api/calendario/${u.icsToken}.ics` : null;

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
        <Tarjeta
          titulo="Mi calendario en el celular"
          descripcion={esProduccion(s) ? "Tus tareas asignadas, con aviso el día anterior." : "Cobros por facturar, compromisos, fechas clave y vencimientos de tu cartera, con aviso el día anterior."}
          className="lg:col-span-2"
        >
          {liga ? (
            <div className="space-y-3 text-sm">
              <div>
                <div className="mb-1 text-xs font-medium uppercase tracking-wide text-tinta-3">Liga privada de suscripción</div>
                <code className="block break-all rounded border border-linea bg-superficie-2 px-3 py-2 text-xs">{liga}</code>
                <p className="mt-1 text-xs text-tinta-3">Esta liga da acceso a tu agenda sin contraseña. No la compartas. Si la compartiste por error, renuévala.</p>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <Paso titulo="Google Calendar (web)" pasos={["Abre calendar.google.com", "En «Otros calendarios» pulsa + → «Desde URL»", "Pega la liga y confirma", "Aparece en el celular con la app de Google Calendar"]} />
                <Paso titulo="iPhone" pasos={["Ajustes → Apps → Calendario → Cuentas", "Añadir cuenta → Otra → Añadir calendario suscrito", "Pega la liga y guarda"]} />
                <Paso titulo="Outlook" pasos={["Calendario → Agregar calendario", "Suscribirse desde la web", "Pega la liga"]} />
              </div>
              <p className="text-xs text-tinta-3">Google actualiza los calendarios suscritos cada varias horas; el portal siempre tiene la versión al día.</p>
              <div className="no-imprimir flex gap-2">
                <form action={renovarLigaCalendario}>
                  <Boton>Renovar liga</Boton>
                </form>
                <form action={desactivarLigaCalendario}>
                  <Boton tipo="peligro">Desactivar</Boton>
                </form>
              </div>
            </div>
          ) : (
            <form action={renovarLigaCalendario} className="no-imprimir">
              <p className="mb-3 text-sm text-tinta-2">Genera una liga privada y suscríbete desde Google Calendar, iPhone u Outlook. Lo que cambie en el portal aparece en tu agenda.</p>
              <Boton tipo="primario">Generar mi liga de calendario</Boton>
            </form>
          )}
        </Tarjeta>
      </div>
    </Pagina>
  );
}

function Paso({ titulo, pasos }: { titulo: string; pasos: string[] }) {
  return (
    <div className="rounded border border-linea px-3 py-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-tinta-2">{titulo}</div>
      <ol className="mt-1 list-decimal space-y-0.5 pl-4 text-xs text-tinta-2">
        {pasos.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ol>
    </div>
  );
}
