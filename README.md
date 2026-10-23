# cluciani-brand-kit

Brand kit canónico de **Christian Luciani**: el logo del triángulo-espiral,
sus assets generados, el generador paramétrico y el manual de marca.

> **Todos los derechos reservados.** Este repositorio no es open source: no se
> concede ninguna licencia de uso. Ver [LICENSE](LICENSE) y
> [TRADEMARK.md](TRADEMARK.md).

## Contenido

```
assets/logo/          # 58 assets generados (SVG, PNG, print, favicon, og)
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
https://cdn.jsdelivr.net/gh/ChristianLuciani/cluciani-brand-kit@v1.0.0/assets/logo/logo-aurea-1024-dark.png
https://cdn.jsdelivr.net/gh/ChristianLuciani/cluciani-brand-kit@v1.0.0/assets/logo/logo-aurea-1024-light.png
```

Ejemplo para el README de perfil (HTML, controla el tamaño en GitHub):

```html
<p align="center">
  <img width="320" src="https://cdn.jsdelivr.net/gh/ChristianLuciani/cluciani-brand-kit@v1.0.0/assets/logo/logo-aurea-1024-dark.png" alt="Christian Luciani">
</p>
```

### Raw de GitHub

```
https://raw.githubusercontent.com/ChristianLuciani/cluciani-brand-kit/v1.0.0/assets/logo/logo-aurea-1024-dark.png
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
| `favicon-aurea.svg`, `favicon-aurea-{16,32}.png` | favicon simplificado |
| `apple-touch-icon-aurea.png`, `og-image-aurea.png` | 180 / 1200×630 |

La versión **áurea** es la canónica; `base` se conserva como referencia
comparativa. Sobre blanco usá siempre `-light`: la variante night deja un halo
verdoso.

## Regenerar

Requisitos: Node 20+ y Chrome/Chromium. En Linux/CI, apuntá `CHROME_PATH`.

```bash
npm install
npm test                    # invariantes de geometría
npm run logo:generate       # regenera los 58 assets (áurea + base)
CHROME_PATH=/usr/bin/google-chrome npm run logo:verify   # gate ≡ DOM aprobado
```

El manual completo —paleta, construcción, capas, usos correctos e incorrectos—
está en [docs/logo.md](docs/logo.md).

## Estado de la animación

`proposals/logo-triangulo-espiral/aurea7.html` es la animación aprobada y
todavía dibuja la C plana. El acabado de barra (bisel, marco, terminales) vive
en los assets; espejarlo en la animación es trabajo pendiente del issue #55
del repo `cv-cluciani`.

## Contacto

@ChristianLuciani en GitHub.
