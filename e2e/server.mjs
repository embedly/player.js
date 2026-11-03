// Static test server for the Playwright suite.
//
// Serves the repo root on two ports so the parent page and the iframes live on
// different origins (http://localhost:8004 vs http://127.0.0.1:8003), which is
// the situation player.js exists for.
//
// /player.js is built on every request by concatenating src/ in the same order
// as the Grunt `concat:release` task, so the tests always run against the
// current source without needing Grunt.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

export const PARENT_PORT = 8004;
export const CHILD_PORT = 8003;

const SOURCES = [
  'src/intro.js',
  'src/core.js',
  'src/keeper.js',
  'src/player.js',
  'src/receiver.js',
  'src/adapters/html.js',
  'src/adapters/jwplayer.js',
  'src/adapters/mock.js',
  'src/adapters/video.js',
  'src/outro.js',
];

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.mp4': 'video/mp4',
};

async function bundle() {
  const parts = await Promise.all(SOURCES.map((f) => readFile(join(ROOT, f), 'utf8')));
  return parts.join('\n');
}

// Write a response body, optionally in small timed chunks (?throttle=1) so
// the browser sees a slow download, e.g. to observe media 'progress' events.
function sendBody(res, buf, throttle) {
  if (!throttle) {
    res.end(buf);
    return;
  }
  const CHUNK = 32 * 1024;
  let offset = 0;
  const timer = setInterval(() => {
    if (res.destroyed || offset >= buf.length) {
      clearInterval(timer);
      res.end();
      return;
    }
    res.write(buf.subarray(offset, offset + CHUNK));
    offset += CHUNK;
  }, 100);
  res.on('close', () => clearInterval(timer));
}

async function handle(req, res) {
  const url = new URL(req.url, 'http://x');

  try {
    // /redirect?to=/path issues a 302, like embed URLs that bounce to the
    // real player page.
    if (url.pathname === '/redirect') {
      const to = url.searchParams.get('to') ?? '/';
      if (!to.startsWith('/')) {
        res.writeHead(400).end('relative paths only');
        return;
      }
      res.writeHead(302, { location: to, 'cache-control': 'no-store' }).end();
      return;
    }

    if (url.pathname === '/player.js') {
      res.writeHead(200, { 'content-type': TYPES['.js'], 'cache-control': 'no-store' });
      res.end(await bundle());
      return;
    }

    const path = normalize(join(ROOT, decodeURIComponent(url.pathname)));
    if (!path.startsWith(ROOT)) {
      res.writeHead(403).end();
      return;
    }

    const body = await readFile(path);
    const throttle = url.searchParams.has('throttle');
    const type = TYPES[extname(path)] ?? 'application/octet-stream';

    // Video elements need byte-range support to seek.
    const range = req.headers.range?.match(/bytes=(\d*)-(\d*)/);
    if (range) {
      const start = range[1] ? Number(range[1]) : 0;
      const end = range[2] ? Number(range[2]) : body.length - 1;
      res.writeHead(206, {
        'content-type': type,
        'content-range': `bytes ${start}-${end}/${body.length}`,
        'accept-ranges': 'bytes',
        'content-length': end - start + 1,
      });
      sendBody(res, body.subarray(start, end + 1), throttle);
      return;
    }

    res.writeHead(200, { 'content-type': type, 'accept-ranges': 'bytes', 'cache-control': 'no-store' });
    sendBody(res, body, throttle);
  } catch {
    res.writeHead(404).end('not found');
  }
}

for (const port of [PARENT_PORT, CHILD_PORT]) {
  createServer(handle).listen(port, () => console.log(`player.js test server on :${port}`));
}
