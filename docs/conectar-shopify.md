# Conectar tu tienda Shopify con Packia

*Guía para enviar a cada cliente. Son unos 5 minutos y lo hace **el dueño de la tienda**.*

> Desde enero de 2026, Shopify solo permite crear apps nuevas desde el **Dev Dashboard**. Ya no se usa el antiguo token `shpat_`.

## 1. Crear la app «Packia» en tu Shopify
1. Entra en el admin de tu tienda → **Configuración** (abajo a la izquierda) → **Apps** → **Desarrollar apps**.
2. Pulsa **Build apps in Dev Dashboard** (*Crear apps en Dev Dashboard*).
3. Pulsa **Create app**, ponle de nombre `Packia` y pulsa **Create**.

## 2. Darle permisos y publicar la versión
En la pantalla de la versión de la app:
1. **App URL**: deja la que viene por defecto (`https://shopify.dev/apps/default-app-home`). **No pongas la dirección de Packia**: dentro del admin de Shopify no se puede iniciar sesión. Packia se usa siempre desde su propia dirección.
2. **Access → Scopes**: añade estos cuatro permisos:
   ```
   read_orders, read_products, read_merchant_managed_fulfillment_orders, write_merchant_managed_fulfillment_orders
   ```
3. Pulsa **Release** y luego otra vez **Release** para confirmar.

## 3. Instalar la app en tu tienda
1. En la app, ve a **Installs** → **Install app**.
2. Elige tu tienda → **Install**.

## 4. Enviar a Packia 3 datos
| Dato | Dónde está |
|---|---|
| **Dominio** | Admin de Shopify → **Configuración → Dominios** → el que termina en **`.myshopify.com`** (no tu dominio propio ni tu email) |
| **Client ID** | Dev Dashboard → tu app **Packia** → **Settings** |
| **Client secret** | En el mismo sitio, debajo del Client ID |

> 🔒 Envía el **Client secret** por un canal privado, nunca por un grupo ni por email sin cifrar. Si se filtra, puedes generar uno nuevo desde el mismo Settings: el anterior deja de funcionar y hay que pasarle el nuevo a Packia.

## Tu acceso a Packia
Packia te enviará tu email de acceso y una contraseña temporal. Entra siempre desde la **dirección de Packia** en una pestaña normal del navegador, no desde el menú de Apps de Shopify.

## Ya está
Packia prueba la conexión, importa tus productos y pedidos pendientes y crea solo los avisos (webhooks) para recibir cada pedido nuevo al instante. Cuando preparemos un pedido, tu cliente recibirá el email de Shopify con el número de seguimiento.

### ¿Problemas?
| Mensaje | Qué hacer |
|---|---|
| «Client ID o Client secret incorrectos, o la app no está instalada» | Revisa el paso 3 y copia otra vez los dos datos. |
| «Shopify no permite el acceso…» | La app tiene que crearla el **dueño** de la tienda desde su propio admin (paso 1), no una agencia desde otra cuenta. |
| Los pedidos llegan sin nombre o dirección | En el Dev Dashboard, en la app, activa el acceso a **Protected customer data** (nombre, dirección, teléfono y email) y vuelve a pulsar **Release**. |

---

### Apps creadas antes de 2026
Si ya tenías una app creada en **Desarrollar apps** antes de 2026, sigue funcionando:
1. En Packia elige **App antigua (token shpat_)**.
2. Pega el **token de acceso de la Admin API** (`shpat_…`) y la **clave secreta de la API**.
