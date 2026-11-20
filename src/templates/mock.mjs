import { html } from './html.mjs';
import { icon } from './icons.mjs';

// Illustration of an appraisal file and the phone inspection form.
// Purely decorative: hidden from assistive technology.
export function heroMock(ctx) {
  const m = ctx.t.mock;
  const states = ['done', 'done', 'active', 'todo'];
  return html`<div class="mock" aria-hidden="true">
  <div class="mock-window">
    <div class="mock-bar">
      <span class="mock-dots"><i></i><i></i><i></i></span>
      <span class="mock-file">${m.file}</span>
    </div>
    <div class="mock-body">
      <div class="mock-head">
        <div>
          <p class="mock-type">${m.type}</p>
          <p class="mock-address">${m.address}</p>
        </div>
        <span class="mock-pill">${m.status}</span>
      </div>
      <ol class="mock-steps">
        ${m.steps.map(
          (s, i) => html`<li class="mock-step is-${states[i]}">
          <span class="mock-mark">${states[i] === 'done' ? icon('tick', 'icon') : ''}</span>
          <span class="mock-step-text"><b>${s.title}</b><span>${s.detail}</span>${
            states[i] === 'active' ? html`<span class="mock-progress"><span></span></span>` : ''
          }</span>
        </li>`
        )}
      </ol>
    </div>
  </div>
  <div class="mock-phone">
    <div class="mock-phone-top">
      <span class="mock-offline">${icon('wifiOff', 'icon')}${m.phoneStatus}</span>
    </div>
    <p class="mock-phone-title">${m.phoneTitle}</p>
    <ul class="mock-phone-rows">
      ${m.phoneRows.map(
        (row, i) => html`<li class="${i < 2 ? 'is-done' : ''}"><span class="mock-check">${i < 2 ? icon('tick', 'icon') : ''}</span>${row}</li>`
      )}
    </ul>
    <div class="mock-photos"><span></span><span></span><span>${icon('camera', 'icon')}</span></div>
    <p class="mock-phone-note">${m.phoneNote}</p>
  </div>
</div>`;
}
