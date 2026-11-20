# QuickAppraiser — public website

The public website of QuickAppraiser, bilingual in Canadian English and Canadian
French. Its one job is to let an appraisal firm **request access** to the
platform. The platform itself lives at
<https://web-production-bbad4.up.railway.app>; the site only links to it and
sends the request form to it.

- Static HTML, CSS and a little JavaScript. No framework, no npm packages.
- Every page exists at `/en/…` and `/fr/…`; `/` sends visitors to the language
  of their browser (or the one they chose before).
- Light and dark mode follow the visitor's system setting.
- No trackers, no cookies, no third-party fonts. The only outside script is
  Cloudflare Turnstile, on the two pages that have the form.

| Page | English | French |
|---|---|---|
| Home | `/en/` | `/fr/` |
| Features | `/en/features/` | `/fr/fonctionnalites/` |
| Request access | `/en/request-access/` | `/fr/demande-acces/` |
| FAQ | `/en/faq/` | `/fr/faq/` |
| Contact | `/en/contact/` | `/fr/contact/` |
| Privacy | `/en/privacy/` | `/fr/confidentialite/` |
| Terms | `/en/terms/` | `/fr/conditions/` |
| Not found | `/404.html` (both languages) | |

## Run it on your computer

You need [Node.js](https://nodejs.org) 18 or newer. Nothing to install.

```bash
node scripts/build.mjs     # builds the site into dist/
node scripts/check.mjs     # checks dist/ against the rules below
node scripts/serve.mjs     # preview at http://localhost:4321/…
```

`npm run dev` does the build and starts the preview in one step.

The preview server applies the same security headers as Cloudflare Pages
(from `dist/_headers`), so what works there works in production.

## Change the copy

All the text of the site, in both languages, is in two files:

- `src/i18n/en.json`: English
- `src/i18n/fr.json`: French

Edit the value, keep the key. Both files must have exactly the same keys and
the same number of items in each list (FAQ questions, features, steps): the
build stops and names the key if one is missing or empty. This prevents a
French page from showing a missing sentence.

A few strings contain a token in braces that the site fills in. Keep the token:

| Token | Where | Replaced by |
|---|---|---|
| `{privacy}` | `form.consent` | the link to the Privacy page (its text is `form.consentLink`) |
| `{email}` | `form.server.unavailable` | the contact email, as a link |
| `{count}` `{max}` | `form.charCount` | the message length counter |

Other things you may want to change:

- **Page addresses**: `slugs` in each file (`fonctionnalites`, `demande-acces`…).
- **Titles and descriptions for search engines**: `meta.pages`.
- **FAQ**: `faq.items`. **Features**: `features.groups`.
- **Province names**: `form.provinces`. The codes (AB, BC…) are what the
  platform receives and must not change.

After editing, run the build and check again.

## Settings and keys

`site.config.json` holds everything that is not copy:

| Setting | Meaning |
|---|---|
| `siteUrl` | The site's address, without a trailing slash. Used for canonical links, hreflang, the sitemap and social cards. |
| `basePath` | The folder the site is served from: `/` on its own domain. |
| `appUrl` | The platform. "Sign in" goes to `appUrl` + `signInPath`, the form posts to `appUrl` + `intakePath`. |
| `contactEmail` | Shown on the Contact page and in error messages. |
| `turnstileSiteKey` | The Turnstile **site** key (public). |
| `termsVersion` | Sent with each request as `terms_version`. Change it when the Privacy text changes. |

The build also reads these environment variables, which win over the file.
This is the easiest way to set them on Cloudflare Pages:

| Variable | Example |
|---|---|
| `SITE_URL` | `https://www.quickappraiser.ca` |
| `BASE_PATH` | `/` |
| `TURNSTILE_SITE_KEY` | `0x4AAAAAAA…` |
| `APP_URL` | `https://app.quickappraiser.ca` (when the platform gets its own domain) |

The Content-Security-Policy is generated from `appUrl`, so a new platform
address is allowed automatically.

### Current values

The repository is set up for the preview on GitHub Pages
(`https://droko1982.github.io/quick-appraiser-pro-2026/`) with Cloudflare's
**test** Turnstile key `1x00000000000000000000AA`. The test key always passes
and shows a "for testing only" notice; the platform will refuse its tokens.
Replace it with the real key before launch (see below).

## Cloudflare Turnstile

1. In the Cloudflare dashboard, open **Turnstile → Add widget**.
2. Name it "QuickAppraiser website", widget mode **Managed**.
3. Hostnames: the site's domain (for example `quickappraiser.ca` and
   `www.quickappraiser.ca`) and, while testing, the `*.pages.dev` address.
4. Copy the **site key** into `turnstileSiteKey` (or the `TURNSTILE_SITE_KEY`
   variable on Cloudflare Pages).
5. The **secret key** goes to the platform only, never into this repository or
   the site. Hand it over privately (a password manager share or a secrets
   tool), not by plain email or chat. The platform stores it on its side.

The widget loads the first time a visitor touches the form, in the page's
language and in light or dark to match the page. If someone presses "Send"
before the check has finished, the request waits for it and then goes out.

## Publish on Cloudflare Pages

1. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**,
   and pick this repository.
2. Build settings:
   - Framework preset: **None**
   - Build command: `node scripts/build.mjs && node scripts/check.mjs`
   - Build output directory: `dist`
3. Environment variables (Production):
   - `SITE_URL` = the final address, for example `https://quickappraiser.pages.dev`
     or your own domain
   - `BASE_PATH` = `/`
   - `TURNSTILE_SITE_KEY` = the real site key
   - `NODE_VERSION` = `20`
4. Save and deploy. Every push to `main` deploys again.
5. Optional: **Custom domains → Set up a domain**.

`dist/_headers` is applied automatically by Cloudflare Pages: the
Content-Security-Policy (only the site itself, `challenges.cloudflare.com` for
Turnstile, and `connect-src` to the platform), `X-Content-Type-Options: nosniff`,
`Referrer-Policy: strict-origin-when-cross-origin`, a restrictive
`Permissions-Policy`, `X-Frame-Options: DENY` and long caching for the
fingerprinted files in `/assets/`.

To upload from your computer instead of connecting Git:

```bash
SITE_URL=https://quickappraiser.pages.dev BASE_PATH=/ TURNSTILE_SITE_KEY=0x… node scripts/build.mjs
npx wrangler pages deploy dist --project-name quickappraiser-site
```

### Register the site on the platform

The platform only accepts the form from addresses it knows (CORS). Until the
exact address is registered there, every request is refused and visitors see
"The form is not available right now". Register the **origin** — scheme and
host, no path, no trailing slash:

- preview: `https://droko1982.github.io`
- Cloudflare Pages: `https://<project>.pages.dev`
- own domain: `https://www.quickappraiser.ca` (and the bare domain if it serves
  the site too)

## The request form

The form posts JSON with `fetch` to `appUrl` + `intakePath` with exactly these
fields: `firm_name`, `province`, `city`, `contact_first_name`,
`contact_last_name`, `contact_email`, `contact_phone`, `team_size` (a number),
`message`, `language` (`en`/`fr`, from the page), `consent` (`true`),
`terms_version`, `client_reference`, `turnstile_token` and the trap field
`website`.

- `client_reference` is a UUID made once when the page loads and reused on
  every retry, so a retry never creates a second application.
- The button is disabled while a request is on its way.
- Each answer of the platform (201/200, 400 `invalid` with field errors, 400
  `consent_required`, 403 `challenge_failed`, 403/404 `origin_not_allowed` /
  `unknown_source`, 429, 503 and network errors) shows its own message in the
  page's language. After a failure the Turnstile widget is reset and nothing
  the visitor typed is lost.
- The code is in `src/assets/js/form.js`; the messages are under `form` in the
  translation files.

## Images

- `src/assets/img/logo-on-light.webp` and `logo-on-dark.webp`: the logo, from
  the two PNG files of the brand.
- `src/static/og-en.png`, `og-fr.png`: social cards (1200 × 630).
- `src/static/favicon.ico`, `icon-192.png`, `icon-512.png`,
  `apple-touch-icon.png`: icons.

Replace a file with one of the same name and size, then build.

## Privacy and Terms

Both pages say `[LEGAL TEXT PENDING]` and ask search engines not to index them
(`noindex: true` in `scripts/build.mjs`). When the legal text exists, put it in
`src/templates/pages.mjs` (`legal`) and the translation files, remove
`noindex`, and change `termsVersion`.

## What `check.mjs` verifies

On every page of `dist/`: `lang="en"`/`lang="fr"`, a title and description,
canonical and hreflang links, the language switch, Open Graph image, labels on
every field, alt text and size on every image, no inline scripts, styles or
event handlers (they would break the security policy), no broken internal
links, and none of the copy the brief rules out (the `FORBIDDEN` list: prices,
placeholder text, "made with" mentions, data-residency claims, certifications,
testimonials and the other words listed there).

## Files

```
site.config.json         settings and keys
src/i18n/en.json, fr.json all the copy
src/templates/           page templates (HTML in JavaScript template strings)
src/assets/css/site.css  the design system: colours, type, layout
src/assets/js/           site.js (menu, language), form.js (the form), lang-redirect.js (/)
src/assets/fonts/        Inter, served by the site (SIL Open Font License)
src/static/              copied as is to the root of the site
scripts/                 build, check and local preview
```
