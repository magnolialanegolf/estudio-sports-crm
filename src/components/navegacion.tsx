"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { Rol } from "@prisma/client";
import { Logotipo } from "./marca";
import { Icono, type NombreIcono } from "./iconos";

type Enlace = { href: string; texto: string; roles?: Rol[]; icono?: NombreIcono };

const PRINCIPAL: Enlace[] = [
  { href: "/", texto: "Hoy", icono: "hoy" },
  { href: "/pipeline", texto: "Pipeline", icono: "pipeline" },
  { href: "/marcas", texto: "Marcas", icono: "marcas" },
  { href: "/contratos", texto: "Contratos", icono: "contratos" },
  { href: "/calendario", texto: "Calendario", icono: "calendario" },
  { href: "/cobranza", texto: "Cobranza", icono: "cobranza" },
  { href: "/pagos", texto: "Pagos", icono: "pagos" },
  { href: "/comisiones", texto: "Comisiones", icono: "comisiones" },
  { href: "/tareas", texto: "Tareas", icono: "tareas" },
  { href: "/produccion", texto: "Producción", icono: "ok" },
  { href: "/incidencias", texto: "Incidencias", icono: "incidencias" },
  { href: "/reportes", texto: "Reportes", icono: "reportes" },
];

const PRODUCCION: Enlace[] = [
  { href: "/tareas", texto: "Mis tareas", icono: "tareas" },
  { href: "/calendario", texto: "Calendario", icono: "calendario" },
  { href: "/incidencias", texto: "Incidencias", icono: "incidencias" },
  { href: "/avisos", texto: "Avisos", icono: "avisos" },
];

const EJECUCION: Rol[] = ["PRODUCCION", "CONTENIDOS", "OPERATIVO"];

const ADMINISTRACION: Enlace[] = [
  { href: "/tablero", texto: "Tablero", icono: "tablero", roles: ["ADMIN_GENERAL", "GERENTE_GENERAL", "ADMINISTRACION", "LECTURA"] },
  { href: "/directores", texto: "Directores", icono: "directores", roles: ["ADMIN_GENERAL"] },
  { href: "/reglas", texto: "Reglas de comisión", icono: "reglas", roles: ["ADMIN_GENERAL"] },
  { href: "/usuarios", texto: "Usuarios", icono: "usuarios", roles: ["ADMIN_GENERAL"] },
  { href: "/bitacora", texto: "Bitácora", icono: "bitacora", roles: ["ADMIN_GENERAL"] },
  { href: "/respaldo", texto: "Respaldo", icono: "bitacora", roles: ["ADMIN_GENERAL"] },
];

function Enlace({ e, ruta, alNavegar }: { e: Enlace; ruta: string; alNavegar: () => void }) {
  const activo = e.href === "/" ? ruta === "/" : ruta.startsWith(e.href);
  const I = e.icono ? Icono[e.icono] : null;
  return (
    <Link
      href={e.href}
      onClick={alNavegar}
      className={`relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm ${activo ? "bg-acento-suave font-medium text-acento" : "text-tinta-2 hover:bg-superficie-2 hover:text-tinta"}`}
    >
      {activo ? <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-naranja" aria-hidden /> : null}
      {I ? <I className={activo ? "text-acento" : "text-tinta-3"} /> : null}
      <span>{e.texto}</span>
    </Link>
  );
}

export function Navegacion({
  nombre,
  rolEtiqueta,
  rol,
  salir,
  children,
  avisos,
}: {
  nombre: string;
  rolEtiqueta: string;
  rol: Rol;
  salir: () => Promise<void>;
  children: React.ReactNode;
  avisos: number;
}) {
  const ruta = usePathname();
  const [abierto, setAbierto] = useState(false);
  const esEjecucion = EJECUCION.includes(rol);
  const admin = esEjecucion ? [] : ADMINISTRACION.filter((e) => !e.roles || e.roles.includes(rol));
  const principal = esEjecucion ? PRODUCCION : PRINCIPAL;

  const cerrar = () => setAbierto(false);

  return (
    <>
      <header className="no-imprimir sticky top-0 z-20 border-b border-linea bg-superficie/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-[1280px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center">
            <Logotipo compacto />
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/avisos" className={`relative inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium ${avisos > 0 ? "border-acento bg-acento-suave text-acento" : "border-linea-fuerte text-tinta-2 hover:bg-superficie-2"}`} aria-label={`Avisos: ${avisos} sin leer`}>
              <Icono.avisos />
              <span className="hidden sm:inline">Avisos</span>
              {avisos > 0 ? <span className="rounded-full bg-naranja px-1.5 text-[11px] font-semibold text-white">{avisos}</span> : null}
            </Link>
            <div className="hidden text-right leading-tight sm:block">
              <div className="text-sm font-medium text-tinta">{nombre}</div>
              <div className="text-[11px] uppercase tracking-wide text-tinta-3">{rolEtiqueta}</div>
            </div>
            <form action={salir}>
              <button type="submit" className="inline-flex h-9 items-center rounded-md border border-linea-fuerte bg-superficie px-3.5 text-sm font-medium text-tinta hover:border-acento-2 hover:text-acento">
                Salir
              </button>
            </form>
            <button
              type="button"
              aria-label="Menú"
              onClick={() => setAbierto((v) => !v)}
              className="inline-flex h-9 items-center rounded-md border border-linea-fuerte bg-superficie px-3.5 text-sm font-medium lg:hidden"
            >
              Menú
            </button>
          </div>
        </div>
        {abierto ? (
          <nav className="border-t border-linea px-4 py-3 lg:hidden">
            <div className="grid grid-cols-2 gap-1">
              {principal.map((e) => (
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
        <nav className="sticky top-16 flex flex-col gap-0.5 p-3">
          {principal.map((e) => (
            <Enlace key={e.href} e={e} ruta={ruta} alNavegar={cerrar} />
          ))}
          {admin.length ? (
            <>
              <div className="etiqueta-marca mt-4 mb-1 px-3 text-[9px] text-tinta-3">Administración</div>
              {admin.map((e) => (
                <Enlace key={e.href} e={e} ruta={ruta} alNavegar={cerrar} />
              ))}
            </>
          ) : null}
          <div className="etiqueta-marca mt-4 mb-1 px-3 text-[9px] text-tinta-3">Cuenta</div>
          <Enlace e={{ href: "/cuenta", texto: "Mi cuenta", icono: "cuenta" }} ruta={ruta} alNavegar={cerrar} />
        </nav>
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
      </div>
    </>
  );
}
