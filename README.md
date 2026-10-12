# Packia

Software de logística (fulfillment) de Packia: recibe los pedidos de las tiendas **Shopify** y **WooCommerce** de nuestros clientes, organiza la preparación en el almacén y devuelve el número de seguimiento a la tienda.

Documentación de negocio en [`docs/`](docs/): [cliente ideal](docs/cliente-ideal.md) y [estrategia de 0 a 10.000 €/mes](docs/estrategia-0-a-10k.md).

## Qué hace

| Pantalla | Para qué |
| --- | --- |
| **Panel** | Pedidos en cola, enviados hoy, % a tiempo, pedidos de los últimos 14 días, uso del plan de cada cliente y stock bajo. Cuenta atrás hasta la hora de corte (14:00). |
| **Pedidos** | Cola por estados: Pendiente → Preparando → Embalado → Enviado. Búsqueda por número, cliente, destinatario, SKU o seguimiento. |
| **Ficha de pedido** | Lista de picking ordenada por ubicación, avisos de stock insuficiente, dirección de envío y formulario de envío (agencia + seguimiento). |
| **Inventario** | Referencias por cliente, stock físico, ubicación y mínimo. El stock se descuenta solo al enviar. |
| **Clientes** | Marcas, su plan (300 / 600 / 1.000 pedidos) y el uso de este mes. |
| **Tiendas** | Conectar Shopify o WooCommerce, sincronizar y ver las URLs de webhooks. |

### Integraciones

- **Shopify** (app personalizada, Admin GraphQL API):
  - Importa los pedidos abiertos sin preparar y las variantes con SKU.
  - Al enviar, crea el *fulfillment* con el seguimiento y Shopify avisa al cliente final.
  - Webhooks `orders/*` verificados con HMAC (`X-Shopify-Hmac-Sha256`).
- **WooCommerce** (REST API v3):
  - Importa los pedidos en estado `processing` y los productos, incluidas sus variaciones.
  - Al enviar, pasa el pedido a `completed` y añade una nota para el cliente con el seguimiento.
  - Webhooks `order.created` y `order.updated` verificados con `X-WC-Webhook-Signature`.

Los pedidos ya importados no se sobrescriben, porque su estado lo lleva el almacén. Solo se marcan como cancelados si la tienda los cancela antes de enviarse.

## Arrancar en local

Requisitos: Node 20 o superior.

```bash
cp .env.example .env
npm install          # también genera el cliente de Prisma
npm run db:push      # crea la base de datos SQLite
npm run db:seed      # datos de demostración: 3 clientes, catálogo y ~3 semanas de pedidos
npm run dev          # http://localhost:3000
```

Las tiendas de demostración están marcadas como *demo* y no llaman a ninguna API externa.

Para probar webhooks reales en local hace falta una URL pública, por ejemplo con un túnel (`cloudflared` o `ngrok`). Pon esa URL en `NEXT_PUBLIC_APP_URL`.

## Conectar una tienda real

**Shopify**
1. En Configuración → Apps y canales de venta → Desarrollar apps, crea una app.
2. Dale los permisos `read_orders`, `read_products`, `read_merchant_managed_fulfillment_orders` y `write_merchant_managed_fulfillment_orders`.
3. Instala la app y copia el token `shpat_…`.
4. En Configuración → Notificaciones → Webhooks, copia la clave de firma y crea los webhooks de pedido (JSON) apuntando a `/api/webhooks/shopify`.
5. En Packia, ve a Tiendas → Conectar tienda.

> Para leer la dirección de envío, Shopify exige acceso a datos protegidos del cliente: actívalo en la configuración de la app.

**WooCommerce**
1. En WooCommerce → Ajustes → Avanzado → REST API, crea una clave con permisos de lectura y escritura.
2. En Packia, ve a Tiendas → Conectar tienda, con la URL `https://…` y las claves `ck_…` / `cs_…`.
3. Copia la URL y el secreto que muestra la ficha de la tienda y crea los webhooks *Pedido creado* y *Pedido actualizado*.

## Stack

Next.js 15 (App Router, Server Actions) · React 19 · TypeScript · Tailwind CSS 4 · Prisma + SQLite.

Para producción: cambiar el `provider` de Prisma a `postgresql` y apuntar `DATABASE_URL` a la base de datos.

## Próximos pasos

- [ ] **Login y roles**: equipo del almacén y acceso de cada cliente solo a su panel. La app todavía no tiene autenticación, así que no debe publicarse en internet tal cual.
- [ ] Cifrar las credenciales de las tiendas en la base de datos.
- [ ] Generar las etiquetas de envío con la agencia o con una plataforma de agencias (Sendcloud, Packlink PRO).
- [ ] Recepciones de mercancía y gestión de devoluciones.
- [ ] Registrar los webhooks automáticamente al conectar la tienda.
- [ ] Facturación mensual: cuota más pedidos de exceso.
- [ ] Escaneo de códigos de barras desde el móvil en el picking.
