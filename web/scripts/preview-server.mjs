import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.woff': 'font/woff', '.woff2': 'font/woff2' };
export async function preview() {
  const dist = resolve(import.meta.dirname, '../../dist');
  const server = createServer(async (req, res) => {
    try {
      const pathname = new URL(req.url, 'http://localhost').pathname;
      if (!pathname.startsWith('/preview/')) { res.writeHead(404).end(); return; }
      const path = resolve(dist, pathname.slice('/preview/'.length) || 'index.html');
      if (!path.startsWith(dist + '/')) { res.writeHead(403).end(); return; }
      res.writeHead(200, { 'Content-Type': mime[extname(path)] || 'application/octet-stream' });
      res.end(await readFile(path));
    } catch { res.writeHead(404).end(); }
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  return { url: `http://127.0.0.1:${server.address().port}/preview/`, close: () => new Promise(r => server.close(r)) };
}
