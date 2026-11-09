# Changelog

## v1.3.0 — 2026-11-08

Release del badge: el Espirángulo se publica como **icono estático por
jsDelivr** (siete variantes) y, opcionalmente, como **Worker colorable**. Es
aditivo: no toca ningún asset de `assets/logo/` ni la geometría; sólo suma
`assets/badge/`, el generador y su documentación.

### Badge (Espirángulo)

- **`assets/badge/`** — siete SVG estáticos del mini monocromo (oro default,
  teal, ámbar, oro profundo, night, blanco y `-adaptive` con dark mode) para
  consumir por jsDelivr, la CDN que el repo ya usa. Sin cuenta ni deploy;
  `@v1.3.0` fija las URLs y `@main` sirve para pruebas mientras el tag no exista.
- **`tools/badge/generate-badge.mjs`** — deriva el icono (un solo `<path>`) de
  `assets/logo/favicon-aurea.svg` y escribe los estáticos y el módulo del
  Worker con la misma función de render; `npm run badge:check` y el test fallan
  si algo queda stale. No se edita a mano.
- **`cdn/`** — Worker Cloudflare **opcional** para color arbitrario por URL
  (`/espirangulo[/:color[/:dark]]?size=&viewbox=auto`), Cache API, CORS, CSP y
  cache headers. Simple Icons no puede alojar la marca (excluye personas).
- **Tests** — 27 casos: color/fallback, dark mode, tamaño, rutas, métodos,
  headers, Cache API, no-deriva y paridad byte a byte de los estáticos.
- **Deploy opcional** — sólo si se usa el Worker; requiere cuenta Cloudflare
  (`cd cdn && npx wrangler@4.158.0 deploy`). No hay deploy en CI.

## v1.2.0 — 2026-11-03

Release de composición: el **settled** pasa a ser el default documentado, con
lockups canónicos y un set de exports propio, y `prefers-reduced-motion` deja
de perder el mark. **Nada se renombra**: los nombres existentes conservan su
contenido; lo nuevo se publica con nombre propio.


- **Lockups settled**: nuevos `logo-{aurea,base}-lockup-settled{,-light}.svg` —
  el lockup canónico sin constelación. El lockup existente queda como variante
  permitida (#6).
- **Exports settled**: set aditivo `logo-aurea-settled-*` (512–4096, print A4/A3
  y og-image) con nombres propios. Los PNG actuales conservan su nombre y su
  contenido (set full, con constelación): nada se renombra (#6).
- **`prefers-reduced-motion`**: la animación conserva la supernova y el cielo,
  y queda **estática** (sin titileo, fade ni respiración). Los 21 vértices no
  se dibujan. El guard ya no envuelve cielo ni supernova (#6).

<!-- composición: 89/52/4/33/3/0 (total/mirror/diverged/local/retired/dropped) -->

- **Composición** (la imprime el gate): **89 archivos** — **52** espejados de
  la fuente, **4** divergentes (favicons de tile lleno de #4; la fuente todavía
  tiene la versión previa), **33** propios (`favicon-*-teal*`, `*-lockup-settled*` y `*-settled-*`) y **3**
  retirados (`favicon-{aurea,base}-16.png` transparentes, #4; más el `README.md`
  de la carpeta de assets de la fuente). Ningún archivo `dropped`.
  Si la composición cambia, el test falla hasta actualizar README, manual y
  este CHANGELOG en el mismo PR.

## v1.1.0 — 2026-11-02

Release que lleva a un tag lo que `v1.0.1` no alcanzaba: la **política de
favicons 16/32** y los **favicons con tile teal**, que hasta ahora sólo vivían
en `main`. Respecto de `v1.0.1`, los únicos archivos de `assets/` que cambian
son los 16 de la familia de favicons (diez teal nuevos, cuatro de tile lleno
re-renderizados y los dos `-16` transparentes retirados); el resto es
byte-idéntico a `v1.0.1` y `tools/logo/assets.sha256` lo fija. Este release
**no regenera ningún asset**: `npm test` y `node tools/logo/verify-assets.mjs`
verifican la paridad.

La sección recoge además lo que estaba bajo `## Unreleased`: el nombre del mark
**Espirángulo** y el gate de paridad de assets (issue #3), y el sync del acabado
de la C en la animación (issue #1). Los consumidores deben pinnear `v1.1.0` (o
posterior) para alcanzar los favicons teal.

### Espirángulo — nombre del mark y paridad de assets (issue #3)

**Espirángulo** (espiral + triángulo) es el nombre ratificado del **mark** por
el operador el **2026-10-27**. Nombra el símbolo, no el wordmark: «Christian
Luciani» en la tipografía del lockup sigue siendo el nombre de marca. No toca
geometría, paleta ni un solo asset (`assets/` sin diff) y no reabre el alcance
del issue #1 (acabado de la C).

- **README y manual** (`README.md`, `docs/logo.md`): el nombre entra en la
  intro y en el título del manual, con la distinción mark ≠ wordmark. La §10.1
  nueva documenta la paridad con la fuente.
- **Gate de paridad** (`tools/logo/verify-assets.mjs`, nuevo + manifiesto
  `tools/logo/assets.sha256`): sin red, verifica que `assets/logo/` coincide
  con el manifiesto (sha256 por archivo + origen declarado: `mirror` /
  `diverged` / `local` / `retired`, con la razón de cada no-`mirror` escrita en
  el manifiesto). Con `--from-source` re-deriva la verdad de
  `ChristianLuciani/christianluciani.github.io` › `assets/brand/logo/` y falla
  ante cualquier drift. `mirror` se recalcula de la fuente; los otros tres
  orígenes son declaraciones explícitas: `--from-source --write` **no puede
  mover sus bytes** sin que la misma invocación los declare con
  `--diverge`/`--local`/`--retire` y un `--reason`, que queda en el diff. El
  parser valida además los conteos `(n)` de los encabezados. CI corre el modo
  offline en cada push.
- **Números publicados**: un test deriva la composición del manifiesto y la
  contrasta contra README, manual y este CHANGELOG por tres vías — la línea
  canónica `<!-- composición: … -->`, **todas** las frases `**N archivos**` (no
  sólo la primera) y **todo** total publicado (`N archivos` / `N assets`)—, así
  que una cifra no puede quedar actualizada en una sola superficie ni
  contradecirse en otra frase.
- **Límite declarado**: CI no consulta la fuente, así que verde significa «el
  árbol es el declarado», no «la fuente no avanzó». La frescura contra la
  fuente es manual (`--from-source --ref main`, documentado en README y en el
  step de CI) y hoy está verde: el artefacto compara **contenido**, así que un
  `main` que avanza sin tocar assets no la rompe, y un asset nuevo/cambiado sí.
  El `README.md` de la carpeta de assets de la fuente va `retired` (es
  documentación, no un asset) y el `source_ref` se pinea a un commit.
  La composición del manifiesto se publica en **Unreleased**: este corte
  histórico no lleva cifra.
- **README — corrección de afirmaciones vencidas**: «Estado de la animación»
  decía que `aurea7.html` todavía dibujaba la C plana (el sync de #1 ya la
  dibuja como banda con máscara) y apuntaba a #56 como trabajo en curso (está
  cerrado desde 2026-10-23). Se corrige el texto, no la animación.
- Release: **v1.1.0** (este corte); el tag y la publicación los ejecuta el
  operador.

### Sync del acabado de la C (issue #1)

Sync del acabado de la C desde `cv-cluciani` `main` @ `8c2a110` (issue #1;
PRs #64/#65/#66 de ese repo). **Assets sin cambios**: `assets/logo/` ya
tenía el acabado (idénticos a v1.0.1); cambian animación, gate y manual.

- **Animación** (`proposals/logo-triangulo-espiral/aurea7.html`): la C deja
  de ser un `path.seg` con `stroke` y pasa a **banda** — `CFINISH`,
  `buildCBand`/`buildCDefs`, gradientes de bisel por tramo (`c-perp-*`),
  barrido (`c-tint-*`), filtro `c-bloom` y máscara `c-reveal` que traza el
  `cPathD` central para conservar el timing. Se retira el filtro `soft`.
- **Gate** (`tools/logo/verify-dom-fidelity.mjs`): además de la geometría de
  referencia, verifica el **contorno** de la C (`cBand`), la **máscara
  aplicada** en el render normal y el **acabado completo** (stops del bisel,
  color/opacidad del barrido y `stdDeviation` del bloom) contra `cFinish`.
  Banner: `animación v16 + acabado #55`.
- **Manual** (`docs/logo.md`): §1 (la animación ya refleja el acabado), §3.1
  (el acabado se declara en `cFinish`) y §4 (alcance del gate, con su límite
  declarado: compara lo declarado en `defs`, no la pintura). §6 y §7 son
  byte-idénticos a la fuente y no cambian; §10 sólo diverge en paths y
  comandos propios del repo del sitio.
- Release: este sync propuso **v1.0.2**; el operador ratificó **v1.1.0**
  (2026-11-02, minor por favicons teal + política 16/32), que es este corte.
  El tag y la publicación siguen siendo del operador.

- **Favicon**: el icono llena el tile (~91%, antes ~75% de alto y ~56% de
  ancho), la barra se engrosa ×4 y el punto de la supernova ×4 sólo en el
  icono (`FAVICON` en `geometry.mjs`); el viewBox se computa del contorno
  real de la barra. Variantes de tile lleno: **`-teal`** (fondo `#00c9c0` +
  C en night, 9.7:1) y **`-teal-gold`** (fondo teal + C con el acabado
  ámbar→oro→luz del mark; sólo 32/SVG, a 16 px el oro no se aprecia).
  La variante transparente también queda 32/SVG: a 16 px el oro sin fondo
  no se aprecia sobre un tab arbitrario; para 16 se publica sólo `-teal`.
  Regeneración selectiva: `npm run logo:favicons`.
- **Tooling**: `--only-favicon`, perfil único de Chrome por captura dentro de
  `TMP` y `CHROME_NO_SANDBOX=1` opt-in para sandboxes externos.

## v1.0.1 — 2026-10-22

- Tooling: `vitest` fijado a 4.0.18 (npm 10 falla al resolver 4.1.10 con
  `edgesOut`) + `package-lock.json`; CI usa `npm ci`. **Assets sin cambios**
  (idénticos a v1.0.0).

## v1.0.0 — 2026-10-22

Primera versión canónica del brand kit, importada desde `cv-cluciani`
(issue #54; PRs #53, #58 y #63).

- **La C**: barra con bisel transversal (luz → oro → sombra), barrido
  ámbar→oro→luz, vértice tipo marco de inglete con esquinas redondeadas y
  terminales circulares convexos.
- **Cuarto color**: ámbar dorado `#d99a2b` (calidez, sin salir del oro).
- **Familias**: night (bloom cálido) y light (sin bloom, sombra neutra);
  assets SVG, PNG 512–4096 y print A4/A3 300 dpi.
- **Favicon**: C del mark en oro plano + supernova.
- **Herramientas**: generador paramétrico (`geometry.mjs`), tests de
  invariantes y gate de fidelidad contra el DOM aprobado.
