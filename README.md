# cluciani-brand-kit

Brand kit canónico de **Christian Luciani**: **Espirángulo**, el mark del
triángulo-espiral, sus assets generados, el generador paramétrico y el manual
de marca.

**Espirángulo** (espiral + triángulo) es el **nombre del mark** — el símbolo
ratificado por el operador el **2026-10-27** (issue #3). Nombra el símbolo, no
el wordmark: «Christian Luciani» en la tipografía del lockup sigue siendo el
nombre de marca (§5 del manual), no el nombre del logo. El nombre no toca la
geometría ni el acabado de la C — eso es alcance del issue #1.

> **Todos los derechos reservados.** Este repositorio no es open source: no se
> concede ninguna licencia de uso. Ver [LICENSE](LICENSE) y
> [TRADEMARK.md](TRADEMARK.md).

## Contenido

```
assets/logo/               # 66 assets generados (SVG, PNG, print, favicon, og)
docs/logo.md               # manual de marca (símbolo, paleta, construcción, uso)
tools/logo/                # geometry.mjs (fuente de verdad), generador, tests, gate
tools/logo/assets.sha256   # manifiesto de paridad de assets/logo (sha256)
proposals/                 # HTML de la animación aprobada (fuente de diseño)
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
| `favicon-aurea.svg`, `favicon-aurea-32.png` | favicon sin fondo: C dorada, sólo 32/SVG (a 16 no se aprecia; para 16 usá `-teal`) |
| `favicon-aurea-teal.svg`, `favicon-aurea-teal-{16,32}.png` | favicon con tile teal `#00c9c0` y C en night (máximo contraste) |
| `favicon-aurea-teal-gold.svg`, `favicon-aurea-teal-gold-32.png` | tile teal + C con el acabado ámbar→oro→luz (32/SVG; sin 16, no se aprecia) |
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
npm run logo:generate       # regenera los 66 assets (áurea + base)
npm run logo:favicons       # sólo favicons (16 sólo -teal; 32 las 3)
CHROME_PATH=/usr/bin/google-chrome npm run logo:verify   # gate ≡ DOM aprobado
```

En un sandbox que impide a Chrome inicializar su propio sandbox (harnesses,
CI restringido), agregá `CHROME_NO_SANDBOX=1` al comando de generación.

El manual completo —paleta, construcción, capas, usos correctos e incorrectos—
está en [docs/logo.md](docs/logo.md).

## Paridad de assets — el último logo

`assets/logo/` es la copia canónica de la fuente del logo,
`ChristianLuciani/christianluciani.github.io` › `assets/brand/logo/`.
`tools/logo/assets.sha256` fija el sha256 de cada archivo y declara su origen;
CI verifica en cada push que el árbol coincida con el manifiesto, sin red:

```bash
node tools/logo/verify-assets.mjs                 # offline: assets/logo/ ≡ manifiesto
node tools/logo/verify-assets.mjs --from-source   # red: drift contra la fuente
```

<!-- composición: 66/52/4/10/3/0 (total/mirror/diverged/local/retired/dropped) -->

Composición vigente (la imprime el propio comando): **66 archivos** —
**52** byte-idénticos a la fuente, **4** divergentes a propósito
(`favicon-{aurea,base}{,-32}.{svg,png}`: la familia de favicons con tile lleno
que este repo adelantó en #4; la fuente todavía tiene la versión previa),
**10** propios de este repo (los `favicon-*-teal*`, que la fuente aún no tiene)
y **3** retirados (`favicon-{aurea,base}-16.png` transparentes, retirados en
#4 — a 16 px sólo se publica `-teal` — y el `README.md` de la carpeta de assets
en la fuente, que es documentación, no un asset).

`mirror` se re-deriva de la fuente. `diverged`, `local`, `retired` y `dropped`
son declaraciones explícitas **con razón** (PR/issue) escrita en el manifiesto:
`--from-source --write` no puede mover sus bytes **ni borrarlos**; re-anclar o
retirar exige declararlo de nuevo con `--diverge`/`--local`/`--retire`/`--drop`
y un motivo. Un byte cambiado o un archivo borrado sin declaración hacen fallar
tanto el modo offline como `--write`. El ref de la fuente va **pineado al
commit**, no a `main`.

**Límite declarado — verde ≠ último logo.** El step de CI corre sólo el modo
offline: demuestra que el árbol es *el declarado*, **no** que la fuente no haya
avanzado. La frescura contra la fuente es **manual**
(`node tools/logo/verify-assets.mjs --from-source --ref main`), y se corre al
tocar assets o al revisar el pin; hoy está **verde** (el árbol de assets de la
fuente no cambió y su `README.md` está declarado como retirado). En cuanto la
fuente sume, cambie o borre un asset, el chequeo falla.

**Regenerar.** `npm run logo:generate` re-renderiza desde `geometry.mjs`; si
Chrome produce bytes distintos a los de la fuente, el gate lo va a marcar como
`declarado mirror y difiere de la fuente`. El camino sancionado es regenerar
**en la fuente** (`cv-cluciani`) primero, re-pinear acá y volver a derivar el
manifiesto — no editar hashes a mano.

## Estado de la animación

`proposals/logo-triangulo-espiral/aurea7.html` es la animación aprobada y ya
refleja el acabado del mark: dibuja la C como banda con bisel y la revela con
una máscara sobre el path central, conservando el timing del trazado (sync del
acabado, issue #1). La integración en el sitio se completó en `cv-cluciani`
#56 (cerrado 2026-10-23).

## Contacto

@ChristianLuciani en GitHub.
