// Minimal HTML templating: every interpolated value is escaped unless it was
// produced by `html` itself or wrapped in `raw()`.

class Safe {
  constructor(value) {
    this.value = value;
  }
  toString() {
    return this.value;
  }
}

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escape(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ESCAPES[ch]);
}

export function raw(value) {
  return new Safe(String(value));
}

function render(value) {
  if (value === null || value === undefined || value === false) return '';
  if (value instanceof Safe) return value.value;
  if (Array.isArray(value)) return value.map(render).join('');
  return escape(value);
}

export function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i += 1) {
    out += render(values[i]) + strings[i + 1];
  }
  return new Safe(out);
}

// Replace {name} tokens in a translated string. Text parts are escaped; token
// values may be Safe (e.g. a link built with `html`).
export function fill(template, tokens) {
  const parts = String(template).split(/(\{[a-z]+\})/gi);
  return raw(
    parts
      .map((part) => {
        const m = part.match(/^\{([a-z]+)\}$/i);
        if (m && Object.prototype.hasOwnProperty.call(tokens, m[1])) return render(tokens[m[1]]);
        return escape(part);
      })
      .join('')
  );
}

// JSON safe to embed inside <script type="application/json">.
export function jsonForScript(data) {
  return raw(
    JSON.stringify(data)
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e')
      .replace(/&/g, '\\u0026')
      .replace(/\u2028/g, '\\u2028')
      .replace(/\u2029/g, '\\u2029')
  );
}
