import sys, pathlib, urllib.parse
src = pathlib.Path(sys.argv[1]); out = pathlib.Path(sys.argv[2])
css = (src/"styles.css").read_text()
fonts = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">'
subs = {
  "{{LOGO}}": (src/"logo.html").read_text().strip(),
  "{{MOCK}}": (src/"mock.html").read_text().strip(),
  "{{FORM}}": (src/"form.html").read_text().strip(),
}
vals = {"{{PACKIA_URL}}": "https://floralwhite-dugong-101545.hostingersite.com", "{{WHATSAPP}}": "34600000000", "{{EMAIL}}": "hola@kargia.eu",
        "{{WA_TEXT}}": urllib.parse.quote("Hola, tengo una tienda online y quiero información sobre Kargia")}
pages = {"web-kargia.html": ("web.body.html", "Kargia · Logística para tiendas online", "Guardamos tu stock, preparamos y enviamos los pedidos de tu tienda Shopify o WooCommerce el mismo día. Cuota fija, sin permanencia."),
         "landing-meta-ads.html": ("landing.body.html", "Kargia · Pide tu propuesta", "Deja de empaquetar: preparamos y enviamos los pedidos de tu tienda online el mismo día. Desde 480 €/mes, sin permanencia."),
         "gracias.html": ("gracias.body.html", "Kargia · ¡Gracias!", "Hemos recibido tu solicitud.")}
for name, (body, title, desc) in pages.items():
    b = (src/body).read_text()
    for k, v in subs.items(): b = b.replace(k, v)
    for k, v in vals.items(): b = b.replace(k, v)
    snippet = f"{fonts}\n<style>\n{css}</style>\n{b}"
    html = f"""<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<style>html{{scroll-behavior:smooth}}body{{margin:0;background:#f5f7fb}}</style>
</head>
<body>
<!-- ▼▼▼ COPIAR DESDE AQUÍ PARA GOHIGHLEVEL (elemento «Código personalizado») ▼▼▼ -->
{snippet}
<!-- ▲▲▲ COPIAR HASTA AQUÍ ▲▲▲ -->
</body>
</html>
"""
    (out/name).write_text(html)
    print(name, len(html))
