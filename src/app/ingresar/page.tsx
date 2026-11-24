import type { Metadata } from "next";
import { FormularioIngreso } from "./formulario";
import { Mascota } from "@/components/marca";
import { googleConfigurado } from "@/lib/google";
import { IconoGoogle } from "./google";

const ERRORES: Record<string, string> = {
  "sin-cartera": "La cuenta no tiene una cartera asignada.",
  "google-sin-usuario": "Tu cuenta de Google no está dada de alta en el portal. Pide al administrador que te registre con ese correo.",
  "google-dominio": "Solo pueden entrar cuentas de Google de la empresa.",
  "google-cancelado": "No se completó el ingreso con Google. Inténtalo de nuevo.",
  "google-error": "Google no confirmó la identidad. Inténtalo de nuevo.",
  "google-no-configurado": "El ingreso con Google no está habilitado en este entorno.",
};

export const metadata: Metadata = { title: "Ingresar" };

export default async function PaginaIngresar({
  searchParams,
}: {
  searchParams: Promise<{ destino?: string; error?: string }>;
}) {
  const { destino, error } = await searchParams;
  const conGoogle = googleConfigurado();
  const aviso = error ? ERRORES[error] : undefined;
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Mascota alto={84} color="#00345e" className="mb-4" />
          <div className="titulo-marca text-3xl text-acento">Estudio Sports</div>
          <div className="etiqueta-marca mt-1 text-[10px] text-naranja">CRM comercial</div>
        </div>
        <div className="tarjeta rounded-xl border border-linea bg-superficie p-6">
          {conGoogle ? (
            <>
              <a
                href={`/api/auth/google${destino ? `?destino=${encodeURIComponent(destino)}` : ""}`}
                className="inline-flex h-10 w-full items-center justify-center gap-2.5 rounded-md border border-linea-fuerte bg-superficie px-3.5 text-sm font-medium text-tinta shadow-sm hover:bg-superficie-2"
              >
                <IconoGoogle />
                Entrar con Google
              </a>
              {aviso && error?.startsWith("google") ? (
                <p role="alert" className="mt-3 rounded border border-riesgo/30 bg-riesgo-suave px-3 py-2 text-sm text-riesgo">{aviso}</p>
              ) : null}
              <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-wide text-tinta-3">
                <span className="h-px flex-1 bg-linea" />
                o con usuario y contraseña
                <span className="h-px flex-1 bg-linea" />
              </div>
            </>
          ) : null}
          <FormularioIngreso destino={destino} aviso={error?.startsWith("google") ? undefined : aviso} />
        </div>
        <p className="mt-6 text-center text-xs text-tinta-3">Acceso restringido. La actividad queda registrada en bitácora.</p>
      </div>
    </main>
  );
}
