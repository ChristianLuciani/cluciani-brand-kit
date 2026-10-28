# Changelog

## Unreleased

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
  contrasta contra README, manual y este CHANGELOG, así que una cifra no puede
  quedar actualizada en una sola superficie.
- **Límite declarado**: CI no consulta la fuente, así que verde significa «el
  árbol es el declarado», no «la fuente no avanzó». La frescura contra la
  fuente es manual (`--from-source`, documentado en README y en el step de CI);
  hoy la fuente en `main` ya sumó `assets/brand/logo/README.md` después del pin.
- **Composición** (la imprime el gate): **66 archivos** — **52** espejados de
  la fuente @ `8c2a110`, **4** divergentes (favicons de tile lleno de #4; la
  fuente todavía tiene la versión previa), **10** propios (`favicon-*-teal*`) y
  **2** retirados (`favicon-{aurea,base}-16.png` transparentes, #4). Si la
  composición cambia, el test falla hasta actualizar README, manual y este
  CHANGELOG en el mismo PR.
- **README — corrección de afirmaciones vencidas**: «Estado de la animación»
  decía que `aurea7.html` todavía dibujaba la C plana (el sync de #1 ya la
  dibuja como banda con máscara) y apuntaba a #56 como trabajo en curso (está
  cerrado desde 2026-10-23). Se corrige el texto, no la animación.
- Release: misma ventana que #1; versión y tag los decide el operador.

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
- Release **v1.0.2** propuesto: tag, fecha de release y bump de `package.json`
  los decide el operador (este sync no los toca).

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
