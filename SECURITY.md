# Security policy

## Alcance

`cluciani-brand-kit` es un repo **público** que publica assets de marca y el
generador que los produce. Interesan reportes sobre:

- **Integridad de los assets publicados** por tag/CDN (un asset que no coincide
  con `tools/logo/assets.sha256`).
- **Cadena de suministro**: dependencias (`package-lock.json`), workflows de
  GitHub Actions y permisos.
- **Secretos expuestos** en el historial o en archivos del repo.
- **Ejecución de código** en `tools/` (scripts locales y CI).

Fuera de alcance: el uso no autorizado de la marca (ver
[TRADEMARK.md](../TRADEMARK.md) y [LICENSE](../LICENSE)) y reportes de
infraestructura de terceros (GitHub, jsDelivr).

## Cómo reportar

Usá **private vulnerability reporting** del repo:
<https://github.com/ChristianLuciani/cluciani-brand-kit/security/advisories/new>.
No abras un issue público con el detalle de la vulnerabilidad.

Incluí: versión/tag afectado, pasos de reproducción, impacto y, si aplica, el
commit o asset exacto. Acuse de recibo dentro de 7 días; no hay bug bounty.

## Versiones soportadas

Sólo el último tag (`v1.1.0` al día de este documento) recibe correcciones. Los
tags son inmutables: un asset publicado no cambia; un defecto de seguridad se
corrige en un tag nuevo.

## Divulgación

Coordinamos la divulgación en un GitHub Security Advisory. Sin fecha de
embargo fija; se publica cuando hay fix o a los 90 días, lo que ocurra primero.
