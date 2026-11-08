import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

import worker, {
  CACHE_CONTROL,
  MAX_SIZE,
  MIN_SIZE,
  normalizeColor,
  parseSize,
  renderIcon,
} from '../src/worker.mjs';
import { DEFAULT_COLOR, PATH, TITLE, VIEWBOX } from '../src/icon.generated.mjs';
import { STATIC_VARIANTS, buildIcon, renderModule, renderStaticFiles } from '../../tools/badge/generate-badge.mjs';

const BASE = 'https://cdn.test';

const get = (path, init = {}) => worker.fetch(new Request(`${BASE}${path}`, init));

describe('contrato de color', () => {
  test('sin color usa el oro de marca y un solo path relleno', async () => {
    const res = await get('/espirangulo');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/svg+xml');
    const svg = await res.text();
    expect(svg).toContain(`fill="${DEFAULT_COLOR}"`);
    expect(svg).toContain(`viewBox="${VIEWBOX}"`);
    expect(svg).toContain(`<title>${TITLE}</title>`);
    expect(svg.match(/<path\b/g)).toHaveLength(1);
    expect(svg).not.toContain('<circle');
    expect(svg).not.toContain('Gradient');
    expect(svg).not.toContain('<script');
  });

  test.each([
    ['00c9c0', '#00c9c0'],
    ['0cf', '#0cf'],
    ['0cf9', '#0cf9'],
    ['00ccff99', '#00ccff99'],
    ['C9A84C', '#c9a84c'],
  ])('hex %s → %s', (input, expected) => {
    expect(normalizeColor(input)).toBe(expected);
    expect(renderIcon({ color: input })).toContain(`fill="${expected}"`);
  });

  test('acepta keywords CSS con su hex canónico', () => {
    expect(normalizeColor('hotpink')).toBe('#ff69b4');
    expect(normalizeColor('TEAL')).toBe('#008080');
    expect(normalizeColor('white')).toBe('#ffffff');
  });

  test('un valor inválido cae al oro de marca (nunca se refleja en el SVG)', async () => {
    const res = await get('/espirangulo/%22%3E%3Cscript%3Ealert(1)%3C/script%3E');
    expect(res.status).toBe(200);
    const svg = await res.text();
    expect(svg).toContain(`fill="${DEFAULT_COLOR}"`);
    expect(svg).not.toContain('script');
    expect(svg).not.toContain('alert');
  });

  test('_ no es un color: cae al default, como en simple-icons', () => {
    expect(normalizeColor('_')).toBe(DEFAULT_COLOR);
  });
});

describe('dark mode', () => {
  test('segundo color distinto emite prefers-color-scheme y no fill en <svg>', async () => {
    const svg = await (await get('/espirangulo/c9a84c/ffffff')).text();
    expect(svg).toContain('<style>path{fill:#c9a84c}@media (prefers-color-scheme:dark){path{fill:#ffffff}}</style>');
    expect(svg).not.toMatch(/<svg[^>]*\bfill=/);
  });

  test('segundo color igual al primero no emite style', async () => {
    const svg = await (await get('/espirangulo/c9a84c/c9a84c')).text();
    expect(svg).not.toContain('<style>');
    expect(svg).toContain('fill="#c9a84c"');
  });

  test('segundo color inválido cae al default', () => {
    expect(normalizeColor('no-es-un-color', '#000')).toBe('#000');
  });
});

describe('size y viewbox', () => {
  test('size fija width y height en px', async () => {
    const svg = await (await get('/espirangulo?size=20')).text();
    expect(svg).toContain('width="20" height="20"');
  });

  test('size se trunca y se clampa al rango', () => {
    expect(parseSize('20.9')).toBe(20);
    expect(parseSize('1')).toBe(MIN_SIZE);
    expect(parseSize('999999')).toBe(MAX_SIZE);
    expect(parseSize('abc')).toBeNull();
    expect(parseSize('-4')).toBeNull();
    expect(parseSize('')).toBeNull();
  });

  test('viewbox=auto se acepta; el icono ya es cuadrado', async () => {
    const res = await get('/espirangulo?viewbox=auto');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain(`viewBox="${VIEWBOX}"`);
  });
});

describe('rutas y métodos', () => {
  test('slug case-insensitive y barra final', async () => {
    expect((await get('/Espirangulo/')).status).toBe(200);
    expect((await get('/ESPIRANGULO/00c9c0')).status).toBe(200);
  });

  test('slug y segmentos desconocidos dan 404 sin cuerpo', async () => {
    for (const path of ['/otro', '/espirangulo/a/b/c', '/espirangulo.svg']) {
      const res = await get(path);
      expect(res.status).toBe(404);
      expect(await res.text()).toBe('');
    }
  });

  test('HEAD devuelve headers y cuerpo vacío', async () => {
    const res = await get('/espirangulo', { method: 'HEAD' });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/svg+xml');
    expect(await res.text()).toBe('');
  });

  test('métodos distintos de GET/HEAD dan 405 con Allow', async () => {
    const res = await get('/espirangulo', { method: 'POST' });
    expect(res.status).toBe(405);
    expect(res.headers.get('allow')).toBe('GET, HEAD');
  });

  test('root redirige al repo y favicon.ico es 204', async () => {
    const home = await get('/');
    expect(home.status).toBe(307);
    expect(home.headers.get('location')).toBe('https://github.com/ChristianLuciani/cluciani-brand-kit');

    expect((await get('/favicon.ico')).status).toBe(204);
  });
});

describe('headers de CDN', () => {
  test('CORS abierto, caché inmutable en edge y CSP sin scripts', async () => {
    const res = await get('/espirangulo');
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
    expect(res.headers.get('cache-control')).toBe(CACHE_CONTROL);
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('content-security-policy')).toContain("default-src 'none'");
  });
});

describe('cache de edge', () => {
  test('la segunda request idéntica sale del Cache API', async () => {
    const store = new Map();
    let puts = 0;
    const previous = globalThis.caches;
    globalThis.caches = {
      default: {
        match: async (key) => store.get(key.url)?.clone(),
        put: async (key, response) => {
          puts += 1;
          store.set(key.url, response.clone());
        },
      },
    };

    try {
      const request = () => new Request(`${BASE}/espirangulo/00c9c0?size=24`);
      const ctx = { waitUntil: (promise) => promise };
      const first = await worker.fetch(request(), {}, ctx);
      const body = await first.text();
      expect(puts).toBe(1);

      const second = await worker.fetch(request(), {}, ctx);
      expect(await second.text()).toBe(body);
      expect(puts).toBe(1);
    } finally {
      if (previous === undefined) delete globalThis.caches;
      else globalThis.caches = previous;
    }
  });
});

describe('el icono no deriva del mini canónico', () => {
  test('PATH y VIEWBOX coinciden con favicon-aurea.svg', () => {
    const icon = buildIcon();
    expect(icon.path).toBe(PATH);
    expect(icon.viewBox).toBe(VIEWBOX);
    expect(icon.title).toBe(TITLE);
  });

  test('el archivo generado está en sync con el generador', () => {
    const file = readFileSync(new URL('../src/icon.generated.mjs', import.meta.url), 'utf8');
    expect(file).toBe(renderModule());
  });

  test('C + supernova: dos subpaths cerrados en un único path', () => {
    expect(PATH.match(/Z/g)).toHaveLength(2);
  });
});

describe('assets estáticos para jsDelivr', () => {
  test('cada variante publicada es byte-idéntica al render del Worker', () => {
    const files = renderStaticFiles();
    expect(files.size).toBe(STATIC_VARIANTS.length);
    for (const [relative, expected] of files) {
      const onDisk = readFileSync(new URL(`../../${relative}`, import.meta.url), 'utf8');
      expect(onDisk, relative).toBe(expected);
    }
  });

  test('el default es oro y el adaptive cambia a blanco en dark mode', () => {
    const files = renderStaticFiles();
    expect(files.get('assets/badge/espirangulo.svg')).toContain('fill="#c9a84c"');
    const adaptive = files.get('assets/badge/espirangulo-adaptive.svg');
    expect(adaptive).toContain('path{fill:#c9a84c}');
    expect(adaptive).toContain('@media (prefers-color-scheme:dark){path{fill:#ffffff}}');
  });
});
