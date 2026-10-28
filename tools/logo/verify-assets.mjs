#!/usr/bin/env node
/**
 * Gate de paridad de `assets/logo/` contra la fuente canónica.
 *
 * El brand kit es el hogar canónico del logo, pero los archivos nacen en
 * `ChristianLuciani/christianluciani.github.io` (`assets/brand/logo/`). Este
 * instrumento demuestra —sin red en CI— que lo que hay acá es exactamente lo
 * declarado, y con `--from-source` (red) que esa declaración sigue siendo
 * cierta contra la fuente.
 *
 * Cada archivo de `assets/logo/` tiene un origen declarado en el manifiesto
 * `tools/logo/assets.sha256`:
 *
 *   mirror    existe en la fuente y es byte-idéntico (sha256)
 *   diverged  existe en la fuente y acá es distinto a propósito (el brand kit
 *             adelanta un cambio); se verifica que siga divergiendo
 *   local     propio del brand kit, no existe en la fuente
 *   retired   existe en la fuente y acá NO se publica
 *
 * Uso:
 *   node tools/logo/verify-assets.mjs                 # verify (offline, CI)
 *   node tools/logo/verify-assets.mjs --from-source   # drift contra la fuente
 *   node tools/logo/verify-assets.mjs --from-source --write   # re-manifiesta
 *   node tools/logo/verify-assets.mjs --help
 *
 * `--from-source` necesita red hacia api.github.com y raw.githubusercontent.com
 * (opcional `GITHUB_TOKEN`/`GH_TOKEN` para el rate limit). El modo `verify` —el
 * único que corre en CI— no toca la red: verifica la copia local contra el
 * manifiesto commiteado.
 */
import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, posix, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const ASSETS_DIR = 'assets/logo';
const MANIFEST = 'tools/logo/assets.sha256';

const DEFAULTS = {
  repo: 'ChristianLuciani/christianluciani.github.io',
  path: 'assets/brand/logo',
};

const ORIGINS = ['mirror', 'diverged', 'local'];

const USAGE = `Uso: node tools/logo/verify-assets.mjs [comando]

Comandos:
  (ninguno)        verify — compara ${ASSETS_DIR}/ con ${MANIFEST}. Sin red.
  --from-source    Deriva la verdad de la fuente (red) y reporta drift.
                   --ref <sha>     commit o rama de la fuente (default: el del
                                   manifiesto).
                   --write         Reescribe el manifiesto si NO hay drift
                                   (nunca bendice una divergencia).
                   --retire <path>   Declara un archivo de la fuente como no
                                     publicado acá (exige --write).
                   --diverge <path>  Declara un archivo que acá difiere de la
                                     fuente a propósito (exige --write).
  --help, -h       Esta ayuda.

Categorías del manifiesto: mirror (idéntico a la fuente) · diverged (existe en
la fuente y acá es distinto a propósito) · local (sólo existe acá) · retired
(existe en la fuente y no se publica acá). Justificá cada divergencia/retiro en
el CHANGELOG y en el PR.`;

const die = (msg, code = 1) => {
  console.error(msg);
  process.exit(code);
};

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const baseName = (path) => path.slice(ASSETS_DIR.length + 1);

// ---------------------------------------------------------------------------
// Manifiesto
// ---------------------------------------------------------------------------

/**
 * Parsea el manifiesto. Formato: comentarios `#` y líneas `<sha256>  <path>`
 * agrupadas por secciones `# --- mirror|diverged|local ---`. Las líneas
 * `# retired: <path>` declaran archivos de la fuente no publicados.
 */
export function parseManifest(text) {
  const manifest = {
    meta: {},
    source: { repo: DEFAULTS.repo, ref: null, path: DEFAULTS.path },
    entries: [],
    retired: [],
  };
  let section = null;

  for (const [i, raw] of text.split('\n').entries()) {
    const line = raw.trim();
    if (!line) continue;

    if (line.startsWith('#')) {
      const body = line.replace(/^#\s?/, '');
      if (body.startsWith('retired:')) {
        manifest.retired.push(body.slice('retired:'.length).trim());
        continue;
      }
      const sec = body.match(/^---\s*(mirror|diverged|local)\b/);
      if (sec) {
        section = sec[1];
        continue;
      }
      const header = body.match(/^([a-z_]+):\s*(.*)$/);
      if (header) manifest.meta[header[1]] = header[2].trim();
      continue;
    }

    const entry = line.match(/^([0-9a-f]{64})\s{2}(\S.*)$/);
    if (!entry) throw new Error(`manifiesto: línea ${i + 1} inválida: ${line}`);
    if (!section) throw new Error(`manifiesto: línea ${i + 1} fuera de sección: ${line}`);
    const [, hash, path] = entry;
    if (!path.startsWith(`${ASSETS_DIR}/`)) {
      throw new Error(`manifiesto: línea ${i + 1} fuera de ${ASSETS_DIR}/: ${path}`);
    }
    if (baseName(path).includes('/')) {
      throw new Error(`manifiesto: subdirectorios no soportados: ${path}`);
    }
    manifest.entries.push({ hash, path, origin: section });
  }

  manifest.source.repo = manifest.meta.source_repo ?? DEFAULTS.repo;
  manifest.source.ref = manifest.meta.source_ref ?? null;
  manifest.source.path = manifest.meta.source_path ?? DEFAULTS.path;

  const seen = new Set();
  for (const e of manifest.entries) {
    if (seen.has(e.path)) throw new Error(`manifiesto: path duplicado: ${e.path}`);
    seen.add(e.path);
  }
  for (const path of manifest.retired) {
    if (seen.has(path)) throw new Error(`manifiesto: ${path} está retirado y declarado a la vez`);
  }
  return manifest;
}

const SECTION_TITLE = {
  mirror: 'mirror — existe en la fuente y es byte-idéntico',
  diverged: 'diverged — existe en la fuente y acá es distinto a propósito',
  local: 'local — propio del brand kit, no existe en la fuente',
};

export function renderManifest({ source, mirror, diverged, local, retired }) {
  const groups = { mirror, diverged, local };
  const lines = [
    `# ${ASSETS_DIR} — manifiesto de paridad (sha256)`,
    '#',
    '# Generado por tools/logo/verify-assets.mjs --from-source --write.',
    '# NO editar a mano: los hashes son la evidencia de que estos archivos son',
    '# byte-idénticos a la fuente canónica. Cambiar un asset sin regenerar el',
    '# manifiesto (o regenerar el manifiesto sin que el asset cambie) rompe el',
    '# gate de CI a propósito.',
    '#',
    `# source_repo: ${source.repo}`,
    `# source_ref: ${source.ref}`,
    `# source_path: ${source.path}`,
    '#',
    '# Secciones:',
    `#   ${SECTION_TITLE.mirror} (${mirror.length})`,
    `#   ${SECTION_TITLE.diverged} (${diverged.length})`,
    `#   ${SECTION_TITLE.local} (${local.length})`,
    `#   retired — existe en la fuente y acá NO se publica (${retired.length})`,
    '',
  ];

  for (const origin of ORIGINS) {
    lines.push(`# --- ${SECTION_TITLE[origin]} (${groups[origin].length}) ---`);
    for (const e of groups[origin]) lines.push(`${e.hash}  ${e.path}`);
    lines.push('');
  }

  lines.push(`# --- retired — de la fuente, no se publican acá (${retired.length}) ---`);
  for (const path of retired) lines.push(`# retired: ${path}`);
  lines.push('');
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Árboles
// ---------------------------------------------------------------------------

/** Map<path repo-relative, sha256> de todos los archivos de `dir`. */
export async function hashTree(root, dir) {
  const out = new Map();
  const walk = async (rel) => {
    const abs = join(root, rel);
    const entries = await readdir(abs, { withFileTypes: true });
    for (const entry of entries) {
      const childRel = posix.join(rel.split(sep).join(posix.sep), entry.name);
      if (entry.isDirectory()) await walk(childRel);
      else if (entry.isFile()) out.set(childRel, sha256(await readFile(join(root, childRel))));
      else throw new Error(`no soportado: ${childRel} (sólo archivos regulares)`);
    }
  };
  await walk(dir);
  return out;
}

/**
 * Compara el manifiesto contra el árbol local: archivo declarado ausente
 * (missing), hash distinto al declarado (changed), archivo presente que nadie
 * declaró (extra) y archivo retirado que reaparece (resurrected).
 */
export function diffManifest(manifest, localTree) {
  const declared = new Map(manifest.entries.map((e) => [e.path, e]));
  const result = {
    missing: [],
    changed: [],
    extra: [],
    resurrected: [],
    counts: { mirror: 0, diverged: 0, local: 0 },
  };

  for (const entry of manifest.entries) {
    const actual = localTree.get(entry.path);
    if (actual === undefined) result.missing.push(entry.path);
    else if (actual !== entry.hash) result.changed.push(entry.path);
    else result.counts[entry.origin] += 1;
  }
  for (const path of localTree.keys()) {
    if (!declared.has(path)) result.extra.push(path);
  }
  for (const path of manifest.retired) {
    if (localTree.has(path)) result.resurrected.push(path);
  }
  result.ok =
    !result.missing.length && !result.changed.length && !result.extra.length && !result.resurrected.length;
  return result;
}

export function formatDiff(result) {
  const lines = [];
  const block = (title, items) => {
    if (!items.length) return;
    lines.push(`✖ ${title} (${items.length}):`);
    for (const item of items) lines.push(`    ${item}`);
  };
  block('declarado en el manifiesto y ausente en el árbol', result.missing);
  block('hash distinto al manifiesto', result.changed);
  block('presente en el árbol y no declarado', result.extra);
  block('retirado del brand kit y reaparece', result.resurrected);
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Fuente (red)
// ---------------------------------------------------------------------------

const authHeaders = (accept) => {
  const headers = { 'User-Agent': 'cluciani-brand-kit/verify-assets', Accept: accept };
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

async function githubJson(url) {
  const res = await fetch(url, { headers: authHeaders('application/vnd.github+json') });
  if (!res.ok) throw new Error(`GitHub API ${res.status} en ${url}: ${await res.text()}`);
  return res.json();
}

async function download(url) {
  const res = await fetch(url, { headers: authHeaders('application/octet-stream') });
  if (!res.ok) throw new Error(`descarga ${res.status} en ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

/** Map<nombre de archivo, sha256> de la fuente en `ref` (red). */
export async function fetchSourceTree({ repo, ref, path }, { concurrency = 6 } = {}) {
  const tree = await githubJson(`https://api.github.com/repos/${repo}/git/trees/${ref}?recursive=1`);
  if (tree.truncated) throw new Error(`árbol truncado por la API en ${repo}@${ref}`);
  const prefix = `${path}/`;
  const blobs = tree.tree
    .filter((t) => t.type === 'blob' && t.path.startsWith(prefix))
    .map((t) => ({ name: t.path.slice(prefix.length) }));

  const out = new Map();
  let cursor = 0;
  const worker = async () => {
    while (cursor < blobs.length) {
      const blob = blobs[cursor];
      cursor += 1;
      if (blob.name.includes('/')) throw new Error(`subdirectorio en la fuente: ${blob.name}`);
      const buf = await download(`https://raw.githubusercontent.com/${repo}/${ref}/${path}/${blob.name}`);
      out.set(blob.name, sha256(buf));
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, blobs.length) }, worker));
  return { files: out, ref: tree.sha };
}

// ---------------------------------------------------------------------------
// Comandos
// ---------------------------------------------------------------------------

async function loadManifest({ tolerant = false } = {}) {
  let text;
  try {
    text = await readFile(join(ROOT, MANIFEST), 'utf8');
  } catch {
    if (tolerant) return { meta: {}, source: { ...DEFAULTS, ref: null }, entries: [], retired: [] };
    die(`✖ no existe ${MANIFEST}: generálo con --from-source --write`);
  }
  try {
    return parseManifest(text);
  } catch (err) {
    die(`✖ ${MANIFEST}: ${err.message}`);
  }
}

const describeSource = (source) => `${source.repo} @ ${source.ref ?? '?'} (${source.path})`;

async function verify() {
  const manifest = await loadManifest();
  const tree = await hashTree(ROOT, ASSETS_DIR);
  const result = diffManifest(manifest, tree);

  console.log(
    `${ASSETS_DIR}: ${tree.size} archivos · ${result.counts.mirror} espejados · ${result.counts.diverged} divergentes · ${result.counts.local} propios · ${manifest.retired.length} retirados`,
  );
  console.log(`fuente: ${describeSource(manifest.source)}`);

  if (!result.ok) die(`${formatDiff(result)}\n✖ ${ASSETS_DIR} no coincide con ${MANIFEST}`);
  console.log(`✔ ${ASSETS_DIR} coincide con ${MANIFEST} (${manifest.entries.length} entradas)`);
}

async function fromSource({ ref, write, retire = [], diverge = [] }) {
  const manifest = await loadManifest({ tolerant: Boolean(ref) });
  const source = { ...manifest.source, ref: ref ?? manifest.source.ref };
  if (!source.ref) die('✖ no hay ref de la fuente: pasá --ref <sha>');

  const declared = new Map(manifest.entries.map((e) => [e.path, e]));
  const retired = new Set(manifest.retired);
  for (const path of retire) {
    if (!path.startsWith(`${ASSETS_DIR}/`)) die(`✖ --retire fuera de ${ASSETS_DIR}/: ${path}`, 2);
    retired.add(path);
    declared.delete(path);
  }
  for (const path of diverge) {
    if (!path.startsWith(`${ASSETS_DIR}/`)) die(`✖ --diverge fuera de ${ASSETS_DIR}/: ${path}`, 2);
    if (!declared.has(path)) declared.set(path, { path, origin: 'diverged', hash: null });
    else declared.set(path, { ...declared.get(path), origin: 'diverged' });
    retired.delete(path);
  }

  console.log(`fuente: ${describeSource(source)} — derivando hashes (red)…`);
  const { files: sourceFiles } = await fetchSourceTree(source);
  const tree = await hashTree(ROOT, ASSETS_DIR);

  const problems = [];
  const groups = { mirror: [], diverged: [], local: [] };

  // Un retiro que la fuente no tiene (o que ya cumple) es un retiro vencido:
  // mantiene ruido en el manifiesto y taparía un asset nuevo con ese nombre.
  for (const path of retired) {
    if (!sourceFiles.has(baseName(path))) {
      problems.push(`retirado y la fuente no lo tiene: ${path} (quitá el retiro)`);
    }
  }

  for (const name of [...sourceFiles.keys()].sort()) {
    const path = `${ASSETS_DIR}/${name}`;
    const sourceHash = sourceFiles.get(name);
    const localHash = tree.get(path);
    const entry = declared.get(path);
    const origin = entry?.origin;

    if (localHash === undefined) {
      if (!retired.has(path)) {
        problems.push(`la fuente lo tiene y acá falta: ${path} (declaralo con --retire si es a propósito)`);
      }
      continue;
    }
    if (retired.has(path)) {
      problems.push(`retirado y presente a la vez: ${path} (quitá el retiro o el archivo)`);
      continue;
    }
    if (origin === 'mirror' || (!origin && localHash === sourceHash)) {
      if (localHash !== sourceHash) problems.push(`declarado mirror y difiere de la fuente: ${path}`);
      groups.mirror.push({ path, hash: sourceHash });
      continue;
    }
    if (origin === 'diverged') {
      if (localHash === sourceHash) {
        problems.push(`la fuente ya coincide con la copia local: pasá ${path} a mirror con --write`);
      } else {
        groups.diverged.push({ path, hash: localHash });
      }
      continue;
    }
    problems.push(`difiere de la fuente sin declarar: ${path} (--diverge si es a propósito)`);
  }

  for (const [path, localHash] of [...tree].sort(([a], [b]) => a.localeCompare(b))) {
    if (sourceFiles.has(baseName(path))) continue;
    if (declared.get(path)?.origin === 'mirror') {
      problems.push(`declarado mirror y la fuente ya no lo tiene: ${path}`);
      continue;
    }
    groups.local.push({ path, hash: localHash });
  }

  console.log(
    `fuente: ${sourceFiles.size} archivos · local: ${tree.size} · espejados: ${groups.mirror.length} · divergentes: ${groups.diverged.length} · propios: ${groups.local.length} · retirados: ${retired.size}`,
  );

  if (problems.length) {
    die(`✖ drift contra la fuente (${problems.length}):\n    ${problems.join('\n    ')}`);
  }

  const text = renderManifest({
    source,
    mirror: groups.mirror,
    diverged: groups.diverged,
    local: groups.local,
    retired: [...retired].sort(),
  });

  const current = await readFile(join(ROOT, MANIFEST), 'utf8').catch(() => null);
  if (current === text) {
    console.log('✔ la fuente no derivó: el manifiesto ya está al día');
    return;
  }
  if (!write) {
    console.log('· el manifiesto quedaría distinto (¿ref o fecha nuevos?): corré con --write');
    return;
  }
  await writeFile(join(ROOT, MANIFEST), text);
  console.log(
    `✔ ${MANIFEST} reescrito (${groups.mirror.length} espejados, ${groups.diverged.length} divergentes, ${groups.local.length} propios)`,
  );
}

async function main(argv) {
  const args = argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    console.log(USAGE);
    return;
  }

  const values = { '--ref': [], '--retire': [], '--diverge': [] };
  const flags = new Set();
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg.startsWith('--') && arg.includes('=')) {
      const [key, ...rest] = arg.split('=');
      if (!(key in values)) die(`✖ argumento desconocido: ${key}\n\n${USAGE}`, 2);
      values[key].push(rest.join('='));
      continue;
    }
    if (arg in values) {
      const value = args[i + 1];
      if (value === undefined || value.startsWith('--')) die(`✖ ${arg} necesita un valor\n\n${USAGE}`, 2);
      values[arg].push(value);
      i += 1;
      continue;
    }
    if (!['--from-source', '--write', '--verify'].includes(arg)) {
      die(`✖ argumento desconocido: ${arg}\n\n${USAGE}`, 2);
    }
    flags.add(arg);
  }

  if (flags.has('--write') && !flags.has('--from-source')) {
    die('✖ --write sólo tiene sentido con --from-source (nunca se escribe sin la fuente)', 2);
  }
  if ((values['--retire'].length || values['--diverge'].length) && !flags.has('--write')) {
    die('✖ --retire/--diverge exigen --from-source --write (dejan traza en el manifiesto)', 2);
  }

  if (flags.has('--from-source')) {
    await fromSource({
      ref: values['--ref'][0],
      write: flags.has('--write'),
      retire: values['--retire'],
      diverge: values['--diverge'],
    });
  } else {
    await verify();
  }
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  main(process.argv).catch((err) => die(`✖ ${err.message}`));
}
