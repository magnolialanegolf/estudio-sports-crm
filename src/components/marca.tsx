// Marca de Estudio Sports: la cabeza del perro tomada del archivo vectorial oficial de Caskarita
// (Illustrator, "Logo oficina Caskarita"), girada a vertical, con el nombre Estudio Sports.

export function Mascota({ alto = 36, className = "", color = "currentColor" }: { alto?: number; className?: string; color?: string }) {
  // Trazo oficial normalizado a 72.5 × 100; margen de 4 unidades por lado para que orejas y hocico nunca se recorten.
  const ancho = Math.round((alto * 80.5) / 108);
  return (
    <svg width={ancho} height={alto} viewBox="-4 -4 80.5 108" role="img" aria-label="Estudio Sports" className={className} style={{ overflow: "visible", display: "block" }}>
      <path fill={color} d="M66.27 35.09 L61.76 38.56 L64.48 33.20 C64.92 32.34 65.10 31.37 65.02 30.41 L63.20 11.21 L68.09 29.73 C68.62 31.72 67.90 33.83 66.27 35.09 M55.28 46.62 L53.23 48.67 L50.88 46.32 L48.54 48.67 L46.49 46.62 L48.83 44.28 L46.49 41.93 L48.54 39.88 L50.88 42.23 L53.23 39.88 L55.28 41.93 L52.93 44.28 ZM22.84 47.29 C21.28 47.29 20.01 46.03 20.01 44.46 C20.01 42.90 21.28 41.64 22.84 41.64 C24.41 41.64 25.67 42.90 25.67 44.46 C25.67 46.03 24.41 47.29 22.84 47.29 M6.22 35.09 C4.60 33.83 3.88 31.72 4.40 29.73 L9.29 11.21 L7.48 30.41 C7.39 31.37 7.57 32.34 8.01 33.20 L10.73 38.56 ZM72.15 32.69 L66.04 1.72 C65.80 0.52 64.36 0.00 63.41 0.78 L58.23 5.00 L46.29 23.90 L26.20 23.90 L14.26 5.00 L9.09 0.78 C8.13 0.00 6.70 0.52 6.45 1.72 L0.35 32.69 C0.00 34.45 0.68 36.26 2.11 37.36 L9.00 42.63 L9.00 42.63 L12.47 68.01 L25.94 94.62 C26.88 96.49 28.29 98.02 29.98 99.11 C31.19 99.90 32.82 99.20 33.04 97.77 L33.62 94.16 C33.93 92.16 32.91 90.16 31.07 89.31 C29.19 88.44 27.76 87.23 27.76 85.88 C27.76 83.25 31.56 82.82 36.24 82.82 C40.93 82.82 44.73 83.25 44.73 85.88 C44.73 87.23 43.30 88.44 41.42 89.31 C39.58 90.16 38.56 92.16 38.88 94.16 L39.47 97.88 C39.69 99.27 41.27 100.00 42.47 99.26 C44.18 98.20 45.62 96.70 46.61 94.86 L61.00 68.01 L63.49 42.63 L70.38 37.36 C71.81 36.26 72.50 34.45 72.15 32.69" />
    </svg>
  );
}

// Monograma en placa: mascota blanca sobre marino, trazo naranja.
export function Monograma({ tamano = 36, className = "" }: { tamano?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center justify-center rounded-xl bg-acento ${className}`} style={{ width: tamano, height: tamano, boxShadow: "inset 0 -3px 0 #ff6c00" }}>
      <Mascota alto={Math.round(tamano * 0.56)} color="#ffffff" />
    </span>
  );
}

export function Logotipo({ compacto = false, claro = false }: { compacto?: boolean; claro?: boolean }) {
  // Alturas fijas para que nunca se corte: mascota 28/40 px, bloque de texto 36/48 px.
  return (
    <span className={`inline-flex items-center gap-3 ${compacto ? "h-10" : "h-12"}`}>
      <Mascota alto={compacto ? 28 : 40} color={claro ? "#ffffff" : "#00345e"} className="shrink-0" />
      <span className="flex flex-col justify-center">
        <span className={`titulo-marca ${compacto ? "text-[18px] leading-[20px]" : "text-[24px] leading-[26px]"} ${claro ? "text-white" : "text-acento"}`}>Estudio Sports</span>
        <span className={`etiqueta-marca ${compacto ? "text-[8px] leading-[12px]" : "text-[9px] leading-[14px]"} ${claro ? "text-white/70" : "text-naranja"}`}>CRM comercial</span>
      </span>
    </span>
  );
}
