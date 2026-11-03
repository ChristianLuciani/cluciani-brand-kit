/**
 * Guarda del estado `prefers-reduced-motion` (decisión #6, 2026-11-02).
 *
 * El gate de fidelidad (`verify-dom-fidelity.mjs`) verifica la COMPOSICIÓN
 * reducida pero no su estaticidad: borrar el bloque CSS de la media query
 * dejaba el gate en verde mientras el render corría 82 animaciones (pase 2 del
 * PR #12). Chrome headless no expone `getAnimations()` sin CDP, así que la
 * estaticidad se guarda en el único plano que sí es determinista: el fuente.
 *
 * Este test falla si alguien:
 *  - quita `animation:none` de la media query,
 *  - vuelve a envolver cielo/constelación en `if (!reduced)`,
 *  - o reactiva la disolución de los vértices en reduced.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const ANIMATIONS = [
  'proposals/logo-triangulo-espiral/aurea7.html',
  'proposals/logo-triangulo-espiral/index.html',
];

describe('prefers-reduced-motion: estado final estático', () => {
  for (const file of ANIMATIONS) {
    it(`${file}: la media query apaga titileo, fade y respiración`, async () => {
      const html = await readFile(join(ROOT, file), 'utf8');
      const mq = html.match(/@media \(prefers-reduced-motion: reduce\)\{[\s\S]*?\n  \}/);
      expect(mq, 'falta la media query de reduced').toBeTruthy();
      expect(mq[0], 'el cielo y la constelación quedan animados (fadeIn)').toMatch(
        /\.sky,\.constellation\{[^}]*animation:none/,
      );
      expect(mq[0], 'las estrellas quedan animadas (twinkle)').toMatch(/\.ambient[^{]*\{[^}]*animation:none/);
      expect(mq[0], 'la C queda animada (breathe)').toMatch(/\.c-glow[^{]*\{[^}]*animation:none/);
    });

    it(`${file}: en reduced se construyen cielo y supernova, no los vértices`, async () => {
      const html = await readFile(join(ROOT, file), 'utf8');
      expect(html, 'los vértices se dibujan también en reduced').toContain('if (reduced && j > 0) return;');
      expect(html, 'la disolución de vértices corre también en reduced').toMatch(/if \(!reduced\) pts\.forEach/);
    });
  }
});
