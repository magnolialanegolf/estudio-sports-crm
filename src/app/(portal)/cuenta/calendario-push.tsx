"use client";

import { useActionState } from "react";
import { cambiarSincronizacionCalendario, desconectarCalendario, sincronizarAhora } from "@/actions/cuenta";
import type { Resultado } from "@/actions/util";

const MENSAJES: Record<string, { tono: "ok" | "riesgo"; texto: string }> = {
  conectado: { tono: "ok", texto: "Google Calendar conectado. Ya tienes el calendario «Estudio Sports» en tu cuenta." },
  cancelado: { tono: "riesgo", texto: "No se completó la conexión. Inténtalo de nuevo." },
  error: { tono: "riesgo", texto: "Google no aceptó la conexión. Inténtalo de nuevo." },
  "sin-permiso": { tono: "riesgo", texto: "Falta el permiso de calendario. Al conectar, marca la casilla de Google Calendar." },
  "no-configurado": { tono: "riesgo", texto: "La conexión con Google no está habilitada en este entorno." },
};

export function PanelCalendarioPush({ configurado, conectado, cuenta, activo, ultima, error, aviso }: { configurado: boolean; conectado: boolean; cuenta: string | null; activo: boolean; ultima: string | null; error: string | null; aviso?: string }) {
  const [r, despachar, pendiente] = useActionState<Resultado>(sincronizarAhora, undefined);
  const m = aviso ? MENSAJES[aviso] : undefined;
  if (!configurado) {
    return <p className="text-sm text-tinta-2">La conexión con Google Calendar se habilita en cuanto el portal tenga sus credenciales de Google. Mientras tanto, usa la suscripción de abajo; en iPhone pon la actualización cada 15 minutos en Ajustes → Calendario → Cuentas.</p>;
  }
  return (
    <div className="space-y-3 text-sm">
      {m ? <p className={`rounded border px-3 py-2 ${m.tono === "ok" ? "border-ok/30 bg-ok-suave text-ok" : "border-riesgo/30 bg-riesgo-suave text-riesgo"}`}>{m.texto}</p> : null}
      <p className="text-tinta-2">
        El portal crea en tu Google un calendario aparte llamado <strong>Estudio Sports</strong> y solo toca ese. Tus pendientes, cobros y vencimientos aparecen ahí y el celular avisa solo. Si mueves una fecha desde el celular, cambia en el portal; si agregas algo en ese calendario, entra como pendiente tuyo.
      </p>
      {!conectado ? (
        <a href="/api/auth/google/calendario" className="inline-flex h-10 items-center rounded-md border border-acento bg-acento px-4 text-sm font-medium text-white shadow-sm hover:bg-acento-2">
          Conectar mi Google Calendar
        </a>
      ) : (
        <>
          <div className="rounded-md border border-linea bg-superficie-2 px-4 py-3">
            <div className="text-xs font-medium uppercase tracking-wide text-tinta-3">Cuenta conectada</div>
            <div className="mt-0.5">{cuenta ?? "Google"}</div>
          </div>
          <form action={cambiarSincronizacionCalendario} className="flex items-center justify-between gap-3 rounded-md border border-linea bg-superficie-2 px-4 py-3">
            <label className="flex items-center gap-2">
              <input type="checkbox" name="sincronizarCalendario" defaultChecked={activo} className="h-4 w-4 accent-[var(--acento)]" />
              <span>Mantener sincronizado</span>
            </label>
            <button type="submit" className="inline-flex h-8 items-center rounded-md border border-linea-fuerte bg-superficie px-3 text-xs font-medium hover:border-acento-2 hover:text-acento">Guardar</button>
          </form>
          <div className="flex flex-wrap items-center gap-3">
            <form action={despachar}>
              <button type="submit" disabled={pendiente || !activo} className="inline-flex h-9 items-center rounded-md border border-acento bg-acento px-3.5 text-sm font-medium text-white shadow-sm hover:bg-acento-2 disabled:opacity-60">
                {pendiente ? "Sincronizando…" : "Sincronizar ahora"}
              </button>
            </form>
            <span className="text-xs text-tinta-3">{ultima ? `Última sincronización: ${ultima}` : "Aún no se ha sincronizado."}</span>
            <form action={desconectarCalendario} className="ml-auto">
              <button type="submit" className="text-xs text-tinta-3 hover:text-riesgo hover:underline">Desconectar</button>
            </form>
          </div>
          <p className="text-xs text-tinta-3">Se actualiza solo cada 10 minutos mientras uses el portal, y al instante con «Sincronizar ahora».</p>
          {error ? <p className="rounded border border-riesgo/30 bg-riesgo-suave px-3 py-2 text-xs text-riesgo">Último error: {error}</p> : null}
          {r?.error ? <p className="rounded border border-riesgo/30 bg-riesgo-suave px-3 py-2 text-sm text-riesgo">{r.error}</p> : null}
          {r?.ok ? <p className="rounded border border-ok/30 bg-ok-suave px-3 py-2 text-sm text-ok">Calendario actualizado en ambos sentidos.</p> : null}
        </>
      )}
    </div>
  );
}
