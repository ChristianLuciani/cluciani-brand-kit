# Badge CDN — Espirángulo

> **Estado: implementado, sin deploy.** El Worker, el contrato y los tests viven
> en este repo; la URL pública la crea el operador en Cloudflare (§5). Hasta
> entonces el mismo código se sirve en local con `npm run badge:preview`.

**Cubre:** el endpoint HTTP del icono (rutas, color, dark mode, tamaño, headers)
y su derivación desde el mini canónico.
**No cubre:** el mark completo, el lockup, los PNG/SVG de `assets/logo/` ni la
decisión de dominio público.
`as_of: 2026-11-08`

## 1. Por qué no Simple Icons

El pedido original era un badge «tipo `cdn.simpleicons.org`». Ese CDN no puede
servir esta marca: [Simple Icons excluye explícitamente las marcas que
representan a una persona](https://github.com/simple-icons/simple-icons/blob/develop/CONTRIBUTING.md)
(«Any brands representing individuals rather than an organization, company, or
product»). No es un trámite pendiente: es un criterio de alcance.

La alternativa es un CDN propio con el mismo contrato. Eso es lo que implementa
`cdn/`.

## 2. Contrato

```text
GET /espirangulo
GET /espirangulo/:color
GET /espirangulo/:color/:darkModeColor
    ?size=<px>&viewbox=auto
```

| Segmento / query | Comportamiento |
|---|---|
| `:color` | Hex de 3, 4, 6 u 8 dígitos, o keyword CSS (`hotpink`, `white`, …). Inválido o `_` → **oro de marca `#c9a84c`** (mismo fallback que simple-icons). |
| `:darkModeColor` | Si está presente y **difiere** del claro, el fill viaja en `<style>` y respeta `prefers-color-scheme: dark`. Si es igual, no se emite `<style>`. |
| `size` | Entero en px; se trunca y se clampa a **3–16383**. Agrega `width`/`height`. |
| `viewbox=auto` | Aceptado. **No-op**: el icono ya es cuadrado y está recortado al contorno. |

Respuesta: `image/svg+xml`, un único `<path>`, `role="img"` + `<title>`, CORS
`*`, `Cache-Control: public, max-age=86400, s-maxage=31536000,
stale-while-revalidate=604800`, CSP `default-src 'none'; style-src
'unsafe-inline'` y `X-Content-Type-Options: nosniff`. Los `GET 200` se guardan
además en la **Cache API** del Worker: el edge no cachea respuestas de Worker
sólo por el header.

Otros caminos: `/` redirige al repo, `/favicon.ico` responde `204`, slug o
segmentos desconocidos `404`, métodos distintos de `GET`/`HEAD` `405`.

## 3. El icono: mini, monocromo, derivado

El badge **no es el mark**: es el **mini** (C + supernova) que el manual ya usa
para favicon y para el mark persistente de ≤ 42 px (`docs/composicion.md` §1 y
§3). Hereda esa fila; no introduce una composición nueva.

- **Fuente:** `assets/logo/favicon-aurea.svg`.
- **Generación:** `tools/badge/generate-badge.mjs` extrae el path de la C y el
  núcleo de la supernova, los combina en **un solo path** y escribe
  `cdn/src/icon.generated.mjs`. El test falla si el archivo no coincide byte a
  byte con lo que produce el generador: nunca se edita a mano.
- **Qué se omite:** los dos halos de la supernova (gradientes con alpha,
  invisibles a 16–32 px y sin sentido en un icono de un solo color) y el fondo.
- **Qué se conserva:** el contorno de la C (marco redondeado y terminales) y el
  núcleo de la supernova, ambos rellenos con el color pedido.
- **Color:** monocromo por contrato. El acabado ámbar→oro→luz y el coral de la
  supernova siguen siendo la firma del **mark** en `assets/logo/`; este endpoint
  no los reemplaza.

Esto es una **derivación declarada** para badges/iconos, no una regla nueva del
mark. Si el favicon canónico cambia, `npm run badge:generate` propaga el cambio
y `npm test` falla hasta hacerlo.

## 4. Uso

Con la URL del deploy (`WORKER`, §5):

```html
<!-- README/sitio: tamaño controlado por atributo -->
<img height="24" src="https://WORKER/espirangulo" alt="Espirángulo — Christian Luciani">

<!-- teal de marca -->
<img height="24" src="https://WORKER/espirangulo/00c9c0" alt="Espirángulo">

<!-- dark mode: oro en claro, blanco en oscuro -->
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://WORKER/espirangulo/c9a84c/ffffff">
  <img height="24" src="https://WORKER/espirangulo/c9a84c" alt="Espirángulo — Christian Luciani">
</picture>
```

Markdown también sirve, pero el color queda fijo por URL:

```md
![Espirángulo](https://WORKER/espirangulo/00c9c0)
```

Local, sin deploy:

```bash
npm run badge:preview     # http://127.0.0.1:8788/preview
curl -s http://127.0.0.1:8788/espirangulo/00c9c0
```

## 5. Deploy (operador)

Requiere una cuenta de Cloudflare y autenticación de Wrangler
(`wrangler login`, o `CLOUDFLARE_API_TOKEN` en el entorno). **No hay deploy en
CI**: requiere credenciales de cuenta y publicar es una acción del operador.

```bash
cd cdn
npx wrangler@4.158.0 deploy
```

Wrangler imprime la URL `https://cluciani-brand-cdn.<subdominio>.workers.dev`.
Ese es el `WORKER` que reemplaza los ejemplos de §4 y el placeholder del README.

Dominio propio (opcional): descomentar `routes` en `cdn/wrangler.toml`, fijar el
patrón y volver a desplegar. Es una decisión de marca/infraestructura, no
técnica: no está tomada acá.

El Worker no usa KV, R2 ni D1, y no hace red en runtime. El único estado de
configuración es el código desplegado; el Cache API guarda respuestas del
icono, no datos de usuario.

## 6. Verificación

```bash
npm test                                   # contrato + no-deriva desde el favicon
npm run badge:check                        # icon.generated.mjs ≡ favicon-aurea.svg
npm run badge:generate                     # regenerar tras tocar el favicon
```

Los tests cubren: default, hex 3/4/6/8, keywords, fallback de inválidos, `_`,
dark mode (con y sin style), `size`/clamp, `viewbox=auto`, slug
case-insensitive, trailing slash, 404/405/HEAD, redirect de root, favicon 204,
headers de CDN, CSP, un solo path y sincronía del generado.

## 7. Límites declarados

- **Un solo slug:** `espirangulo`. No hay alias (`cluciani`, `christianluciani`)
  ni otros marks en este endpoint.
- **Un solo icono:** el mini. No se sirven `settled`, `layers`, lockups ni las
  variantes `-teal-gold`; esos viven en `assets/logo/` y tienen su propio
  contrato de composición.
- **Sin purga automática:** el Cache API guarda cada URL según `s-maxage` (un
  año). Un deploy nuevo **no** invalida entradas ya cacheadas: un cambio de
  icono/contrato tarda hasta una purga manual (dashboard/API) o un cambio de URL.
  El versionado de los assets sigue siendo por tag; el endpoint se versiona
  desplegando.
- **`viewbox=auto` es no-op** porque el icono es cuadrado; se acepta por
  compatibilidad con el contrato de simple-icons.
- **Sin analytics ni logs de requests** más allá de la observabilidad de
  Cloudflare (§`wrangler.toml`).
- **Derechos:** el repo es `UNLICENSED`. Servir el icono no concede licencia de
  uso de la marca; ver `LICENSE` y `TRADEMARK.md`.
