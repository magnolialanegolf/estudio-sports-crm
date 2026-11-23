# Estudio Sports · CRM comercial

Portal de control comercial de Estudio Sports: marcas, contratos, compromisos con cada marca, calendario de facturación y cobro, comisiones calculadas y reportes para la dirección. Sustituye el control en hoja de cálculo.

Piloto en línea: https://estudiosports.magnolialane.com.mx

Desarrollado por Magnolia Digital. Piloto con un director comercial; diseñado desde el primer día para operar con todos los directores y con la dirección general.

## Principios del diseño

- **Permisos a nivel de fila.** Un director ve y captura únicamente su cartera. El administrador general ve todo, consolidado y por director.
- **La comisión se calcula, nunca se captura.** Comisión = cobrado × (1 − retención de la casa) × porcentaje del director, con la regla vigente en la fecha del cobro. Solo el administrador general fija reglas; los directores las ven.
- **Dato confirmado contra dato heredado.** Cada contrato, hito de cobro y pago lleva la bandera `confirmado`. Lo que viene del archivo anterior sin respaldo documental se muestra como «por confirmar» y no suma a la comisión devengada confirmada.
- **Todo queda en bitácora.** Ingresos, altas, cambios y bajas, con usuario y fecha.
- **Sin versión pública.** Toda ruta exige sesión; el sitio se declara no indexable.

## Roles

| Rol | Alcance |
|---|---|
| Administrador general | Todo: consolidado, tablero, directores, carteras, reglas de comisión, usuarios, bitácora, pagos de comisión. |
| Director comercial | Solo su cartera: marcas, contratos, compromisos, hitos y pagos. Ve sus comisiones. No edita reglas ni asignaciones. |
| Administración | Facturas y cobros de todas las carteras. No ve comisiones. |
| Lectura | Consulta el consolidado sin editar. |

## Módulos

Hoy (vencidos y próximos 30 días) · Marcas y contactos · Contratos con línea de tiempo, hitos de cobro y compromisos · Calendario de dos capas con exportación ICS · Cobranza por antigüedad · Comisiones · Reportes (informe de dirección e informe consolidado, imprimibles en PDF) · Tablero · Directores y carteras · Reglas de comisión · Usuarios · Bitácora · Exportación CSV.

## Stack

Next.js 16 (App Router, acciones de servidor) · TypeScript · Tailwind 4 · Prisma 6 · PostgreSQL (Neon en producción) · sesión firmada con `jose` en cookie `httpOnly` · contraseñas con `bcrypt`. Gráficas en SVG sin dependencias.

## Puesta en marcha local

```bash
pnpm install
cp .env.example .env        # DATABASE_URL y SESSION_SECRET (mínimo 32 caracteres)
pnpm db:push                 # crea el esquema
pnpm db:seed                 # carga inicial (ver abajo)
pnpm dev
```

`pnpm db:reset` borra y vuelve a cargar la semilla.

## Carga inicial (semilla)

`prisma/seed.ts` transcribe el archivo «CRM Comercial Estudio Sport» (corte 23 de noviembre de 2026) tal cual, con sus contradicciones anotadas en `observaciones` de cada contrato y las banderas `confirmado` en falso donde el archivo no tiene respaldo. Incluye una **dirección de demostración** con datos ficticios para mostrar el consolidado; se elimina desde Directores.

Usuarios iniciales: `admin`, `miguel`, `demo`. Las contraseñas se toman de `SEED_CLAVE_ADMIN`, `SEED_CLAVE_MIGUEL` y `SEED_CLAVE_DEMO`; sin esas variables se usan valores por defecto de desarrollo que deben cambiarse en el primer ingreso (Mi cuenta → Cambiar contraseña).

## Despliegue

1. Base de datos en Neon; copiar la cadena de conexión a `DATABASE_URL`.
2. Proyecto en Vercel ligado al repositorio, con `DATABASE_URL` y `SESSION_SECRET` como variables de entorno.
3. El comando de construcción aplica el esquema y carga la semilla solo si la base está vacía (`SEED_FORZAR=1` la recarga). Definir `SEED_CLAVE_ADMIN`, `SEED_CLAVE_MIGUEL` y `SEED_CLAVE_DEMO` antes del primer despliegue.
4. Las cuentas de GitHub, Vercel y Neon deben quedar a nombre de Estudio Sports al contratar; durante el piloto viven en Magnolia.

## Pendientes de la siguiente fase

Envío automático de informes por correo · carga de documentos firmados · alertas por correo a 90/60/30 días · alta de los demás directores y de los socios · migración de cuentas a Estudio Sports.
