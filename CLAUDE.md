# Kargia (antes «Packia»): traspaso del proyecto para Claude

Lee esto entero antes de tocar nada. Resume todo lo hablado y construido con el dueño del proyecto hasta la **v13.0.0** (octubre de 2026).

---

## 1. Quién es el usuario y cómo trabajar con él

- **Idioma:** español de España. Responde siempre en español, cercano y claro.
- **Perfil:** emprendedor, **no programador**. Lo despliega todo él mismo en Hostinger, Supabase y GoHighLevel. Necesita instrucciones **paso a paso**, con dónde hacer clic. Suele enviar capturas de pantalla.
- **Escribe rápido y con faltas de ortografía.** Interpreta la intención; si algo es ambiguo, elige lo razonable y explícalo.
- **Forma de entrega que espera, en cada cambio:**
  1. Programar, probar (build, typecheck y pruebas en navegador con Playwright cuando se pueda) y subir la versión en `package.json`.
  2. Commit y push a la rama de trabajo (la última fue `claude/busy-mendel-38iopm`).
  3. Generar un **zip** con `git archive --format=zip -o kargia-vX.Y.zip HEAD` en la raíz del repo y **enviárselo**. Los `*.zip` están en `.gitignore` y el zip nunca incluye `.env`.
  4. Terminar con un resumen corto: qué cambia, qué tiene que hacer él y cómo actualizar («sube el zip a Hostinger → **Redeploy** → si hay migración, entra como admin y pulsa **Actualizar ahora**; abajo del menú debe poner vX.Y.Z»).
- **Seguridad:**
  - Nunca escribas contraseñas ni claves en commits, docs o zips.
  - En un momento compartió su contraseña de la base de datos de Supabase en el chat; se le recomendó cambiarla. No la uses ni la repitas.
  - El email del usuario es solo para identificarle.

---

## 2. El negocio

- **Kargia** (dominio **kargia.eu**) es una empresa de **logística / fulfillment (3PL)** para tiendas online **Shopify y WooCommerce** en España: recepción, almacenaje, preparación de pedidos, envío y devoluciones.
- Empieza en la trastienda de un local físico.
- **Modelo de precios** (editable en la app, Ajustes → Planes y precios):

  | Plan | Cuota | Pedidos incluidos | Pedido extra |
  |---|---|---|---|
  | Arranque | 480 €/mes | 300 | 1,40 € |
  | Crecimiento | 850 €/mes | 600 | 1,30 € |
  | Escala | 1.200 €/mes | 1.000 | 1,20 € |

  Devolución: 1,50 €. Sin permanencia, 2 semanas de prueba y primer mes prorrateado.
- **Cliente ideal:** tiendas a partir de unos 300 pedidos al mes. Hay un competidor de referencia (LOPI) analizado en `docs/cliente-ideal.md`.
- **Estrategia de 0 a 10.000 €/mes** en `docs/estrategia-0-a-10k.md`: captación en frío, socios que derivan clientes, Meta Ads y oferta de lanzamiento.
- **Marca:**
  - Logo: dos chevrones («<<»), uno **blanco** y otro **lima `#C3FC1D`**, sobre **negro `#0B0B0D`**. Hay versión SVG en `marketing/kargia-logo.svg` y en `src/app/icon.svg`.
  - El nombre se muestra en minúsculas, «kargia», con «FULFILLMENT» debajo.
  - El código mantiene identificadores internos `packia` (claves de localStorage, el proveedor de etiquetas `PACKIA`, el prefijo `packia:GLS` del envío por defecto…). **No los renombres**: están guardados en la base de datos.

---

## 3. Stack y despliegue

- **Next.js 15.5** (App Router, Server Actions, middleware, `instrumentation.ts`), **React 19**, **TypeScript 5.9.3** fijado (la 7 rompía `next.config`) y **Tailwind 4**.
  - En Tailwind 4 las utilidades propias se definen con `@utility`, no con `@layer`.
  - La utilidad `table-cell` se llama `cell` para no chocar con la de Tailwind.
- **Prisma 6.19** con **PostgreSQL en Supabase**. Login con **Supabase Auth** (`@supabase/ssr`). RLS activado en todas las tablas: la app usa la conexión directa de Prisma.
- **Hosting:** Hostinger, «Node.js Web App» (plan Business o Cloud).
  - El usuario sube el zip, pulsa **Redeploy** y configura las variables de entorno en hPanel.
  - URL temporal actual: `https://floralwhite-dugong-101545.hostingersite.com`. El plan es moverla a `app.kargia.eu`.
- **Variables de entorno** (explicadas en `docs/variables-de-entorno.md`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL` (pooler, puerto 6543, `?pgbouncer=true`), `DIRECT_URL` (puerto 5432), `ENCRYPTION_KEY` y `NEXT_PUBLIC_APP_URL` (opcional). Opcionales: `CRON_SECRET`, `SENDCLOUD_*`, `COMPANY_*`, `SENDER_*`, `SYNC_INTERVAL_SECONDS`.
- **Asistente `/setup`:** comprueba las variables, crea las tablas (aplica las migraciones él mismo y registra los checksums en `_prisma_migrations`, compatible con `prisma migrate deploy`) y crea el primer administrador.
- **Pantalla «Actualización pendiente»:** si una versión nueva trae migraciones sin aplicar, el layout `(app)` la muestra y el administrador pulsa «Actualizar ahora».
  - **Regla crítica:** cualquier consulta que se ejecute antes de esa comprobación (por ejemplo `getCurrentUser` en `src/lib/auth.ts`) solo puede seleccionar **columnas que existían en la primera versión**. Si no, la app se cae tras actualizar; ya pasó una vez y se corrigió en la v4.1.
- **`supabase/setup.sql`:** SQL completo para pegarlo a mano en Supabase. Se regenera con `npm run setup:sql` **cada vez que añadas una migración**.

### Cómo crear una migración (hay trampas)
1. Edita `prisma/schema.prisma`.
2. Genera el SQL **sin** haber creado antes la carpeta de la migración. Si la carpeta existe vacía, Prisma da el error P3015 y sale un SQL vacío:
   ```bash
   npx prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --script --shadow-database-url "postgresql://postgres:postgres@localhost:5432/packia_shadow" > /tmp/x.sql
   ```
3. Comprueba que `/tmp/x.sql` no esté vacío. Después crea `prisma/migrations/AAAAMMDDHHMMSS_vN_nombre/migration.sql` con ese contenido.
4. Si creas tablas nuevas, añade `ALTER TABLE "X" ENABLE ROW LEVEL SECURITY;`.
5. Ejecuta `npx prisma migrate deploy`, luego `npx prisma generate` y luego `npm run setup:sql`.
6. No uses `prisma migrate dev`: falla con la shadow DB por el RLS condicional de `_prisma_migrations`.

---

## 4. Funcionalidades (v12.1.0)

**Roles**
- **ADMIN:** acceso a todo.
- **STAFF** (operario de almacén): todo salvo facturación, usuarios y ajustes generales.
- **CLIENT:** solo los datos de su empresa (`clientScope`). Además tiene «Mi plan».

**Pedidos y almacén**
- **Tiendas:**
  - Shopify con apps del Dev Dashboard (client credentials, token de 24 h cacheado y cifrado; también admite `shpat_` antiguos), API **2026-10**, webhooks registrados con el campo `uri`.
  - WooCommerce REST v3 con webhooks firmados (HMAC).
  - Sincronización **cada 60 s** con un programador interno (`src/lib/scheduler.ts`, arrancado desde `instrumentation.ts`, con bloqueo en la tabla `SyncLock`). De respaldo: `/api/cron/sync?key=CRON_SECRET`.
- **Salida:**
  - Tarjetas por cliente (de 3 en 3) y **modo preparación** pedido a pedido (`/salida/preparar`, componente `station.tsx`).
  - Lista de picking con marcas que se recuerdan en localStorage y **escáner de código de barras o SKU** que avisa si un producto no es del pedido.
  - Hora de corte a las 14:00, días laborables, hora de Madrid.
  - Avanzar y volver a pendiente, también en bloque.
- **Validación de productos:** cada producto nuevo queda «Por validar» hasta que alguien del equipo le da el OK (código de barras, ubicación y peso). Hasta entonces el pedido no se puede embalar ni etiquetar (`src/lib/validation.ts`).
- **Recepción** de mercancía, **Devoluciones**, **Inventario** con buscadores, y **Clientes tienda** (los compradores finales, con exportación a CSV; solo ADMIN y STAFF).
- **Etiquetas:**
  - Etiqueta interna de 10×15 cm (`src/lib/labels/packia.ts`) con el número de pedido grande y el contenido del paquete. También Sendcloud, global o con las claves propias de cada cliente.
  - **Imprimir al embalar:** por defecto, casilla «Imprimir la etiqueta al terminar». Se imprime desde un iframe dentro de la página, sin abrir pestañas, con un recuadro pequeño para Ver o Reimprimir (`src/components/print-toast.tsx`), y se pasa al siguiente pedido.
  - Para imprimir sin el diálogo del navegador hay que abrir Chrome con `--kiosk-printing`; las instrucciones están en la app.
  - Cola **Etiquetas → Por imprimir** con impresión en bloque en un solo PDF.
  - **Impresora configurable** (`src/lib/labels/print.ts`): térmica 10×15 o 4×6", A4 con 4 o con 1 etiqueta, desplazamiento en mm, escala, giro de 180°, diálogo automático, orden y página de prueba.
- **Notificaciones:** campana con avisos y contadores en el menú (verde = pendiente, rojo = urgente).
- **Menú:** «Más» en el móvil, botón «Demo» en la cabecera, versión visible abajo del menú y scroll en pantallas bajas.

**Facturación** (`src/lib/billing.ts` y `src/lib/plans.ts`)
- Cuota del plan, pedidos extra y devoluciones procesadas.
- **Semanas de prueba** y **prorrateo** del primer mes.
- **Cambio de plan a mitad de mes prorrateado por días.** La tabla `PlanChange` guarda el historial y la cuota y los pedidos incluidos se reparten por tramos. Se puede aplicar desde hoy, desde el día 1 de este mes o desde el día 1 del mes siguiente (`PlanRequest` de tipo CHANGE).
- **«Facturar hasta hoy»** o hasta un día concreto. Al cerrar el mes solo se factura el resto.
- **Facturación automática** del mes anterior los días 1 a 5 (se puede desactivar en Ajustes).
- **Anular y corregir facturas** con **rectificativas**:
  - Una factura emitida nunca se borra ni se edita.
  - Anular emite una rectificativa en negativo (serie `KGR`) enlazada y deja el periodo libre.
  - Corregir anula la original y emite una factura nueva con las líneas editadas.
  - Las facturas normales usan la serie `KG` (configurable en Ajustes).
- **Mi plan (cliente):**
  - Subir de plan: inmediato y prorrateado.
  - Bajar de plan: desde el día 1 del mes siguiente; lo aplica el programador.
  - Solicitar la baja: la confirma o rechaza un admin y se guarda como `serviceEndAt`.

**Ajustes**
- Datos fiscales y remitente.
- **Marca:** nombre, texto bajo el nombre, logo, WhatsApp, teléfono y email.
- **Planes y precios:** se pueden aplicar también a los clientes actuales.
- Sendcloud, facturación automática, serie de facturas y estado del sistema.

**Modo demo** (`/demo`, solo ADMIN y STAFF)
- Tienda ficticia «Lumen Cosmetics», sin escribir nada en la base de datos.
- Vista del almacén y vista del cliente, simular pedidos, validar productos, escanear, embalar, cola de etiquetas, PDF de ejemplo y factura de ejemplo.

**API pública** (sin login; permiso CORS `*`)
- `/api/public/planes` devuelve marca, contacto, datos fiscales y precios. No da datos de clientes.
- `/api/public/marca/logo` sirve el logo.

---

## 5. Web de marketing en GoHighLevel

- Las páginas de la web están en `marketing/gohighlevel/`: `web-kargia.html`, `landing-meta-ads.html` (para Meta Ads) y `gracias.html` (dispara el evento Lead del píxel).
- Las **fuentes** están en `marketing/gohighlevel/src/` (`styles.css`, plantillas `*.body.html` y `build.py`). Para regenerar:
  ```bash
  python3 marketing/gohighlevel/src/build.py marketing/gohighlevel/src marketing/gohighlevel
  ```
- El usuario pega el HTML entre las marcas `COPIAR DESDE AQUÍ` / `HASTA AQUÍ` en un elemento «Custom JS/HTML» de GHL.
- Todo el CSS va bajo la clase `.pk` para no chocar con los estilos de GHL.
- Un **script** dentro de las páginas lee `URL_APP/api/public/planes` desde el navegador de cada visitante y actualiza nombre, logo, precios, botones de WhatsApp, email, teléfono y aviso legal. GHL no necesita API.
  - La URL de la app está en `build.py` (`{{PACKIA_URL}}`); hay que cambiarla cuando la app pase a `app.kargia.eu`.
- La web y la app irán en subdominios distintos: `kargia.eu` en GHL y `app.kargia.eu` en Hostinger. Funciona gracias al CORS de la API pública.
- La guía completa (carpeta, website, funnel, formulario de cualificación, píxel, automatizaciones y colores) está en `marketing/gohighlevel/README.md`.
- No hay conector de GoHighLevel en Claude: no se puede entrar en su cuenta, solo darle archivos e instrucciones.

---

## 6. Mapa del código

```
src/app/(app)/          páginas con login (layout: menú, campana, actualización pendiente, PrintToast)
  salida/  salida/[id]/  salida/preparar/ (station.tsx)   etiquetas/   recepcion/   devoluciones/
  inventario/ (+ validar/[id])   clientes/ (+ [id]: client-form, plan-panel)   clientes-tienda/
  facturacion/ (+ [id], [id]/rectificar, actions.ts)   mi-plan/   tiendas/   usuarios/   ajustes/
src/app/demo/           modo demo (demo-app.tsx, etiqueta/route.ts)
src/app/setup/          asistente inicial          src/app/login/   src/app/auth/
src/app/api/            labels/[orderId] (PDF; batch y test), webhooks, cron/sync, notifications, export, public
src/app/actions.ts      acciones principales (clientes, tiendas, pedidos, productos, usuarios)
src/app/plan-actions.ts subir, bajar y baja de plan     src/app/print-actions.ts   impresora
src/lib/                auth, billing, plans, brand(+types), labels/{index,packia,print,print-options,sendcloud,sender},
                        sync, scheduler, notifications, validation, setup, settings, schedule, crypto, integrations/
src/components/         ui, sidebar, logo, brand, pick-list, print-toast, print-settings-form, notifications, …
prisma/                 schema.prisma, migrations (init → v12_print_on_pack), seed.ts (datos de demo)
docs/                   cliente-ideal, estrategia-0-a-10k, puesta-en-marcha, variables-de-entorno, conectar-shopify
```

**Colores** (`src/app/globals.css`):
- `brand-400` = lima del logo, para rellenos y botones.
- `brand-600` = verde oliva, para texto sobre blanco.
- `ink-900` = negro.
- `btn-primary` = lima con texto negro.
- `text-gradient` = resaltado tipo rotulador lima.
- No pongas texto lima sobre fondo blanco: no se lee.

---

## 6b. Seguridad (v13): no romper
- `src/lib/security.ts`: `safeRedirectPath` (usar en toda redirección con destino que venga del usuario), `securityHeaders` (en `next.config.ts`), `hardenCookie` y `RateLimiter` (login).
- Cada página `[id]` debe usar `canAccessClient` o `requireUser([...])` sin CLIENT. Cada acción de servidor debe empezar comprobando el rol. **`npm test` lo audita** y falla si no.
- El stock físico nunca puede quedar en negativo: `orderBlockers` (motivo `nostock`) y un descuento atómico en `shipOrder`.
- El plazo de salida se cuenta desde `slaStart(order)`, que es la llegada a la app, no la fecha de compra.
- Detalle punto por punto en `docs/seguridad.md`. Prueba de extremo a extremo: `tests/e2e/security.e2e.mjs`.

## 7. Cómo probar en local (entorno de Claude)

- PostgreSQL local con las bases `packia` y `packia_shadow` (usuario y contraseña `postgres`). `.env` de desarrollo con `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321`.
- Supabase Auth se simula con un **servidor mock** (un script de Node que responde a `/auth/v1/token`, `/auth/v1/user` y `/auth/v1/admin/users`). Usuario de pruebas: `admin@packia.es` / `Admin1234!`.
- Datos de demo: `npm run db:seed`. Se niega a ejecutarse si hay tiendas reales.
- Comprobaciones: `npx tsc --noEmit`, **`npm test`**, `npm run build` y luego `next start`. Pruebas de extremo a extremo con Playwright; Chromium está en `/opt/pw-browsers`.
- En el entorno remoto, el contenedor a veces se reinicia y hay que arrancar de nuevo PostgreSQL (`service postgresql start`), el mock y el servidor.

---

## 8. Historial de versiones

| Versión | Qué trajo |
|---|---|
| 1–3 | App base, login y roles, Supabase, etiquetas, recepción, salida, devoluciones, facturación, asistente `/setup` y despliegue en Hostinger. |
| 4 / 4.1 | Estación de preparación, tarjetas por cliente, notificaciones, sincronización cada minuto, Clientes tienda y corrección de la caída tras actualizar. |
| 5 | Semanas de prueba, prorrateo, «Emitir todas», facturación automática, editar usuarios y picking con marcas. |
| 6 | Validación de productos, escáner en el picking y modo demo. |
| 7 | Planes prorrateados, facturar hasta hoy, Mi plan, precios en Ajustes, API pública de precios y menú «Más» en el móvil. |
| 8 | Marca configurable (nombre y logo) en la app y en la web. |
| 9 | Cola de etiquetas e impresora configurable. |
| 9.1 | Marca por defecto Kargia con su logo. |
| 10 | Colores de Kargia en toda la app y contacto público. |
| 11 / 11.1 | Facturas rectificativas (anular y corregir) y cola de etiquetas en la demo. |
| 12 / 12.1 | Menú con scroll, imprimir cada etiqueta al embalar con recuadro, número de pedido grande y contenido en la etiqueta. |
| 13 | Auditoría de seguridad: cabeceras, `?next=` seguro, límite de intentos de login, cookies endurecidas, pruebas automáticas, stock nunca negativo y plazo de salida desde la llegada al almacén. |

---

## 9. Ideas pendientes y posibles siguientes pasos

- Impresión 100 % silenciosa desde el servidor con **PrintNode** o **QZ Tray**, si el modo `--kiosk-printing` no le basta.
- Repartidores nativos (GLS, SEUR…) sin pasar por Sendcloud: se habló pero no está hecho.
- Pasar la app a `app.kargia.eu`: variable `NEXT_PUBLIC_APP_URL`, Site URL y Redirect URL en Supabase, y URL en los HTML de GHL.
- Datos fiscales reales en Ajustes: ahora hay datos de ejemplo («Packia Fulfillment S.L.»).
- Testimonios y casos reales en la web cuando haya clientes.
- Los avisos internos de cambios de plan llevan a `/mi-plan?c=ID`, que redirige al equipo a la ficha del cliente.
