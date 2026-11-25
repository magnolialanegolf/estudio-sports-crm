import { Navegacion } from "@/components/navegacion";
import { requerirSesion } from "@/lib/acceso";
import { etiqueta } from "@/lib/formato";
import { salir } from "@/actions/sesion";
import { avisosSinLeer } from "@/lib/avisos";
import { after } from "next/server";
import { sincronizarSiToca } from "@/lib/google-calendar";

export const dynamic = "force-dynamic";

export default async function LayoutPortal({ children }: { children: React.ReactNode }) {
  const s = await requerirSesion();
  const avisos = await avisosSinLeer(s.usuarioId);
  // Push al calendario: si está conectado y pasaron diez minutos, se actualiza después de responder.
  after(() => sincronizarSiToca(s.usuarioId));
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Navegacion nombre={s.nombre} rol={s.rol} rolEtiqueta={etiqueta("rol", s.rol)} salir={salir} avisos={avisos}>
        {children}
      </Navegacion>
    </div>
  );
}
