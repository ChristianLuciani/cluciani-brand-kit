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
 *   mirror    existe en la fuente y es byte-idéntico (se re-deriva de la fuente)
 *   diverged  existe en la fuente y acá difiere a propósito; lleva una razón
 *   local     propio del brand kit, no existe en la fuente; lleva una razón
 *   retired   existe en la fuente y acá NO se publica; lleva una razón
 *
 * Los tres orígenes que no pueden re-derivarse de la fuente son declaraciones
 * explícitas: `--from-source --write` NO puede mover sus bytes. Para re-anclar
 * uno hace falta declararlo otra vez con `--diverge`/`--local`/`--retire` y un
 * `--reason`, que queda escrito en el manifiesto y en el diff.
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
 * manifiesto commiteado. Límite declarado en README: CI no consulta la fuente,
 * así que verde significa «el árbol es el declarado», no «la fuente no avanzó».
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
                   --ref <sha>       commit o rama de la fuente (default: el del
                                     manifiesto).
                   --write           Reescribe el manifiesto si NO hay drift.
                                     Nunca mueve los bytes de un local/diverged
                                     sin una declaración explícita.
                   --diverge <path>  Declara (o re-ancla) un archivo que existe
                                     en la fuente y acá difiere a propósito.
                   --local <path>    Declara (o re-ancla) un archivo propio del
                                     brand kit, ausente en la fuente.
                   --retire <path>   Declara un archivo de la fuente que acá no
                                     se publica.
                   --reason <texto>  Motivo (PR/issue) por defecto para las
                                     declaraciones sin motivo inline. Toda
                                     declaración exige motivo: queda escrito en
                                     el manifiesto. Un motivo por archivo:
                                     --diverge <path>=<motivo>
  --help, -h       Esta ayuda.

Un cambio de bytes en un local/diverged sin declararlo hace fallar --write, y
el modo offline lo detecta igual contra el manifiesto commiteado.`;

const die = (msg, code = 1) => {
  console.error(msg);
  process.exit(code);
};

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const baseName = (path) => path.slice(ASSETS_DIR.length + 1);

// ---------------------------------------------------------------------------
// Manifiesto
// ---------------------------------------------------------------------------

const SECTION_TITLE = {
  mirror: 'mirror — existe en la fuente y es byte-idéntico',
  diverged: 'diverged — existe en la fuente y acá es distinto a propósito',
  local: 'local — propio del brand kit, no existe en la fuente',
  retired: 'retired — existe en la fuente y acá NO se publica',
};

/**
 * Parsea el manifiesto. Formato: comentarios `#` y líneas
 * `<sha256>  <path>[  # <razón>]` agrupadas por secciones
 * `# --- mirror|diverged|local|retired … (n) ---`; los retiros van como
 * `# retired: <path> — <razón>`. Los conteos `(n)` de cada encabezado son
 * estructura: se validan contra las entradas reales.
 */
export function parseManifest(text) {
  const manifest = {
    meta: {},
    source: { repo: DEFAULTS.repo, ref: null, path: DEFAULTS.path },
    entries: [],
    retired: [],
  };
  const headerCounts = new Map();
  let section = null;

  for (const [i, raw] of text.split('\n').entries()) {
    const line = raw.trim();
    if (!line) continue;

    if (line.startsWith('#')) {
      const body = line.replace(/^#\s?/, '');

      const sec = body.match(/^---\s*(mirror|diverged|local|retired)\b(.*)$/);
      if (sec) {
        section = sec[1];
        const count = sec[2].match(/\((\d+)\)\s*(?:---)?\s*$/);
        if (count) headerCounts.set(section, Number(count[1]));
        continue;
      }

      if (body.startsWith('retired:')) {
        const rest = body.slice('retired:'.length).trim();
        const sepIndex = rest.indexOf(' — ');
        const path = (sepIndex === -1 ? rest : rest.slice(0, sepIndex)).trim();
        const reason = sepIndex === -1 ? '' : rest.slice(sepIndex + 3).trim();
        validatePath(path, i);
        if (!reason) throw new Error(`manifiesto: línea ${i + 1}: retiro sin razón: ${path}`);
        if (manifest.retired.some((r) => r.path === path)) {
          throw new Error(`manifiesto: retiro duplicado: ${path}`);
        }
        manifest.retired.push({ path, reason });
        continue;
      }

      const header = body.match(/^([a-z_]+):\s*(.*)$/);
      if (header) manifest.meta[header[1]] = header[2].trim();
      continue;
    }

    const entry = line.match(/^([0-9a-f]{64}) {2}(\S+)(?: {2}# (\S.*))?$/);
    if (!entry) throw new Error(`manifiesto: línea ${i + 1} inválida: ${line}`);
    if (!section) throw new Error(`manifiesto: línea ${i + 1} fuera de sección: ${line}`);
    if (section === 'retired') {
      throw new Error(`manifiesto: línea ${i + 1}: los retiros son líneas «# retired:», no entradas`);
    }
    const [, hash, path, reason] = entry;
    validatePath(path, i);
    if (section !== 'mirror' && !reason) {
      throw new Error(`manifiesto: línea ${i + 1}: ${section} sin razón: ${path}`);
    }
    if (manifest.entries.some((e) => e.path === path)) {
      throw new Error(`manifiesto: path duplicado: ${path}`);
    }
    manifest.entries.push({ hash, path, origin: section, reason: reason ?? null });
  }

  for (const entry of manifest.entries) {
    if (manifest.retired.some((r) => r.path === entry.path)) {
      throw new Error(`manifiesto: ${entry.path} está retirado y declarado a la vez`);
    }
  }

  for (const [name, declared] of headerCounts) {
    const actual =
      name === 'retired' ? manifest.retired.length : manifest.entries.filter((e) => e.origin === name).length;
    if (actual !== declared) {
      throw new Error(
        `manifiesto: el encabezado de «${name}» declara ${declared} y hay ${actual} (¿editaste a mano?)`,
      );
    }
  }

  manifest.source.repo = manifest.meta.source_repo ?? DEFAULTS.repo;
  manifest.source.ref = manifest.meta.source_ref ?? null;
  manifest.source.path = manifest.meta.source_path ?? DEFAULTS.path;
  return manifest;
}

function validatePath(path, lineIndex) {
  if (!path.startsWith(`${ASSETS_DIR}/`)) {
    throw new Error(`manifiesto: línea ${lineIndex + 1} fuera de ${ASSETS_DIR}/: ${path}`);
  }
  if (baseName(path).includes('/')) {
    throw new Error(`manifiesto: subdirectorios no soportados: ${path}`);
  }
}

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
    '# mirror se re-deriva de la fuente. diverged/local/retired son',
    '# declaraciones explícitas con razón (PR/issue): --from-source --write no',
    '# puede mover sus bytes; re-anclarlos exige --diverge/--local/--retire con',
    '# --reason. Los conteos de cada encabezado los valida el parser.',
    '',
  ];

  for (const origin of ORIGINS) {
    lines.push(`# --- ${SECTION_TITLE[origin]} (${groups[origin].length}) ---`);
    for (const e of groups[origin]) {
      lines.push(e.origin === 'mirror' ? `${e.hash}  ${e.path}` : `${e.hash}  ${e.path}  # ${e.reason}`);
    }
    lines.push('');
  }

  lines.push(`# --- ${SECTION_TITLE.retired} (${retired.length}) ---`);
  for (const r of retired) lines.push(`# retired: ${r.path} — ${r.reason}`);
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
  for (const r of manifest.retired) {
    if (localTree.has(r.path)) result.resurrected.push(r.path);
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

async function fromSource({ ref, write, declarations }) {
  const manifest = await loadManifest({ tolerant: Boolean(ref) });
  const source = { ...manifest.source, ref: ref ?? manifest.source.ref };
  if (!source.ref) die('✖ no hay ref de la fuente: pasá --ref <sha>');

  const previous = new Map(manifest.entries.map((e) => [e.path, e]));
  const declaredNow = new Map(declarations.map((d) => [d.path, d]));
  const retired = new Map(manifest.retired.map((r) => [r.path, r.reason]));

  for (const { path, origin, reason } of declarations) {
    if (!path.startsWith(`${ASSETS_DIR}/`)) die(`✖ ${origin} fuera de ${ASSETS_DIR}/: ${path}`, 2);
    if (origin === 'retire') retired.set(path, reason);
    else retired.delete(path);
  }

  console.log(`fuente: ${describeSource(source)} — derivando hashes (red)…`);
  const { files: sourceFiles } = await fetchSourceTree(source);
  const tree = await hashTree(ROOT, ASSETS_DIR);

  const problems = [];
  const groups = { mirror: [], diverged: [], local: [] };
  const reasonFor = (path) => {
    const declared = declaredNow.get(path);
    if (declared) return declared.reason;
    return previous.get(path)?.reason ?? null;
  };

  for (const [path] of retired) {
    if (!sourceFiles.has(baseName(path))) {
      problems.push(`retirado y la fuente no lo tiene: ${path} (quitá el retiro)`);
    }
  }

  for (const name of [...sourceFiles.keys()].sort()) {
    const path = `${ASSETS_DIR}/${name}`;
    const sourceHash = sourceFiles.get(name);
    const localHash = tree.get(path);
    const prev = previous.get(path);
    const declared = declaredNow.get(path);
    const origin = declared?.origin ?? prev?.origin;

    if (localHash === undefined) {
      if (!retired.has(path)) {
        problems.push(`la fuente lo tiene y acá falta: ${path} (declaralo con --retire --reason)`);
      }
      continue;
    }
    if (retired.has(path)) {
      problems.push(`retirado y presente a la vez: ${path} (quitá el retiro o el archivo)`);
      continue;
    }
    if (origin === 'mirror') {
      if (localHash !== sourceHash) {
        problems.push(
          `declarado mirror y difiere de la fuente: ${path} (sincronizá/regenerá, o declará --diverge --reason)`,
        );
      } else {
        groups.mirror.push({ path, hash: sourceHash, origin: 'mirror', reason: null });
      }
      continue;
    }
    if (origin === 'diverged') {
      if (localHash === sourceHash) {
        problems.push(`la fuente ya coincide con la copia local: pasá ${path} a mirror con --write`);
      } else if (!declared && prev.hash !== localHash) {
        problems.push(`cambió sin declarar: ${path} (--diverge --reason si es a propósito)`);
      } else {
        groups.diverged.push({ path, hash: localHash, origin: 'diverged', reason: reasonFor(path) });
      }
      continue;
    }
    if (origin === 'local') {
      problems.push(`declarado local pero existe en la fuente: ${path} (clasificalo como mirror o diverged)`);
      continue;
    }
    if (localHash === sourceHash) {
      groups.mirror.push({ path, hash: sourceHash, origin: 'mirror', reason: null });
      continue;
    }
    problems.push(`difiere de la fuente sin declarar: ${path} (--diverge --reason si es a propósito)`);
  }

  for (const [path, localHash] of [...tree].sort(([a], [b]) => a.localeCompare(b))) {
    if (sourceFiles.has(baseName(path))) continue;
    const prev = previous.get(path);
    const declared = declaredNow.get(path);
    if (declared?.origin === 'retire') continue; // ya reportado arriba como retiro + presencia
    if (prev?.origin === 'mirror') {
      problems.push(`declarado mirror y la fuente ya no lo tiene: ${path}`);
      continue;
    }
    if (declared?.origin === 'local' || prev?.origin === 'local') {
      if (!declared && prev.hash !== localHash) {
        problems.push(`cambió sin declarar: ${path} (--local --reason si es a propósito)`);
      } else {
        groups.local.push({ path, hash: localHash, origin: 'local', reason: reasonFor(path) });
      }
      continue;
    }
    if (!declared) {
      problems.push(`archivo propio sin declarar: ${path} (--local --reason)`);
      continue;
    }
    groups.local.push({ path, hash: localHash, origin: 'local', reason: reasonFor(path) });
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
    retired: [...retired]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([path, why]) => ({ path, reason: why })),
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

  const values = { '--ref': [], '--retire': [], '--diverge': [], '--local': [], '--reason': [] };
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

  const reason = values['--reason'].join(' ').trim();
  const parseDeclaration = (value, origin) => {
    const split = value.indexOf('=');
    const path = split === -1 ? value : value.slice(0, split);
    const inline = split === -1 ? null : value.slice(split + 1).trim();
    return { path, origin, reason: inline || reason };
  };
  const declarations = [
    ...values['--diverge'].map((v) => parseDeclaration(v, 'diverged')),
    ...values['--local'].map((v) => parseDeclaration(v, 'local')),
    ...values['--retire'].map((v) => parseDeclaration(v, 'retire')),
  ];

  if (flags.has('--write') && !flags.has('--from-source')) {
    die('✖ --write sólo tiene sentido con --from-source (nunca se escribe sin la fuente)', 2);
  }
  if (declarations.length && !flags.has('--write')) {
    die('✖ --diverge/--local/--retire exigen --from-source --write', 2);
  }
  const withoutReason = declarations.filter((d) => !d.reason);
  if (withoutReason.length) {
    die(
      `✖ una declaración exige motivo (--reason, o <path>=<motivo>): ${withoutReason.map((d) => d.path).join(', ')}`,
      2,
    );
  }
  if (reason && !declarations.length) {
    die('✖ --reason sólo acompaña a una declaración (--diverge/--local/--retire)', 2);
  }

  if (flags.has('--from-source')) {
    await fromSource({ ref: values['--ref'][0], write: flags.has('--write'), declarations });
  } else {
    await verify();
  }
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  main(process.argv).catch((err) => die(`✖ ${err.message}`));
}
