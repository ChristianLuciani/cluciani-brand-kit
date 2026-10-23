# Changelog

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
