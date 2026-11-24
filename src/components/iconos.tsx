// Iconos de línea, 20px, sin dependencias. Trazo 1.6 para que se lean finos.
import type { SVGProps } from "react";

const base = (props: SVGProps<SVGSVGElement>) => ({
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  ...props,
});

export const Icono = {
  hoy: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
  ),
  pipeline: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}><path d="M4 6h16M6 12h12M9 18h6" /></svg>
  ),
  marcas: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}><path d="M4 7a2 2 0 0 1 2-2h5l9 9-7 7-9-9z" /><circle cx="8.5" cy="9.5" r="1.2" /></svg>
  ),
  contratos: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5M10 13h6M10 17h6" /></svg>
  ),
  calendario: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16M8 3v4M16 3v4" /></svg>
  ),
  cobranza: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}><path d="M4 18V8M10 18v-6M16 18V5M22 18H2" /></svg>
  ),
  pagos: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M3 10h18M7 15h3" /></svg>
  ),
  comisiones: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M12 7v10M9.5 9.5c0-1 1-1.5 2.5-1.5s2.5.7 2.5 1.6c0 2.4-5 1.4-5 3.9 0 .9 1 1.6 2.5 1.6s2.5-.6 2.5-1.5" /></svg>
  ),
  tareas: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}><path d="M5 12l4 4L19 6" /></svg>
  ),
  incidencias: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}><path d="M12 3l9 16H3z" /><path d="M12 10v4M12 17h.01" /></svg>
  ),
  reportes: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}><path d="M5 20h14M7 16l3-4 3 2 4-6" /></svg>
  ),
  tablero: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}><rect x="3" y="3" width="8" height="8" rx="1.5" /><rect x="13" y="3" width="8" height="5" rx="1.5" /><rect x="13" y="10" width="8" height="11" rx="1.5" /><rect x="3" y="13" width="8" height="8" rx="1.5" /></svg>
  ),
  directores: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}><circle cx="9" cy="8" r="3.5" /><path d="M3 20a6 6 0 0 1 12 0M16 11a3 3 0 1 0 0-6M21 20a5 5 0 0 0-5-5" /></svg>
  ),
  reglas: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}><path d="M4 7h16M4 12h10M4 17h6" /><circle cx="18" cy="16" r="3" /></svg>
  ),
  usuarios: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}><circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></svg>
  ),
  bitacora: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}><path d="M6 3h12v18H6z" /><path d="M9 7h6M9 11h6M9 15h4" /></svg>
  ),
  cuenta: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="10" r="3" /><path d="M6.5 18a6 6 0 0 1 11 0" /></svg>
  ),
  avisos: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" /><path d="M10 21h4" /></svg>
  ),
  alerta: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>
  ),
  ok: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M8 12l3 3 5-6" /></svg>
  ),
  dinero: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}><rect x="3" y="7" width="18" height="11" rx="2" /><circle cx="12" cy="12.5" r="2.5" /></svg>
  ),
  renovar: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}><path d="M20 12a8 8 0 1 1-2.3-5.7" /><path d="M20 4v5h-5" /></svg>
  ),
};

export type NombreIcono = keyof typeof Icono;
