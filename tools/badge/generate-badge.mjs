#!/usr/bin/env node
// Genera el icono del CDN desde el mini canónico del brand kit.
//
// Fuente única: assets/logo/favicon-aurea.svg (C + supernova ×4, sin fondo).
// El badge es monocromo por contrato (estilo simple-icons): se toma la C y el
// núcleo de la supernova, se omiten los halos (gradientes con alpha, invisibles
// a 16–32 px y sin sentido en un icono de un solo color) y se combinan en un
// único <path>.
//
// Escribe dos salidas con la misma fuente y el mismo render:
//   cdn/src/icon.generated.mjs          (Worker)
//   assets/badge/espirangulo*.svg       (estáticos para jsDelivr)
//
// Uso:
//   node tools/badge/generate-badge.mjs           # regenera todo
//   node tools/badge/generate-badge.mjs --check   # falla si algo quedó stale

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { renderSvg } from '../../cdn/src/icon.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SOURCE = resolve(ROOT, 'assets/logo/favicon-aurea.svg');
const OUT = resolve(ROOT, 'cdn/src/icon.generated.mjs');
const STATIC_DIR = resolve(ROOT, 'assets/badge');

const TITLE = 'Espirángulo — Christian Luciani';
const DEFAULT_COLOR = '#c9a84c';

// Set estático mínimo para consumir por jsDelivr sin deploy. El color es el
// archivo: para un color arbitrario está el Worker (docs/badge.md §5).
export const STATIC_VARIANTS = [
  { file: 'espirangulo.svg', color: DEFAULT_COLOR },
  { file: 'espirangulo-teal.svg', color: '#00c9c0' },
  { file: 'espirangulo-amber.svg', color: '#d99a2b' },
  { file: 'espirangulo-deep.svg', color: '#8a5a1c' },
  { file: 'espirangulo-night.svg', color: '#050810' },
  { file: 'espirangulo-white.svg', color: '#ffffff' },
  { file: 'espirangulo-adaptive.svg', color: DEFAULT_COLOR, darkColor: '#ffffff' },
];

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

/** Renderiza los SVG estáticos (misma plantilla que el Worker). */
export function renderStaticFiles(icon = buildIcon()) {
  const files = new Map();
  for (const variant of STATIC_VARIANTS) {
    files.set(
      `assets/badge/${variant.file}`,
      `${renderSvg({
        path: icon.path,
        viewBox: icon.viewBox,
        title: icon.title,
        color: variant.color,
        darkColor: variant.darkColor ?? null,
      })}\n`,
    );
  }
  return files;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes('--check');
  const icon = buildIcon();
  const outputs = new Map([
    ['cdn/src/icon.generated.mjs', renderModule(icon)],
    ...renderStaticFiles(icon),
  ]);

  if (check) {
    const stale = [];
    for (const [relative, expected] of outputs) {
      let current = '';
      try {
        current = readFileSync(resolve(ROOT, relative), 'utf8');
      } catch {
        // missing → stale
      }
      if (current !== expected) stale.push(relative);
    }
    if (stale.length > 0) {
      console.error(`badge: salidas desactualizadas (${stale.length}):`);
      for (const file of stale) console.error(`  - ${file}`);
      console.error('Corré `npm run badge:generate`.');
      process.exitCode = 1;
    } else {
      console.log(`badge: ${outputs.size} salidas ≡ assets/logo/favicon-aurea.svg`);
    }
  } else {
    mkdirSync(STATIC_DIR, { recursive: true });
    for (const [relative, content] of outputs) {
      writeFileSync(resolve(ROOT, relative), content);
    }
    console.log(`badge: ${outputs.size} salidas escritas (Worker + assets/badge/)`);
  }
}
