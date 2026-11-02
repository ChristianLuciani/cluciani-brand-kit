/**
 * Guarda de la matriz de composición (issue #6).
 *
 * La matriz vive en `tools/logo/composition.json`; la decisión, en
 * `docs/composicion.md`. Este test NO decide: verifica que lo publicado y lo
 * generado no deriven en silencio.
 *
 *  1. cada artefacto derivable declara su composición y coincide con el SVG;
 *  2. ningún SVG áurea queda fuera de la matriz (cobertura);
 *  3. cada artefacto de la matriz aparece en la tabla del manual (doc ↔ dato);
 *  4. todo objetivo está declarado y su estado usa el vocabulario cerrado.
 *
 * Si cambia la composición de un asset, este test falla a propósito: hay que
 * actualizar la matriz y el manual en el mismo PR (#7 es el antecedente para
 * los conteos; acá el eje es la composición).
 */
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = new URL('../..', import.meta.url).pathname;
const MATRIX = join(ROOT, 'tools/logo/composition.json');
const MANUAL = join(ROOT, 'docs/composicion.md');

/** Deriva la composición de un SVG generado: hechos del archivo, no del issue. */
function derive(svg) {
  const stars = new Set([...svg.matchAll(/id="logo-star-(\d+)"/g)].map((m) => Number(m[1])));
  const supernova = stars.has(0) || /id="logo-supernova"/.test(svg);
  return {
    espiral: /id="logo-spiral"/.test(svg),
    c: /id="logo-c-triespiral"/.test(svg),
    supernova,
    cielo: /id="logo-background"/.test(svg),
    // star 0 ES la supernova; los vértices son los grupos restantes.
    vertices: Math.max(0, stars.size - 1),
    lineas: (svg.match(/<line\b/g) || []).length,
    paths: (svg.match(/<path\b/g) || []).length,
  };
}

async function load() {
  const matrix = JSON.parse(await readFile(MATRIX, 'utf8'));
  const manual = await readFile(MANUAL, 'utf8');
  const files = (await readdir(join(ROOT, 'assets/logo'))).filter((f) => f.endsWith('.svg'));
  return { matrix, manual, files };
}

describe('matriz de composición', () => {
  it('deriva la composición de cada artefacto y coincide con el SVG', async () => {
    const { matrix } = await load();
    for (const [id, row] of Object.entries(matrix.artefactos)) {
      const svg = await readFile(join(ROOT, row.path), 'utf8');
      const derived = derive(svg);
      expect(derived, `${id} (${row.path}): la composición declarada no coincide con el SVG`).toEqual(
        row.composicion,
      );
    }
  });

  it('ningún SVG áurea queda fuera de la matriz', async () => {
    const { matrix, files } = await load();
    const declared = new Set(Object.values(matrix.artefactos).map((r) => r.path.split('/').pop()));
    const fuera = new Set(matrix.fueraDeMatriz);
    const sinFila = files.filter((f) => !declared.has(f) && !fuera.has(f));
    expect(sinFila, 'estos SVG no están ni en la matriz ni declarados fuera de alcance').toEqual([]);
    for (const f of fuera) {
      expect(files, `fueraDeMatriz lista un archivo inexistente: ${f}`).toContain(f);
    }
  });

  it('cada artefacto de la matriz aparece en la tabla del manual', async () => {
    const { matrix, manual } = await load();
    for (const [id, row] of Object.entries(matrix.artefactos)) {
      expect(manual, `docs/composicion.md no menciona el id «${id}»`).toContain(`\`${id}\``);
      expect(manual, `docs/composicion.md no menciona el path ${row.path}`).toContain(row.path);
    }
  });

  it('todo objetivo está declarado y el estado usa el vocabulario cerrado', async () => {
    const { matrix } = await load();
    expect(matrix.estado).toBe('propuesta');
    for (const [id, row] of Object.entries(matrix.artefactos)) {
      expect(row.objetivo, `${id}: falta el objetivo`).toBeTruthy();
      expect(['coincide', 'deriva', 'excepcion-declarada'], `${id}: estado fuera de vocabulario`).toContain(
        row.estado,
      );
      expect(typeof row.ratificado, `${id}: falta ratificado`).toBe('boolean');
    }
  });
});
