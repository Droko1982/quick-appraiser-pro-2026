import { html, raw, jsonForScript } from './html.mjs';
import { icon } from './icons.mjs';

const NAV = ['features', 'faq', 'contact'];

export function langSwitch(ctx, extraClass = '') {
  const { t, other } = ctx;
  return html`<div class="lang-switch ${extraClass}" role="group" aria-label="${t.a11y.langLabel}">
    <span class="lang-current" aria-current="true">${t.langShort}<span class="sr-only"> · ${t.langName} (${t.a11y.currentLang})</span></span>
    <a class="lang-link" href="${ctx.href(ctx.pageKey, other.lang)}" hreflang="${other.t.hreflang}" lang="${other.lang}" data-lang="${other.lang}">${other.t.langShort}<span class="sr-only"> · ${other.t.langName}</span></a>
  </div>`;
}

function brand(ctx, variant) {
  const { t } = ctx;
  const img =
    variant === 'dark'
      ? html`<img src="${ctx.asset('img/logo-on-dark.webp')}" alt="" width="68" height="40" decoding="async">`
      : html`<picture>
          <source srcset="${ctx.asset('img/logo-on-dark.webp')}" media="(prefers-color-scheme: dark)">
          <img src="${ctx.asset('img/logo-on-light.webp')}" alt="" width="68" height="40" decoding="async">
        </picture>`;
  return html`<a class="brand" href="${ctx.href('home')}">${img}<span class="brand-name">${t.meta.siteName}</span></a>`;
}

function navLinks(ctx) {
  const { t } = ctx;
  return NAV.map(
    (key) =>
      html`<li><a href="${ctx.href(key)}"${ctx.pageKey === key ? raw(' aria-current="page"') : ''}>${t.nav[key]}</a></li>`
  );
}

function header(ctx) {
  const { t, cfg } = ctx;
  return html`<header class="site-header" data-header>
  <div class="container header-inner">
    ${brand(ctx, 'auto')}
    <nav class="site-nav" aria-label="${t.a11y.navLabel}">
      <ul class="nav-list">${navLinks(ctx)}</ul>
      <a class="nav-signin" href="${cfg.signInUrl}">${t.nav.signIn}</a>
      <a class="btn btn-primary btn-sm" href="${ctx.href('requestAccess')}"${ctx.pageKey === 'requestAccess' ? raw(' aria-current="page"') : ''}>${t.nav.requestAccess}</a>
    </nav>
    <div class="header-tools">
      ${langSwitch(ctx)}
      <details class="mobile-menu" data-mobile-menu>
        <summary class="menu-toggle" aria-label="${t.a11y.menuOpen}" data-label-open="${t.a11y.menuOpen}" data-label-close="${t.a11y.menuClose}">
          ${icon('menu', 'icon icon-open')}${icon('close', 'icon icon-close')}
        </summary>
        <nav class="mobile-panel" aria-label="${t.a11y.navLabel}">
          <ul class="mobile-list">${navLinks(ctx)}
            <li><a href="${cfg.signInUrl}">${t.nav.signIn}</a></li>
          </ul>
          <a class="btn btn-primary btn-block" href="${ctx.href('requestAccess')}">${t.nav.requestAccess}</a>
        </nav>
      </details>
    </div>
  </div>
</header>`;
}

function footer(ctx) {
  const { t, cfg } = ctx;
  return html`<footer class="site-footer">
  <div class="container footer-grid">
    <div class="footer-brand">
      ${brand(ctx, 'dark')}
      <p>${t.footer.tagline}</p>
    </div>
    <nav class="footer-nav" aria-label="${t.a11y.footerNavLabel}">
      <div>
        <h2 class="footer-title">${t.footer.colPlatform}</h2>
        <ul>
          <li><a href="${ctx.href('features')}">${t.footer.features}</a></li>
          <li><a href="${ctx.href('faq')}">${t.footer.faq}</a></li>
          <li><a href="${ctx.href('requestAccess')}">${t.footer.requestAccess}</a></li>
          <li><a href="${cfg.signInUrl}">${t.footer.signIn}</a></li>
        </ul>
      </div>
      <div>
        <h2 class="footer-title">${t.footer.colCompany}</h2>
        <ul>
          <li><a href="${ctx.href('contact')}">${t.footer.contact}</a></li>
          <li><a href="${ctx.href('privacy')}">${t.footer.privacy}</a></li>
          <li><a href="${ctx.href('terms')}">${t.footer.terms}</a></li>
        </ul>
      </div>
    </nav>
  </div>
  <div class="container footer-bottom">
    <p>© <span data-year>${ctx.year}</span> QuickAppraiser</p>
    ${langSwitch(ctx, 'lang-switch-footer')}
  </div>
</footer>`;
}

export function headCommon(ctx) {
  const { cfg } = ctx;
  return html`<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="${cfg.cspMeta}">
<meta name="referrer" content="strict-origin-when-cross-origin">`;
}

export function headAssets(ctx) {
  return html`<meta name="color-scheme" content="light dark">
<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0b1322" media="(prefers-color-scheme: dark)">
<meta name="author" content="${ctx.cfg.author}">
<link rel="preload" href="${ctx.asset('fonts/inter-latin.woff2')}" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${ctx.asset('css/site.css')}">
<link rel="icon" href="${ctx.base}favicon.ico" sizes="32x32">
<link rel="icon" href="${ctx.base}icon-192.png" type="image/png" sizes="192x192">
<link rel="apple-touch-icon" href="${ctx.base}apple-touch-icon.png">`;
}

function seo(ctx, page) {
  const { t, other, cfg } = ctx;
  const meta = t.meta.pages[page.key];
  const url = ctx.abs(page.key, ctx.lang);
  const ogImage = `${cfg.siteUrl}${ctx.base}og-${ctx.lang}.png`;
  const alternates = page.alternates === false
    ? ''
    : html`<link rel="canonical" href="${url}">
<link rel="alternate" hreflang="${t.hreflang}" href="${url}">
<link rel="alternate" hreflang="${other.t.hreflang}" href="${ctx.abs(page.key, other.lang)}">
<link rel="alternate" hreflang="x-default" href="${cfg.siteUrl}${ctx.base}">`;
  return html`<title>${meta.title}</title>
<meta name="description" content="${meta.description}">
${page.noindex ? raw('<meta name="robots" content="noindex">') : ''}
${alternates}
<meta property="og:type" content="website">
<meta property="og:site_name" content="${t.meta.siteName}">
<meta property="og:title" content="${meta.title}">
<meta property="og:description" content="${meta.description}">
<meta property="og:url" content="${url}">
<meta property="og:locale" content="${t.locale}">
<meta property="og:locale:alternate" content="${other.t.locale}">
<meta property="og:image" content="${ogImage}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${t.meta.ogImageAlt}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${meta.title}">
<meta name="twitter:description" content="${meta.description}">
<meta name="twitter:image" content="${ogImage}">`;
}

function structuredData(ctx) {
  const { cfg, t } = ctx;
  const home = `${cfg.siteUrl}${ctx.base}`;
  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${home}#organization`,
        name: 'QuickAppraiser',
        url: home,
        logo: `${home}icon-512.png`,
        email: cfg.contactEmail,
        areaServed: { '@type': 'Country', name: 'Canada' },
      },
      {
        '@type': 'WebSite',
        '@id': `${home}#website`,
        name: 'QuickAppraiser',
        url: ctx.abs('home', ctx.lang),
        inLanguage: t.hreflang,
        publisher: { '@id': `${home}#organization` },
      },
    ],
  };
  return html`<script type="application/ld+json">${jsonForScript(data)}</script>`;
}

export function layout(ctx, page) {
  const { t } = ctx;
  const scripts = [html`<script src="${ctx.asset('js/site.js')}" defer></script>`];
  if (page.form) {
    scripts.push(html`<script src="${ctx.asset('js/form.js')}" defer></script>`);
  }
  return html`<!doctype html>
<html lang="${ctx.lang}">
<head>
${headCommon(ctx)}
${seo(ctx, page)}
${headAssets(ctx)}
${page.key === 'home' ? structuredData(ctx) : ''}
${scripts}
</head>
<body class="page-${page.key}">
<a class="skip-link" href="#main">${t.a11y.skip}</a>
${header(ctx)}
<main id="main" tabindex="-1">
${page.body}
</main>
${footer(ctx)}
</body>
</html>
`;
}
