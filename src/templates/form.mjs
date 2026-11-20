import { html, raw, fill, jsonForScript } from './html.mjs';
import { icon } from './icons.mjs';

const PROVINCES = ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'];

function describedBy(...ids) {
  return ids.filter(Boolean).join(' ');
}

function textField(f, name, { type = 'text', max, min, autocomplete, half = false, inputmode, extra = '' }) {
  const hint = f.hints[name];
  const ids = describedBy(hint ? `h-${name}` : '', `e-${name}`);
  return html`<div class="field${half ? ' field-half' : ''}" data-field="${name}">
    <label for="f-${name}">${f.labels[name]}</label>
    ${hint ? html`<p class="field-hint" id="h-${name}">${hint}</p>` : ''}
    <input id="f-${name}" name="${name}" type="${type}" required${max ? raw(` maxlength="${max}"`) : ''}${
      min ? raw(` minlength="${min}"`) : ''
    }${autocomplete ? raw(` autocomplete="${autocomplete}"`) : ''}${inputmode ? raw(` inputmode="${inputmode}"`) : ''}${raw(extra)} aria-describedby="${ids}">
    <p class="field-error" id="e-${name}" data-error-for="${name}"></p>
  </div>`;
}

export function requestForm(ctx, { headingLevel = 2 } = {}) {
  const { t, cfg, lang } = ctx;
  const f = t.form;
  const collator = new Intl.Collator(t.hreflang);
  const provinces = PROVINCES.map((code) => ({ code, name: f.provinces[code] })).sort((a, b) =>
    collator.compare(a.name, b.name)
  );
  const h = `h${headingLevel}`;
  const privacyLink = html`<a href="${ctx.href('privacy')}" target="_blank" rel="noopener">${f.consentLink}<span class="sr-only"> (${f.newTab})</span></a>`;

  const messages = {
    labels: f.labels,
    errors: f.errors,
    server: f.server,
    submit: f.submit,
    sending: f.sending,
    summaryTitle: f.summaryTitle,
    charCount: f.charCount,
  };

  return html`<div class="form-card" data-form-root>
  <form class="request-form" id="request-form" novalidate
    data-endpoint="${cfg.intakeUrl}"
    data-sitekey="${cfg.turnstileSiteKey}"
    data-terms-version="${cfg.termsVersion}"
    data-lang="${lang}"
    data-email="${cfg.contactEmail}">
    <p class="form-intro">${f.intro}</p>
    <noscript><p class="form-alert">${fill(f.noscript, { email: html`<a href="mailto:${cfg.contactEmail}">${cfg.contactEmail}</a>` })}</p></noscript>
    <div class="form-alert" data-form-alert role="alert" tabindex="-1"></div>
    <div class="form-grid">
      ${textField(f, 'firm_name', { max: 200, autocomplete: 'organization' })}
      <div class="field field-half" data-field="province">
        <label for="f-province">${f.labels.province}</label>
        <div class="select-wrap">
          <select id="f-province" name="province" required autocomplete="address-level1" aria-describedby="e-province">
            <option value="">${f.provincePrompt}</option>
            ${provinces.map((p) => html`<option value="${p.code}">${p.name}</option>`)}
          </select>
          ${icon('chevron', 'icon select-icon')}
        </div>
        <p class="field-error" id="e-province" data-error-for="province"></p>
      </div>
      ${textField(f, 'city', { max: 100, autocomplete: 'address-level2', half: true })}
      ${textField(f, 'contact_first_name', { max: 100, autocomplete: 'given-name', half: true })}
      ${textField(f, 'contact_last_name', { max: 100, autocomplete: 'family-name', half: true })}
      ${textField(f, 'contact_email', { type: 'email', max: 254, autocomplete: 'email', half: true, extra: ' spellcheck="false" autocapitalize="off"' })}
      ${textField(f, 'contact_phone', { type: 'tel', min: 7, max: 40, autocomplete: 'tel', half: true })}
      ${textField(f, 'team_size', { type: 'number', inputmode: 'numeric', extra: ' min="1" max="1000" step="1"' })}
      <div class="field" data-field="message">
        <label for="f-message">${f.labels.message} <span class="field-optional">(${f.optional})</span></label>
        <p class="field-hint" id="h-message">${f.hints.message}</p>
        <textarea id="f-message" name="message" rows="4" maxlength="2000" aria-describedby="h-message e-message"></textarea>
        <div class="field-meta">
          <p class="field-error" id="e-message" data-error-for="message"></p>
          <p class="field-count" data-count-for="message" aria-hidden="true">${fill(f.charCount, { count: '0', max: '2000' })}</p>
        </div>
      </div>
    </div>

    <div class="hp-field" aria-hidden="true">
      <label for="f-website">${f.labels.website}</label>
      <input id="f-website" name="website" type="text" tabindex="-1" autocomplete="off" aria-hidden="true">
    </div>

    <div class="field field-check" data-field="consent">
      <div class="check">
        <input id="f-consent" name="consent" type="checkbox" required aria-describedby="e-consent">
        <label for="f-consent">${fill(f.consent, { privacy: privacyLink })}</label>
      </div>
      <p class="field-error" id="e-consent" data-error-for="consent"></p>
    </div>

    <div class="field field-turnstile" data-field="turnstile" role="group" aria-label="${f.verificationLabel}">
      <div class="turnstile-slot" data-turnstile></div>
      <p class="field-error" id="e-turnstile" data-error-for="turnstile"></p>
    </div>

    <button class="btn btn-primary btn-lg btn-submit" type="submit" data-submit>
      <span class="spinner" aria-hidden="true"></span><span data-submit-label>${f.submit}</span>
    </button>
  </form>

  <div class="form-success" data-form-success tabindex="-1" hidden>
    <span class="success-icon">${icon('tick', 'icon')}</span>
    ${raw(`<${h} class="success-title">`)}${f.successTitle}${raw(`</${h}>`)}
    <p>${f.success}</p>
  </div>
  <script type="application/json" id="form-i18n">${jsonForScript(messages)}</script>
</div>`;
}
