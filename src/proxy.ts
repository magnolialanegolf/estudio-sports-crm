import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESION, leerSesion } from "@/lib/sesion";

// Primera barrera: sin sesión válida no se sirve ninguna vista del portal.
// Las páginas vuelven a validar con requerirSesion(); esto evita exponer
// siquiera la estructura del portal a quien no está autenticado.
// El calendario personal se identifica por liga privada: no lleva cookie (Google, iPhone).
const PUBLICAS = ["/ingresar", "/api/calendario/"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const esPublica = PUBLICAS.some((p) => pathname === p || pathname.startsWith(p.endsWith("/") ? p : `${p}/`));
  const sesion = await leerSesion(req.cookies.get(COOKIE_SESION)?.value);

  if (!sesion && !esPublica) {
    const url = req.nextUrl.clone();
    url.pathname = "/ingresar";
    url.search = pathname !== "/" ? `?destino=${encodeURIComponent(pathname)}` : "";
    return NextResponse.redirect(url);
  }
  // Contraseña inicial: obliga a cambiarla antes de usar el portal.
  if (sesion?.debeCambiarClave && pathname !== "/cuenta" && !pathname.startsWith("/api/")) {
    const url = req.nextUrl.clone();
    url.pathname = "/cuenta";
    url.search = "?cambiar=1";
    return NextResponse.redirect(url);
  }
  // Producción solo entra a sus tareas y a su cuenta.
  if (sesion?.rol === "PRODUCCION" && !["/tareas", "/cuenta", "/api/"].some((p) => pathname === p || pathname.startsWith(p))) {
    const url = req.nextUrl.clone();
    url.pathname = "/tareas";
    url.search = "";
    return NextResponse.redirect(url);
  }
  if (sesion && pathname === "/ingresar") {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }
  const res = NextResponse.next();
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt).*)"],
};
