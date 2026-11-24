import { createRemoteJWKSet, jwtVerify } from "jose";

// Acceso con Google Workspace (OpenID Connect). El portal no crea cuentas desde Google:
// solo abre sesión a quien ya está dado de alta con ese correo. Google es la identidad;
// el portal sigue siendo quien decide quién entra y con qué rol.

const JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

export function googleConfigurado() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

// Dominios permitidos, separados por coma (GOOGLE_DOMINIOS="estudiosports.mx,magnolialane.com.mx").
// Vacío: cualquier dominio, siempre que el correo exista como usuario activo.
export function dominiosPermitidos(): string[] {
  return (process.env.GOOGLE_DOMINIOS ?? "")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
}

export function urlAutorizacion(args: { redirectUri: string; state: string; nonce: string }) {
  const dominios = dominiosPermitidos();
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: args.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state: args.state,
    nonce: args.nonce,
    prompt: "select_account",
    access_type: "online",
  });
  if (dominios.length === 1) p.set("hd", dominios[0]);
  return `https://accounts.google.com/o/oauth2/v2/auth?${p.toString()}`;
}

export type IdentidadGoogle = { correo: string; nombre: string | null; dominio: string | null; sub: string };

export async function canjearCodigo(args: { code: string; redirectUri: string; nonce: string }): Promise<IdentidadGoogle> {
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: args.code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: args.redirectUri,
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Google no aceptó el código (${r.status}).`);
  const datos = (await r.json()) as { id_token?: string };
  if (!datos.id_token) throw new Error("Google no devolvió identidad.");

  const { payload } = await jwtVerify(datos.id_token, JWKS, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: process.env.GOOGLE_CLIENT_ID!,
  });
  if (payload.nonce !== args.nonce) throw new Error("La respuesta de Google no corresponde a esta solicitud.");
  if (payload.email_verified !== true || typeof payload.email !== "string") throw new Error("Google no confirma el correo de la cuenta.");
  const correo = payload.email.toLowerCase();
  const dominio = typeof payload.hd === "string" ? payload.hd.toLowerCase() : correo.split("@")[1] ?? null;
  return { correo, nombre: typeof payload.name === "string" ? payload.name : null, dominio, sub: String(payload.sub) };
}
