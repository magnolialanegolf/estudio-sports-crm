// Avisos por correo. Se envían por Resend cuando hay llave y remitente configurados;
// sin ellos, el portal funciona igual y los avisos quedan solo en la campana.
// Nunca lanza: un correo que falla no debe detener la operación que lo originó.

export function correoConfigurado() {
  return Boolean(process.env.RESEND_API_KEY && process.env.CORREO_REMITENTE);
}

export function urlPortal() {
  return (process.env.APP_URL ?? "https://estudiosports.magnolialane.com.mx").replace(/\/$/, "");
}

function escapar(t: string) {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function plantilla(args: { nombre: string; texto: string; liga: string | null }) {
  const liga = args.liga ?? urlPortal();
  return `<!doctype html><html lang="es"><body style="margin:0;background:#f4f6f9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1b2430">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6f9;padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e3e8ef;border-radius:12px;overflow:hidden">
<tr><td style="background:#00345e;padding:18px 24px;color:#ffffff;font-size:14px;letter-spacing:.08em;text-transform:uppercase;font-weight:600">Estudio Sports <span style="color:#ff6c00">· CRM comercial</span></td></tr>
<tr><td style="padding:28px 24px 8px;font-size:15px;line-height:1.5">Hola, ${escapar(args.nombre)}.</td></tr>
<tr><td style="padding:0 24px 20px;font-size:16px;line-height:1.55;font-weight:500">${escapar(args.texto)}</td></tr>
<tr><td style="padding:0 24px 28px"><a href="${liga}" style="display:inline-block;background:#00345e;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:11px 18px;border-radius:8px">Abrir en el portal</a></td></tr>
<tr><td style="padding:14px 24px;border-top:1px solid #e3e8ef;font-size:12px;color:#6b7684;line-height:1.5">Recibes este aviso porque participas en el proceso. Puedes desactivar los correos en Mi cuenta del portal.</td></tr>
</table></td></tr></table></body></html>`;
}

export async function enviarCorreo(args: { para: string; nombre: string; asunto: string; texto: string; href?: string | null }): Promise<boolean> {
  if (!correoConfigurado()) return false;
  const liga = args.href ? (args.href.startsWith("http") ? args.href : `${urlPortal()}${args.href}`) : null;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: process.env.CORREO_REMITENTE,
        to: [args.para],
        subject: args.asunto.slice(0, 160),
        text: `${args.texto}\n\n${liga ?? urlPortal()}`,
        html: plantilla({ nombre: args.nombre, texto: args.texto, liga }),
      }),
    });
    return r.ok;
  } catch {
    return false;
  }
}
