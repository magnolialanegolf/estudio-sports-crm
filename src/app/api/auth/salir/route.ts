import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESION } from "@/lib/sesion";

export const dynamic = "force-dynamic";

// Cierra la sesión desde una ruta (las páginas no pueden borrar cookies) y manda al ingreso con motivo.
export async function GET(req: NextRequest) {
  const error = req.nextUrl.searchParams.get("error");
  const res = NextResponse.redirect(new URL(error ? `/ingresar?error=${encodeURIComponent(error)}` : "/ingresar", req.url));
  res.cookies.delete(COOKIE_SESION);
  return res;
}
