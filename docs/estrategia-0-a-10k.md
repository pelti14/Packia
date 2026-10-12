# Kargia — Estrategia de 0 a 10.000 €/mes

> Plan operativo paso a paso: montar la empresa, captar clientes, cerrarlos y escalar.
> Documento vivo. Última revisión: 12/10/2026. Ver también [`cliente-ideal.md`](cliente-ideal.md).

---

## 0. El objetivo en números

**10.000 €/mes de facturación propia** (cuotas + margen de transporte + extras). El importe íntegro de los envíos revendidos no cuenta, solo nuestro margen.

| Concepto por cliente medio | €/mes |
|---|---|
| Cuota media (mezcla de planes de 300 y 600) | ~600 € |
| Margen de transporte (≈450 envíos × 0,40 €) | ~180 € |
| Extras (insertos, devoluciones, almacenaje extra) | ~70 € |
| **Ingreso medio por cliente** | **~850 €** |

👉 **Hacen falta unos 12 clientes** (por ejemplo 7 en el plan de 300 y 5 en el de 600), que suman unos 5.000 pedidos/mes, **unos 240 pedidos al día**.
Eso ya no cabe en una trastienda: el plan incluye un salto a almacén pequeño y 1–2 personas de apoyo.

**Plazo realista:** 9–12 meses. Más rápido si el arranque coincide con la campaña de Black Friday y Navidad.

| Fase | Meses | Clientes | Facturación/mes | Hito |
|---|---|---|---|---|
| 0. Cimientos | Mes 0 | 0 | 0 € | Lista para operar |
| 1. Validación | 1–3 | 3 | ~2.000 € | 3 clientes pagando, operación sin errores |
| 2. Tracción | 4–6 | 7 | ~5.500 € | Almacén pequeño + primera persona |
| 3. Escala | 7–12 | 12+ | **10.000 €+** | Captación predecible |

---

## FASE 0 — Cimientos (semanas 1–4)

### 0.1 Legal y administrativo
- [ ] **Forma jurídica**: empezar como autónomo es válido. Pasar a **SL** cuando la facturación supere ~4.000–5.000 €/mes, o antes para limitar responsabilidad sobre mercancía ajena. Consultarlo con una gestoría.
- [ ] **Epígrafe IAE / CNAE** de almacenamiento y actividades anexas al transporte (CNAE 5210 / 5229). Confirmar con la gestoría.
- [ ] **Licencia de actividad** del local: comprobar que el uso permite almacenaje.
- [ ] **Seguros** (imprescindible antes del primer cliente):
  - Responsabilidad civil de la actividad.
  - **Mercancía de terceros en depósito** (robo, incendio, agua).
  - Opcional: daños durante la manipulación.
- [ ] **Contrato de servicio de logística**, revisado por un abogado. Puntos clave:
  - Servicios incluidos por plan y precio del exceso.
  - Hora de corte y plazos (SLA): % de pedidos que salen el mismo día.
  - Responsabilidad por errores: si el error es nuestro, reponemos el producto a **precio de coste**, con un límite anual.
  - Que la responsabilidad por el transporte es del transportista.
  - Inventario: tolerancia de mermas, inventario anual.
  - Impago: **derecho de retención de la mercancía** hasta el cobro.
  - Material de marca aportado por el cliente.
  - Sin permanencia, con preaviso de 30 días y plazo para retirar el stock.
- [ ] **Condiciones de recepción** (documento para el cliente): cómo etiquetar cajas, código de barras/EAN por referencia y aviso previo de cada envío de mercancía.
- [ ] **Cobro**: domiciliación SEPA (Stripe, GoCardless) **por adelantado** cada mes. Los excesos se cobran a mes vencido.

### 0.2 Transporte
- [ ] Pedir tarifas a **2–3 agencias**: MRW, GLS, Correos Express, SEUR, CTT. Con poco volumen las tarifas serán peores que las de LOPI.
- [ ] Plan B para el arranque: plataformas que agrupan agencias (Sendcloud, Packlink PRO, Outvio). Dan buenas tarifas desde el primer envío y generan etiquetas fácilmente. Renegociar directamente con la agencia al pasar de ~1.500 envíos/mes.
- [ ] Pactar una **recogida diaria fija** (y sábados si es posible).
- [ ] Definir el modelo: una agencia factura directo al cliente y otra la revendemos con margen.

### 0.3 Espacio y equipamiento (trastienda)
| Material | Coste aprox. |
|---|---|
| Estanterías metálicas con huecos numerados (ubicaciones A-01-01…) | 400–1.000 € |
| Mesa de packing amplia | 100–200 € |
| Impresora térmica de etiquetas (tipo Zebra) | 150–300 € |
| Báscula | 40–80 € |
| Lector de códigos de barras | 30–60 € |
| Material de embalaje estándar inicial (bolsas, cajas, relleno, cinta) | 200–400 € |
| Cámara para grabar el packing (prueba ante reclamaciones) | 50–100 € |
| **Total arranque** | **~1.000–2.200 €** |

- Zonas separadas: **recepción → almacén → packing → salida → devoluciones**.
- Calcular la capacidad real: ¿cuántos palets o estanterías por cliente? Así se sabe cuántos clientes caben antes de mudarse.

### 0.4 Procesos estándar (SOP)
Escribir en una página cada uno (después se meten en la app):
1. **Recepción**: contar, revisar daños, etiquetar, ubicar y registrar en el sistema. Avisar al cliente en menos de 24–48 h.
2. **Picking**: lista de recogida por ubicación y **escaneo obligatorio** de cada unidad (así se consigue más del 99,5 % de precisión).
3. **Packing**: material estándar o de marca, insertos, peso, etiqueta, foto o vídeo.
4. **Salida**: manifiesto de recogida para la agencia.
5. **Devoluciones**: recibir, revisar, clasificar (vendible, dañado o con incidencia) y avisar al cliente.
6. **Incidencias**: rotura, pérdida, error de envío. Quién responde y en cuánto tiempo.
7. **Inventario**: recuento rotativo semanal de las referencias que más se mueven.

**Hora de corte propuesta:** pedidos hasta las 14:00 salen el mismo día. Subir a las 16:00 cuando haya equipo.

### 0.5 App Kargia (Next.js): solo el mínimo para arrancar
No construir nada que no pida un cliente real. Orden de prioridad:
1. **Integración Shopify + WooCommerce**: importar pedidos automáticamente (webhooks).
2. **Catálogo e inventario** por cliente: referencias, stock y ubicación.
3. **Cola de pedidos**: pendiente → preparado → enviado.
4. **Generar la etiqueta de envío** (vía la plataforma de agencias o la API de la agencia) y **devolver el número de seguimiento a la tienda**, marcando el pedido como enviado.
5. **Panel del cliente**: su stock, sus pedidos y su seguimiento.
6. Después: recepciones, devoluciones, alertas de stock bajo, facturación automática y escaneo con el móvil.

> Mientras la app no esté lista, los 2–3 primeros clientes se pueden operar con las apps de Shopify y WooCommerce de la plataforma de agencias y una hoja de cálculo. **No retrasar la venta por el software.**

### 0.6 Marca y presencia mínima
- [ ] Dominio + **landing de una página** (estructura en §2.2).
- [ ] **WhatsApp Business** con catálogo y respuestas rápidas.
- [ ] Perfil de LinkedIn del fundador optimizado ("Logística para tiendas Shopify y WooCommerce").
- [ ] Ficha de Google Business.
- [ ] **Fotos y vídeo reales del almacén y el packing**: generan confianza.
- [ ] **Calculadora de ahorro** (hoja de cálculo o página): lo que le cuesta hoy al cliente frente a Kargia.

---

## FASE 1 — Validación: de 0 a 3 clientes (meses 1–3)

**Objetivo:** conseguir 3 clientes que paguen, sin errores, y convertirlos en casos de éxito.
**Canal principal:** prospección directa (outbound) + red de contactos. Sin publicidad todavía.

### 1.1 Construir la lista de 200 tiendas
Cómo encontrarlas:
- **Biblioteca de anuncios de Meta**: buscar tiendas españolas con anuncios activos (si invierten en anuncios, venden).
- **Detectores de tecnología** (BuiltWith, Wappalyzer, Store Leads): listas de tiendas Shopify y WooCommerce en España.
- Google: `"tienda online" + [tu provincia]`, `site:myshopify.com` + sector.
- Instagram: marcas de cosmética, suplementos, mascotas o accesorios de 5k a 100k seguidores con tienda propia.
- **Red propia**: clientes de tus negocios físicos, proveedores, conocidos con tienda.

**Señales de que encajan** (priorizar):
- Anuncios activos en Meta o TikTok.
- Muchas reseñas recientes.
- Quejas de envíos lentos en sus reseñas.
- Ofertas de empleo de "mozo de almacén" o "preparador de pedidos".
- Lanzamientos o campañas frecuentes.
- **Tienda en WooCommerce** (LOPI no la atiende).

Guardar en una hoja de cálculo o CRM con estas columnas: tienda, URL, plataforma, sector, pedidos estimados, contacto, canal, estado, próxima acción.

### 1.2 Secuencia de contacto (por cada tienda)
| Día | Canal | Acción |
|---|---|---|
| 1 | Instagram DM / LinkedIn | Mensaje corto personalizado |
| 3 | Email | Email con el cálculo de ahorro |
| 6 | Llamada o WhatsApp | Seguimiento breve |
| 10 | Email | Último mensaje ("¿cierro tu ficha?") |

**Mensaje 1 (DM):**
> Hola [nombre], he visto [producto/campaña concreta] de [tienda], ¡pinta genial! Una pregunta rápida: ¿los pedidos los seguís preparando vosotros? Monto la logística a tiendas [Shopify/WooCommerce] que pasan de 300 pedidos/mes: almacenamos, preparamos y enviamos por cuota fija, y vosotros solo vendéis. Si te encaja te paso un cálculo de lo que ahorraríais. 🙌

**Email (día 3):**
> **Asunto:** ¿Cuánto os cuesta de verdad preparar los pedidos de [tienda]?
>
> Hola [nombre]:
> Si preparáis unos [X] pedidos al mes, entre preparación, material, espacio y vuestras horas os está costando unos **[Y] €/mes**, aunque no aparezca en ninguna factura.
> En Kargia lo hacemos por **[cuota] €/mes fijos**: recepción, almacenaje, preparación, devoluciones y soporte por WhatsApp. Sin cobros por movimiento ni permanencia. Integración directa con [Shopify/WooCommerce].
> ¿Te viene bien una llamada de 15 minutos esta semana para ver si encaja?
> [Firma + WhatsApp]

**Llamada o WhatsApp (día 6):** "Te escribí hace unos días por la logística de [tienda]. ¿Es algo que os esté dando guerra ahora o lo tenéis controlado?"

**Volumen semanal en la fase 1:** **50 contactos nuevos por semana** (10 al día). Es la parte más importante de la fase.

### 1.3 Oferta de lanzamiento (solo los 3 primeros)
- **Primer mes al 50 %** (o dos semanas gratis).
- Integración y alta gratis.
- Precio de lanzamiento **bloqueado 12 meses** a cambio de **testimonio en vídeo + caso de éxito** a los 60 días.
- Mensaje de escasez real: "Solo aceptamos 3 tiendas en esta tanda por espacio".

### 1.4 Embudo esperado (fase 1)
| Paso | Mensual | Conversión |
|---|---|---|
| Contactos nuevos | 200 | — |
| Respuestas | 20–30 | 10–15 % |
| Llamadas de diagnóstico | 8–10 | ~40 % |
| Propuestas enviadas | 5–6 | ~60 % |
| **Clientes cerrados** | **1–2** | 25–35 % |

### 1.5 Ejecución impecable
Con los primeros clientes, **la operación ES el marketing**:
- 0 errores. Revisar dos veces cada pedido al principio.
- Respuesta por WhatsApp en menos de 1 hora en horario laboral.
- **Informe mensual** al cliente: pedidos enviados, % salidos el mismo día, incidencias, stock bajo.
- Al día 60, pedir **testimonio, caso de éxito con números y 2 contactos** de otras tiendas.

---

## FASE 2 — Tracción: de 3 a 7 clientes (meses 4–6)

**Objetivo:** ~5.500 €/mes, mudanza a almacén pequeño y primera contratación.

### 2.1 Canales que se añaden
1. **Socios que derivan clientes** (el canal con mejor relación coste/resultado):
   - Agencias de Meta Ads, Google Ads y TikTok.
   - Desarrolladores y agencias de Shopify y WooCommerce.
   - Gestorías y consultores de ecommerce.
   - Oferta: **comisión del 10 % de la cuota durante 12 meses**, o un pago único de 200–300 € por cliente cerrado.
   - Objetivo: **10 socios activos**. Darles un PDF de una página y un enlace con seguimiento.
2. **Meta Ads a la landing** (presupuesto de 300–600 €/mes):
   - Público: empresarios con tienda, intereses en Shopify, WooCommerce, ecommerce y dropshipping, España, de 25 a 50 años.
   - Anuncios: vídeo del almacén y el packing, "tu salón lleno de cajas", comparativa de costes, testimonio.
   - Objetivo: **formulario de cualificación**. Coste por contacto esperado: 10–30 €.
3. **Contenido orgánico** (LinkedIn + Instagram + TikTok): 3 publicaciones por semana.
   - Detrás de las cámaras del almacén, unboxing de clientes, "cuánto cuesta de verdad preparar 300 pedidos", errores comunes de logística, Black Friday.
4. **SEO** (largo plazo): artículos como "fulfillment WooCommerce España", "logística para tienda Shopify", "alternativa a Amazon FBA".
5. **Referidos de clientes**: **1 mes gratis** por cada tienda referida que cierre.

### 2.2 Landing (estructura)
1. **Titular:** *"Tú vende. Nosotros preparamos y enviamos tus pedidos. Cuota fija, sin sorpresas."* + "Shopify y WooCommerce · Desde 300 pedidos/mes".
2. **El dolor:** cajas en casa, horas empaquetando, retrasos, miedo a Black Friday.
3. **Cómo funciona:** conectamos tu tienda → nos envías el stock → enviamos tus pedidos.
4. **Qué incluye** y **precios públicos por planes**.
5. **Diferenciadores:** WooCommerce, unboxing de marca, trato directo, panel en tiempo real.
6. **Pruebas:** testimonios, fotos reales, cifras (precisión, % salidos el mismo día).
7. **Preguntas frecuentes** (objeciones).
8. **Formulario de cualificación** (ver 3.1) + botón de WhatsApp.

### 2.3 Operación
- **Mudanza a almacén pequeño** (150–300 m²) al llegar a 4–5 clientes o cuando la trastienda supere el 70 % de ocupación.
- **Primera persona** (media jornada o jornada completa) para preparar pedidos al pasar de ~80–100 pedidos/día.
- La app ya debe tener: recepciones, devoluciones y panel del cliente.
- Negociar **tarifa propia con la agencia** al pasar de ~1.500 envíos/mes.

---

## FASE 3 — Escala: de 7 a 12+ clientes (meses 7–12)

**Objetivo:** 10.000 €/mes con una captación que funcione sola.

- **Campaña de Black Friday y Navidad** (vender de agosto a octubre): "Este año sí puedes hacer Black Friday". Es el momento de mayor dolor del cliente.
- Duplicar lo que funcione (normalmente socios + referidos + anuncios).
- **Retargeting** de los visitantes de la landing con testimonios.
- **Planes superiores** (600 y 1.000 pedidos): subir a los clientes que crecen. Revisar el plan de cada cliente cada trimestre.
- Servicios extra con margen: kitting/packs, etiquetado, gestión de devoluciones avanzada, envíos a Europa.
- Equipo: 2–3 personas en almacén y un responsable de operaciones. **El fundador pasa a vender y gestionar socios.**
- Empezar a pensar en vender la app como herramienta independiente (otro modelo de negocio futuro).

---

## 3. Proceso de venta y cierre (paso a paso)

### 3.1 Formulario de cualificación (landing y anuncios)
1. Nombre, tienda, URL, WhatsApp.
2. Plataforma: Shopify / WooCommerce / Otra.
3. Pedidos al mes: <150 / 150–300 / 300–600 / 600–1.000 / >1.000.
4. Número de referencias.
5. Tipo de producto y tamaño medio.
6. ¿Quién prepara hoy los pedidos? (yo / empleado / otro operador logístico)
7. Principal problema hoy.

**Filtro automático:** menos de 150 pedidos → respuesta amable + recurso gratuito (guía "Cómo preparar tu tienda para escalar") y se guardan para más adelante. Entre 150 y 300 → valorar. 300 o más → **llamada prioritaria**.

### 3.2 Contacto en menos de 1 hora
Mensaje por WhatsApp: "Hola [nombre], soy [tú] de Kargia. He visto tu solicitud de [tienda]. ¿Te va bien una llamada de 15 min hoy o mañana para ver si encajamos?"

### 3.3 Llamada de diagnóstico (15–20 min): guion
1. **Contexto (2 min):** "Cuéntame de tu tienda: qué vendes y cómo va el último año".
2. **Situación actual (5 min):**
   - ¿Cuántos pedidos al mes? ¿Y en picos?
   - ¿Quién los prepara y cuántas horas le lleva?
   - ¿Dónde tienes el stock? ¿Te cabe?
   - ¿Qué agencia usas y cuánto pagas por envío?
3. **Dolor (5 min):**
   - "¿Qué pasó el último Black Friday?"
   - "Si mañana vendieras el doble, ¿qué pasaría?"
   - "¿Qué harías con las horas que te pasas empaquetando?"
4. **Coste real (3 min):** calcularlo con él usando la calculadora:
   - Horas del fundador o empleado × valor/hora
   - + espacio (alquiler proporcional)
   - + material
   - + coste de los errores y retrasos
5. **Siguiente paso (2 min):** "Con esto te preparo una propuesta cerrada con tu plan, tu tarifa de envío y lo que ahorrarías. Te la envío en 24 h. ¿La vemos juntos el [día] en 15 min?" → **dejar la cita agendada en la propia llamada**.

### 3.4 Propuesta (en menos de 24 h)
Documento de 2–3 páginas:
1. Su situación actual y su coste real (con sus propios números).
2. El plan recomendado y lo que incluye.
3. La tarifa de envío cerrada para su peso medio.
4. **Ahorro y beneficio** al mes y al año (dinero + horas liberadas).
5. Calendario de alta: integración en 1–2 días → stock en 3–7 → primer envío en 7–10.
6. Garantías: sin permanencia, política de errores, mes de prueba.
7. **Fecha límite** de la oferta (plazas por tanda).

### 3.5 Llamada de cierre (15 min)
- Repasar la propuesta **en directo** (no enviarla sin explicarla).
- Preguntar: "¿Qué te frena para empezar?" → resolver objeciones (ver `cliente-ideal.md` §6).
- Si es posible: **invitarle a ver el almacén** (si es de la zona, cierra muchísimo).
- Cierre: "Si te parece, te paso el contrato y el enlace de pago. Esta semana integramos tu tienda y la que viene empiezas a recibir stock".
- Si duda: ofrecer el **piloto con un 50 % de descuento el primer mes** y sin permanencia.

### 3.6 Seguimiento si no cierra
- Día 2: "¿Has podido revisarla? ¿Alguna duda?"
- Día 5: enviar un caso de éxito parecido.
- Día 10: "¿Lo dejamos para después de [campaña]? Te guardo la tarifa hasta el día X".
- Después: newsletter mensual y volver a contactar antes de Black Friday.

### 3.7 Alta del cliente (días 1–10)
1. Firma del contrato + domiciliación SEPA.
2. Llamada de bienvenida: material de marca, insertos, instrucciones especiales.
3. Integración de la tienda (24–48 h).
4. Envío de las condiciones de recepción → recepción del stock → registro y ubicación.
5. Primer pedido de prueba (pedido real del cliente a sí mismo).
6. Arranque + seguimiento diario la primera semana.
7. Revisión a los 30 días.

---

## 4. Métricas que hay que mirar cada semana

**Captación**
- Contactos nuevos / respuestas / llamadas / propuestas / cierres.
- Coste por contacto y coste por cliente en anuncios.
- Clientes derivados por socios y por referidos.

**Operación**
- **% de pedidos que salen el mismo día** (objetivo >98 %).
- **Precisión de envíos** (objetivo >99,5 %).
- Tiempo de respuesta por WhatsApp (<1 h).
- Pedidos por hora por persona.
- Ocupación del almacén (%).

**Negocio**
- Facturación mensual recurrente.
- Margen bruto por cliente.
- Bajas de clientes (objetivo: 0 en el primer año).
- Ingreso medio por cliente.

---

## 5. Rutina semanal del fundador (fases 1–2)

| Bloque | Tiempo/semana |
|---|---|
| Prospección (50 contactos nuevos + seguimientos) | 6–8 h |
| Llamadas de diagnóstico y cierre | 3–5 h |
| Operación (preparar pedidos, recepciones) | según volumen |
| Socios (1–2 reuniones) | 2 h |
| Contenido (3 publicaciones) | 2 h |
| Revisión de métricas + mejora de procesos | 1 h |

**Regla de oro:** la prospección se hace **todos los días, aunque haya pedidos**. Cuando se para la captación, a los 2 meses se para el crecimiento.

---

## 6. Presupuesto inicial aproximado

| Partida | € |
|---|---|
| Equipamiento y material (§0.3) | 1.000–2.200 |
| Seguros (anual) | 400–900 |
| Gestoría y abogado (contrato) | 300–800 |
| Web, dominio y herramientas | 50–150 |
| Anuncios (desde la fase 2, al mes) | 300–600 |
| **Total para arrancar** | **~2.000–4.000 €** |

---

## 7. Próximos pasos inmediatos (esta semana)
1. [ ] Llamar a la gestoría: forma jurídica, epígrafe y seguros.
2. [ ] Pedir tarifas a 2 agencias y abrir cuenta en una plataforma de agencias.
3. [ ] Medir la trastienda: cuántas estanterías y palets caben.
4. [ ] Crear la hoja de prospección y meter las primeras 50 tiendas.
5. [ ] Crear la calculadora de ahorro.
6. [ ] Montar la landing de una página + WhatsApp Business.
7. [ ] Enviar los primeros 10 mensajes.
