/**
 * Guarda de la matriz de composición (issue #6).
 *
 * La matriz vive en `tools/logo/composition.json`; la decisión, en
 * `docs/composicion.md`. Este test NO decide: verifica que lo publicado y lo
 * generado no deriven en silencio.
 *
 *  1. cada artefacto declara su composición y coincide valor por valor con el SVG;
 *  2. la tabla de §2 del manual coincide valor por valor con el JSON (no sólo
 *     los ids: cambiar un «21» por un «99» en la tabla pone rojo);
 *  3. ningún SVG áurea queda fuera de la matriz — sólo los `-base` (v10) pueden
 *     excluirse, y por nombre;
 *  4. los tres `estados` no derivables están declarados y validados;
 *  5. ratificación sin ambigüedad: `propuesta` ⇒ todo `false`;
 *     `ratificada` ⇒ todo `true`.
 *
 * Si cambia la composición de un asset, este test falla a propósito: hay que
 * actualizar la matriz y el manual en el mismo PR (#7 es el antecedente para
 * los conteos; acá el eje es la composición).
 */
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const MATRIX = join(ROOT, 'tools/logo/composition.json');
const MANUAL = join(ROOT, 'docs/composicion.md');
const ESTADOS_VOCAB = ['coincide', 'deriva', 'excepcion-declarada'];

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
    vertices: [...stars].filter((n) => n !== 0).length,
    lineas: (svg.match(/<line\b/g) || []).length,
    paths: (svg.match(/<path\b/g) || []).length,
  };
}

const yn = (cell, id) => {
  if (cell === 'sí') return true;
  if (cell === 'no') return false;
  throw new Error(`fila ${id}: columna booleana inválida «${cell}» (esperado sí|no)`);
};

/** «excepción declarada» (prosa) → `excepcion-declarada` (vocabulario del JSON). */
const estadoCell = (cell, id) => {
  const norm = cell
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '-');
  if (!ESTADOS_VOCAB.includes(norm)) {
    throw new Error(`fila ${id}: estado publicado «${cell}» fuera del vocabulario ${ESTADOS_VOCAB.join('|')}`);
  }
  return norm;
};

/** Filas de la tabla de §3 (id → estado publicado en el manual). */
function estadoTable(manual) {
  const section = manual.match(/## 3\.[\s\S]*?(?=\n## 4\.)/);
  if (!section) throw new Error('docs/composicion.md: falta la sección §3');
  const rows = new Map();
  for (const line of section[0].split('\n')) {
    if (!line.startsWith('| `')) continue;
    const cells = line.split('|').map((c) => c.trim());
    if (cells.length !== 7) throw new Error(`fila de §3 con ${cells.length - 2} columnas: ${line}`);
    rows.set(cells[1].replaceAll('`', ''), estadoCell(cells[5].replaceAll('*', ''), cells[1]));
  }
  return rows;
}

/** Filas de la tabla de §2 (id → composición publicada en el manual). */
function manualTable(manual) {
  const section = manual.match(/## 2\.[\s\S]*?(?=\n## 3\.)/);
  if (!section) throw new Error('docs/composicion.md: falta la sección §2');
  const rows = new Map();
  for (const line of section[0].split('\n')) {
    if (!line.startsWith('| `')) continue;
    const cells = line.split('|').map((c) => c.trim());
    if (cells.length !== 10) throw new Error(`fila de §2 con ${cells.length - 2} columnas: ${line}`);
    const id = cells[1].replaceAll('`', '');
    rows.set(id, {
      path: cells[2].replaceAll('`', ''),
      espiral: yn(cells[3], id),
      c: yn(cells[4], id),
      supernova: yn(cells[5], id),
      cielo: yn(cells[6], id),
      vertices: Number(cells[7]),
      estado: estadoCell(cells[8], id),
    });
  }
  return rows;
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
      expect(typeof row.objetivo, `${id}: falta objetivo`).toBe('string');
      expect(row.objetivo.trim().length, `${id}: objetivo vacío`).toBeGreaterThan(0);
      const svg = await readFile(join(ROOT, row.path), 'utf8');
      expect(derive(svg), `${id} (${row.path}): la composición declarada no coincide con el SVG`).toEqual(
        row.composicion,
      );
    }
  });

  it('la tabla de §2 coincide valor por valor con el JSON', async () => {
    const { matrix, manual } = await load();
    const table = manualTable(manual);
    expect([...table.keys()].sort(), 'la tabla de §2 y el JSON listan artefactos distintos').toEqual(
      Object.keys(matrix.artefactos).sort(),
    );
    for (const [id, row] of Object.entries(matrix.artefactos)) {
      const published = table.get(id);
      expect(published.path, `${id}: path distinto entre manual y JSON`).toBe(row.path);
      expect(published.estado, `${id}: estado distinto entre manual y JSON`).toBe(row.estado);
      for (const axis of ['espiral', 'c', 'supernova', 'cielo', 'vertices']) {
        expect(published[axis], `${id}: «${axis}» publicado en §2 no coincide con el JSON`).toBe(
          row.composicion[axis],
        );
      }
    }
  });

  it('sólo los SVG -base (v10) pueden quedar fuera de la matriz', async () => {
    const { matrix, files } = await load();
    const declared = new Set(Object.values(matrix.artefactos).map((r) => r.path.split('/').pop()));
    for (const f of matrix.fueraDeMatriz) {
      expect(f, `fueraDeMatriz sólo admite la familia v10 (…-base…): ${f}`).toMatch(/-base/);
      expect(files, `fueraDeMatriz lista un archivo inexistente: ${f}`).toContain(f);
    }
    const fuera = new Set(matrix.fueraDeMatriz);
    const sinFila = files.filter((f) => !declared.has(f) && !fuera.has(f));
    expect(sinFila, 'estos SVG no están ni en la matriz ni declarados como v10').toEqual([]);
  });

  it('la tabla de §3 coincide con el JSON y la prosa vive en el manual', async () => {
    const { matrix, manual } = await load();
    const table = estadoTable(manual);
    expect([...table.keys()].sort(), 'la tabla de §3 y el JSON listan estados distintos').toEqual(
      Object.keys(matrix.estados).sort(),
    );
    for (const [id, row] of Object.entries(matrix.estados)) {
      // El JSON declara el ESTADO; la prosa (`hoy`/`objetivo`) tiene un solo
      // hogar: el manual. Duplicarla en el JSON abría una segunda fuente que
      // podía divergir sin que el test la mirara (review #11, pase 2).
      expect(table.get(id), `§3: el estado publicado de «${id}» no coincide con el JSON`).toBe(row.estado);
      for (const field of ['fuente', 'derivacion']) {
        expect(typeof row[field], `${id}: «${field}» debe ser texto no vacío`).toBe('string');
        expect(row[field].trim().length, `${id}: «${field}» vacío`).toBeGreaterThan(0);
      }
      expect(ESTADOS_VOCAB, `${id}: estado fuera de vocabulario`).toContain(row.estado);
      expect(typeof row.ratificado, `${id}: falta ratificado`).toBe('boolean');
    }
  });

  it('la ratificación no tiene término medio', async () => {
    const { matrix } = await load();
    expect(['propuesta', 'ratificada'], 'estado de la matriz fuera de vocabulario').toContain(matrix.estado);
    const esperado = matrix.estado === 'ratificada';
    for (const [id, row] of Object.entries({ ...matrix.artefactos, ...matrix.estados })) {
      expect(row.ratificado, `${id}: estado "${matrix.estado}" exige ratificado=${esperado}`).toBe(esperado);
      if (Object.hasOwn(row, 'estado')) {
        expect(ESTADOS_VOCAB, `${id}: estado fuera de vocabulario`).toContain(row.estado);
      }
    }
  });
});
