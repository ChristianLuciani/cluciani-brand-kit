#!/usr/bin/env node
// Genera el icono del CDN desde el mini canónico del brand kit.
//
// Fuente única: assets/logo/favicon-aurea.svg (C + supernova ×4, sin fondo).
// El badge es monocromo por contrato (estilo simple-icons): se toma la C y el
// núcleo de la supernova, se omiten los halos (gradientes con alpha, invisibles
// a 16–32 px y sin sentido en un icono de un solo color) y se combinan en un
// único <path>.
//
// Uso:
//   node tools/badge/generate-badge.mjs           # escribe cdn/src/icon.generated.mjs
//   node tools/badge/generate-badge.mjs --check   # falla si el archivo está stale

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SOURCE = resolve(ROOT, 'assets/logo/favicon-aurea.svg');
const OUT = resolve(ROOT, 'cdn/src/icon.generated.mjs');

const TITLE = 'Espirángulo — Christian Luciani';
const DEFAULT_COLOR = '#c9a84c';

/** Extrae la C y el núcleo de la supernova y los une en un solo path. */
export function buildIcon(sourceSvg = readFileSync(SOURCE, 'utf8')) {
  const viewBox = /<svg\b[^>]*\bviewBox="([^"]+)"/.exec(sourceSvg)?.[1];
  if (!viewBox) throw new Error('favicon-aurea.svg: falta viewBox');

  const cGroup = /<g id="logo-c-triespiral"[\s\S]*?<\/g>/.exec(sourceSvg)?.[0];
  const cPath = cGroup && /<path\b[^>]*\bd="([^"]+)"/.exec(cGroup)?.[1];
  if (!cPath) throw new Error('favicon-aurea.svg: falta el path de la C');

  const novaGroup = /<g id="logo-supernova"[\s\S]*?<\/g>/.exec(sourceSvg)?.[0];
  if (!novaGroup) throw new Error('favicon-aurea.svg: falta la supernova');

  // Los círculos del grupo son halos (r 44.8 y 26.6) y el núcleo (r 24.8).
  // El núcleo es el último y el único con opacity="1".
  const circles = [...novaGroup.matchAll(/<circle\b[^>]*>/g)].map(([tag]) => ({
    cx: Number(/\bcx="([^"]+)"/.exec(tag)?.[1]),
    cy: Number(/\bcy="([^"]+)"/.exec(tag)?.[1]),
    r: Number(/\br="([^"]+)"/.exec(tag)?.[1]),
    opacity: /\bopacity="([^"]+)"/.exec(tag)?.[1],
  }));
  const core = circles.findLast((c) => c.opacity === '1');
  if (!core || !Number.isFinite(core.cx + core.cy + core.r) || core.r <= 0) {
    throw new Error('favicon-aurea.svg: falta el núcleo de la supernova');
  }

  // Un círculo como dos arcos: mismo contorno, sin <circle> (contrato simple-icons).
  const { cx, cy, r } = core;
  const circlePath = `M ${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;

  return {
    viewBox,
    path: `${circlePath} ${cPath}`,
    title: TITLE,
    defaultColor: DEFAULT_COLOR,
  };
}

/** Serializa el módulo que consume el Worker (determinista, byte a byte). */
export function renderModule(icon = buildIcon()) {
  return `// GENERADO por tools/badge/generate-badge.mjs — NO EDITAR A MANO.
// Fuente: assets/logo/favicon-aurea.svg (mini: C + supernova; halos omitidos
// porque el badge es monocromo). Regenerar: npm run badge:generate
export const VIEWBOX = ${JSON.stringify(icon.viewBox)};
export const PATH = ${JSON.stringify(icon.path)};
export const TITLE = ${JSON.stringify(icon.title)};
export const DEFAULT_COLOR = ${JSON.stringify(icon.defaultColor)};
`;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes('--check');
  const rendered = renderModule();

  if (check) {
    let current = '';
    try {
      current = readFileSync(OUT, 'utf8');
    } catch {
      // cae al error de abajo con el mensaje correcto
    }
    if (current !== rendered) {
      console.error('badge: icon.generated.mjs está desactualizado. Corré `npm run badge:generate`.');
      process.exitCode = 1;
    } else {
      console.log('badge: icon.generated.mjs ≡ assets/logo/favicon-aurea.svg');
    }
  } else {
    writeFileSync(OUT, rendered);
    console.log(`badge: escrito ${OUT}`);
  }
}
