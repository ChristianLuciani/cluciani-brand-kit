// CDN de icono para el brand kit — contrato tipo cdn.simpleicons.org.
//
//   GET /espirangulo[:color][/:darkModeColor][?viewbox=auto][?size=N]
//
// El SVG no se sirve desde disco ni se compone a mano: nace de
// cdn/src/icon.generated.mjs, que se regenera desde
// assets/logo/favicon-aurea.svg (mini: C + supernova) con
// `npm run badge:generate`. El icono es monocromo; el color se inyecta acá.
//
// Deploy: Cloudflare Worker (ver docs/badge.md). Sin KV, R2 ni red en runtime.

import { CSS_COLORS } from './colors.mjs';
import { DEFAULT_COLOR, PATH, TITLE, VIEWBOX } from './icon.generated.mjs';

export const SLUG = 'espirangulo';
export const REPO_URL = 'https://github.com/ChristianLuciani/cluciani-brand-kit';
export const MIN_SIZE = 3;
export const MAX_SIZE = 16383;
export const CACHE_CONTROL = 'public, max-age=86400, s-maxage=31536000, stale-while-revalidate=604800';

const HEX = /^(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i;

/** Normaliza `color`/`dark` al contrato: hex o keyword CSS; si no, fallback. */
export function normalizeColor(value, fallback = DEFAULT_COLOR) {
  if (typeof value !== 'string') return fallback;
  const color = value.trim().toLowerCase();
  if (CSS_COLORS.has(color)) return CSS_COLORS.get(color);
  if (HEX.test(color)) return `#${color}`;
  return fallback;
}

/** `size` es un entero positivo en px; se clampa al rango del contrato. */
export function parseSize(value) {
  if (value === null || value === undefined || value === '') return null;
  const size = Math.trunc(Number(value));
  if (!Number.isFinite(size) || size <= 0) return null;
  return Math.min(MAX_SIZE, Math.max(MIN_SIZE, size));
}

/** Devuelve el SVG del icono. `darkColor` sólo cambia el fill en dark mode. */
export function renderIcon({ color, darkColor, size } = {}) {
  const light = normalizeColor(color);
  const dark = darkColor === undefined || darkColor === null
    ? null
    : normalizeColor(darkColor);
  const px = parseSize(size);

  const attrs = [
    'xmlns="http://www.w3.org/2000/svg"',
    `viewBox="${VIEWBOX}"`,
    'role="img"',
  ];
  if (px !== null) attrs.push(`width="${px}"`, `height="${px}"`);

  const title = `<title>${TITLE}</title>`;
  const path = `<path d="${PATH}"/>`;
  const darkMode = dark !== null && dark !== light;

  if (darkMode) {
    // El fill vive en el <style> para poder cambiarlo con prefers-color-scheme.
    return `<svg ${attrs.join(' ')}>${title}<style>path{fill:${light}}@media (prefers-color-scheme:dark){path{fill:${dark}}}</style>${path}</svg>`;
  }

  return `<svg fill="${light}" ${attrs.join(' ')}>${title}${path}</svg>`;
}

const svgHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': CACHE_CONTROL,
  'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'",
  'Content-Type': 'image/svg+xml',
  'X-Content-Type-Options': 'nosniff',
};

function route(pathname) {
  if (pathname === '/') return { name: 'home' };
  if (pathname === '/favicon.ico') return { name: 'favicon' };

  const segments = pathname.split('/').filter(Boolean);
  if (segments.length < 1 || segments.length > 3) return { name: 'not-found' };
  if (segments[0].toLowerCase() !== SLUG) return { name: 'not-found' };

  return { name: 'icon', color: segments[1], darkColor: segments[2] };
}

export default {
  async fetch(request, _env, ctx) {
    const method = request.method.toUpperCase();
    const url = new URL(request.url);

    let pathname;
    try {
      pathname = decodeURIComponent(url.pathname);
    } catch {
      return new Response(null, { status: 400, headers: { 'Cache-Control': 'no-store' } });
    }

    const target = route(pathname);

    if (target.name === 'home') {
      return new Response(null, {
        status: 307,
        headers: { Location: REPO_URL, 'Cache-Control': 'public, max-age=3600' },
      });
    }

    if (target.name === 'favicon') {
      return new Response(null, { status: 204, headers: { 'Cache-Control': 'public, max-age=86400' } });
    }

    if (target.name === 'not-found') {
      return new Response(null, {
        status: 404,
        headers: { 'Cache-Control': 'public, max-age=300', 'Access-Control-Allow-Origin': '*' },
      });
    }

    if (method !== 'GET' && method !== 'HEAD') {
      return new Response('Method Not Allowed', {
        status: 405,
        headers: { Allow: 'GET, HEAD', 'Cache-Control': 'no-store' },
      });
    }

    const svg = renderIcon({
      color: target.color,
      darkColor: target.darkColor,
      size: url.searchParams.get('size'),
    });

    // Cache API del Worker: el header solo no cachea la respuesta en el edge.
    // Sólo se cachean GET 200; HEAD se computa y no se almacena.
    const cache = method === 'GET' ? globalThis.caches?.default : undefined;
    const cacheKey = cache ? new Request(url.toString(), { method: 'GET' }) : null;
    if (cache && cacheKey) {
      const hit = await cache.match(cacheKey);
      if (hit) return hit;
    }

    const response = new Response(method === 'HEAD' ? null : svg, { status: 200, headers: svgHeaders });
    if (cache && cacheKey) {
      const put = cache.put(cacheKey, response.clone());
      if (ctx?.waitUntil) ctx.waitUntil(put);
    }

    return response;
  },
};
