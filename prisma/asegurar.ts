// Garantiza usuarios base en cada despliegue, sin tocar los que ya existen.
// Se ejecuta en la construcción, después de la semilla.
import { PrismaClient, type Rol } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

// Hash bcrypt de la contraseña de las cuentas de prueba de Magnolia Digital.
// La contraseña en claro la custodia Digital; aquí solo vive el hash.
const HASH_PRUEBA = "$2b$12$zBQZGqZc4k49bvZPT/SRqOhNyfJ.X2ERfMRELL1PKpA2OztojpCuO";

const OPERATIVOS: { usuario: string; nombre: string; rol: Rol; clave: string }[] = [
  { usuario: "chayi", nombre: "Chayi", rol: "PRODUCCION", clave: process.env.SEED_CLAVE_PRODUCCION ?? "EstudioSports-Chayi-2026" },
];

// Cuentas de prueba de Magnolia Digital: una por rol, para verificar cada vista.
const PRUEBA: { usuario: string; nombre: string; rol: Rol; cartera?: boolean }[] = [
  { usuario: "md-admin", nombre: "Prueba Magnolia · Administrador", rol: "ADMIN_GENERAL" },
  { usuario: "md-gerente", nombre: "Prueba Magnolia · Gerente", rol: "GERENTE_GENERAL" },
  { usuario: "md-director", nombre: "Prueba Magnolia · Director", rol: "DIRECTOR", cartera: true },
  { usuario: "md-asistente", nombre: "Prueba Magnolia · Asistente", rol: "ASISTENTE_COMERCIAL", cartera: true },
  { usuario: "md-pagos", nombre: "Prueba Magnolia · Pagos", rol: "ADMINISTRACION" },
  { usuario: "md-produccion", nombre: "Prueba Magnolia · Producción", rol: "PRODUCCION" },
  { usuario: "md-lectura", nombre: "Prueba Magnolia · Lectura", rol: "LECTURA" },
];

async function main() {
  for (const u of OPERATIVOS) {
    if (await db.usuario.findUnique({ where: { usuario: u.usuario } })) continue;
    await db.usuario.create({ data: { usuario: u.usuario, nombre: u.nombre, rol: u.rol, passwordHash: await bcrypt.hash(u.clave, 12), debeCambiarClave: true } });
    console.log(`Usuario ${u.usuario} creado (${u.rol}); debe cambiar la contraseña al ingresar.`);
  }

  // Las cuentas de cartera se ligan a la dirección de demostración, nunca a un director real.
  let demo = await db.director.findFirst({ where: { esDemo: true } });
  if (!demo) demo = await db.director.create({ data: { nombre: "Dirección de demostración", esDemo: true, notas: "Director ficticio. Regenerar desde Directores." } });

  // Las cuentas de prueba se sincronizan con el hash del repositorio en cada despliegue:
  // cambiar el hash aquí equivale a cambiar su contraseña.
  for (const u of PRUEBA) {
    await db.usuario.upsert({
      where: { usuario: u.usuario },
      update: { passwordHash: HASH_PRUEBA, debeCambiarClave: false, activo: true, rol: u.rol, directorId: u.cartera ? demo.id : null },
      create: { usuario: u.usuario, nombre: u.nombre, rol: u.rol, directorId: u.cartera ? demo.id : null, passwordHash: HASH_PRUEBA, debeCambiarClave: false },
    });
  }
  console.log(`Cuentas de prueba de Magnolia sincronizadas (${PRUEBA.length}).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
