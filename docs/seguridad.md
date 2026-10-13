# Seguridad: respuesta a la auditoría del 13/10/2026 (v13.0.0)

Cada punto tiene una prueba automática:
- **`npm test`** ejecuta pruebas unitarias, una auditoría del código y una prueba con la base de datos.
- **`tests/e2e/security.e2e.mjs`** ejecuta una prueba completa contra la app en marcha.

| Punto | Estado | Qué se ha hecho | Prueba |
|---|---|---|---|
| **2.1 Firma HMAC de webhooks** | Ya estaba bien; ahora tiene pruebas | Shopify (`X-Shopify-Hmac-Sha256`) y WooCommerce (`X-WC-Webhook-Signature`): HMAC-SHA256 del **cuerpo sin procesar** (`req.text()`), comparación en tiempo constante (`timingSafeEqual`) y **401** si no coincide, **antes** de leer el JSON. | `security.test.ts` (firma buena, basura, cuerpo alterado, secreto distinto, JSON re-serializado) y `access-audit.test.ts` (comprueba que la firma se valida antes de `JSON.parse`). |
| **2.2 Aislamiento entre clientes** | Revisado, sin fugas; ahora protegido por pruebas | Las páginas de detalle comprueban `canAccessClient` (404 si el registro es de otro cliente) o están restringidas a ADMIN/STAFF. Los listados usan `clientScope`. Las acciones que puede usar un cliente fuerzan su propia empresa o comprueban la pertenencia. Un cliente sin empresa asignada no ve nada. | `access-audit.test.ts` falla si una página `[id]`, una ruta de API o una acción de servidor no comprueba rol ni cliente (probado quitando un control a propósito). `security.e2e.mjs`: con ids **reales** de otro cliente, el pedido, la factura, la recepción, la devolución y la etiqueta devuelven **404**. |
| **2.3 Cabeceras HTTP** | Hecho | HSTS (2 años, subdominios, preload), `X-Frame-Options: SAMEORIGIN` (no `DENY`, porque la propia app muestra la etiqueta en un recuadro para imprimirla), `nosniff`, `Referrer-Policy`, `Permissions-Policy` y **CSP en modo Report-Only**. `poweredByHeader: false` quita `X-Powered-By`. | `security.test.ts` y `security.e2e.mjs` |
| **2.4 Redirección abierta en `?next=`** | Endurecido | `safeRedirectPath()` (en `src/lib/security.ts`) rechaza `//`, `\`, esquemas (`https:`, `javascript:`), caracteres de control y cualquier origen externo. Se usa en el login, `/auth/callback`, las acciones de «Mi plan», la facturación y la validación de productos. | `security.test.ts` (13 casos maliciosos) y `security.e2e.mjs` (login con `next=//evil.example` se queda en la app) |
| **2.5 Fuerza bruta en el login** | Hecho | 5 fallos por email e IP, o 20 por IP, en 15 minutos → bloqueo temporal con aviso. Cada fallo queda en el log del servidor; al bloquear, se avisa a los admins en la campana. Los enlaces de «olvidé mi contraseña» tienen límite por IP. El límite vive en memoria: vale con un único servidor (Hostinger); con varios habría que pasarlo a la base de datos o a Redis. | `security.test.ts` y `security.e2e.mjs` |
| **2.6 Cookie de sesión** | Hecho | Se fuerzan `HttpOnly`, `Secure` (en producción), `SameSite=Lax` y `path=/`. Supabase rota el token en cada login y en cada refresco. | `security.test.ts` y comprobado en el navegador |
| **2.7 Cabecera `Server: hcdn`** | No se puede cambiar desde la app | La pone el CDN de Hostinger, delante de la app. Solo revela el proveedor, no versiones. | — |
| **3.1 KPI «A tiempo 0 %» / «retrasados»** | Corregido | El plazo se contaba desde la fecha de compra en la tienda, así que los pedidos antiguos importados al conectar una tienda (o que llegan tarde desde ella) salían como retrasos del almacén. Ahora **cuenta desde que el pedido llega a la app** (`slaStart`). El porcentaje «A tiempo» no se muestra hasta tener **10 envíos** (con 1 envío tarde salía «0 %»), y las tarjetas explican qué miden. | — |
| **3.2 Stock negativo** | Corregido | No se puede embalar, etiquetar ni enviar un pedido si el stock físico no alcanza (aviso «Sin stock: hay X, pide Y»). El descuento al enviar es atómico (`stock >= cantidad`) y evita negativos aunque se envíen dos pedidos a la vez. El inventario muestra **físico · reservado (pedidos abiertos) · disponible** y marca «Revisar: stock negativo» en los datos antiguos. | `stock.test.ts` (base de datos real) |

**Nota:** en el código no hay Sentry configurado. Si existe, está fuera de la app (en Hostinger). Se puede añadir si se quiere.

## Qué hacer con la política CSP
Ahora está en «Report-Only»: solo avisa en la consola del navegador (F12 → Consola) y no bloquea nada.
1. Usa la app unos días y fíjate si aparecen avisos `Content-Security-Policy`.
2. Cuando no aparezca ninguno, en `src/lib/security.ts` cambia `Content-Security-Policy-Report-Only` por `Content-Security-Policy`.
