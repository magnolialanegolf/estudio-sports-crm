import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESION, leerSesion } from "@/lib/sesion";

// Primera barrera: sin sesión válida no se sirve ninguna vista del portal.
// Las páginas vuelven a validar con requerirSesion(); esto evita exponer
// siquiera la estructura del portal a quien no está autenticado.
const PUBLICAS = ["/ingresar"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const esPublica = PUBLICAS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const sesion = await leerSesion(req.cookies.get(COOKIE_SESION)?.value);

  if (!sesion && !esPublica) {
    const url = req.nextUrl.clone();
    url.pathname = "/ingresar";
    url.search = pathname !== "/" ? `?destino=${encodeURIComponent(pathname)}` : "";
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
