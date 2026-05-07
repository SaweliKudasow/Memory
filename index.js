import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), 'files');
const type = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.svg': 'image/svg+xml',
};

http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  const file = url === '/' ? 'index.html' : url.slice(1);
  if (file.includes('..')) {
    res.writeHead(403);
    return res.end();
  }
  fs.readFile(path.join(root, file), (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end('404');
    }
    res.writeHead(200, { 'Content-Type': type[path.extname(file)] || 'text/plain' });
    res.end(data);
  });
}).listen(3011);
