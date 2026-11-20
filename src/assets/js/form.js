(function () {
  'use strict';

  var form = document.getElementById('request-form');
  if (!form) return;

  var root = form.closest('[data-form-root]');
  var i18n = JSON.parse(document.getElementById('form-i18n').textContent);
  var endpoint = form.getAttribute('data-endpoint');
  var siteKey = form.getAttribute('data-sitekey');
  var termsVersion = form.getAttribute('data-terms-version');
  var lang = form.getAttribute('data-lang');
  var contactEmail = form.getAttribute('data-email');

  var alertBox = form.querySelector('[data-form-alert]');
  var submitBtn = form.querySelector('[data-submit]');
  var submitLabel = form.querySelector('[data-submit-label]');
  var successBox = root.querySelector('[data-form-success]');
  var slot = form.querySelector('[data-turnstile]');
  var counter = form.querySelector('[data-count-for="message"]');

  var TURNSTILE_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=qaTurnstileReady';
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var FIELDS = [
    'firm_name',
    'province',
    'city',
    'contact_first_name',
    'contact_last_name',
    'contact_email',
    'contact_phone',
    'team_size',
    'message',
    'consent',
  ];
  var RULES = {
    firm_name: { required: true, max: 200 },
    province: { required: true, choices: true },
    city: { required: true, max: 100 },
    contact_first_name: { required: true, max: 100 },
    contact_last_name: { required: true, max: 100 },
    contact_email: { required: true, max: 254, email: true },
    contact_phone: { required: true, min: 7, max: 40 },
    team_size: { required: true, int: [1, 1000] },
    message: { max: 2000 },
    consent: { checked: true },
  };
  var SERVER_CODES = {
    required: 'required',
    blank: 'required',
    null: 'required',
    max_length: 'tooLong',
  };

  // Generated once per page load and reused on every retry, so a retried
  // request never creates a second application.
  var clientReference = makeUuid();
  var token = null;
  var widgetId = null;
  var turnstileState = 'idle';
  var sending = false;
  var waitingForToken = false;
  var waitTimer = null;
  var dirty = {};

  /* ------------------------------------------------------------ Helpers */

  function makeUuid() {
    var c = window.crypto;
    if (c && typeof c.randomUUID === 'function') return c.randomUUID();
    var b = new Uint8Array(16);
    c.getRandomValues(b);
    b[6] = (b[6] & 15) | 64;
    b[8] = (b[8] & 63) | 128;
    var h = Array.prototype.map
      .call(b, function (x) {
        return (x + 256).toString(16).slice(1);
      })
      .join('');
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
  }

  function field(name) {
    return form.elements[name];
  }

  function val(name) {
    return field(name).value.trim();
  }

  // "{email}" style tokens → DOM nodes, never innerHTML.
  function fillNodes(template, tokens) {
    var frag = document.createDocumentFragment();
    String(template)
      .split(/(\{[a-z]+\})/i)
      .forEach(function (part) {
        var m = part.match(/^\{([a-z]+)\}$/i);
        if (m && tokens[m[1]]) frag.appendChild(tokens[m[1]]);
        else if (part) frag.appendChild(document.createTextNode(part));
      });
    return frag;
  }

  function message(name, code) {
    var own = i18n.errors[name] || {};
    return own[code] || own.invalid || i18n.errors.generic[code] || i18n.errors.generic.invalid;
  }

  /* ---------------------------------------------------------- Validation */

  function check(name) {
    var rule = RULES[name];
    var el = field(name);
    if (rule.checked) return el.checked ? '' : 'required';
    if (name === 'team_size' && el.validity && el.validity.badInput) return 'invalid';
    var v = el.value.trim();
    if (!v) return rule.required ? 'required' : '';
    if (rule.max && v.length > rule.max) return 'tooLong';
    if (rule.min && v.length < rule.min) return 'invalid';
    if (rule.email && (!EMAIL.test(v) || (el.validity && el.validity.typeMismatch))) return 'invalid';
    if (rule.int) {
      if (!/^\d+$/.test(v)) return 'invalid';
      var n = parseInt(v, 10);
      if (n < rule.int[0] || n > rule.int[1]) return 'invalid';
    }
    if (rule.choices) {
      var ok = Array.prototype.some.call(el.options, function (o) {
        return o.value && o.value === v;
      });
      if (!ok) return 'invalid';
    }
    return '';
  }

  function setError(name, text) {
    var box = form.querySelector('[data-error-for="' + name + '"]');
    if (box) box.textContent = text || '';
    var el = field(name);
    if (el && el.setAttribute) {
      if (text) el.setAttribute('aria-invalid', 'true');
      else el.removeAttribute('aria-invalid');
    }
  }

  function validateField(name) {
    var code = check(name);
    var text = code ? message(name, code) : '';
    setError(name, text);
    return text;
  }

  FIELDS.forEach(function (name) {
    var el = field(name);
    var onChange = function () {
      dirty[name] = true;
      if (el.getAttribute('aria-invalid') === 'true') validateField(name);
    };
    el.addEventListener('input', onChange);
    el.addEventListener('change', onChange);
    el.addEventListener('blur', function () {
      if (dirty[name]) validateField(name);
    });
  });

  if (counter) {
    var updateCount = function () {
      counter.textContent = i18n.charCount
        .replace('{count}', String(field('message').value.length))
        .replace('{max}', '2000');
    };
    field('message').addEventListener('input', updateCount);
    updateCount();
  }

  /* --------------------------------------------------------------- Alert */

  function clearAlert() {
    alertBox.textContent = '';
  }

  function showAlert(content, items) {
    clearAlert();
    var title = document.createElement('p');
    title.className = 'alert-title';
    title.appendChild(typeof content === 'string' ? document.createTextNode(content) : content);
    alertBox.appendChild(title);
    if (items && items.length) {
      var list = document.createElement('ul');
      items.forEach(function (item) {
        var li = document.createElement('li');
        var a = document.createElement('a');
        a.href = '#f-' + item.name;
        a.textContent = item.text;
        a.addEventListener('click', function (event) {
          event.preventDefault();
          var el = field(item.name);
          if (el && el.focus) el.focus();
        });
        li.appendChild(a);
        list.appendChild(li);
      });
      alertBox.appendChild(list);
    }
    alertBox.focus();
  }

  function unavailableMessage() {
    var link = document.createElement('a');
    link.href = 'mailto:' + contactEmail;
    link.textContent = contactEmail;
    return fillNodes(i18n.server.unavailable, { email: link });
  }

  /* ----------------------------------------------------------- Turnstile */

  function renderTurnstile() {
    if (!window.turnstile || widgetId !== null) return;
    widgetId = window.turnstile.render(slot, {
      sitekey: siteKey,
      language: lang,
      theme: 'auto',
      size: 'flexible',
      'response-field': false,
      callback: function (value) {
        token = value;
        setError('turnstile', '');
        if (waitingForToken) {
          stopWaiting();
          send();
        }
      },
      'expired-callback': function () {
        token = null;
      },
      'timeout-callback': function () {
        token = null;
      },
      'error-callback': function () {
        token = null;
      },
    });
  }

  function loadTurnstile() {
    if (turnstileState !== 'idle' || !siteKey) return;
    turnstileState = 'loading';
    window.qaTurnstileReady = function () {
      turnstileState = 'ready';
      renderTurnstile();
    };
    var script = document.createElement('script');
    script.src = TURNSTILE_SRC;
    script.async = true;
    script.onerror = function () {
      turnstileState = 'idle';
    };
    document.head.appendChild(script);
  }

  function resetTurnstile() {
    token = null;
    if (window.turnstile && widgetId !== null) {
      try {
        window.turnstile.reset(widgetId);
      } catch (e) {
        /* widget gone: it will render again on the next load */
      }
    } else {
      loadTurnstile();
    }
  }

  // Load the challenge on the first sign of a person using the form, not with
  // the page: it keeps the page light, and filling in the fields leaves the
  // widget plenty of time to finish.
  ['focusin', 'pointerdown', 'keydown', 'input'].forEach(function (type) {
    form.addEventListener(type, loadTurnstile, { once: true, passive: true });
  });

  /* ---------------------------------------------------------- Submission */

  function setBusy(busy) {
    sending = busy;
    submitBtn.disabled = busy;
    submitLabel.textContent = busy ? i18n.sending : i18n.submit;
    if (busy) form.setAttribute('aria-busy', 'true');
    else form.removeAttribute('aria-busy');
  }

  function payload() {
    return {
      firm_name: val('firm_name'),
      province: val('province'),
      city: val('city'),
      contact_first_name: val('contact_first_name'),
      contact_last_name: val('contact_last_name'),
      contact_email: val('contact_email'),
      contact_phone: val('contact_phone'),
      team_size: parseInt(val('team_size'), 10),
      message: val('message'),
      language: lang,
      consent: true,
      terms_version: termsVersion,
      client_reference: clientReference,
      turnstile_token: token,
      website: field('website').value,
    };
  }

  function showSuccess() {
    form.hidden = true;
    successBox.hidden = false;
    successBox.focus();
  }

  function showServerFieldErrors(fields) {
    var items = [];
    var siteProblem = false;
    Object.keys(fields || {}).forEach(function (name) {
      var codes = [].concat(fields[name] || []);
      var code = SERVER_CODES[codes[0]] || 'invalid';
      if (name === 'turnstile_token') {
        setError('turnstile', i18n.server.challenge);
        items.push({ name: 'turnstile', text: i18n.server.challenge });
      } else if (name === 'consent') {
        setError('consent', i18n.server.consent);
        items.push({ name: 'consent', text: i18n.server.consent });
      } else if (FIELDS.indexOf(name) !== -1) {
        var text = message(name, code);
        setError(name, text);
        items.push({ name: name, text: text });
      } else {
        siteProblem = true;
      }
    });
    if (siteProblem && !items.length) showAlert(unavailableMessage());
    else showAlert(i18n.server.invalid, items);
  }

  function handle(status, body) {
    setBusy(false);
    var error = body && body.error;

    if (status === 200 || status === 201) {
      showSuccess();
      return;
    }

    // Any answer other than success may have used up the token.
    resetTurnstile();

    if (status === 400 && error === 'invalid') {
      showServerFieldErrors(body.fields);
    } else if (status === 400 && error === 'consent_required') {
      setError('consent', i18n.server.consent);
      showAlert(i18n.server.consent);
    } else if (status === 403 && error === 'challenge_failed') {
      showAlert(i18n.server.challenge);
    } else if (status === 403 || status === 404) {
      showAlert(unavailableMessage());
    } else if (status === 429) {
      showAlert(i18n.server.tooMany);
    } else {
      // 503 challenge_unavailable, any other status and network errors.
      // Nothing the visitor typed is cleared.
      showAlert(i18n.server.later);
    }
  }

  function send() {
    setBusy(true);
    var controller = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = controller
      ? window.setTimeout(function () {
          controller.abort();
        }, 25000)
      : null;

    fetch(endpoint, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload()),
      signal: controller ? controller.signal : undefined,
    })
      .then(function (response) {
        return response.text().then(function (text) {
          var body = null;
          try {
            body = text ? JSON.parse(text) : null;
          } catch (e) {
            body = null;
          }
          return { status: response.status, body: body };
        });
      })
      .then(
        function (result) {
          if (timer) window.clearTimeout(timer);
          handle(result.status, result.body);
        },
        function () {
          if (timer) window.clearTimeout(timer);
          handle(0, null);
        }
      );
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    if (sending || waitingForToken) return;

    var errors = [];
    FIELDS.forEach(function (name) {
      dirty[name] = true;
      var text = validateField(name);
      if (text) errors.push({ name: name, text: text });
    });
    setError('turnstile', '');

    if (errors.length) {
      showAlert(i18n.summaryTitle, errors);
      return;
    }

    clearAlert();
    if (token) {
      send();
      return;
    }

    // The check is still running: hold the request for a few seconds and send
    // it as soon as the token arrives. If the widget needs a click, say so.
    loadTurnstile();
    waitingForToken = true;
    setBusy(true);
    waitTimer = window.setTimeout(function () {
      stopWaiting();
      setBusy(false);
      var waitText = i18n.errors.turnstile.required;
      setError('turnstile', waitText);
      showAlert(waitText);
    }, 10000);
  });

  function stopWaiting() {
    waitingForToken = false;
    if (waitTimer) window.clearTimeout(waitTimer);
    waitTimer = null;
  }
})();
