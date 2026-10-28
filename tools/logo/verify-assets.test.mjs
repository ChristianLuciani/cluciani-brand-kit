import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';

import { diffManifest, formatDiff, hashTree, parseManifest, renderManifest } from './verify-assets.mjs';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const DIGEST_A = 'a'.repeat(64);
const DIGEST_B = 'b'.repeat(64);

const manifestText = ({ mirror = [], diverged = [], local = [], retired = [] }) =>
  [
    '# source_repo: owner/src',
    '# source_ref: deadbeef',
    '# source_path: assets/brand/logo',
    '',
    `# --- mirror (${mirror.length}) ---`,
    ...mirror.map(([hash, path]) => `${hash}  ${path}`),
    '',
    `# --- diverged (${diverged.length}) ---`,
    ...diverged.map(([hash, path, reason = 'motivo']) => `${hash}  ${path}  # ${reason}`),
    '',
    `# --- local (${local.length}) ---`,
    ...local.map(([hash, path, reason = 'motivo']) => `${hash}  ${path}  # ${reason}`),
    '',
    `# --- retired (${retired.length}) ---`,
    ...retired.map(([path, reason = 'motivo']) => `# retired: ${path} — ${reason}`),
    '',
  ].join('\n');

describe('parseManifest', () => {
  it('lee secciones, procedencia, razones y retiros', () => {
    const m = parseManifest(
      manifestText({
        mirror: [[DIGEST_A, 'assets/logo/a.svg']],
        diverged: [[DIGEST_B, 'assets/logo/b.svg', 'PR #4: divergente']],
        local: [[DIGEST_A, 'assets/logo/c.svg', 'PR #4: propio']],
        retired: [
          ['assets/logo/d.png', 'a 16 px no se lee'],
          ['assets/logo/e.png', 'sin uso'],
        ],
      }),
    );

    expect(m.source).toEqual({ repo: 'owner/src', ref: 'deadbeef', path: 'assets/brand/logo' });
    expect(m.entries.map((e) => [e.path, e.origin, e.reason])).toEqual([
      ['assets/logo/a.svg', 'mirror', null],
      ['assets/logo/b.svg', 'diverged', 'PR #4: divergente'],
      ['assets/logo/c.svg', 'local', 'PR #4: propio'],
    ]);
    expect(m.retired).toEqual([
      { path: 'assets/logo/d.png', reason: 'a 16 px no se lee' },
      { path: 'assets/logo/e.png', reason: 'sin uso' },
    ]);
  });

  it('rechaza una entrada fuera de sección', () => {
    expect(() => parseManifest(`${DIGEST_A}  assets/logo/a.svg\n`)).toThrow(/fuera de sección/);
  });

  it('rechaza un path duplicado', () => {
    const text = manifestText({ mirror: [[DIGEST_A, 'assets/logo/a.svg']] }).replace(
      '# --- diverged (0) ---',
      `${DIGEST_A}  assets/logo/a.svg\n# --- diverged (0) ---`,
    );
    expect(() => parseManifest(text)).toThrow(/duplicado/);
  });

  it('rechaza un archivo retirado y declarado a la vez', () => {
    const text = manifestText({
      mirror: [[DIGEST_A, 'assets/logo/a.svg']],
      retired: [['assets/logo/a.svg']],
    });
    expect(() => parseManifest(text)).toThrow(/retirado y declarado/);
  });

  it('rechaza un path fuera de assets/logo', () => {
    expect(() => parseManifest(manifestText({ mirror: [[DIGEST_A, 'README.md']] }))).toThrow(
      /fuera de assets\/logo/,
    );
  });

  it('exige razón en diverged y local', () => {
    const sinRazon = manifestText({ diverged: [[DIGEST_B, 'assets/logo/b.svg']] }).replace(
      '  # motivo',
      '',
    );
    expect(() => parseManifest(sinRazon)).toThrow(/diverged sin razón/);
    const localSinRazon = manifestText({ local: [[DIGEST_B, 'assets/logo/c.svg']] }).replace(
      '  # motivo',
      '',
    );
    expect(() => parseManifest(localSinRazon)).toThrow(/local sin razón/);
  });

  it('exige razón y path válido en los retiros, sin duplicados', () => {
    expect(() => parseManifest(manifestText({ retired: [['assets/logo/x.png', '']] }))).toThrow(
      /retiro sin razón/,
    );
    expect(() => parseManifest(manifestText({ retired: [['README.md', 'fuera']] }))).toThrow(
      /fuera de assets\/logo/,
    );
    expect(() =>
      parseManifest(
        manifestText({
          retired: [
            ['assets/logo/x.png', 'uno'],
            ['assets/logo/x.png', 'dos'],
          ],
        }),
      ),
    ).toThrow(/retiro duplicado/);
  });

  it('valida los conteos de los encabezados (no son decorativos)', () => {
    const text = manifestText({ mirror: [[DIGEST_A, 'assets/logo/a.svg']] }).replace(
      '# --- mirror (1) ---',
      '# --- mirror (2) ---',
    );
    expect(() => parseManifest(text)).toThrow(/declara 2 y hay 1/);
  });
});

describe('renderManifest / parseManifest', () => {
  it('round-trip estable con las cuatro categorías', () => {
    const source = { repo: 'owner/src', ref: 'deadbeef', path: 'assets/brand/logo' };
    const model = {
      source,
      mirror: [{ path: 'assets/logo/a.svg', hash: DIGEST_A, origin: 'mirror', reason: null }],
      diverged: [{ path: 'assets/logo/b.svg', hash: DIGEST_B, origin: 'diverged', reason: 'PR #4' }],
      local: [{ path: 'assets/logo/c.svg', hash: DIGEST_A, origin: 'local', reason: 'tile teal' }],
      retired: [{ path: 'assets/logo/d.png', reason: 'no se publica' }],
    };
    const text = renderManifest(model);

    expect(renderManifest(parseManifestModel(text))).toBe(text);
    expect(parseManifest(text).entries).toEqual([
      { path: 'assets/logo/a.svg', hash: DIGEST_A, origin: 'mirror', reason: null },
      { path: 'assets/logo/b.svg', hash: DIGEST_B, origin: 'diverged', reason: 'PR #4' },
      { path: 'assets/logo/c.svg', hash: DIGEST_A, origin: 'local', reason: 'tile teal' },
    ]);
    expect(parseManifest(text).retired).toEqual([{ path: 'assets/logo/d.png', reason: 'no se publica' }]);
  });

  // renderManifest toma listas planas; el parse devuelve entradas tipadas.
  function parseManifestModel(text) {
    const m = parseManifest(text);
    const by = (origin) =>
      m.entries
        .filter((e) => e.origin === origin)
        .map((e) => ({ path: e.path, hash: e.hash, origin, reason: e.reason }));
    return { source: m.source, mirror: by('mirror'), diverged: by('diverged'), local: by('local'), retired: m.retired };
  }
});

describe('diffManifest', () => {
  const model = () =>
    parseManifest(
      manifestText({
        mirror: [[DIGEST_A, 'assets/logo/a.svg']],
        diverged: [[DIGEST_B, 'assets/logo/b.svg']],
        retired: [['assets/logo/d.png']],
      }),
    );
  const tree = () =>
    new Map([
      ['assets/logo/a.svg', DIGEST_A],
      ['assets/logo/b.svg', DIGEST_B],
    ]);

  it('ok cuando el árbol coincide exactamente', () => {
    const result = diffManifest(model(), tree());
    expect(result.ok).toBe(true);
    expect(result.counts).toEqual({ mirror: 1, diverged: 1, local: 0 });
  });

  it('detecta un archivo ausente', () => {
    const t = tree();
    t.delete('assets/logo/a.svg');
    const result = diffManifest(model(), t);
    expect(result.ok).toBe(false);
    expect(result.missing).toEqual(['assets/logo/a.svg']);
  });

  it('detecta un hash alterado', () => {
    const t = tree();
    t.set('assets/logo/a.svg', DIGEST_B);
    const result = diffManifest(model(), t);
    expect(result.changed).toEqual(['assets/logo/a.svg']);
  });

  it('detecta un archivo no declarado', () => {
    const t = tree();
    t.set('assets/logo/intruso.png', DIGEST_A);
    const result = diffManifest(model(), t);
    expect(result.extra).toEqual(['assets/logo/intruso.png']);
  });

  it('detecta un retirado que reaparece', () => {
    const t = tree();
    t.set('assets/logo/d.png', DIGEST_A);
    const result = diffManifest(model(), t);
    expect(result.resurrected).toEqual(['assets/logo/d.png']);
  });

  it('el reporte nombra cada falla', () => {
    const t = tree();
    t.delete('assets/logo/a.svg');
    t.set('assets/logo/d.png', DIGEST_A);
    const text = formatDiff(diffManifest(model(), t));
    expect(text).toMatch(/ausente en el árbol/);
    expect(text).toMatch(/reaparece/);
  });
});

describe('hashTree', () => {
  const dirs = [];
  afterAll(async () => {
    await Promise.all(dirs.map((d) => rm(d, { recursive: true, force: true })));
  });

  it('hashea archivos recursivamente con paths repo-relative', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'brand-kit-assets-'));
    dirs.push(dir);
    await mkdir(join(dir, 'assets/logo/sub'), { recursive: true });
    await writeFile(join(dir, 'assets/logo/a.txt'), 'a');
    await writeFile(join(dir, 'assets/logo/sub/b.txt'), 'b');

    const tree = await hashTree(dir, 'assets/logo');
    expect([...tree.keys()]).toEqual(['assets/logo/a.txt', 'assets/logo/sub/b.txt']);
    expect(tree.get('assets/logo/a.txt')).toBe(
      'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb',
    );
  });
});

describe('manifiesto commiteado contra assets/logo', () => {
  const load = async () => {
    const manifest = parseManifest(await readFile(join(ROOT, 'tools/logo/assets.sha256'), 'utf8'));
    const tree = await hashTree(ROOT, 'assets/logo');
    return { manifest, tree, result: diffManifest(manifest, tree) };
  };

  it('el árbol real coincide con tools/logo/assets.sha256', async () => {
    const { manifest, tree, result } = await load();
    expect(result.ok, formatDiff(result)).toBe(true);
    expect(manifest.entries.length).toBe(tree.size);
    expect(result.counts.mirror + result.counts.diverged + result.counts.local).toBe(manifest.entries.length);
  });

  // Un número publicado en varias superficies tiene que moverse en todas a la
  // vez: se deriva la composición del manifiesto y se contrasta contra cada
  // superficie que la publica (README, manual y CHANGELOG; los encabezados del
  // manifiesto los valida el parser). Si una cifra cambia legítimamente, se
  // actualizan TODAS en el mismo PR; si no, este test falla nombrando el archivo.
  it('los números publicados son los derivados del manifiesto', async () => {
    const { manifest, tree, result } = await load();
    const derived = {
      total: tree.size,
      mirror: result.counts.mirror,
      diverged: result.counts.diverged,
      local: result.counts.local,
      retired: manifest.retired.length,
    };
    const hint = (path) =>
      `${path}: la composición publicada no coincide con el manifiesto ` +
      `(${JSON.stringify(derived)}); actualizala en todas las superficies en el mismo PR`;

    for (const path of ['README.md', 'docs/logo.md', 'CHANGELOG.md']) {
      const text = await readFile(join(ROOT, path), 'utf8');
      const anchor = text.match(/\*\*(\d+) archivos\*\*/);
      expect(anchor, `${path}: falta la línea «**<total> archivos**» con la composición`).toBeTruthy();
      expect(Number(anchor[1]), hint(path)).toBe(derived.total);

      // Los cuatro conteos van en orden —espejados, divergentes, propios,
      // retirados— en negrita, después del total.
      const tail = text.slice(anchor.index, anchor.index + 700);
      const published = [...tail.matchAll(/\*\*(\d+)\*\*/g)].map((m) => Number(m[1]));
      expect(published.slice(0, 4), hint(path)).toEqual([
        derived.mirror,
        derived.diverged,
        derived.local,
        derived.retired,
      ]);
    }
  });
});
