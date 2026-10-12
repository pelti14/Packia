# Packia

Software de logística (fulfillment) de Packia. Recibe los pedidos de las tiendas **Shopify** y **WooCommerce** de nuestros clientes, organiza el almacén (recepción, salida y devoluciones), crea las etiquetas de envío y factura a cada cliente su cuota mensual.

Documentación de negocio en [`docs/`](docs/): [cliente ideal](docs/cliente-ideal.md) y [estrategia de 0 a 10.000 €/mes](docs/estrategia-0-a-10k.md).

## Qué hace

| Sección | Para qué |
| --- | --- |
| **Panel** | Pedidos que tienen que salir hoy, retrasados, enviados hoy, % a tiempo, pedidos de los últimos 14 días, cuota de pedidos de cada cliente, recepciones previstas y stock bajo. |
| **Salida** | Tarjetas grandes por cliente (de 3 en 3) para seleccionar uno, varios o todos y entrar en el **modo preparación**: pedido a pedido, de más urgente a menos, marcando productos, embalando y creando la etiqueta con el repartidor por defecto del cliente. Debajo, la lista completa con pestañas (*Para hoy · Retrasados · Sin preparar · Preparando · Listos para etiqueta · Enviados*), avance o **vuelta a pendiente** en bloque e impresión de etiquetas en un solo PDF. Corte a las 14:00 en días laborables (hora de Madrid). |
| **Ficha de pedido** | Lista de picking por ubicación que se marca producto a producto al cogerlo o **escaneando el código de barras** (o el SKU): si el producto no es del pedido, avisa en rojo con un pitido. Las marcas se recuerdan en el navegador. **Crear etiqueta y enviar** (Sendcloud o etiqueta interna Packia) o registrar un seguimiento hecho fuera. El seguimiento se devuelve a la tienda. |
| **Recepción** | Avisos de entrada de mercancía (los puede crear el cliente). Al llegar se cuentan las unidades recibidas y dañadas, y se asigna ubicación. El stock sube solo. |
| **Devoluciones** | Se registran sobre un pedido enviado y siguen el flujo *Anunciada → Recibida → Procesada*. Al procesar, lo vendible vuelve al stock y lo dañado se aparta. |
| **Inventario** | Stock, ubicación, código de barras, mínimo y peso por referencia, con buscador. Pestaña **Por validar**: cada producto nuevo que llega de la tienda necesita el **OK del equipo** (se comprueba en la mano, se escanea el código y se pone ubicación). Hasta entonces, los pedidos que lo llevan **no se pueden embalar ni etiquetar**. El menú lo marca en rojo si hay pedidos bloqueados. |
| **Modo demo** | `/demo`, solo para administradores y almacén. Una tienda ficticia (Lumen Cosmetics) para enseñar Packia a un cliente potencial: vista del almacén y vista del cliente, simular pedidos, validar un producto, escanear, embalar, etiqueta PDF de ejemplo, recepciones, devoluciones y una factura con prueba y prorrateo. No escribe nada en la base de datos; **Reiniciar demo** la deja como al principio. |
| **Clientes tienda** | Los compradores de cada tienda, guardados solos con cada pedido. Búsqueda y **exportación a CSV** (Excel). |
| **Notificaciones** | Campana con avisos que saltan al momento: pedidos nuevos, cancelados por la tienda, mercancía avisada o recibida, devoluciones, stock bajo, facturas y errores de sincronización. El menú muestra contadores **verdes** (tareas pendientes) o **rojos** (urgente: retrasos, errores). |
| **Facturación** | Uso del mes por cliente: pedidos enviados frente a los incluidos, exceso y devoluciones. Desplegable para ir a cualquier mes (36 atrás). **Semanas de prueba gratis** por cliente y **prorrateo** del primer mes de pago. Botón **«Emitir las N facturas»** del mes y **facturación automática** del mes anterior los días 1–5 (activable en Ajustes). **«Facturar hasta hoy»** (o hasta un día concreto) en cualquier momento del mes; al cerrar el mes solo se factura el resto. **Cambios de plan a mitad de mes** prorrateados por días: cuota y pedidos incluidos se reparten entre el plan anterior y el nuevo. Facturas PK-AAAA-0001 con IVA, imprimibles en PDF, y control de cobro. |
| **Mi plan** (cliente) | El cliente ve su plan y su consumo, **sube de plan** al momento (prorrateado), **baja de plan** desde el día 1 del mes siguiente o **solicita la baja**, que confirma un administrador. |
| **Clientes** | Cambio de plan aplicable desde hoy (prorrateado), desde el día 1 de este mes o del siguiente. Peticiones del cliente, baja con último día de servicio, historial de planes y facturar hasta un día. Plan y tarifas de cada cliente (cuota, pedidos incluidos, precio por pedido adicional y por devolución), datos fiscales, **repartidor por defecto** y, opcionalmente, **su propia cuenta de Sendcloud** con sus contratos de agencia. |
| **Sincronización** | Además de los webhooks, Packia consulta todas las tiendas **cada minuto** (productos cada 30 min). Respaldo opcional con cron externo en `/api/cron/sync?key=CRON_SECRET`. |
| **Tiendas** | Conexión con Shopify y WooCommerce, sincronización y webhooks. |
| **Usuarios** | Alta y edición de usuarios: nombre, email, rol, empresa y contraseña. |
| **Ajustes** | **Marca**: nombre comercial, texto bajo el nombre y logo, para toda la app, el acceso de los clientes, el título de la pestaña y la web de GoHighLevel. **Planes y precios** editables (opcionalmente aplicados a los clientes actuales desde hoy o desde el mes que viene; la web de GoHighLevel los lee de `/api/public/planes`). Datos fiscales, remitente de las etiquetas, claves de Sendcloud y estado del sistema (incluido el botón para actualizar la base de datos). |

### Roles

| Rol | Puede |
| --- | --- |
| **Administrador** | Todo, incluida facturación, clientes, tiendas y usuarios. |
| **Almacén** | Salida, recepción, devoluciones, inventario (y validar productos) y modo demo. Puede sincronizar tiendas. No ve facturación. |
| **Cliente** | Solo los datos de **su** empresa: pedidos, stock, recepciones (puede avisar de entradas), devoluciones (puede registrarlas), sus facturas y **Mi plan** (subir, bajar o pedir la baja). No ve Clientes tienda ni el modo demo. |

### Etiquetas de envío

- **Sendcloud** (recomendado): con las claves configuradas aparecen los métodos de envío de la cuenta (MRW, GLS, Correos Express, SEUR…). Packia crea el envío, recibe el número de seguimiento y descarga la **etiqueta oficial** de la agencia en A6.
- **Etiqueta Packia**: etiqueta interna de 10×15 cm con código de barras Code 128, remitente y destinatario. Sirve para pruebas o para agencias que acepten etiquetas propias. **No sustituye a la etiqueta oficial de la agencia.**

### Seguridad

- Login con **Supabase Auth**. Todas las páginas exigen sesión, menos `/login` y los webhooks. Cada acción del servidor comprueba el rol del usuario.
- Los usuarios con rol Cliente solo pueden consultar los datos de su empresa.
- Los tokens, Client secrets y claves de las tiendas y de Sendcloud se guardan **cifrados con AES-256-GCM** usando `ENCRYPTION_KEY`.
- El asistente `/setup` solo permite crear el primer administrador. Después queda bloqueado.
- **RLS activado** en todas las tablas: la API pública de Supabase, que funciona con la clave anónima, no puede leer ni escribir nada. La app accede por Prisma.
- Los webhooks se verifican con la firma HMAC de Shopify o WooCommerce.

## Puesta en marcha

👉 **Guía completa paso a paso: [docs/puesta-en-marcha.md](docs/puesta-en-marcha.md)** (Supabase + Hostinger).
📋 **Chuleta de variables de entorno: [docs/variables-de-entorno.md](docs/variables-de-entorno.md)**.

En resumen:
1. Crea un proyecto en Supabase y copia las **6 variables** de `.env.example`.
2. Sube la app a tu hosting: en Hostinger, *Node.js Web App*, plan Business o Cloud. Añade las variables y despliega.
3. Abre tu dominio. El **asistente `/setup`** comprueba la conexión, crea las tablas (con RLS) y tu usuario administrador.
4. En **Ajustes** rellena los datos fiscales, el remitente y las claves de Sendcloud. Se guardan en la base de datos, no en el hosting.

En local:
```bash
cp .env.example .env   # rellena las 6 variables
npm install
npm run dev            # abre http://localhost:3000 → /setup
```
Comandos útiles:
- `npm run db:migrate`: crea o actualiza las tablas desde la terminal (alternativa al botón de `/setup`).
- `npm run create-admin -- email "contraseña" "Nombre"`: crea un administrador desde la terminal.
- `npm run setup:sql`: regenera `supabase/setup.sql`.
- `npm run db:seed`: carga datos de demostración.

## Conectar una tienda

**Shopify**: desde 2026 la app la crea el dueño de la tienda en el *Dev Dashboard* y da a Packia el dominio `.myshopify.com`, el **Client ID** y el **Client secret**. Packia pide y renueva el token solo (dura 24 h) y crea los webhooks automáticamente.
Guía para enviar a los clientes: **[docs/conectar-shopify.md](docs/conectar-shopify.md)**. Las apps antiguas con token `shpat_` también se aceptan.

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
