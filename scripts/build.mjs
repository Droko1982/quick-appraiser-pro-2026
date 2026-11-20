// Builds the static site into dist/. No dependencies: Node 18+ only.
//
//   node scripts/build.mjs
//
// Environment variables override site.config.json (useful on Cloudflare Pages):
//   SITE_URL            https://www.example.ca        (no trailing slash)
//   BASE_PATH           /                             (folder the site is served from)
//   TURNSTILE_SITE_KEY  0x4AAAAAA...                  (public site key)
//   APP_URL             https://app.example.ca        (the platform)

import { readFile, writeFile, mkdir, rm, readdir, copyFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { layout } from '../src/templates/layout.mjs';
import * as pages from '../src/templates/pages.mjs';
import { rootPage, notFoundPage } from '../src/templates/special.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');
const LANGS = ['en', 'fr'];

/* --------------------------------------------------------------- Config */

async function loadConfig() {
  const file = JSON.parse(await readFile(path.join(ROOT, 'site.config.json'), 'utf8'));
  const env = process.env;
  const cfg = {
    ...file,
    siteUrl: env.SITE_URL || file.siteUrl,
    basePath: env.BASE_PATH || file.basePath || '/',
    turnstileSiteKey: env.TURNSTILE_SITE_KEY || file.turnstileSiteKey,
    appUrl: env.APP_URL || file.appUrl,
  };
  cfg.siteUrl = cfg.siteUrl.replace(/\/+$/, '');
  cfg.appUrl = cfg.appUrl.replace(/\/+$/, '');
  cfg.basePath = `/${cfg.basePath.replace(/^\/+|\/+$/g, '')}/`.replace(/\/{2,}/g, '/');
  // A wrong value here breaks every link of the site without any other sign.
  // Git Bash on Windows, for one, rewrites BASE_PATH=/ into the path of its
  // own folder ("C:/Program Files/Git/").
  if (!/^\/([A-Za-z0-9._~-]+\/)*$/.test(cfg.basePath)) {
    throw new Error(
      `BASE_PATH is not a folder of the site: "${cfg.basePath}".\n` +
        '  In Git Bash on Windows, put MSYS_NO_PATHCONV=1 before the command, or use PowerShell.'
    );
  }
  for (const [name, value] of [['SITE_URL', cfg.siteUrl], ['APP_URL', cfg.appUrl]]) {
    let url;
    try {
      url = new URL(value);
    } catch {
      throw new Error(`${name} is not an address: "${value}"`);
    }
    if (!/^https?:$/.test(url.protocol) || url.pathname !== '/' || url.search || url.hash) {
      throw new Error(`${name} must be scheme and host only, for example https://www.example.ca (got "${value}")`);
    }
  }
  cfg.signInUrl = `${cfg.appUrl}${cfg.signInPath}`;
  cfg.intakeUrl = `${cfg.appUrl}${cfg.intakePath}`;

  const appOrigin = new URL(cfg.appUrl).origin;
  const directives = [
    "default-src 'self'",
    "script-src 'self' https://challenges.cloudflare.com",
    'frame-src https://challenges.cloudflare.com',
    `connect-src 'self' ${appOrigin}`,
    "img-src 'self' data:",
    "style-src 'self'",
    "font-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];
  // frame-ancestors only works as an HTTP header (ignored in <meta>).
  cfg.cspHeader = [...directives, "frame-ancestors 'none'"].join('; ');
  cfg.cspMeta = directives.join('; ');
  return cfg;
}

/* ---------------------------------------------------------- Translations */

function shape(value, at, out) {
  if (Array.isArray(value)) {
    out.push(`${at}[${value.length}]`);
    value.forEach((v, i) => shape(v, `${at}[${i}]`, out));
  } else if (value && typeof value === 'object') {
    for (const key of Object.keys(value).sort()) shape(value[key], at ? `${at}.${key}` : key, out);
  } else {
    out.push(at);
    // An empty string is a forgotten translation, except the home page slug.
    if (typeof value === 'string' && !value.trim() && at !== 'slugs.home') out.push(`${at} (empty)`);
  }
  return out;
}

async function loadDicts() {
  const dicts = {};
  for (const lang of LANGS) {
    dicts[lang] = JSON.parse(await readFile(path.join(SRC, 'i18n', `${lang}.json`), 'utf8'));
  }
  // Both languages must have exactly the same keys and list lengths.
  const [a, b] = LANGS.map((l) => new Set(shape(dicts[l], '', [])));
  const onlyA = [...a].filter((k) => !b.has(k));
  const onlyB = [...b].filter((k) => !a.has(k));
  const empty = [...a, ...b].filter((k) => k.endsWith('(empty)'));
  if (onlyA.length || onlyB.length || empty.length) {
    const lines = [
      ...onlyA.map((k) => `  only in ${LANGS[0]}: ${k}`),
      ...onlyB.map((k) => `  only in ${LANGS[1]}: ${k}`),
      ...empty.map((k) => `  empty: ${k}`),
    ];
    throw new Error(`Translation files do not match:\n${lines.join('\n')}`);
  }
  return dicts;
}

/* ---------------------------------------------------------------- Assets */

const hash = (buf) => createHash('sha256').update(buf).digest('hex').slice(0, 10);

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

// Conservative minifiers: comments and whitespace only, nothing clever.
function minifyCss(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{};])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim();
}

function minifyJs(js) {
  return js
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('//') && !/^\/\*.*\*\/$/.test(line))
    .join('\n');
}

function hashedName(rel, buf) {
  const ext = path.posix.extname(rel);
  return `${rel.slice(0, -ext.length)}.${hash(buf)}${ext}`;
}

async function buildAssets() {
  const srcDir = path.join(SRC, 'assets');
  const files = (await walk(srcDir)).map((full) => ({
    full,
    rel: path.relative(srcDir, full).split(path.sep).join('/'),
  }));
  const manifest = {};
  const write = async (rel, buf) => {
    const target = path.join(DIST, 'assets', ...rel.split('/'));
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, buf);
  };

  // Everything except CSS first: CSS refers to fonts and images by name.
  for (const f of files.filter((f) => !f.rel.endsWith('.css'))) {
    let buf = await readFile(f.full);
    if (f.rel.endsWith('.js')) buf = Buffer.from(minifyJs(buf.toString('utf8')));
    manifest[f.rel] = hashedName(f.rel, buf);
    await write(manifest[f.rel], buf);
  }
  for (const f of files.filter((f) => f.rel.endsWith('.css'))) {
    let css = await readFile(f.full, 'utf8');
    css = css.replace(/url\((['"]?)\.\.\/([^'")]+)\1\)/g, (match, quote, ref) => {
      const hashed = manifest[ref];
      if (!hashed) throw new Error(`${f.rel}: unknown asset ${ref}`);
      // CSS sits in assets/css/, so "../" still points at assets/.
      return `url(${quote}../${hashed}${quote})`;
    });
    const buf = Buffer.from(minifyCss(css));
    manifest[f.rel] = hashedName(f.rel, buf);
    await write(manifest[f.rel], buf);
  }
  return manifest;
}

async function copyStatic() {
  const dir = path.join(SRC, 'static');
  for (const full of await walk(dir)) {
    const rel = path.relative(dir, full);
    const target = path.join(DIST, rel);
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(full, target);
  }
}

/* ----------------------------------------------------------------- Pages */

const PAGES = [
  { key: 'home', render: pages.home },
  { key: 'features', render: pages.features },
  { key: 'requestAccess', render: pages.requestAccess, form: true },
  { key: 'faq', render: pages.faq },
  { key: 'contact', render: pages.contact, form: true },
  { key: 'privacy', render: (ctx) => pages.legal(ctx, 'privacy'), noindex: true },
  { key: 'terms', render: (ctx) => pages.legal(ctx, 'terms'), noindex: true },
];

function makeContext(cfg, dicts, manifest) {
  const base = cfg.basePath;
  const pathFor = (key, lang) => {
    const slug = dicts[lang].slugs[key];
    if (slug === undefined) throw new Error(`No slug for page "${key}" in ${lang}`);
    return `${lang}/${slug ? `${slug}/` : ''}`;
  };
  const shared = {
    cfg,
    dicts,
    base,
    year: new Date().getFullYear(),
    pathFor,
    hrefFor: (key, lang) => base + pathFor(key, lang),
    absFor: (key, lang) => cfg.siteUrl + base + pathFor(key, lang),
    asset(rel) {
      const hashed = manifest[rel];
      if (!hashed) throw new Error(`Unknown asset: ${rel}`);
      return `${base}assets/${hashed}`;
    },
  };
  return (lang, pageKey = null) => {
    const other = LANGS.find((l) => l !== lang);
    return {
      ...shared,
      lang,
      pageKey,
      t: dicts[lang],
      other: { lang: other, t: dicts[other] },
      href: (key, l = lang) => shared.hrefFor(key, l),
      abs: (key, l = lang) => shared.absFor(key, l),
    };
  };
}

async function writePage(relPath, content) {
  const target = path.join(DIST, ...relPath.split('/'));
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, String(content).replace(/\n\s*\n+/g, '\n'));
}

function sitemap(cfg, ctxFor) {
  const ctx = ctxFor('en');
  const urls = PAGES.filter((p) => !p.noindex).flatMap((p) =>
    LANGS.map((lang) => {
      const alts = LANGS.map(
        (l) => `    <xhtml:link rel="alternate" hreflang="${ctx.dicts[l].hreflang}" href="${ctx.absFor(p.key, l)}"/>`
      ).join('\n');
      return `  <url>\n    <loc>${ctx.absFor(p.key, lang)}</loc>\n${alts}\n    <xhtml:link rel="alternate" hreflang="x-default" href="${cfg.siteUrl}${cfg.basePath}"/>\n  </url>`;
    })
  );
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>
`;
}

function headersFile(cfg) {
  const permissions = [
    'accelerometer=()',
    'autoplay=()',
    'camera=()',
    'display-capture=()',
    'encrypted-media=()',
    'fullscreen=(self)',
    'geolocation=()',
    'gyroscope=()',
    'magnetometer=()',
    'microphone=()',
    'midi=()',
    'payment=()',
    'picture-in-picture=()',
    'publickey-credentials-get=()',
    'screen-wake-lock=()',
    'serial=()',
    'usb=()',
    'xr-spatial-tracking=()',
  ].join(', ');
  return `/*
  Content-Security-Policy: ${cfg.cspHeader}
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: ${permissions}
  X-Frame-Options: DENY
  Cross-Origin-Opener-Policy: same-origin
  Strict-Transport-Security: max-age=31536000

${cfg.basePath}assets/*
  Cache-Control: public, max-age=31536000, immutable
`;
}

/* ------------------------------------------------------------------ Main */

async function main() {
  const started = Date.now();
  const cfg = await loadConfig();
  const dicts = await loadDicts();

  await rm(DIST, { recursive: true, force: true });
  await mkdir(DIST, { recursive: true });

  const manifest = await buildAssets();
  await copyStatic();
  const ctxFor = makeContext(cfg, dicts, manifest);

  let count = 0;
  for (const lang of LANGS) {
    for (const page of PAGES) {
      const ctx = ctxFor(lang, page.key);
      const body = page.render(ctx);
      const doc = layout(ctx, { ...page, body });
      await writePage(`${ctx.pathFor(page.key, lang)}index.html`, doc);
      count += 1;
    }
  }

  const neutral = ctxFor('en');
  await writePage('index.html', rootPage(neutral));
  await writePage('404.html', notFoundPage(neutral));
  await writeFile(path.join(DIST, 'sitemap.xml'), sitemap(cfg, ctxFor));
  await writeFile(
    path.join(DIST, 'robots.txt'),
    `User-agent: *\nAllow: /\n\nSitemap: ${cfg.siteUrl}${cfg.basePath}sitemap.xml\n`
  );
  await writeFile(path.join(DIST, '_headers'), headersFile(cfg));
  await writeFile(path.join(DIST, '.nojekyll'), '');

  const size = (await stat(path.join(DIST, 'assets', manifest['css/site.css']))).size;
  console.log(
    `Built ${count + 2} pages into dist/ in ${Date.now() - started} ms` +
      `\n  site:      ${cfg.siteUrl}${cfg.basePath}` +
      `\n  platform:  ${cfg.appUrl}` +
      `\n  turnstile: ${cfg.turnstileSiteKey.startsWith('1x0000') ? 'TEST site key (replace before launch)' : cfg.turnstileSiteKey}` +
      `\n  css:       ${(size / 1024).toFixed(1)} kB`
  );
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
