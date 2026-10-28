# Changelog

## Unreleased

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
