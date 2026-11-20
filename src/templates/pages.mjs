import { html, raw } from './html.mjs';
import { icon } from './icons.mjs';
import { heroMock } from './mock.mjs';
import { requestForm } from './form.mjs';

function eyebrow(text) {
  return html`<p class="eyebrow">${text}</p>`;
}

function pageHero(ctx, { eyebrow: eb, title, lead, narrow = false }) {
  return html`<section class="page-hero${narrow ? ' page-hero-narrow' : ''}">
  <div class="container">
    ${eb ? eyebrow(eb) : ''}
    <h1>${title}</h1>
    ${lead ? html`<p class="lead">${lead}</p>` : ''}
  </div>
</section>`;
}

function ctaBand(ctx, { title, body, button }) {
  const { t, cfg } = ctx;
  return html`<section class="cta-band" aria-labelledby="cta-title">
  <div class="container">
    <div class="cta-panel">
      <div class="cta-copy">
        <h2 id="cta-title">${title}</h2>
        <p>${body}</p>
      </div>
      <div class="cta-actions">
        <a class="btn btn-light btn-lg" href="${ctx.href('requestAccess')}">${button}${icon('arrow', 'icon btn-icon')}</a>
        <p class="cta-signin">${t.home.ctaSignIn} <a href="${cfg.signInUrl}">${t.home.ctaSignInLink}</a></p>
      </div>
    </div>
  </div>
</section>`;
}

function mailLink(ctx) {
  const email = ctx.cfg.contactEmail;
  return html`<a href="mailto:${email}">${email}</a>`;
}

/* ---------------------------------------------------------------- Home */

export function home(ctx) {
  const { t } = ctx;
  const h = t.home;
  const groups = t.features.groups;
  return html`<section class="hero">
  <div class="hero-grid-bg" aria-hidden="true"></div>
  <div class="container hero-inner">
    <div class="hero-copy">
      ${eyebrow(h.eyebrow)}
      <h1 class="hero-title">${h.titleLead} <span class="hero-title-end">${h.titleEnd}</span></h1>
      <p class="hero-sub">${h.subtitle}</p>
      <div class="hero-actions">
        <a class="btn btn-primary btn-lg" href="${ctx.href('requestAccess')}">${h.ctaPrimary}${icon('arrow', 'icon btn-icon')}</a>
        <a class="btn btn-secondary btn-lg" href="#how-it-works">${h.ctaSecondary}</a>
      </div>
      <ul class="hero-facts" aria-label="${h.factsLabel}">
        ${h.facts.map((fact) => html`<li>${icon('tick', 'icon')}${fact}</li>`)}
      </ul>
    </div>
    <div class="hero-visual">${heroMock(ctx)}</div>
  </div>
</section>

<section class="section values" aria-labelledby="values-title">
  <div class="container">
    <div class="section-head">
      ${eyebrow(h.valuesEyebrow)}
      <h2 id="values-title">${h.valuesTitle}</h2>
    </div>
    <ul class="value-grid">
      ${h.values.map(
        (v) => html`<li class="value-card">
        <span class="value-icon">${icon(v.icon)}</span>
        <h3>${v.title}</h3>
        <p>${v.body}</p>
      </li>`
      )}
    </ul>
  </div>
</section>

<section class="section how" id="how-it-works" tabindex="-1" aria-labelledby="how-title">
  <div class="container">
    <div class="section-head">
      ${eyebrow(h.howEyebrow)}
      <h2 id="how-title">${h.howTitle}</h2>
      <p class="section-lead">${h.howLead}</p>
    </div>
    <ol class="steps">
      ${h.steps.map(
        (s, i) => html`<li class="step">
        <span class="step-num" aria-hidden="true">${String(i + 1)}</span>
        <h3>${s.title}</h3>
        <p>${s.body}</p>
      </li>`
      )}
    </ol>
  </div>
</section>

<section class="section overview" aria-labelledby="overview-title">
  <div class="container">
    <div class="section-head section-head-row">
      <div>
        ${eyebrow(h.overviewEyebrow)}
        <h2 id="overview-title">${h.overviewTitle}</h2>
      </div>
      <a class="text-link" href="${ctx.href('features')}">${h.overviewLink}${icon('arrow', 'icon')}</a>
    </div>
    <ul class="overview-grid">
      ${groups.map(
        (g) => html`<li>
        <a class="overview-card" href="${ctx.href('features')}#${g.id}">
          <span class="overview-icon">${icon(g.icon)}</span>
          <span class="overview-text"><span class="overview-title">${g.title}</span><span class="overview-intro">${g.intro}</span></span>
        </a>
      </li>`
      )}
    </ul>
  </div>
</section>

${ctaBand(ctx, { title: h.ctaTitle, body: h.ctaBody, button: h.ctaButton })}`;
}

/* ------------------------------------------------------------ Features */

export function features(ctx) {
  const { t } = ctx;
  const f = t.features;
  return html`${pageHero(ctx, { eyebrow: f.eyebrow, title: f.title, lead: f.lead })}

<div class="container features-layout">
  <nav class="feature-jump" aria-label="${f.jumpLabel}">
    <ul>
      ${f.groups.map((g) => html`<li><a href="#${g.id}">${icon(g.icon)}<span>${g.title}</span></a></li>`)}
    </ul>
  </nav>
  <div class="feature-groups">
    ${f.groups.map(
      (g) => html`<section class="feature-group" id="${g.id}" aria-labelledby="${g.id}-title">
      <div class="feature-group-head">
        <span class="feature-group-icon">${icon(g.icon)}</span>
        <div>
          <h2 id="${g.id}-title">${g.title}</h2>
          <p>${g.intro}</p>
        </div>
      </div>
      <ul class="feature-items">
        ${g.items.map(
          (item) => html`<li class="feature-item">
          <h3>${item.title}</h3>
          <p>${item.body}</p>
        </li>`
        )}
      </ul>
    </section>`
    )}
  </div>
</div>

${ctaBand(ctx, { title: f.ctaTitle, body: f.ctaBody, button: f.ctaButton })}`;
}

/* ------------------------------------------------------ Request access */

export function requestAccess(ctx) {
  const { t, cfg } = ctx;
  const r = t.request;
  return html`<section class="page-hero page-hero-form">
  <div class="container form-layout form-layout-request">
    <div class="form-aside request-intro">
      ${eyebrow(r.eyebrow)}
      <h1>${r.title}</h1>
      <p class="lead">${r.lead}</p>
    </div>
    <div class="form-column request-form-column">
      ${requestForm(ctx, { headingLevel: 2 })}
    </div>
    <div class="form-aside request-details">
      <div class="aside-block">
        <h2 class="aside-title">${r.nextTitle}</h2>
        <ol class="next-steps">
          ${r.next.map((step, i) => html`<li><span class="next-num" aria-hidden="true">${String(i + 1)}</span><span>${step}</span></li>`)}
        </ol>
      </div>
      <div class="aside-block aside-contact">
        <h2 class="aside-title">${r.emailTitle}</h2>
        <p>${r.emailBody} ${mailLink(ctx)}</p>
      </div>
      <div class="aside-block aside-contact">
        <h2 class="aside-title">${r.signInTitle}</h2>
        <p><a href="${cfg.signInUrl}">${r.signInLink}</a></p>
      </div>
    </div>
  </div>
</section>`;
}

/* ------------------------------------------------------------- Contact */

export function contact(ctx) {
  const { t } = ctx;
  const c = t.contact;
  return html`${pageHero(ctx, { eyebrow: c.eyebrow, title: c.title, lead: c.lead })}
<section class="section section-tight contact-section">
  <div class="container form-layout">
    <div class="form-aside">
      <div class="contact-card">
        <span class="contact-icon">${icon('mail')}</span>
        <div>
          <h2 class="aside-title">${c.emailLabel}</h2>
          <p class="contact-email">${mailLink(ctx)}</p>
        </div>
      </div>
    </div>
    <div class="form-column">
      <h2 class="form-heading" id="contact-form-title">${c.formTitle}</h2>
      <p class="form-heading-lead">${c.formLead}</p>
      ${requestForm(ctx, { headingLevel: 3 })}
    </div>
  </div>
</section>`;
}

/* ----------------------------------------------------------------- FAQ */

export function faq(ctx) {
  const { t } = ctx;
  const q = t.faq;
  return html`${pageHero(ctx, { eyebrow: q.eyebrow, title: q.title, lead: q.lead, narrow: true })}
<section class="section section-tight">
  <div class="container container-narrow">
    <div class="faq-list">
      ${q.items.map(
        (item, i) => html`<details class="faq-item"${i === 0 ? raw(' open') : ''}>
        <summary><span>${item.q}</span>${icon('chevron', 'icon faq-chevron')}</summary>
        <div class="faq-answer"><p>${item.a}</p></div>
      </details>`
      )}
    </div>
    <div class="faq-more">
      <h2>${q.moreTitle}</h2>
      <p>${q.moreBody} ${mailLink(ctx)}</p>
      <a class="btn btn-primary" href="${ctx.href('requestAccess')}">${t.nav.requestAccess}${icon('arrow', 'icon btn-icon')}</a>
    </div>
  </div>
</section>`;
}

/* --------------------------------------------------------------- Legal */

export function legal(ctx, which) {
  const { t } = ctx;
  const title = which === 'privacy' ? t.legal.privacyTitle : t.legal.termsTitle;
  return html`${pageHero(ctx, { title, narrow: true })}
<section class="section section-tight">
  <div class="container container-narrow">
    <p class="legal-pending">${t.legal.pending}</p>
  </div>
</section>`;
}
