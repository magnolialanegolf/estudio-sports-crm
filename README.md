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
| Producción | Solo sus tareas asignadas (marca, qué hacer, fecha, instrucciones). Reporta avance, cumplimiento o «requiere atención». No ve montos, contratos ni comisiones. |
| Lectura | Consulta el consolidado sin editar. |

## Módulos

Hoy (vencidos y próximos 30 días) · Marcas y contactos · Contratos con línea de tiempo, hitos de cobro, compromisos, cumplimiento de entregables y documentos adjuntos · Tareas (entregables asignados a producción, con repetición «N veces cada semana/quincena/mes», reporte y estado «requiere atención») · Calendario de dos capas y calendario personal por suscripción (Google Calendar, iPhone, Outlook) · Cobranza por antigüedad · Comisiones · Reportes (informe de dirección e informe consolidado, imprimibles en PDF) · Tablero · Directores, carteras y cartera de demostración anonimizada · Reglas de comisión · Usuarios · Bitácora · Exportación CSV.

Los documentos (PDF, PNG, JPG hasta 10 MB) se guardan en la base durante el piloto; con volumen alto se migran a almacenamiento de objetos.

## Cadena de producción

Cada entregable de un contrato recorre seis etapas con un responsable claro en cada una, y cada traspaso avisa a quien sigue y queda en el historial:

| Etapa | En cancha de | Quién la mueve |
|---|---|---|
| Por autorizar | Comercial | El director autoriza la ejecución (uno por uno o toda la serie). Hasta entonces, producción lo ve programado pero no en su calendario. |
| Por producir | Producción (asignado) | Marca grabado. |
| Grabado / En edición | Edición (editor) | Toma para edición y marca edición lista, con liga del material. |
| Editado | Comercial | Publica o entrega; el entregable queda cumplido. |
| Publicado | — | Cierra. Si con él quedan completos los entregables del mes, comercial y dirección reciben «procede facturar» con el hito correspondiente. |

Regresar una etapa exige motivo. La vista **Producción** muestra, para comercial y dirección, cada entregable abierto con etapa, en cancha de quién está, días en la etapa, retraso frente a la fecha con la marca y último movimiento o motivo. Las tareas autorizadas aparecen en el calendario personal de cada quien y en su liga de suscripción.

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

Usuarios iniciales: `admin`, `miguel`, `demo`, `produccion`. Las contraseñas se toman de `SEED_CLAVE_ADMIN`, `SEED_CLAVE_MIGUEL`, `SEED_CLAVE_DEMO` y `SEED_CLAVE_PRODUCCION`; sin esas variables se usan valores por defecto de desarrollo que deben cambiarse en el primer ingreso (Mi cuenta → Cambiar contraseña).

## Despliegue

1. Base de datos en Neon; copiar la cadena de conexión a `DATABASE_URL`.
2. Proyecto en Vercel ligado al repositorio, con `DATABASE_URL` y `SESSION_SECRET` como variables de entorno.
3. El comando de construcción aplica el esquema y carga la semilla solo si la base está vacía (`SEED_FORZAR=1` la recarga). Definir `SEED_CLAVE_ADMIN`, `SEED_CLAVE_MIGUEL` y `SEED_CLAVE_DEMO` antes del primer despliegue.
4. Lector de contratos: `ANTHROPIC_API_KEY`. Cada lectura registra en bitácora sus tokens y su costo.
5. Ingreso con Google Workspace: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` y `GOOGLE_DOMINIOS`. La credencial se crea en Google Cloud (APIs y servicios → Credenciales → ID de cliente OAuth, tipo aplicación web) con la URI de retorno `https://<dominio>/api/auth/google/callback`. Google solo identifica: entra quien ya existe como usuario activo con ese correo y cuyo dominio está en la lista. El acceso por usuario y contraseña sigue disponible.
6. Las cuentas de GitHub, Vercel y Neon deben quedar a nombre de Estudio Sports al contratar; durante el piloto viven en Magnolia.

## Pendientes de la siguiente fase

Envío automático de informes y alertas por correo · sincronización bidireccional con Google Calendar · almacenamiento de objetos para documentos · alta de los demás directores y de los socios · migración de cuentas a Estudio Sports.
