# cluciani-brand-kit

Brand kit canónico de **Christian Luciani**: el logo del triángulo-espiral,
sus assets generados, el generador paramétrico y el manual de marca.

> **Todos los derechos reservados.** Este repositorio no es open source: no se
> concede ninguna licencia de uso. Ver [LICENSE](LICENSE) y
> [TRADEMARK.md](TRADEMARK.md).

## Contenido

```
assets/logo/          # 70 assets generados (SVG, PNG, print, favicon, og)
docs/logo.md          # manual de marca (símbolo, paleta, construcción, uso)
tools/logo/           # geometry.mjs (fuente de verdad), generador, tests, gate
proposals/            # HTML de la animación aprobada (fuente de diseño)
```

La versión canónica se publica por **tags** (`v1.0.0`, …). Consumí siempre un
tag, nunca `main`: los assets de una versión no cambian.

## Consumo

### CDN (recomendado para README, sitios y docs)

jsDelivr sirve el repo público con caché inmutable por tag:

```
https://cdn.jsdelivr.net/gh/ChristianLuciani/cluciani-brand-kit@v1.0.1/assets/logo/logo-aurea-1024-dark.png
https://cdn.jsdelivr.net/gh/ChristianLuciani/cluciani-brand-kit@v1.0.1/assets/logo/logo-aurea-1024-light.png
```

Ejemplo para el README de perfil (HTML, controla el tamaño en GitHub):

```html
<p align="center">
  <img width="320" src="https://cdn.jsdelivr.net/gh/ChristianLuciani/cluciani-brand-kit@v1.0.1/assets/logo/logo-aurea-1024-dark.png" alt="Christian Luciani">
</p>
```

### Raw de GitHub

```
https://raw.githubusercontent.com/ChristianLuciani/cluciani-brand-kit/v1.0.1/assets/logo/logo-aurea-1024-dark.png
```

### Nomenclatura

| Patrón | Uso |
|---|---|
| `logo-aurea-{512\|1024\|2048\|4096}.png` | mark transparente |
| `logo-aurea-{size}-dark.png` | fondo night aprobado |
| `logo-aurea-{size}-light.png` | fondo blanco (superficie clara) |
| `logo-aurea-layers.svg` / `-light.svg` | master por capas |
| `logo-aurea-settled.svg` / `-light.svg` | estado final (sin estrellas de vértices) |
| `logo-aurea-lockup.svg` / `-light.svg` | mark + tipografía (800×940) |
| `logo-aurea-print-{a4\|a3}{,-dark,-light}.png` | 300 dpi |
| `favicon-aurea.svg`, `favicon-aurea-{16,32}.png` | favicon: la C llena el tile (sin fondo) |
| `favicon-aurea-teal.svg`, `favicon-aurea-teal-{16,32}.png` | favicon con tile teal `#00c9c0` y C en night (máximo contraste) |
| `favicon-aurea-teal-gold.svg`, `favicon-aurea-teal-gold-{16,32}.png` | tile teal + C con el acabado ámbar→oro→luz del mark |
| `apple-touch-icon-aurea.png`, `og-image-aurea.png` | 180 / 1200×630 |

La versión **áurea** es la canónica; `base` se conserva como referencia
comparativa. Sobre blanco usá siempre `-light`: la variante night deja un halo
verdoso.

Favicon con tile teal (opciones de color, §3.2 del manual). Los favicons teal
todavía no están en `v1.0.1`: reemplazá `<tag>` por el tag que publique esta
versión.

```html
<!-- máximo contraste: C en night -->
<link rel="icon" type="image/svg+xml" href="https://cdn.jsdelivr.net/gh/ChristianLuciani/cluciani-brand-kit@<tag>/assets/logo/favicon-aurea-teal.svg">
<link rel="icon" type="image/png" sizes="32x32" href="https://cdn.jsdelivr.net/gh/ChristianLuciani/cluciani-brand-kit@<tag>/assets/logo/favicon-aurea-teal-32.png">

<!-- la C con sus colores (acabado ámbar→oro→luz) -->
<link rel="icon" type="image/svg+xml" href="https://cdn.jsdelivr.net/gh/ChristianLuciani/cluciani-brand-kit@<tag>/assets/logo/favicon-aurea-teal-gold.svg">
<link rel="icon" type="image/png" sizes="32x32" href="https://cdn.jsdelivr.net/gh/ChristianLuciani/cluciani-brand-kit@<tag>/assets/logo/favicon-aurea-teal-gold-32.png">
```

## Regenerar

Requisitos: Node 20+ y Chrome/Chromium. En Linux/CI, apuntá `CHROME_PATH`.

```bash
npm install
npm test                    # invariantes de geometría
npm run logo:generate       # regenera los 70 assets (áurea + base)
npm run logo:favicons       # sólo favicons (16/32, 3 variantes)
CHROME_PATH=/usr/bin/google-chrome npm run logo:verify   # gate ≡ DOM aprobado
```

En un sandbox que impide a Chrome inicializar su propio sandbox (harnesses,
CI restringido), agregá `CHROME_NO_SANDBOX=1` al comando de generación.

El manual completo —paleta, construcción, capas, usos correctos e incorrectos—
está en [docs/logo.md](docs/logo.md).

## Estado de la animación

`proposals/logo-triangulo-espiral/aurea7.html` es la animación aprobada y
todavía dibuja la C plana. El acabado de barra (bisel, marco, terminales) vive
en los assets; espejarlo en la animación es trabajo pendiente del issue #55
del repo `cv-cluciani`.

## Contacto

@ChristianLuciani en GitHub.
