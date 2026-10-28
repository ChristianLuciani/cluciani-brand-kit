# Changelog

## Unreleased

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
