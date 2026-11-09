// Servidor de preview local del CDN. No se despliega: sirve el mismo Worker
// que producción y una página de QA visual.
//
//   npm run badge:preview   → http://localhost:8788/preview
//
// Sin dependencias: usa http + Request/Response de Node 20+.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

import worker from './src/worker.mjs';

const PORT = Number(process.env.PORT ?? 8788);
const previewPage = await readFile(new URL('./preview.html', import.meta.url), 'utf8');

const server = createServer(async (req, res) => {
  if (req.url === '/preview' || req.url === '/preview.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(previewPage);
    return;
  }

  try {
    const request = new Request(new URL(req.url, `http://localhost:${PORT}`), {
      method: req.method,
      headers: req.headers,
    });
    const response = await worker.fetch(request);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    if (req.method === 'HEAD' || response.body === null) {
      res.end();
    } else {
      res.end(Buffer.from(await response.arrayBuffer()));
    }
  } catch (error) {
    console.error(error);
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('preview error');
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`badge preview: http://127.0.0.1:${PORT}/preview`);
  console.log(`icono:         http://127.0.0.1:${PORT}/espirangulo`);
});
