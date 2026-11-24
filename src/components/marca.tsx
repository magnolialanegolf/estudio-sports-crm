// Marca provisional de Estudio Sports: la mascota de Caskarita (cabeza en vector, del logotipo
// oficial) con el nombre Estudio Sports. Misma empresa, mismo personaje.

export function Mascota({ alto = 36, className = "", color = "currentColor" }: { alto?: number; className?: string; color?: string }) {
  const ancho = Math.round((alto * 86.5) / 63.2);
  return (
    <svg width={ancho} height={alto} viewBox="0 0 86.5 63.2" role="img" aria-label="Estudio Sports" className={className}>
      <path fill={color} d="M62.397 28.0231L57.087 1.14313C56.877 0.0931269 55.627 -0.356873 54.807 0.323127L50.307 3.98313L39.947 20.3931H22.507L12.157 3.98313L7.65703 0.323127C6.82703 -0.346873 5.57703 0.103127 5.37703 1.14313L0.0770327 28.0231C-0.222967 29.5531 0.367033 31.1231 1.60703 32.0731L7.58703 36.6531L10.607 58.6831L22.287 81.7731C23.107 83.3931 24.327 84.7231 25.787 85.6731C26.837 86.3531 28.247 85.7531 28.447 84.5131L28.947 81.3831C29.217 79.6431 28.337 77.9131 26.737 77.1731C25.097 76.4231 23.867 75.3631 23.867 74.1931C23.867 71.9031 27.167 71.5231 31.227 71.5231C35.287 71.5231 38.587 71.8931 38.587 74.1931C38.587 75.3631 37.357 76.4131 35.717 77.1731C34.117 77.9131 33.237 79.6431 33.507 81.3831L34.017 84.6031C34.207 85.8131 35.577 86.4531 36.627 85.8031C38.107 84.8831 39.357 83.5831 40.217 81.9931L52.707 58.6831L54.867 36.6631L60.857 32.0831C62.097 31.1331 62.687 29.5631 62.387 28.0331M5.17703 30.0931C3.76703 29.0031 3.13703 27.1731 3.59703 25.4431L7.83703 9.38313L6.26703 26.0431C6.18703 26.8831 6.34703 27.7231 6.72703 28.4731L9.08703 33.1231L5.17703 30.1031V30.0931ZM19.597 40.6931C18.237 40.6931 17.137 39.5931 17.137 38.2431C17.137 36.8931 18.237 35.7931 19.597 35.7931C20.957 35.7931 22.047 36.8931 22.047 38.2431C22.047 39.5931 20.947 40.6931 19.597 40.6931ZM47.747 40.1131L45.967 41.8931L43.927 39.8531L41.887 41.8931L40.107 40.1131L42.147 38.0731L40.107 36.0331L41.887 34.2531L43.927 36.2931L45.967 34.2531L47.747 36.0331L45.707 38.0731L47.747 40.1131ZM57.297 30.0931L53.377 33.1131L55.737 28.4631C56.117 27.7131 56.277 26.8731 56.197 26.0331L54.627 9.37313L58.867 25.4431C59.327 27.1731 58.697 29.0031 57.287 30.0931" />
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
  return (
    <span className="inline-flex items-center gap-2.5">
      <Mascota alto={compacto ? 30 : 42} color={claro ? "#ffffff" : "#00345e"} />
      <span className="flex flex-col leading-none">
        <span className={`titulo-marca ${compacto ? "text-[19px]" : "text-2xl"} ${claro ? "text-white" : "text-acento"}`}>Estudio Sports</span>
        <span className={`etiqueta-marca mt-1 text-[9px] ${claro ? "text-white/70" : "text-naranja"}`}>CRM comercial</span>
      </span>
    </span>
  );
}
