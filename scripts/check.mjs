// Checks the built site in dist/ against the rules of the brief.
//
//   node scripts/build.mjs && node scripts/check.mjs
//
// Exits with code 1 and a list of problems if anything fails.

import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');

const cfg = JSON.parse(await readFile(path.join(ROOT, 'site.config.json'), 'utf8'));
const base = `/${(process.env.BASE_PATH || cfg.basePath || '/').replace(/^\/+|\/+$/g, '')}/`.replace(/\/{2,}/g, '/');

// Words and patterns that must never appear in the copy.
const FORBIDDEN = [
  [/\bAI\b/, 'the word "AI"'],
  [/\bIA\b/, 'the word "IA"'],
  [/lorem|ipsum/i, 'placeholder text'],
  [/\$\s?\d|\d\s?\$/, 'a price'],
  [/\b(price|prices|pricing|per month|per user|free trial|prix|tarif|tarifs|tarification|essai gratuit)\b/i, 'pricing words'],
  [/\b(made|built|powered|designed) (with|by)\b/i, 'a "made with" mention'],
  [/\b(stored|hosted|kept) in canada\b|(hébergé|stocké|conservé)e?s? au canada/i, 'a data residency claim'],
  [/\b(SOC ?2|ISO ?27001|ISO ?9001|testimonial|témoignage|award|prix d’excellence)\b/i, 'a certification or testimonial'],
  [/revolutionary|game-?changing|révolutionnaire/i, 'hype'],
  [/\b(TODO|FIXME|TBD)\b/, 'a work note'],
];

const problems = [];
const report = (file, msg) => problems.push(`${path.relative(DIST, file).split(path.sep).join('/')}: ${msg}`);

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

async function exists(file) {
  try {
    await stat(file);
    return true;
  } catch {
    return false;
  }
}

function visibleText(htmlText) {
  return htmlText
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ');
}

function attr(tag, name) {
  const m = tag.match(new RegExp(`\\s${name}="([^"]*)"`, 'i'));
  return m ? m[1] : null;
}

function urlToFile(url) {
  const clean = url.split('#')[0].split('?')[0];
  if (!clean.startsWith(base)) return null;
  const rel = clean.slice(base.length);
  return path.join(DIST, ...rel.split('/').filter(Boolean), rel === '' || rel.endsWith('/') ? 'index.html' : '');
}

const files = await walk(DIST);
const htmlFiles = files.filter((f) => f.endsWith('.html'));
const idsByFile = new Map();

for (const file of htmlFiles) {
  const text = await readFile(file, 'utf8');
  const ids = new Set();
  for (const m of text.matchAll(/\sid="([^"]+)"/g)) {
    if (ids.has(m[1])) report(file, `duplicate id "${m[1]}"`);
    ids.add(m[1]);
  }
  idsByFile.set(path.normalize(file), ids);
}

for (const file of htmlFiles) {
  const text = await readFile(file, 'utf8');
  const rel = path.relative(DIST, file).split(path.sep).join('/');
  const isPage = /^(en|fr)\//.test(rel);

  const lang = text.match(/<html lang="([^"]+)"/);
  if (!lang || !['en', 'fr'].includes(lang[1])) report(file, 'missing lang="en" or lang="fr"');
  if (isPage && lang && !rel.startsWith(lang[1] + '/')) report(file, `lang="${lang[1]}" does not match the folder`);
  if (!/<title>[^<]{5,}<\/title>/.test(text)) report(file, 'missing <title>');
  if (!/<meta name="description" content="[^"]{20,}">/.test(text)) report(file, 'missing meta description');
  if (/<meta name="generator"/i.test(text)) report(file, 'generator meta tag');
  if (/<!--/.test(text)) report(file, 'HTML comment left in the output');
  if (/\sstyle="/i.test(text)) report(file, 'inline style attribute (blocked by the CSP)');
  if (/\son[a-z]+="/i.test(text)) report(file, 'inline event handler (blocked by the CSP)');

  for (const m of text.matchAll(/<script\b[^>]*>/gi)) {
    const type = attr(m[0], 'type');
    if (!attr(m[0], 'src') && type !== 'application/json' && type !== 'application/ld+json') {
      report(file, 'inline script (blocked by the CSP)');
    }
  }

  if (isPage) {
    if (!/<link rel="canonical" href="https:\/\//.test(text)) report(file, 'missing canonical');
    const alternates = [...text.matchAll(/<link rel="alternate" hreflang="([^"]+)"/g)].map((m) => m[1]);
    for (const h of ['en-CA', 'fr-CA', 'x-default']) {
      if (!alternates.includes(h)) report(file, `missing hreflang ${h}`);
    }
    if (!/<meta property="og:image" content="https:\/\/[^"]+\.png">/.test(text)) report(file, 'missing og:image');
    if (!/class="lang-switch/.test(text)) report(file, 'missing language switch');
  }

  for (const m of text.matchAll(/<img\b[^>]*>/gi)) {
    if (attr(m[0], 'alt') === null) report(file, 'image without alt');
    if (!attr(m[0], 'width') || !attr(m[0], 'height')) report(file, 'image without width/height');
  }

  // Every form control has a label.
  const labels = new Set([...text.matchAll(/<label for="([^"]+)"/g)].map((m) => m[1]));
  for (const m of text.matchAll(/<(input|select|textarea)\b[^>]*>/gi)) {
    const id = attr(m[0], 'id');
    if (attr(m[0], 'type') === 'hidden') continue;
    if (!id || !labels.has(id)) report(file, `form control without a label (${id || m[1]})`);
  }

  // Internal links and assets resolve.
  for (const m of text.matchAll(/\s(?:href|src|srcset)="([^"]+)"/g)) {
    const url = m[1];
    if (url.startsWith('#')) {
      const id = url.slice(1);
      if (id && !idsByFile.get(path.normalize(file)).has(id)) report(file, `link to missing #${id}`);
      continue;
    }
    const target = urlToFile(url);
    if (!target) continue;
    if (!(await exists(target))) {
      report(file, `broken link ${url}`);
      continue;
    }
    const hash = url.split('#')[1];
    if (hash && target.endsWith('.html') && !idsByFile.get(path.normalize(target))?.has(hash)) {
      report(file, `link to missing ${url}`);
    }
  }

  // Copy rules.
  const copy = visibleText(text) + ' ' + [...text.matchAll(/\s(?:content|alt|aria-label|title)="([^"]*)"/g)].map((m) => m[1]).join(' ');
  for (const [re, what] of FORBIDDEN) {
    const hit = copy.match(re);
    if (hit) report(file, `${what}: "${hit[0]}"`);
  }
}

for (const required of ['index.html', '404.html', 'sitemap.xml', 'robots.txt', '_headers', 'og-en.png', 'og-fr.png', 'favicon.ico']) {
  if (!(await exists(path.join(DIST, required)))) problems.push(`missing ${required}`);
}

const headers = await readFile(path.join(DIST, '_headers'), 'utf8').catch(() => '');
for (const h of ['Content-Security-Policy', 'X-Content-Type-Options: nosniff', 'Referrer-Policy: strict-origin-when-cross-origin', 'Permissions-Policy']) {
  if (!headers.includes(h)) problems.push(`_headers: missing ${h}`);
}

if (problems.length) {
  console.error(`${problems.length} problem(s):\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log(`OK: ${htmlFiles.length} HTML files checked, no problems found.`);
