import { html } from './html.mjs';
import { headCommon, headAssets } from './layout.mjs';
import { icon } from './icons.mjs';

// "/" and "404.html" are not tied to one language: they show both.

function soloBrand(ctx) {
  return html`<a class="brand" href="${ctx.base}">
    <picture>
      <source srcset="${ctx.asset('img/logo-on-dark.webp')}" media="(prefers-color-scheme: dark)">
      <img src="${ctx.asset('img/logo-on-light.webp')}" alt="" width="75" height="44" decoding="async">
    </picture>
    <span class="brand-name">QuickAppraiser</span>
  </a>`;
}

export function rootPage(ctx) {
  const { cfg, dicts } = ctx;
  const en = dicts.en;
  const fr = dicts.fr;
  const url = `${cfg.siteUrl}${ctx.base}`;
  return html`<!doctype html>
<html lang="en" data-base="${ctx.base}">
<head>
${headCommon(ctx)}
<title>QuickAppraiser</title>
<meta name="description" content="${en.meta.pages.home.description}">
<link rel="alternate" hreflang="${en.hreflang}" href="${ctx.absFor('home', 'en')}">
<link rel="alternate" hreflang="${fr.hreflang}" href="${ctx.absFor('home', 'fr')}">
<link rel="alternate" hreflang="x-default" href="${url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="QuickAppraiser">
<meta property="og:title" content="${en.meta.pages.home.title}">
<meta property="og:description" content="${en.meta.pages.home.description}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${url}og-en.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${en.meta.ogImageAlt}">
<meta name="twitter:card" content="summary_large_image">
${headAssets(ctx)}
<script src="${ctx.asset('js/lang-redirect.js')}"></script>
</head>
<body>
<main class="solo" id="main">
  <div class="solo-card">
    ${soloBrand(ctx)}
    <h1 class="sr-only">QuickAppraiser</h1>
    <div class="solo-actions">
      <a class="btn btn-primary btn-lg" href="${ctx.hrefFor('home', 'en')}" hreflang="en-CA" data-lang="en">${en.root.choose}</a>
      <a class="btn btn-secondary btn-lg" href="${ctx.hrefFor('home', 'fr')}" hreflang="fr-CA" lang="fr" data-lang="fr">${fr.root.choose}</a>
    </div>
  </div>
</main>
</body>
</html>
`;
}

export function notFoundPage(ctx) {
  const { dicts } = ctx;
  const en = dicts.en;
  const fr = dicts.fr;
  return html`<!doctype html>
<html lang="en">
<head>
${headCommon(ctx)}
<title>${en.notFound.title} · ${fr.notFound.title} · QuickAppraiser</title>
<meta name="description" content="${en.meta.pages.notFound.description}">
<meta name="robots" content="noindex">
${headAssets(ctx)}
</head>
<body>
<main class="solo" id="main">
  <div class="solo-card">
    ${soloBrand(ctx)}
    <p class="solo-code">${en.notFound.code}</p>
    <h1>${en.notFound.title}</h1>
    <p>${en.notFound.body}</p>
    <a class="btn btn-primary" href="${ctx.hrefFor('home', 'en')}" hreflang="en-CA">${en.notFound.home}${icon('arrow', 'icon btn-icon')}</a>
    <div class="solo-split" lang="fr">
      <h2>${fr.notFound.title}</h2>
      <p>${fr.notFound.body}</p>
      <a class="btn btn-secondary" href="${ctx.hrefFor('home', 'fr')}" hreflang="fr-CA">${fr.notFound.home}${icon('arrow', 'icon btn-icon')}</a>
    </div>
  </div>
</main>
</body>
</html>
`;
}
