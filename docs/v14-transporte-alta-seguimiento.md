# v14: transporte, alta en un clic y seguimiento con marca

Guía paso a paso para poner en marcha las tres novedades de la versión 14.

---

## 1. Transporte: varias agencias y elección automática

**Dónde:** menú **Transporte** (solo administradores).

1. Pulsa **Cargar servicios de ejemplo**. Aparecen GLS, Correos Express, SEUR y CTT con tarifas de ejemplo.
2. En cada servicio, pon **tus precios reales** (lo que te cobra la agencia) por zona y tramo de peso. Si una casilla queda vacía, ese servicio no cubre esa zona o ese peso.
   - Zonas: Península, Baleares, Canarias, Ceuta y Melilla, Portugal y Europa.
   - Tramos de peso: hasta 1, 2, 5, 10, 15, 20 y 30 kg.
3. En **Método de etiqueta**, elige con qué se hace la etiqueta: `packia:GLS` (etiqueta interna) o `sendcloud:ID` (un método de tu Sendcloud).
4. Pon el **margen general por envío**, por ejemplo 0,40 €. Es lo que ganas por encima del coste.
5. En la ficha de cada cliente (**Envíos**) elige cómo se decide la agencia:
   - **La de por defecto:** la suya, si tiene tarifa para ese envío.
   - **La más barata:** la de menor coste para cada pedido.
   - **La más rápida:** la que tarda menos días.

   Ahí también puedes ponerle un margen distinto al general.

**Qué pasa después:**
- Al embalar, el recuadro **Agencia recomendada** muestra la elegida y ya viene seleccionada.
- Al enviar, el pedido guarda el **coste** y lo que se **cobra**. En la ficha del pedido, el administrador ve coste, cobro y margen; el cliente solo ve lo que se le cobra.
- En la factura del mes aparece una línea por agencia, por ejemplo «Transporte GLS (124 envíos)».

> Si no cargas tarifas, todo funciona como antes: no se cobra transporte en la factura.

---

## 2. Alta de clientes sin trabajo para ti

### Invitar a una tienda
1. Ve a **Clientes** → recuadro **Invitar tienda**.
2. Rellena el nombre y el email (opcionales), el plan y las semanas de prueba.
3. Pulsa **Crear enlace de alta** → **Copiar** y envíaselo por WhatsApp o por email.
4. La tienda abre el enlace, crea su cuenta y llega a **Primeros pasos**:
   1. Conectar su tienda.
   2. Catálogo importado.
   3. Avisar del envío de stock (ve la dirección del almacén).
   4. Su marca para los compradores.
   5. Primer pedido enviado.

Cada enlace es de un solo uso y caduca a los 14 días. Si pusiste un email, solo sirve para ese email.

**Alta abierta** (opcional): en el mismo recuadro, marca «Alta abierta» y cualquiera podrá registrarse en `https://TU-APP/alta`. Se puede poner ese enlace en la web y en la landing.

### WooCommerce en un clic (no hay que configurar nada)
La tienda escribe su dirección, pulsa **Conectar con WooCommerce**, entra en su WordPress y pulsa **Aprobar**. WooCommerce nos envía las claves, que se guardan cifradas, y Kargia crea los webhooks e importa el catálogo y los pedidos.

> Solo funciona con la app en **https**. La URL de Hostinger ya lo es.

### Shopify en un clic (hay que crear una app una vez)
Sin esto, la tienda ve «Te la conectamos nosotros» y se conecta como hasta ahora (`docs/conectar-shopify.md`).

1. Entra en <https://partners.shopify.com>, crea una cuenta de Partner (gratis) y luego **Apps → Crear app → Crear app manualmente**. Nombre: «Kargia».
2. En la configuración de la app:
   - **App URL:** `https://TU-APP/bienvenida`
   - **Allowed redirection URL(s):** `https://TU-APP/api/shopify/callback`
3. En **Distribución**, elige **Distribución personalizada** si vas a conectar pocas tiendas, o **Pública** si quieres que cualquiera la instale. Con la personalizada, Shopify te pide el dominio de cada tienda.
4. Copia el **Client ID** y el **Client secret** de la app.
5. En Hostinger → tu web → **Variables de entorno**, añade:
   - `SHOPIFY_API_KEY` = Client ID
   - `SHOPIFY_API_SECRET` = Client secret

   Pulsa **Redeploy**.
6. A partir de ahí, la tienda escribe `mitienda.myshopify.com` → **Conectar con Shopify** → **Instalar**, y vuelve conectada.

---

## 3. Seguimiento con la marca de cada tienda

### Lo que hace la tienda (o tú, desde su ficha → «Marca para sus compradores»)
En **Mi marca**:
1. Activa el seguimiento con su marca.
2. Pone su nombre, logo, color, email de atención al cliente y un mensaje opcional (por ejemplo, un código de descuento).
3. Elige quién avisa al comprador:
   - **Su tienda:** Shopify o WooCommerce envían su email de siempre, pero el enlace de seguimiento lleva a la página con su marca.
   - **Vosotros:** enviamos los emails con su marca (recibido, preparado, enviado y entregado, a elegir) y la tienda deja de enviar el suyo de «enviado».

La página de seguimiento (`/seguimiento/…`) es pública, no muestra la dirección completa (solo la ciudad) y funciona bien en el móvil.

### Para que salgan los emails: buzón SMTP (una vez)
1. En Hostinger → **Emails**, crea un buzón, por ejemplo `envios@kargia.eu`.
2. En las variables de entorno de la web, añade:
   - `SMTP_HOST` = `smtp.hostinger.com`
   - `SMTP_PORT` = `465`
   - `SMTP_USER` = `envios@kargia.eu`
   - `SMTP_PASS` = la contraseña de ese buzón
   - `SMTP_FROM` = `envios@kargia.eu`

   Pulsa **Redeploy**.
3. Desde **Mi marca**, pulsa **Enviarme un email de prueba**.

El remitente sale con el nombre de la tienda, por ejemplo «Velas Nube <envios@kargia.eu>». Las respuestas del comprador le llegan a la tienda.

> Mientras no haya SMTP, la página de seguimiento funciona igualmente y los avisos quedan registrados como «omitidos».

### «Entregado» automático con Sendcloud
En Sendcloud → **Settings → Integrations →** tu integración API → **Webhook URL**: `https://TU-APP/api/webhooks/sendcloud`, y activa **Webhook feedback**. Kargia comprueba la firma con tu clave secreta.

Con las etiquetas internas, el almacén pulsa **Marcar como entregado** en la ficha del pedido.
