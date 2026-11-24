// Garantiza usuarios base en cada despliegue, sin tocar los que ya existen.
// Se ejecuta en la construcción, después de la semilla.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const BASE = [
  {
    usuario: "chayi",
    nombre: "Chayi",
    rol: "PRODUCCION" as const,
    clave: process.env.SEED_CLAVE_PRODUCCION ?? "EstudioSports-Chayi-2026",
  },
];

async function main() {
  for (const u of BASE) {
    const existe = await db.usuario.findUnique({ where: { usuario: u.usuario } });
    if (existe) continue;
    await db.usuario.create({
      data: { usuario: u.usuario, nombre: u.nombre, rol: u.rol, passwordHash: await bcrypt.hash(u.clave, 12), debeCambiarClave: true },
    });
    console.log(`Usuario ${u.usuario} creado (${u.rol}); debe cambiar la contraseña al ingresar.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
