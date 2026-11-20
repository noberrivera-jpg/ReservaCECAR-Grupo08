/**
 * server.js – Servidor local con Proxy inverso anti-CORS (Cero dependencias)
 * 
 * Este servidor resuelve el problema de CORS automáticamente:
 * 1. Sirve los archivos estáticos del frontend (HTML, CSS, JS).
 * 2. Redirige las peticiones /api/* hacia el backend https://api.ehily.cecar.cloud
 *    agregando las cabeceras Access-Control-Allow-Origin para que ningún
 *    navegador las bloquee.
 * 
 * Para ejecutarlo:
 *   node server.js
 * Luego abre en tu navegador:
 *   http://localhost:3000
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3000;
const BACKEND_HOST = 'api.ehily.cecar.cloud';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon'
};

const server = http.createServer((req, res) => {
  // Habilitar CORS para todas las respuestas
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Empresa-Id');

  // Responder preflight OPTIONS de inmediato
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url);
  const pathname = parsedUrl.pathname;

  // 1. Si la petición es para la API (/api/...) -> Reenviar al Backend
  if (pathname.startsWith('/api/')) {
    const options = {
      hostname: BACKEND_HOST,
      port: 443,
      path: req.url,
      method: req.method,
      headers: {
        ...req.headers,
        host: BACKEND_HOST
      }
    };

    const proxyReq = https.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, {
        ...proxyRes.headers,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Empresa-Id'
      });
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      console.error('Error al conectar con backend:', err.message);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'No se pudo contactar el backend: ' + err.message }));
    });

    req.pipe(proxyReq);
    return;
  }

  // 2. Si es archivo estático -> Servir desde la carpeta local
  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
  
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 No encontrado: ' + pathname);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log('==================================================');
  console.log(` Servidor local activo en: http://localhost:${PORT}`);
  console.log(` Proxy anti-CORS conectado a: https://${BACKEND_HOST}`);
  console.log('==================================================');
  console.log('Abre tu navegador en: http://localhost:' + PORT);
});
