// Local preview of dist/ that behaves like Cloudflare Pages: it serves the
// site under its base path, applies the rules in dist/_headers and answers
// unknown addresses with 404.html.
//
//   node scripts/serve.mjs            → http://localhost:4321/
//   PORT=8080 node scripts/serve.mjs

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const PORT = Number(process.env.PORT || 4321);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
};

async function loadConfig() {
  const cfg = JSON.parse(await readFile(path.join(ROOT, 'site.config.json'), 'utf8'));
  const base = process.env.BASE_PATH || cfg.basePath || '/';
  return `/${base.replace(/^\/+|\/+$/g, '')}/`.replace(/\/{2,}/g, '/');
}

async function loadHeaderRules() {
  const text = await readFile(path.join(DIST, '_headers'), 'utf8').catch(() => '');
  const rules = [];
  let current = null;
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (!/^\s/.test(line)) {
      current = { pattern: line.trim(), headers: [] };
      rules.push(current);
    } else if (current) {
      const i = line.indexOf(':');
      current.headers.push([line.slice(0, i).trim(), line.slice(i + 1).trim()]);
    }
  }
  return rules;
}

function matches(pattern, urlPath) {
  if (pattern.endsWith('*')) return urlPath.startsWith(pattern.slice(0, -1));
  return pattern === urlPath;
}

async function resolveFile(rel) {
  const target = path.normalize(path.join(DIST, rel));
  if (!target.startsWith(DIST)) return null;
  try {
    const s = await stat(target);
    if (s.isDirectory()) {
      const index = path.join(target, 'index.html');
      await stat(index);
      return { file: index, redirect: !rel.endsWith('/') };
    }
    return { file: target };
  } catch {
    return null;
  }
}

const base = await loadConfig();
const rules = await loadHeaderRules();

createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const urlPath = decodeURIComponent(url.pathname);
  for (const rule of rules) {
    if (matches(rule.pattern, urlPath)) rule.headers.forEach(([k, v]) => res.setHeader(k, v));
  }
  if (urlPath === '/' && base !== '/') {
    res.writeHead(302, { Location: base });
    return res.end();
  }
  let found = null;
  if (urlPath.startsWith(base)) found = await resolveFile(urlPath.slice(base.length));
  if (found && found.redirect) {
    res.writeHead(301, { Location: `${url.pathname}/${url.search}` });
    return res.end();
  }
  const status = found ? 200 : 404;
  const file = found ? found.file : path.join(DIST, '404.html');
  const type = TYPES[path.extname(file)] || 'application/octet-stream';
  let body = await readFile(file);
  const headers = { 'Content-Type': type };
  // Compress text like Cloudflare does, so local measurements are realistic.
  if (/^(text\/|application\/(json|xml))/.test(type) && /\bgzip\b/.test(req.headers['accept-encoding'] || '')) {
    body = gzipSync(body);
    headers['Content-Encoding'] = 'gzip';
    headers.Vary = 'Accept-Encoding';
  }
  res.writeHead(status, headers);
  res.end(body);
}).listen(PORT, () => {
  console.log(`Serving dist/ at http://localhost:${PORT}${base}`);
});
