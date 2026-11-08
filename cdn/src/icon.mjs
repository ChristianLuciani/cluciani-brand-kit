// Render del SVG del badge. Puro: recibe el icono ya derivado y colores ya
// normalizados. Lo comparten el Worker (color por URL) y el generador de los
// assets estáticos para jsDelivr; así el archivo y el endpoint no divergen.

/** Devuelve el SVG de un solo <path>. `darkColor` sólo aplica en dark mode. */
export function renderSvg({
  path,
  viewBox,
  title,
  color,
  darkColor = null,
  size = null,
}) {
  const attrs = [
    'xmlns="http://www.w3.org/2000/svg"',
    `viewBox="${viewBox}"`,
    'role="img"',
  ];
  if (size !== null) attrs.push(`width="${size}"`, `height="${size}"`);

  const titleTag = `<title>${title}</title>`;
  const pathTag = `<path d="${path}"/>`;
  const darkMode = darkColor !== null && darkColor !== color;

  if (darkMode) {
    return `<svg ${attrs.join(' ')}>${titleTag}<style>path{fill:${color}}@media (prefers-color-scheme:dark){path{fill:${darkColor}}}</style>${pathTag}</svg>`;
  }

  return `<svg fill="${color}" ${attrs.join(' ')}>${titleTag}${pathTag}</svg>`;
}
