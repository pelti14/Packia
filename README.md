# Packia

Software de logística (fulfillment) de Packia. Recibe los pedidos de las tiendas **Shopify** y **WooCommerce** de nuestros clientes, organiza el almacén (recepción, salida y devoluciones), crea las etiquetas de envío y factura a cada cliente su cuota mensual.

Documentación de negocio en [`docs/`](docs/): [cliente ideal](docs/cliente-ideal.md) y [estrategia de 0 a 10.000 €/mes](docs/estrategia-0-a-10k.md).

## Qué hace

| Sección | Para qué |
| --- | --- |
| **Panel** | Pedidos que tienen que salir hoy, retrasados, enviados hoy, % a tiempo, pedidos de los últimos 14 días, cuota de pedidos de cada cliente, recepciones previstas y stock bajo. |
| **Salida** | Pestañas *Para hoy · Retrasados · Sin preparar · Preparando · Listos para etiqueta · Enviados*. Corte a las 14:00 en días laborables (hora de Madrid). Avance en bloque e impresión de etiquetas en un solo PDF. |
| **Ficha de pedido** | Lista de picking por ubicación. **Crear etiqueta y enviar** (Sendcloud o etiqueta interna Packia) o registrar un seguimiento hecho fuera. El seguimiento se devuelve a la tienda. |
| **Recepción** | Avisos de entrada de mercancía (los puede crear el cliente). Al llegar se cuentan las unidades recibidas y dañadas, y se asigna ubicación. El stock sube solo. |
| **Devoluciones** | Se registran sobre un pedido enviado y siguen el flujo *Anunciada → Recibida → Procesada*. Al procesar, lo vendible vuelve al stock y lo dañado se aparta. |
| **Inventario** | Stock, ubicación, mínimo y peso por referencia. |
| **Facturación** | Uso del mes por cliente: pedidos enviados frente a los incluidos, exceso y devoluciones. Emisión de facturas mensuales (PK-AAAA-0001) con IVA, imprimibles en PDF, y control de cobro. |
| **Clientes** | Plan y tarifas de cada cliente (cuota, pedidos incluidos, precio por pedido adicional y por devolución) y sus datos fiscales. |
| **Tiendas** | Conexión con Shopify y WooCommerce, sincronización y webhooks. |
| **Usuarios** | Alta de usuarios y roles. |

### Roles

| Rol | Puede |
| --- | --- |
| **Administrador** | Todo, incluida facturación, clientes, tiendas y usuarios. |
| **Almacén** | Salida, recepción, devoluciones e inventario. Puede sincronizar tiendas. No ve facturación. |
| **Cliente** | Solo los datos de **su** empresa: pedidos, stock, recepciones (puede avisar de entradas), devoluciones (puede registrarlas) y sus facturas. |

### Etiquetas de envío

- **Sendcloud** (recomendado): con las claves configuradas aparecen los métodos de envío de la cuenta (MRW, GLS, Correos Express, SEUR…). Packia crea el envío, recibe el número de seguimiento y descarga la **etiqueta oficial** de la agencia en A6.
- **Etiqueta Packia**: etiqueta interna de 10×15 cm con código de barras Code 128, remitente y destinatario. Sirve para pruebas o para agencias que acepten etiquetas propias. **No sustituye a la etiqueta oficial de la agencia.**

### Seguridad

- Login con **Supabase Auth**. Todas las páginas exigen sesión, menos `/login` y los webhooks. Cada acción del servidor comprueba el rol del usuario.
- Los usuarios con rol Cliente solo pueden consultar los datos de su empresa.
- Los tokens y claves de las tiendas se guardan **cifrados con AES-256-GCM** usando `ENCRYPTION_KEY`.
- **RLS activado** en todas las tablas: la API pública de Supabase, que funciona con la clave anónima, no puede leer ni escribir nada. La app accede por Prisma.
- Los webhooks se verifican con la firma HMAC de Shopify o WooCommerce.

## Puesta en marcha con Supabase

### 1. Crear el proyecto
1. Entra en [supabase.com](https://supabase.com) y crea un proyecto. Elige la región **EU (Frankfurt o Irlanda)** y guarda la contraseña de la base de datos.
2. **Authentication → Providers → Email**: desactiva *Allow new users to sign up*. Los usuarios los crea un administrador desde Packia.
3. **Authentication → URL Configuration**: pon en *Site URL* la URL de la app, por ejemplo `https://app.packia.es`, y añade `https://app.packia.es/auth/callback` en *Redirect URLs*.

### 2. Variables de entorno
Copia `.env.example` a `.env` y rellénalo:

| Variable | Dónde está |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API (**secreta**, solo servidor) |
| `DATABASE_URL` | Project Settings → Database → Connection string → *Transaction pooler* (puerto 6543), añade `?pgbouncer=true` |
| `DIRECT_URL` | Igual, pero *Session pooler* (puerto 5432) |
| `ENCRYPTION_KEY` | `openssl rand -base64 32`. Guárdala bien: sin ella no se pueden leer las claves de las tiendas. |
| `SENDCLOUD_*` | Sendcloud → Ajustes → Integraciones → Sendcloud API |
| `SENDER_*`, `COMPANY_*` | Datos de vuestro almacén y datos fiscales para etiquetas y facturas |

### 3. Crear las tablas y el primer administrador
```bash
npm install
npm run db:migrate                                   # crea las tablas y activa RLS
npm run create-admin -- tu@email.com "contraseña" "Tu nombre"
npm run dev                                          # http://localhost:3000
```
Opcional: `npm run db:seed` carga datos de demostración (3 clientes, ~5 semanas de pedidos, recepciones y devoluciones). Se niega a ejecutarse si hay tiendas reales conectadas.

### 4. Publicarlo online (Vercel)
1. Importa el repositorio en [vercel.com](https://vercel.com).
2. Añade todas las variables del `.env` en *Settings → Environment Variables* y pon `NEXT_PUBLIC_APP_URL` con la URL final.
3. Despliega. El build ya ejecuta `prisma generate`.
4. Cuando haya cambios en el modelo de datos, ejecuta `npm run db:migrate` contra Supabase.

## Conectar una tienda

**Shopify**
1. En Configuración → Apps y canales de venta → Desarrollar apps, crea una app.
2. Dale los permisos `read_orders`, `read_products`, `read_merchant_managed_fulfillment_orders` y `write_merchant_managed_fulfillment_orders`. Activa también el acceso a datos protegidos del cliente, que hace falta para leer la dirección.
3. Instala la app y copia el token `shpat_…`.
4. En Configuración → Notificaciones → Webhooks, copia la clave de firma y crea los webhooks de pedido (JSON) apuntando a `/api/webhooks/shopify`.
5. En Packia, ve a Tiendas → Conectar tienda.

**WooCommerce**
1. En WooCommerce → Ajustes → Avanzado → REST API, crea una clave con permisos de lectura y escritura.
2. En Packia, ve a Tiendas → Conectar tienda, con la URL `https://…` y las claves `ck_…` / `cs_…`.
3. Copia la URL y el secreto que muestra la ficha de la tienda y crea los webhooks *Pedido creado* y *Pedido actualizado*.

## Stack

Next.js 15 (App Router, Server Actions, middleware) · React 19 · TypeScript · Tailwind CSS 4 · Prisma + PostgreSQL (Supabase) · Supabase Auth · pdf-lib + bwip-js (etiquetas).

## Próximos pasos

- [ ] Registrar los webhooks automáticamente al conectar la tienda.
- [ ] Escaneo de códigos de barras desde el móvil en picking y recepción.
- [ ] Domiciliación SEPA automática de las facturas (Stripe o GoCardless).
- [ ] Avisos por email al cliente: stock bajo, recepción confirmada, factura emitida.
- [ ] Recogida diaria de la agencia y manifiesto de salida.
