"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { Rol } from "@prisma/client";

type Enlace = { href: string; texto: string; roles?: Rol[] };

const PRINCIPAL: Enlace[] = [
  { href: "/", texto: "Hoy" },
  { href: "/marcas", texto: "Marcas" },
  { href: "/contratos", texto: "Contratos" },
  { href: "/calendario", texto: "Calendario" },
  { href: "/cobranza", texto: "Cobranza" },
  { href: "/comisiones", texto: "Comisiones" },
  { href: "/reportes", texto: "Reportes" },
];

const ADMINISTRACION: Enlace[] = [
  { href: "/tablero", texto: "Tablero", roles: ["ADMIN_GENERAL", "ADMINISTRACION", "LECTURA"] },
  { href: "/directores", texto: "Directores", roles: ["ADMIN_GENERAL"] },
  { href: "/reglas", texto: "Reglas de comisión", roles: ["ADMIN_GENERAL"] },
  { href: "/usuarios", texto: "Usuarios", roles: ["ADMIN_GENERAL"] },
  { href: "/bitacora", texto: "Bitácora", roles: ["ADMIN_GENERAL"] },
];

function Enlace({ e, ruta, alNavegar }: { e: Enlace; ruta: string; alNavegar: () => void }) {
  const activo = e.href === "/" ? ruta === "/" : ruta.startsWith(e.href);
  return (
    <Link
      href={e.href}
      onClick={alNavegar}
      className={`block rounded px-3 py-1.5 text-sm ${activo ? "bg-acento-suave font-medium text-acento" : "text-tinta-2 hover:bg-superficie-2 hover:text-tinta"}`}
    >
      {e.texto}
    </Link>
  );
}

export function Navegacion({
  nombre,
  rolEtiqueta,
  rol,
  salir,
  children,
}: {
  nombre: string;
  rolEtiqueta: string;
  rol: Rol;
  salir: () => Promise<void>;
  children: React.ReactNode;
}) {
  const ruta = usePathname();
  const [abierto, setAbierto] = useState(false);
  const admin = ADMINISTRACION.filter((e) => !e.roles || e.roles.includes(rol));

  const cerrar = () => setAbierto(false);

  return (
    <>
      <header className="no-imprimir sticky top-0 z-20 border-b border-linea bg-superficie">
        <div className="mx-auto flex h-14 w-full max-w-[1280px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-baseline gap-2">
            <span className="font-serif text-lg tracking-wide text-tinta">Estudio Sports</span>
            <span className="hidden text-[11px] font-medium uppercase tracking-[0.18em] text-tinta-3 sm:inline">CRM comercial</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="text-sm font-medium text-tinta">{nombre}</div>
              <div className="text-[11px] uppercase tracking-wide text-tinta-3">{rolEtiqueta}</div>
            </div>
            <form action={salir}>
              <button type="submit" className="rounded border border-linea-fuerte px-3 py-1.5 text-xs font-medium text-tinta hover:bg-superficie-2">
                Salir
              </button>
            </form>
            <button
              type="button"
              aria-label="Menú"
              onClick={() => setAbierto((v) => !v)}
              className="rounded border border-linea-fuerte px-3 py-1.5 text-xs font-medium lg:hidden"
            >
              Menú
            </button>
          </div>
        </div>
        {abierto ? (
          <nav className="border-t border-linea px-4 py-3 lg:hidden">
            <div className="grid grid-cols-2 gap-1">
              {PRINCIPAL.map((e) => (
                <Enlace key={e.href} e={e} ruta={ruta} alNavegar={cerrar} />
              ))}
              {admin.map((e) => (
                <Enlace key={e.href} e={e} ruta={ruta} alNavegar={cerrar} />
              ))}
              <Link href="/cuenta" onClick={() => setAbierto(false)} className="block rounded px-3 py-1.5 text-sm text-tinta-2 hover:bg-superficie-2">
                Mi cuenta
              </Link>
            </div>
          </nav>
        ) : null}
      </header>
      <div className="flex flex-1 flex-col lg:flex-row">
      <aside className="no-imprimir hidden w-56 shrink-0 border-r border-linea bg-superficie lg:block">
        <nav className="sticky top-14 flex flex-col gap-0.5 p-3">
          {PRINCIPAL.map((e) => (
            <Enlace key={e.href} e={e} ruta={ruta} alNavegar={cerrar} />
          ))}
          {admin.length ? (
            <>
              <div className="mt-4 mb-1 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-tinta-3">Administración</div>
              {admin.map((e) => (
                <Enlace key={e.href} e={e} ruta={ruta} alNavegar={cerrar} />
              ))}
            </>
          ) : null}
          <div className="mt-4 mb-1 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-tinta-3">Cuenta</div>
          <Enlace e={{ href: "/cuenta", texto: "Mi cuenta" }} ruta={ruta} alNavegar={cerrar} />
        </nav>
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
      </div>
    </>
  );
}
