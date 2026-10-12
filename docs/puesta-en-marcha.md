# Puesta en marcha: Supabase + Hostinger

Guía paso a paso para tener Packia online en tu dominio. Tiempo estimado: unos 30 minutos.

**Qué vas a hacer**

1. Crear el proyecto en **Supabase** (base de datos y login). Es gratis para empezar.
2. Subir la app a **Hostinger** como *Node.js Web App*.
3. Abrir tu dominio y completar el **asistente de configuración** (`/setup`): crea las tablas y tu usuario administrador con un par de clics.
4. Rellenar **Ajustes** dentro de la app.

> **Requisito de Hostinger:** las apps Node.js (Next.js) solo funcionan en los planes **Business** o **Cloud** (Startup, Professional, Enterprise…). Los planes *Single* y *Premium* no sirven: tendrías que subir de plan o usar un VPS (ver el final).

---

## 1. Supabase (≈10 min)

### 1.1 Crear el proyecto
1. Entra en [supabase.com](https://supabase.com) → **Start your project** → regístrate (con GitHub o email).
2. **New project**:
   - **Name:** `packia`
   - **Database Password:** pulsa *Generate a password* y **guárdala**, que la necesitarás.
   - **Region:** *Central EU (Frankfurt)* o *West EU (Ireland)*.
   - Plan **Free** para empezar.
3. Espera a que el proyecto termine de crearse (1–2 minutos).

### 1.2 Copiar las claves
Abre un bloc de notas y ve pegando estos valores:

| Variable | Dónde está en Supabase |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | **Project Settings → Data API → Project URL** (`https://xxxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Project Settings → API Keys** → clave `anon` / *publishable* |
| `SUPABASE_SERVICE_ROLE_KEY` | **Project Settings → API Keys** → clave `service_role` / *secret*. **No la compartas nunca.** |
| `DATABASE_URL` | Botón **Connect** (arriba) → pestaña **ORMs** → **Prisma** → línea `DATABASE_URL` |
| `DIRECT_URL` | Mismo sitio → línea `DIRECT_URL` |

- En `DATABASE_URL` y `DIRECT_URL`, sustituye `[YOUR-PASSWORD]` por la contraseña del paso 1.1.
- Si Supabase te enseña claves nuevas (*publishable* / *secret*) y además una pestaña **Legacy API keys**, lo más seguro es usar las de *Legacy* (`anon` y `service_role`).

### 1.3 Seguridad del login
1. **Authentication → Sign In / Providers**: desactiva **Allow new users to sign up**. En Packia los usuarios los da de alta un administrador desde la app.
2. **Authentication → URL Configuration** (hazlo cuando sepas tu dominio, paso 2):
   - **Site URL:** `https://tu-dominio.com`
   - **Redirect URLs:** añade `https://tu-dominio.com/auth/callback`

### 1.4 Emails de recuperación de contraseña (recomendado)
El servidor de email gratuito de Supabase envía muy pocos correos por hora. Usa el email de tu dominio de Hostinger:
- **Authentication → Emails → SMTP Settings** → *Enable custom SMTP*
  - Host: `smtp.hostinger.com` · Puerto: `465`
  - Usuario y contraseña: los de un buzón de Hostinger, por ejemplo `no-reply@tu-dominio.com`
  - Sender email: ese mismo buzón · Sender name: `Packia`

> **Las tablas no se crean aquí.** Las crea la app en el paso 3 con un botón. Si lo prefieres, puedes pegar el archivo `supabase/setup.sql` en **SQL Editor → New query → Run**.

---

## 2. Hostinger (≈10 min)

### 2.1 Preparar las variables de entorno
Copia `.env.example` en un archivo nuevo llamado `.env` y rellena las 6 variables obligatorias con lo que copiaste de Supabase.
- `ENCRYPTION_KEY`: puedes dejarla vacía de momento. El asistente te genera una en el paso 3 y la añades después.
- `NEXT_PUBLIC_APP_URL`: pon `https://tu-dominio.com`.

### 2.2 Crear la app
1. En **hPanel** → **Websites** → **Add website** → **Node.js Web App**.
2. Elige cómo subir el código:
   - **Upload files**: sube `packia.zip` (ya viene sin `node_modules` ni `.env`).
   - o **GitHub**: conecta el repositorio y la rama. Cada `git push` vuelve a desplegar solo.
3. Revisa la configuración que Hostinger detecta:
   - **Framework:** Next.js
   - **Node.js version:** **22.x** (vale 20.x o superior)
   - **Root directory:** `/` (donde está `package.json`)
   - **Build command:** `npm run build`
   - **Start command:** `npm start` (o *entry file* que proponga para Next.js)
4. **Environment variables**: añádelas una a una o **importa el archivo `.env`**.
5. Elige tu **dominio** (o subdominio, por ejemplo `app.tu-dominio.com`) y pulsa **Deploy**.

Hostinger instala las dependencias, compila la app y la arranca. Tarda unos minutos.

> Si el dominio ya tiene una web en tu plan, Hostinger te pedirá quitarla primero o usar un subdominio. Recomendado: `app.tu-dominio.com`.

### 2.3 Cada vez que cambies una variable
Las variables que empiezan por `NEXT_PUBLIC_` se integran en la app al compilar. Si cambias alguna, haz **Redeploy** en hPanel.

---

## 3. Asistente de configuración (≈2 min)

Abre `https://tu-dominio.com`. Mientras falte algo, Packia te lleva solo a **/setup**:

1. **Variables de entorno**: te dice cuáles faltan y dónde están en Supabase. Si falta `ENCRYPTION_KEY`, te muestra una generada:
   - cópiala,
   - **guárdala en un lugar seguro** (sin ella no se pueden leer las claves de las tiendas),
   - añádela en hPanel y haz **Redeploy**.
2. **Conexión con Supabase**: comprueba la base de datos y el login. Si falla, casi siempre es la contraseña dentro de `DATABASE_URL` o haber cambiado `anon` por `service_role`.
3. **Crear las tablas**: botón **Crear tablas en Supabase**. Crea todo y activa la seguridad RLS.
4. **Primer administrador**: tu nombre, email y contraseña. Entras directamente.

Cuando existe el administrador, `/setup` queda bloqueado.

## 4. Dentro de la app

1. **Ajustes**:
   - datos fiscales (para las facturas),
   - dirección del almacén (para las etiquetas),
   - claves de **Sendcloud** (botón *Probar conexión*).
2. **Clientes**: crea cada cliente y ajusta su plan y sus tarifas.
3. **Tiendas**: conecta su Shopify o WooCommerce.
   - **Shopify:** envía a tu cliente la guía [conectar-shopify.md](conectar-shopify.md). Te pasará el dominio `.myshopify.com`, el Client ID y el Client secret. Los webhooks se crean solos.
   - **WooCommerce:** crea los webhooks con la URL y el secreto que te muestra la ficha de la tienda.
4. **Usuarios**: da acceso a tu equipo (rol *Almacén*) y a tus clientes (rol *Cliente*).

---

## Actualizar Packia más adelante
1. Sube la versión nueva:
   - **Con GitHub:** haz `git push` y Hostinger vuelve a desplegar.
   - **Con ZIP:** en hPanel → tu Node.js Web App → sube el ZIP nuevo → **Redeploy**. Las variables de entorno se mantienen.
2. Entra en Packia como administrador. Si la versión trae cambios de base de datos, verás **«Actualización pendiente»**. Pulsa **Actualizar ahora**. Tus datos se mantienen y la app se abre sola al terminar.

## Problemas frecuentes

| Síntoma | Solución |
| --- | --- |
| La web se queda en `/setup` diciendo que faltan variables | Revisa que estén en hPanel y haz **Redeploy**. |
| «Base de datos: error de autenticación» | Contraseña incorrecta en `DATABASE_URL` / `DIRECT_URL`. En Supabase: *Project Settings → Database → Reset database password*. |
| «Supabase Auth: Invalid API key» | La `SUPABASE_SERVICE_ROLE_KEY` es la `anon` por error, o tiene espacios. |
| El enlace de «olvidé mi contraseña» no funciona | Falta `https://tu-dominio.com/auth/callback` en *Redirect URLs* (paso 1.3). |
| No llegan los emails | Configura el SMTP de Hostinger (paso 1.4). |
| Error al compilar en Hostinger | Comprueba que la versión de Node.js sea 20.x o superior y que las 6 variables estén puestas *antes* del deploy. |

## Alternativas si tu plan de Hostinger no tiene Node.js
- **Subir a Business o Cloud** en hPanel. Es lo más sencillo.
- **VPS de Hostinger** (KVM 1 o superior):
  1. Instala Node 22.
  2. Sube el código y crea el `.env`.
  3. Ejecuta `npm install && npm run build && npm start` y mantenlo en marcha con `pm2`.
  4. Pon Nginx delante para el dominio y el HTTPS.
- **Vercel** (gratis para empezar): importa el repositorio de GitHub, añade las mismas variables y apunta tu dominio de Hostinger a Vercel desde la zona DNS.
