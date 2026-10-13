# Chuleta: variables de entorno de Kargia

Dónde sacar cada variable, paso a paso, para cuando haya que volver a ponerlas: un hosting nuevo, otro servidor o un cambio de claves.

## Resumen

| # | Variable | ¿Obligatoria? | De dónde sale |
|---|---|---|---|
| 1 | `NEXT_PUBLIC_SUPABASE_URL` | Sí | Supabase → Project Settings → Data API |
| 2 | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sí | Supabase → Project Settings → API Keys |
| 3 | `SUPABASE_SERVICE_ROLE_KEY` | Sí | Supabase → Project Settings → API Keys |
| 4 | `DATABASE_URL` | Sí | Supabase → botón **Connect** → ORMs → Prisma |
| 5 | `DIRECT_URL` | Sí | Supabase → botón **Connect** → ORMs → Prisma |
| 6 | `ENCRYPTION_KEY` | Sí, pero se puede poner después del primer deploy | La genera la app en `/setup` |
| 7 | `NEXT_PUBLIC_APP_URL` | No | Tu dominio, por ejemplo `https://app.tudominio.com` |
| 8 | `SHOPIFY_API_KEY` y `SHOPIFY_API_SECRET` | No (para conectar Shopify en un clic) | Shopify Partners → tu app → Client ID y Client secret |
| 9 | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | No (para los emails al comprador) | Hostinger → Emails → tu buzón |

> **Regla de oro:** los valores se pegan **sin comillas** en Hostinger. Después de añadir o cambiar una variable, pulsa **Redeploy**.

---

## Antes de empezar
1. Entra en **[supabase.com](https://supabase.com)** → **Sign in**.
2. Abre el proyecto **packia**.
3. Ten a mano la **contraseña de la base de datos**. Si no la tienes, mira el apartado 4.

---

## 1. `NEXT_PUBLIC_SUPABASE_URL`
1. Abajo a la izquierda, pulsa el engranaje **Project Settings**.
2. Entra en **Data API**.
3. Copia la **Project URL**.

Ejemplo: `https://abcdxyz.supabase.co`

## 2. `NEXT_PUBLIC_SUPABASE_ANON_KEY` (clave pública)
1. Ve a **Project Settings → API Keys**.
2. Si hay una pestaña **Legacy API keys**, ábrela y copia la clave **`anon`** con la etiqueta `public`. Es larga y empieza por `eyJ...`.
3. Si solo hay claves nuevas, copia la **Publishable key**, que empieza por `sb_publishable_...`.

Esta clave no es secreta.

## 3. `SUPABASE_SERVICE_ROLE_KEY` (clave secreta)
1. En la misma pantalla, **Project Settings → API Keys**:
   - pestaña **Legacy API keys** → clave **`service_role`** con la etiqueta `secret` (pulsa *Reveal*), o
   - claves nuevas → **Secret key** (`sb_secret_...`), pulsando el ojo para verla.
2. Cópiala.

> ⚠️ **No la compartas nunca**, ni en capturas ni por WhatsApp: da acceso total a la base de datos.
> ⚠️ No la confundas con la `anon`. Si están cambiadas, `/setup` mostrará «Invalid API key».
> ⚠️ **No** es la contraseña de la base de datos.

## 4. `DATABASE_URL` y `DIRECT_URL` (conexión a la base de datos)
1. Pulsa el botón **Connect**, arriba del todo, en la barra del proyecto.
2. Ve a la pestaña **ORMs** y elige **Prisma** en el desplegable.
3. Verás dos líneas parecidas a estas:
   ```
   DATABASE_URL="postgresql://postgres.abcdxyz:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
   DIRECT_URL="postgresql://postgres.abcdxyz:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"
   ```
4. Copia cada una **sin las comillas**.
5. Cambia `[YOUR-PASSWORD]` (con los corchetes incluidos) por la **contraseña de la base de datos**. Va entre los `:` y la `@`.

Cómo distinguirlas:

| | Puerto | Final |
|---|---|---|
| `DATABASE_URL` | **6543** | termina en `?pgbouncer=true` |
| `DIRECT_URL` | **5432** | termina en `/postgres` |

### Si no recuerdas la contraseña de la base de datos
Supabase no la vuelve a mostrar nunca. Para crear una nueva:
1. Ve a **Project Settings → Database → Reset database password**.
2. Escribe una **solo con letras y números**, por ejemplo `Kargia2026Almacen`. Los símbolos `@ # / ? : %` rompen la dirección.
3. Guárdala en tu gestor de contraseñas.
4. Actualiza `DATABASE_URL` y `DIRECT_URL` en Hostinger y pulsa **Redeploy**.

## 5. `ENCRYPTION_KEY` (clave de cifrado)
Sirve para cifrar las claves de las tiendas y de Sendcloud.

**Primera instalación:**
1. Despliega sin ella.
2. Abre la web: te lleva a **Configuración inicial** (`/setup`).
3. En el paso 1 copia **«ENCRYPTION_KEY generada para ti»**.
4. **Guárdala en tu gestor de contraseñas.**
5. Añádela en Hostinger y pulsa **Redeploy**.

**Si cambias de hosting o reinstalas:** usa **la misma clave de siempre**. No generes otra nueva.

> ⚠️ Si se pierde o se cambia, las tiendas conectadas y las claves de Sendcloud dejan de funcionar. Habría que volver a conectarlas en **Tiendas** y en **Ajustes**.

Alternativa con terminal: `openssl rand -base64 32`

## 6. `NEXT_PUBLIC_APP_URL` (opcional)
La dirección pública de la app, con `https://` y **sin barra al final**, por ejemplo `https://app.tudominio.com`.
- Mientras uses la URL temporal de Hostinger, puedes no ponerla: la app usa la dirección desde la que se abre.
- Cuando tengas el dominio definitivo, añádela y pulsa **Redeploy**.

---

## 8. `SHOPIFY_API_KEY` y `SHOPIFY_API_SECRET` (opcionales)
Son el Client ID y el Client secret de la app «Kargia» en Shopify Partners. Con ellas, las tiendas conectan Shopify con un botón. Los pasos están en [v14-transporte-alta-seguimiento.md](v14-transporte-alta-seguimiento.md#shopify-en-un-clic-hay-que-crear-una-app-una-vez).

## 9. Emails: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` y `SMTP_FROM` (opcionales)
Son los datos de un buzón de correo para enviar los avisos al comprador con la marca de cada tienda. Con Hostinger:

| Variable | Valor |
|---|---|
| `SMTP_HOST` | `smtp.hostinger.com` |
| `SMTP_PORT` | `465` |
| `SMTP_USER` | el buzón, por ejemplo `envios@kargia.eu` |
| `SMTP_PASS` | la contraseña del buzón |
| `SMTP_FROM` | el mismo buzón |

---

## Dónde se ponen en Hostinger
1. Entra en **hPanel → Websites** y abre tu **Node.js Web App**.
2. Ve a **Variables de entorno** (*Environment variables*).
3. Para cada variable, pulsa **Añadir más**, pon el nombre a la izquierda y el valor a la derecha.
   - También puedes **Importar .env**: un archivo de texto con una línea por variable (`NOMBRE=valor`).
4. Pulsa **Guardar / Finalizar** y luego **Redeploy**.

## Al cambiar de dominio, también en Supabase
En **Authentication → URL Configuration**:
- **Site URL:** `https://app.tudominio.com`
- **Redirect URLs:** añade `https://app.tudominio.com/auth/callback`

Sin esto no funciona el enlace de «¿Olvidaste tu contraseña?».

---

## Comprobación rápida
Abre `https://tu-dominio/setup` con la sesión iniciada como administrador, o mira **Ajustes → Estado del sistema**. Todo debe estar en verde ✅.

| Si sale en rojo… | Revisa… |
|---|---|
| Variables de entorno | Que estén todas en Hostinger y que hayas pulsado **Redeploy**. |
| Clave de cifrado | Que `ENCRYPTION_KEY` esté completa, sin espacios. |
| Base de datos | La contraseña dentro de `DATABASE_URL` y `DIRECT_URL` (apartado 4). |
| Supabase Auth | `SUPABASE_SERVICE_ROLE_KEY`: que sea la secreta y no la `anon`. |
| Tablas | Pulsa **Crear tablas** o **Actualizar base de datos**. |
