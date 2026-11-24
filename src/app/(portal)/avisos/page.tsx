import Link from "next/link";
import { format } from "date-fns";
import { db } from "@/lib/db";
import { requerirSesion } from "@/lib/acceso";
import { Boton, Pagina, Tarjeta, Vacio } from "@/components/ui";
import { marcarAvisosLeidos } from "@/actions/avisos";
import { AbrirAviso } from "./paneles";

export default async function Avisos() {
  const s = await requerirSesion();
  const avisos = await db.aviso.findMany({ where: { usuarioId: s.usuarioId }, orderBy: { creadoEn: "desc" }, take: 100 });
  const sinLeer = avisos.filter((a) => !a.leido).length;
  return (
    <Pagina
      titulo="Avisos"
      subtitulo={sinLeer ? `${sinLeer} sin leer` : "Al día"}
      acciones={
        sinLeer ? (
          <form action={marcarAvisosLeidos}>
            <Boton>Marcar todos como leídos</Boton>
          </form>
        ) : undefined
      }
    >
      <Tarjeta>
        {avisos.length === 0 ? (
          <Vacio>Sin avisos. Aquí aparecen las tareas que te asignan y los reportes de lo que pediste.</Vacio>
        ) : (
          <ul className="-mx-5 divide-y divide-linea/70">
            {avisos.map((a) => (
              <li key={a.id} className={`flex items-start justify-between gap-3 px-5 py-3 ${a.leido ? "" : "bg-acento-suave/40"}`}>
                <div className="min-w-0">
                  {a.href ? (
                    <AbrirAviso id={a.id} href={a.href} texto={a.texto} leido={a.leido} />
                  ) : (
                    <span className={`text-sm ${a.leido ? "text-tinta-2" : "font-medium text-tinta"}`}>{a.texto}</span>
                  )}
                  <div className="text-xs text-tinta-3">{format(a.creadoEn, "dd/MM/yyyy HH:mm")}</div>
                </div>
                {!a.leido ? <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-acento" aria-label="sin leer" /> : null}
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>
      <p className="mt-4 text-xs text-tinta-3">
        Los avisos viven en el portal y en tu <Link href="/cuenta" className="text-acento hover:underline">calendario suscrito</Link>. El envío por correo se habilita en la siguiente fase.
      </p>
    </Pagina>
  );
}
