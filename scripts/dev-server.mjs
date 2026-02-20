import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const port = 5173;
const root = process.cwd();

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.ts': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8'
};

createServer(async (req, res) => {
  const url = req.url?.split('?')[0] ?? '/';
  const normalized = url === '/' ? '/index.html' : url;
  const path = join(root, normalized.startsWith('/src') || normalized.startsWith('/public') ? normalized.slice(1) : normalized.slice(1));

  try {
    const content = await readFile(path, 'utf-8');
    res.writeHead(200, { 'Content-Type': mime[extname(path)] ?? 'text/plain; charset=utf-8' });
    res.end(content);
    return;
  } catch {
    const index = await readFile(join(root, 'index.html'), 'utf-8');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(index);
  }
}).listen(port, () => {
  console.log(`AXIOS demo dev server: http://localhost:${port}`);
});
