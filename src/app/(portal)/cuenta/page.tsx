import { headers } from "next/headers";
import { db } from "@/lib/db";
import { esProduccion, requerirSesion } from "@/lib/acceso";
import { etiqueta } from "@/lib/formato";
import { Aviso, Boton, Definicion, Pagina, Tarjeta } from "@/components/ui";
import { FormularioClave } from "./formulario";
import { desactivarLigaCalendario, renovarLigaCalendario } from "@/actions/calendario";

export default async function Cuenta({ searchParams }: { searchParams: Promise<{ cambiar?: string }> }) {
  const s = await requerirSesion();
  const { cambiar } = await searchParams;
  const u = await db.usuario.findUnique({ where: { id: s.usuarioId }, select: { icsToken: true } });
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? "https";
  const liga = u?.icsToken ? `${proto}://${host}/api/calendario/${u.icsToken}.ics` : null;
  const webcal = liga ? liga.replace(/^https?:\/\//, "webcal://") : null;
  const google = liga ? `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal!)}` : null;

  return (
    <Pagina titulo="Mi cuenta">
      {cambiar || s.debeCambiarClave ? (
        <div className="mb-5">
          <Aviso tono="alerta">Estás usando una contraseña inicial. Cámbiala aquí para poder usar el portal.</Aviso>
        </div>
      ) : null}
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
            <div id="calendario" className="space-y-3 text-sm">
              <div className="no-imprimir flex flex-wrap gap-2">
                <a href={google!} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center rounded-md border border-acento bg-acento px-3.5 text-sm font-medium text-white shadow-sm hover:bg-acento-2">Agregar a Google Calendar</a>
                <a href={webcal!} className="inline-flex h-9 items-center rounded-md border border-linea-fuerte bg-superficie px-3.5 text-sm font-medium text-tinta shadow-sm hover:border-acento-2 hover:text-acento">Agregar a iPhone / Mac</a>
                <a href={webcal!} className="inline-flex h-9 items-center rounded-md border border-linea-fuerte bg-superficie px-3.5 text-sm font-medium text-tinta shadow-sm hover:border-acento-2 hover:text-acento">Agregar a Outlook</a>
              </div>
              <p className="text-xs text-tinta-2">Es una suscripción, no una descarga: lo que cambie en el portal se refleja en tu agenda. Google tarda hasta unas horas en refrescar; iPhone y Outlook, minutos.</p>
              <div>
                <div className="mb-1 text-xs font-medium uppercase tracking-wide text-tinta-3">Liga privada de suscripción (si prefieres pegarla a mano)</div>
                <code className="block break-all rounded border border-linea bg-superficie-2 px-3 py-2 text-xs">{liga}</code>
                <p className="mt-1 text-xs text-tinta-3">Esta liga da acceso a tu agenda sin contraseña. No la compartas. Si la compartiste por error, renuévala.</p>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <Paso titulo="Google Calendar" pasos={["Pulsa «Agregar a Google Calendar»", "Google abre la pantalla «Agregar calendario» → Agregar", "Aparece en el celular con la app de Google Calendar"]} />
                <Paso titulo="iPhone / Mac" pasos={["Pulsa «Agregar a iPhone / Mac» desde el dispositivo", "Acepta «Suscribirse»", "Queda en la app Calendario"]} />
                <Paso titulo="A mano" pasos={["Copia la liga de arriba", "Google: Otros calendarios → + → Desde URL", "iPhone: Ajustes → Calendario → Cuentas → Añadir calendario suscrito"]} />
              </div>
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
