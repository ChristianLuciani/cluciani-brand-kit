# Badge CDN — Espirángulo

> **Estado: estático listo para jsDelivr; Worker opcional sin deploy.** Los SVG
> de `assets/badge/` se publican con el repo y se consumen por jsDelivr sin
> cuenta ni infraestructura. El Worker de `cdn/` queda como opción para color
> arbitrario por URL; su deploy lo decide el operador (§5).

**Cubre:** los SVG estáticos del badge, su derivación desde el mini canónico y
el contrato opcional del Worker.
**No cubre:** el mark completo, el lockup, los PNG/SVG de `assets/logo/` ni la
decisión de un dominio propio.
`as_of: 2026-11-08`

## 1. Por qué no Simple Icons

El pedido original era un badge «tipo `cdn.simpleicons.org`». Ese CDN no puede
servir esta marca: [Simple Icons excluye explícitamente las marcas que
representan a una persona](https://github.com/simple-icons/simple-icons/blob/develop/CONTRIBUTING.md)
(«Any brands representing individuals rather than an organization, company, or
product»). No es un trámite pendiente: es un criterio de alcance.

La alternativa para uso propio es publicar los SVG con el repo y servirlos por
jsDelivr, que ya es la CDN del brand kit. No hace falta Cloudflare.

## 2. Camino A — jsDelivr (estático, recomendado)

Los archivos viven en `assets/badge/` y se sirven con el resto del repo:

```text
https://cdn.jsdelivr.net/gh/ChristianLuciani/cluciani-brand-kit@main/assets/badge/espirangulo.svg
```

`@main` funciona apenas se mergea. Para que la URL sea inmutable, pineá el tag
posterior al release (por ejemplo `@v1.3.0`); el repo publica por tags y `main`
puede cambiar.

| Archivo | Color | Uso |
|---|---|---|
| `espirangulo.svg` | `#c9a84c` (oro de marca) | default |
| `espirangulo-teal.svg` | `#00c9c0` | acento teal del sitio |
| `espirangulo-amber.svg` | `#d99a2b` | ámbar de la C |
| `espirangulo-deep.svg` | `#8a5a1c` | oro profundo, superficies claras |
| `espirangulo-night.svg` | `#050810` | night sobre fondo claro |
| `espirangulo-white.svg` | `#ffffff` | blanco sobre fondo oscuro |
| `espirangulo-adaptive.svg` | oro → blanco | `prefers-color-scheme: dark` |

Ejemplos:

```html
<!-- default -->
<img height="24" src="https://cdn.jsdelivr.net/gh/ChristianLuciani/cluciani-brand-kit@main/assets/badge/espirangulo.svg" alt="Espirángulo — Christian Luciani">

<!-- teal -->
<img height="24" src="https://cdn.jsdelivr.net/gh/ChristianLuciani/cluciani-brand-kit@main/assets/badge/espirangulo-teal.svg" alt="Espirángulo">

<!-- dark mode: oro en claro, blanco en oscuro -->
<img height="24" src="https://cdn.jsdelivr.net/gh/ChristianLuciani/cluciani-brand-kit@main/assets/badge/espirangulo-adaptive.svg" alt="Espirángulo — Christian Luciani">
```

En Markdown:

```md
![Espirángulo](https://cdn.jsdelivr.net/gh/ChristianLuciani/cluciani-brand-kit@main/assets/badge/espirangulo.svg)
```

Render de tamaños y variantes: [`badge-render.png`](badge-render.png) (el HTML
que lo produce es [`badge-render.html`](badge-render.html), con los SVG
relativos; abrirlo directo o servirlo con `python3 -m http.server`).

**Límite del camino estático:** el color es el archivo. jsDelivr no puede
recolorear por URL; si querés un color que no está en la tabla, sumá una
variante al generador o usá el Worker (§3).

## 3. Camino B — Worker (dinámico, opcional)

`cdn/` implementa el contrato de `cdn.simpleicons.org` para color arbitrario:

```text
GET /espirangulo
GET /espirangulo/:color
GET /espirangulo/:color/:darkModeColor
    ?size=<px>&viewbox=auto
```

| Segmento / query | Comportamiento |
|---|---|
| `:color` | Hex de 3, 4, 6 u 8 dígitos, o keyword CSS (`hotpink`, `white`, …). Inválido o `_` → **oro de marca `#c9a84c`**. |
| `:darkModeColor` | Si está presente y **difiere** del claro, el fill viaja en `<style>` y respeta `prefers-color-scheme: dark`. Si es igual, no se emite `<style>`. |
| `size` | Entero en px; se trunca y se clampa a **3–16383**. Agrega `width`/`height`. |
| `viewbox=auto` | Aceptado. **No-op**: el icono ya es cuadrado y recortado al contorno. |

Respuesta: `image/svg+xml`, un único `<path>`, `role="img"` + `<title>`, CORS
`*`, `Cache-Control: public, max-age=86400, s-maxage=31536000,
stale-while-revalidate=604800`, CSP `default-src 'none'; style-src
'unsafe-inline'` y `X-Content-Type-Options: nosniff`. Los `GET 200` se guardan
en la **Cache API** del Worker.

Sin deploy, el mismo Worker se sirve en local:

```bash
npm run badge:preview     # http://127.0.0.1:8788/preview
curl -s http://127.0.0.1:8788/espirangulo/00c9c0
```

## 4. El icono: mini, monocromo, derivado

El badge **no es el mark**: es el **mini** (C + supernova) que el manual ya usa
para favicon y para el mark persistente de ≤ 42 px (`docs/composicion.md` §1 y
§3). Hereda esa fila; no introduce una composición nueva.

- **Fuente:** `assets/logo/favicon-aurea.svg`.
- **Generación:** `tools/badge/generate-badge.mjs` extrae el path de la C y el
  núcleo de la supernova, los combina en **un solo path** y escribe tanto
  `cdn/src/icon.generated.mjs` como los SVG de `assets/badge/`. Ambos salen de
  la misma función de render (`cdn/src/icon.mjs`): archivo y endpoint no pueden
  divergir.
- **Qué se omite:** los dos halos de la supernova (gradientes con alpha,
  invisibles a 16–32 px y sin sentido en un icono de un solo color) y el fondo.
- **Qué se conserva:** el contorno de la C (marco redondeado y terminales) y el
  núcleo de la supernova, ambos rellenos con el color pedido.
- **Color:** monocromo por contrato. El acabado ámbar→oro→luz y el coral de la
  supernova siguen siendo la firma del **mark** en `assets/logo/`; este badge no
  los reemplaza.

Esto es una **derivación declarada** para badges/iconos, no una regla nueva del
mark. Si el favicon canónico cambia, `npm run badge:generate` propaga el cambio
y `npm test` falla hasta hacerlo.

## 5. Deploy del Worker (opcional, operador)

Requiere una cuenta de Cloudflare y autenticación de Wrangler
(`wrangler login`, o `CLOUDFLARE_API_TOKEN` en el entorno). **No hay deploy en
CI**: requiere credenciales de cuenta y publicar es una acción del operador.

```bash
cd cdn
npx wrangler@4.158.0 deploy
```

Wrangler imprime la URL `https://cluciani-brand-cdn.<subdominio>.workers.dev`.
Ese es el host del §3.

Dominio propio (opcional): descomentar `routes` en `cdn/wrangler.toml`, fijar el
patrón y volver a desplegar. Es una decisión de marca/infraestructura, no
técnica: no está tomada acá.

El Worker no usa KV, R2 ni D1, y no hace red en runtime. El único estado de
configuración es el código desplegado; el Cache API guarda respuestas del
icono, no datos de usuario.

## 6. Verificación

```bash
npm test                                   # contrato + estáticos + no-deriva
npm run badge:check                        # 8 salidas ≡ favicon-aurea.svg
npm run badge:generate                     # regenerar tras tocar el favicon
```

Los tests cubren: default, hex 3/4/6/8, keywords, fallback de inválidos, `_`,
dark mode (con y sin style), `size`/clamp, `viewbox=auto`, slug
case-insensitive, trailing slash, 404/405/HEAD, redirect de root, favicon 204,
headers de CDN, CSP, un solo path, Cache API y sincronía byte a byte de los
siete SVG estáticos con el render del Worker.

## 7. Límites declarados

- **Un solo slug y un solo icono:** `espirangulo`, mini. No se sirven `settled`,
  `layers`, lockups ni `-teal-gold`; esos viven en `assets/logo/` y tienen su
  propio contrato de composición.
- **Estático:** color fijo por archivo; sin `?size=` (el tamaño lo controla el
  HTML) y sin `viewbox=auto` (el SVG ya es cuadrado).
- **Sin purga automática en el Worker:** el Cache API guarda cada URL según
  `s-maxage` (un año). Un deploy nuevo **no** invalida entradas ya cacheadas: un
  cambio se ve al expirar, con purga manual o con un cambio de URL. El
  versionado de los assets es por tag.
- **`@main` es mutable:** jsDelivr lo cachea y no es una versión; para
  reproducibilidad, pineá el tag.
- **Sin analytics ni logs de requests** más allá de la observabilidad del
  Worker.
- **Derechos:** el repo es `UNLICENSED`. Servir el icono no concede licencia de
  uso de la marca; ver `LICENSE` y `TRADEMARK.md`.
