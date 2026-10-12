# Packia en GoHighLevel: web y landing para Meta Ads

En esta carpeta hay 3 páginas listas para pegar en GoHighLevel (GHL):

| Archivo | Para qué | Dónde va en GHL |
|---|---|---|
| `web-packia.html` | Web de la empresa: qué hacemos, cómo funciona, qué incluye, precios, preguntas y contacto. | **Website** «Packia · Web» |
| `landing-meta-ads.html` | Landing para el tráfico de los anuncios de Meta. Sin menú, un solo objetivo: pedir propuesta. | **Funnel** «Packia · Meta Ads», paso 1 |
| `gracias.html` | Página que se ve después de enviar el formulario. Lanza el evento **Lead** del píxel de Meta. | **Funnel** «Packia · Meta Ads», paso 2 |

Para ver cómo quedan, abre cada archivo en el navegador (doble clic).

> **Cambia antes de pegar** (con «Buscar y reemplazar» de cualquier editor de texto, en los 3 archivos):
> - `34600000000` → tu WhatsApp con prefijo y sin `+` ni espacios. Ejemplo: `34612345678`.
> - `hola@packia.es` → tu email.
> - `https://floralwhite-dugong-101545.hostingersite.com` → la dirección de tu Packia, si cambias de dominio.

### Marca y precios conectados con la app
**Cómo se conecta, si GHL no tiene API con la app:** no hace falta. El HTML que pegas en GHL lleva un pequeño script. Cada vez que alguien abre la web, su navegador pide a tu app (`https://tu-app/api/public/planes`) el nombre, el logo y los precios, y los pone en la página. Es como cuando una web enseña el tiempo de otra página.
- Esa dirección es pública a propósito: solo da nombre, eslogan, logo y precios. Nunca datos de clientes ni pedidos.
- Si cambias algo en **Ajustes → Marca** o **Ajustes → Planes y precios**, la web lo muestra en unos minutos, sin tocar GoHighLevel.
- Si la app no responde, la web enseña lo que lleva escrito el HTML («Packia» y los precios de serie).
- Lo que el script no puede cambiar: el **nombre de la página y del dominio en GHL** y el **texto de los anuncios de Meta**. Eso se cambia a mano.

Los archivos fuente están en `src/`. Para regenerar las páginas: `python3 marketing/gohighlevel/src/build.py marketing/gohighlevel/src marketing/gohighlevel`.

---

## 1. Crear la carpeta Packia
1. Entra en GHL y abre la **subcuenta** de Packia.
2. Menú de la izquierda → **Sites**.
3. En **Funnels**, pulsa **Create folder** (Nueva carpeta) → nombre **Packia** → **Save**.
4. Haz lo mismo en **Websites**: carpeta **Packia**.

## 2. Crear la web
1. **Sites → Websites → carpeta Packia → + New Website → From blank**. Nombre: **Packia · Web**.
2. Pulsa **+ Add new page** → nombre **Inicio**, ruta `/` → **Edit**.
3. En el editor:
   1. Añade una **sección** → en sus ajustes elige **Full width** y pon el **padding a 0** (arriba, abajo y a los lados).
   2. Dentro, una **fila de 1 columna**, también con padding 0.
   3. Pulsa **+ Add element** → **Custom JS/HTML** (Código). Arrástralo a la columna.
   4. Haz clic en el elemento → **Open code editor**.
   5. Abre `web-packia.html` con el Bloc de notas, copia **todo lo que hay entre** `▼▼▼ COPIAR DESDE AQUÍ` y `▲▲▲ COPIAR HASTA AQUÍ` y pégalo.
   6. **Save** y luego **Preview** para comprobarlo en ordenador y móvil.
4. **Ajustes de la página** (engranaje): **Title** «Packia · Logística para tiendas online» y la descripción del archivo (`<meta name="description">`).

## 3. Crear el formulario de cualificación
1. **Sites → Forms → Builder → + Add form → Blank form**. Nombre: **Solicitud Packia**.
2. Campos (en este orden):
   1. Nombre *(obligatorio)*
   2. Teléfono / WhatsApp *(obligatorio)*
   3. Email *(obligatorio)*
   4. Nombre y web de la tienda *(texto)*
   5. Plataforma *(desplegable)*: Shopify / WooCommerce / Otra
   6. Pedidos al mes *(desplegable)*: Menos de 150 / 150–300 / 300–600 / 600–1.000 / Más de 1.000
   7. ¿Quién prepara hoy los pedidos? *(desplegable)*: Yo / Un empleado / Otro operador logístico
   8. ¿Cuál es tu principal problema hoy? *(texto largo, opcional)*
   9. Casilla de aceptación de la política de privacidad *(obligatoria)*
3. Botón: **«Quiero mi propuesta»**. Color `#3a52f0`, bordes redondeados.
4. **Options → On submit → Open URL** → la dirección de la página de gracias (paso 4, la copias cuando la tengas).
5. **Save** → **Integrate** → copia el **Embed code**.

## 4. Crear el funnel de Meta Ads (landing + gracias)
1. **Sites → Funnels → carpeta Packia → + New Funnel → From blank**. Nombre: **Packia · Meta Ads**.
2. **Paso 1:** **+ Add new step** → nombre **Landing**, ruta `/propuesta` → **Edit**.
   1. Igual que en la web: sección full width sin padding → elemento **Custom JS/HTML** → pega el contenido de `landing-meta-ads.html` entre las marcas.
   2. Dentro de lo que has pegado, busca `FORMULARIO DE GOHIGHLEVEL`. Borra desde esa línea hasta `FIN DEL FORMULARIO` y pega en su lugar el **Embed code** del formulario (paso 3).
   3. Haz lo mismo en la web (`web-packia.html`, sección Contacto) para que también recoja contactos.
   > Si aún no tienes el formulario, puedes publicar igualmente: en su lugar sale un botón de WhatsApp.
3. **Paso 2:** **+ Add new step** → nombre **Gracias**, ruta `/gracias` → pega `gracias.html` de la misma forma.
4. Copia la URL del paso Gracias y ponla en el formulario (**On submit → Open URL**, paso 3.4).

## 5. Dominio
**Settings → Domains → + Add domain**, por ejemplo `packia.es` para la web y `go.packia.es` para el funnel. Sigue las instrucciones de DNS que da GHL y, después, en cada Website o Funnel → **Settings → Domain** elige el dominio.

## 6. Píxel de Meta
1. En el **Administrador de eventos** de Meta, copia el **código base del píxel**.
2. En GHL: **Funnel Packia · Meta Ads → Settings → Head tracking code** → pega el código base. Haz lo mismo en el Website.
3. La página **Gracias** ya lanza el evento **Lead** sola (`fbq('track','Lead')`).
4. Comprueba con la extensión **Meta Pixel Helper**: debe aparecer *PageView* en la landing y *Lead* en gracias.
5. En Meta, verifica el dominio y configura el evento **Lead** como prioritario.

## 7. Automatización recomendada (Automation → Workflows)
**Disparador:** *Form submitted* = Solicitud Packia.

1. **If/Else** por «Pedidos al mes»:
   - **300 o más:** etiqueta `lead-prioritario` → oportunidad en el pipeline **Ventas Packia** (etapa *Nuevo*) → **notificación interna** a tu móvil → WhatsApp/SMS al momento:
     > Hola {{contact.first_name}}, soy [tu nombre] de Packia. He recibido tu solicitud para {{contact.company_name}}. ¿Te viene bien una llamada de 15 minutos hoy o mañana?
   - **150–300:** etiqueta `lead-valorar` → mismo mensaje, prioridad normal.
   - **Menos de 150:** etiqueta `lead-futuro` → email amable con la guía «Cómo preparar tu tienda para escalar» y seguimiento a los 90 días.
2. **Espera 1 día sin respuesta** → segundo mensaje: «¿Te viene mejor que te escriba por aquí o prefieres llamada?».

**Pipeline «Ventas Packia»:** Nuevo → Contactado → Llamada hecha → Propuesta enviada → Cliente / Perdido.

## 8. Campaña en Meta (para empezar)
- **Objetivo:** Clientes potenciales → conversiones en el sitio web → evento **Lead**.
- **URL del anuncio:** `https://go.tudominio/propuesta?utm_source=meta&utm_medium=paid&utm_campaign=lanzamiento`
- **Público:** España, 25–55 años, intereses Shopify, WooCommerce, comercio electrónico y emprendimiento, y dueños de pequeñas empresas.
- **Presupuesto:** 10–20 €/día para empezar. Revisa a los 7 días el **coste por lead** (objetivo: 10–30 €) y cuántos superan los 300 pedidos/mes.
- **Creatividades:** vídeo real del almacén y del packing, «tu salón lleno de cajas», comparativa de lo que cuesta hacerlo tú frente a la cuota fija, y una pantalla del panel de Packia (usa el **modo demo**).

## Notas
- Los precios salen de los planes de la app (Ajustes). Por defecto: Arranque 480 €, Crecimiento 850 € y Escala 1.200 €, con 2 semanas de prueba.
- No hay testimonios inventados. Cuando tengas los primeros clientes, añade sus opiniones y cifras reales: es lo que más convierte.
- Todo el estilo va dentro de la clase `.pk`, así no se mezcla con los estilos de GHL.
