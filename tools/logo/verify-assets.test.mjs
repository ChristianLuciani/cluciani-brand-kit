import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';

import {
  diffManifest,
  formatDiff,
  hashTree,
  parseManifest,
  renderManifest,
} from './verify-assets.mjs';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const DIGEST_A = 'a'.repeat(64);
const DIGEST_B = 'b'.repeat(64);

const manifestText = ({ mirror = [], diverged = [], local = [], retired = [] }) =>
  [
    '# source_repo: owner/src',
    '# source_ref: deadbeef',
    '# source_path: assets/brand/logo',
    '',
    '# --- mirror (1) ---',
    ...mirror.map(([hash, path]) => `${hash}  ${path}`),
    '',
    '# --- diverged (1) ---',
    ...diverged.map(([hash, path]) => `${hash}  ${path}`),
    '',
    '# --- local (0) ---',
    ...local.map(([hash, path]) => `${hash}  ${path}`),
    '',
    '# --- retired (2) ---',
    ...retired.map((path) => `# retired: ${path}`),
    '',
  ].join('\n');

describe('parseManifest', () => {
  it('lee secciones, procedencia y retiros', () => {
    const m = parseManifest(
      manifestText({
        mirror: [[DIGEST_A, 'assets/logo/a.svg']],
        diverged: [[DIGEST_B, 'assets/logo/b.svg']],
        local: [[DIGEST_A, 'assets/logo/c.svg']],
        retired: ['assets/logo/d.png', 'assets/logo/e.png'],
      }),
    );

    expect(m.source).toEqual({ repo: 'owner/src', ref: 'deadbeef', path: 'assets/brand/logo' });
    expect(m.entries.map((e) => [e.path, e.origin])).toEqual([
      ['assets/logo/a.svg', 'mirror'],
      ['assets/logo/b.svg', 'diverged'],
      ['assets/logo/c.svg', 'local'],
    ]);
    expect(m.retired).toEqual(['assets/logo/d.png', 'assets/logo/e.png']);
  });

  it('rechaza una entrada fuera de sección', () => {
    expect(() => parseManifest(`${DIGEST_A}  assets/logo/a.svg\n`)).toThrow(/fuera de sección/);
  });

  it('rechaza un path duplicado', () => {
    const text = manifestText({ mirror: [[DIGEST_A, 'assets/logo/a.svg']] }).replace(
      '# --- diverged (1) ---',
      `${DIGEST_A}  assets/logo/a.svg\n# --- diverged (1) ---`,
    );
    expect(() => parseManifest(text)).toThrow(/duplicado/);
  });

  it('rechaza un archivo retirado y declarado a la vez', () => {
    const text = manifestText({
      mirror: [[DIGEST_A, 'assets/logo/a.svg']],
      retired: ['assets/logo/a.svg'],
    });
    expect(() => parseManifest(text)).toThrow(/retirado y declarado/);
  });

  it('rechaza un path fuera de assets/logo', () => {
    expect(() => parseManifest(manifestText({ mirror: [[DIGEST_A, 'README.md']] }))).toThrow(
      /fuera de assets\/logo/,
    );
  });
});

describe('renderManifest / parseManifest', () => {
  it('round-trip estable con las cuatro categorías', () => {
    const source = { repo: 'owner/src', ref: 'deadbeef', path: 'assets/brand/logo' };
    const model = {
      source,
      mirror: [{ path: 'assets/logo/a.svg', hash: DIGEST_A }],
      diverged: [{ path: 'assets/logo/b.svg', hash: DIGEST_B }],
      local: [{ path: 'assets/logo/c.svg', hash: DIGEST_A }],
      retired: ['assets/logo/d.png'],
    };
    const text = renderManifest(model);
    expect(renderManifest(parseManifestModel(text))).toBe(text);
    expect(parseManifest(text).entries).toEqual([
      { path: 'assets/logo/a.svg', hash: DIGEST_A, origin: 'mirror' },
      { path: 'assets/logo/b.svg', hash: DIGEST_B, origin: 'diverged' },
      { path: 'assets/logo/c.svg', hash: DIGEST_A, origin: 'local' },
    ]);
  });

  // renderManifest toma listas planas; el parse devuelve entradas tipadas.
  function parseManifestModel(text) {
    const m = parseManifest(text);
    const by = (origin) => m.entries.filter((e) => e.origin === origin).map((e) => ({ path: e.path, hash: e.hash }));
    return { source: m.source, mirror: by('mirror'), diverged: by('diverged'), local: by('local'), retired: m.retired };
  }
});

describe('diffManifest', () => {
  const model = () =>
    parseManifest(
      manifestText({
        mirror: [[DIGEST_A, 'assets/logo/a.svg']],
        diverged: [[DIGEST_B, 'assets/logo/b.svg']],
        retired: ['assets/logo/d.png'],
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
  it('el árbol real coincide con tools/logo/assets.sha256', async () => {
    const { readFile } = await import('node:fs/promises');
    const manifest = parseManifest(await readFile(join(ROOT, 'tools/logo/assets.sha256'), 'utf8'));
    const tree = await hashTree(ROOT, 'assets/logo');

    const result = diffManifest(manifest, tree);
    expect(result.ok, formatDiff(result)).toBe(true);
    expect(manifest.entries.length).toBe(tree.size);
    expect(result.counts.mirror + result.counts.diverged + result.counts.local).toBe(manifest.entries.length);
  });

  // Composición publicada en README.md («66 assets»), docs/logo.md §10 y
  // CHANGELOG.md. Si un asset cambia de categoría, esta aserción falla a
  // propósito: actualizá las tres superficies y este bloque en el MISMO PR.
  it('la composición publicada no derivó', async () => {
    const { readFile } = await import('node:fs/promises');
    const manifest = parseManifest(await readFile(join(ROOT, 'tools/logo/assets.sha256'), 'utf8'));
    const tree = await hashTree(ROOT, 'assets/logo');
    const result = diffManifest(manifest, tree);
    const hint = 'composición publicada en README/docs/CHANGELOG: si el cambio es legítimo, actualizá las tres y este test en el mismo PR';

    expect(result.counts.mirror, hint).toBe(52);
    expect(result.counts.diverged, hint).toBe(4);
    expect(result.counts.local, hint).toBe(10);
    expect(manifest.retired.length, hint).toBe(2);
    expect(tree.size, hint).toBe(66);
  });
});
