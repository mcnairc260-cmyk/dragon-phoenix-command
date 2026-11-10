// Turns one business profile (a plain object) into one finished web page.
// No dependencies. Every value is escaped before it goes into the page.
//
// Rules built in:
// - A preview page tells search engines not to list it (noindex).
// - Customer quotes are shown only when the profile gives a real quote
//   WITH a source link. No quote data means no quote section.
// - All colors are CSS variables.

const esc = (v) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const telHref = (phone) => {
  const d = String(phone).replace(/\D/g, '');
  return `tel:+${d.length === 10 ? '1' + d : d}`;
};

const safeUrl = (u) => (/^https?:\/\//i.test(String(u || '')) ? String(u) : '');
const safeColor = (c, fallback) => (/^#[0-9a-f]{3,8}$/i.test(String(c || '')) ? c : fallback);

export function validateProfile(p) {
  const errors = [];
  const need = (cond, msg) => cond || errors.push(msg);
  need(p && typeof p === 'object', 'profile must be an object');
  if (!p || typeof p !== 'object') return errors;
  need(typeof p.name === 'string' && p.name.trim(), 'name is required');
  need(['home-service', 'hospitality'].includes(p.template), 'template must be "home-service" or "hospitality"');
  need(typeof p.phone === 'string' && p.phone.replace(/\D/g, '').length >= 10, 'phone must have at least 10 digits');
  need(typeof p.city === 'string' && p.city.trim(), 'city is required');
  need(typeof p.region === 'string' && p.region.trim(), 'region (state) is required');
  need(typeof p.tagline === 'string' && p.tagline.trim(), 'tagline is required');
  if (p.template === 'home-service') need(Array.isArray(p.services) && p.services.length > 0, 'services must list at least one service');
  if (p.template === 'hospitality') need(Array.isArray(p.menu) && p.menu.length > 0, 'menu must list at least one section');
  for (const q of p.quotes || []) {
    need(q.text && q.name && safeUrl(q.sourceUrl), `quote from "${q.name || '?'}" needs text, name, and a sourceUrl (no source, no quote)`);
  }
  return errors;
}

const SCHEMA_TYPES = {
  'home-service': 'HomeAndConstructionBusiness',
  hospitality: 'Restaurant',
};

export function buildSite(profile) {
  const errors = validateProfile(profile);
  if (errors.length) throw new Error('Profile problems:\n- ' + errors.join('\n- '));

  const p = profile;
  const isFood = p.template === 'hospitality';
  const demo = p.demo !== false; // preview unless told it is live
  const year = p.year || new Date().getFullYear();
  const place = `${p.city}, ${p.region}`;
  const title = `${p.name} | ${p.shortCategory || (isFood ? 'Restaurant' : 'Home services')} in ${place}`;
  const description = (p.description || `${p.tagline} ${p.name} serves ${place}. Call ${p.phone}.`).slice(0, 300);
  const formAction = safeUrl(p.formAction);
  const formTitle = isFood ? p.formTitle || 'Ask about catering or a private event' : p.formTitle || 'Ask for a free quote';
  const brand = safeColor(p.theme?.brand, isFood ? '#7a2e12' : '#0f4c81');
  const accent = safeColor(p.theme?.accent, isFood ? '#e9a13b' : '#f59e0b');

  const ld = {
    '@context': 'https://schema.org',
    '@type': p.schemaType || SCHEMA_TYPES[p.template],
    name: p.name,
    description,
    telephone: p.phone,
    address: {
      '@type': 'PostalAddress',
      ...(p.street ? { streetAddress: p.street } : {}),
      addressLocality: p.city,
      addressRegion: p.region,
      ...(p.postal ? { postalCode: p.postal } : {}),
      addressCountry: 'US',
    },
    ...(p.areas?.length ? { areaServed: p.areas } : {}),
    ...(safeUrl(p.liveUrl) ? { url: p.liveUrl } : {}),
  };
  // "</" inside JSON must not close the script tag.
  const ldJson = JSON.stringify(ld, null, 2).replace(/</g, '\\u003c');

  const services = (p.services || [])
    .map(
      (s) => `
        <li class="card">
          <h3>${esc(s.name)}</h3>
          <p>${esc(s.text)}</p>${s.price ? `\n          <p class="price">${esc(s.price)}</p>` : ''}
        </li>`,
    )
    .join('');

  const menu = (p.menu || [])
    .map(
      (sec) => `
        <section class="menu-sec">
          <h3>${esc(sec.section)}</h3>
          <ul class="menu-items">${(sec.items || [])
            .map(
              (it) => `
            <li><span class="mi-name">${esc(it.name)}</span><span class="mi-dots" aria-hidden="true"></span><span class="mi-price">${esc(it.price || '')}</span>${it.text ? `<span class="mi-text">${esc(it.text)}</span>` : ''}</li>`,
            )
            .join('')}
          </ul>
        </section>`,
    )
    .join('');

  const hours = (p.hours || []).map((h) => `<tr><th scope="row">${esc(h.days)}</th><td>${esc(h.hours)}</td></tr>`).join('');
  const areas = (p.areas || []).map((a) => `<li>${esc(a)}</li>`).join('');
  const points = (p.points || []).map((t) => `<li>${esc(t)}</li>`).join('');
  const quotes = (p.quotes || [])
    .map(
      (q) => `
        <figure class="card quote">
          <blockquote>${esc(q.text)}</blockquote>
          <figcaption>${esc(q.name)} · <a href="${esc(safeUrl(q.sourceUrl))}" rel="noopener">${esc(q.sourceLabel || 'source')}</a></figcaption>
        </figure>`,
    )
    .join('');

  const eventFields = isFood
    ? `
          <label>Date of your event<input type="date" name="event_date"></label>
          <label>Number of guests<input type="number" name="guests" min="1" inputmode="numeric"></label>`
    : `
          <label>Your address or area<input type="text" name="area" autocomplete="street-address"></label>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">${demo ? '\n<meta name="robots" content="noindex, nofollow">' : ''}
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta name="theme-color" content="${esc(brand)}">
<script type="application/ld+json">
${ldJson}
</script>
<style>
:root{
  --brand:${brand};
  --accent:${accent};
  --ink:#16202b;
  --muted:#52606d;
  --bg:#ffffff;
  --soft:#f4f6f8;
  --line:#dde3ea;
  --on-brand:#ffffff;
  --on-accent:#1b1300;
  --ok:#14713d;
  --radius:14px;
}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;font:17px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:var(--ink);background:var(--bg)}
a{color:var(--brand)}
h1,h2,h3{line-height:1.2;margin:0 0 .5em}
h1{font-size:clamp(2rem,6vw,3.2rem);letter-spacing:-.02em}
h2{font-size:clamp(1.5rem,4vw,2.1rem)}
h3{font-size:1.15rem}
p{margin:0 0 1em}
.wrap{max-width:1040px;margin:0 auto;padding:0 20px}
.demo{background:var(--ink);color:var(--bg);text-align:center;padding:8px 12px;font-size:.9rem}
header.top{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 20px;max-width:1040px;margin:0 auto}
.brand{font-weight:800;font-size:1.15rem;color:var(--ink);text-decoration:none}
.btn{display:inline-block;padding:14px 22px;border-radius:999px;font-weight:700;text-decoration:none;border:2px solid transparent;font-size:1rem;cursor:pointer}
.btn-call{background:var(--accent);color:var(--on-accent)}
.btn-ghost{border-color:var(--on-brand);color:var(--on-brand)}
.btn-solid{background:var(--brand);color:var(--on-brand);width:100%}
.hero{background:linear-gradient(135deg,var(--brand),var(--ink));color:var(--on-brand);padding:64px 0 72px}
.hero p.lead{font-size:1.2rem;max-width:36em;opacity:.95}
.hero .cta{display:flex;flex-wrap:wrap;gap:12px;margin-top:24px}
.hero ul{padding:0;margin:26px 0 0;list-style:none;display:flex;flex-wrap:wrap;gap:8px 22px;font-weight:600}
.hero li::before{content:"✓ ";color:var(--accent)}
section.block{padding:56px 0}
section.alt{background:var(--soft)}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px;list-style:none;padding:0;margin:24px 0 0}
.card{background:var(--bg);border:1px solid var(--line);border-radius:var(--radius);padding:20px;margin:0}
.card p{color:var(--muted);margin:0}
.card .price{color:var(--ink);font-weight:700;margin-top:10px}
.quote blockquote{margin:0 0 10px;font-size:1.05rem}
.quote figcaption{color:var(--muted);font-size:.92rem}
.two{display:grid;grid-template-columns:1fr;gap:32px}
@media(min-width:780px){.two{grid-template-columns:1fr 1fr}}
.chips{list-style:none;padding:0;margin:16px 0 0;display:flex;flex-wrap:wrap;gap:8px}
.chips li{background:var(--bg);border:1px solid var(--line);border-radius:999px;padding:6px 14px;font-size:.95rem}
table.hours{border-collapse:collapse;width:100%;margin-top:12px}
table.hours th,table.hours td{text-align:left;padding:8px 0;border-bottom:1px solid var(--line);font-weight:400}
table.hours td{text-align:right;color:var(--muted)}
.menu-sec{margin-top:28px}
.menu-items{list-style:none;padding:0;margin:0}
.menu-items li{display:flex;flex-wrap:wrap;align-items:baseline;gap:8px;padding:10px 0;border-bottom:1px solid var(--line)}
.mi-name{font-weight:700}
.mi-dots{flex:1;border-bottom:1px dotted var(--line);min-width:20px}
.mi-price{font-weight:700}
.mi-text{flex-basis:100%;color:var(--muted);font-size:.95rem}
form{display:grid;gap:14px;background:var(--bg);border:1px solid var(--line);border-radius:var(--radius);padding:22px}
label{display:grid;gap:6px;font-weight:600;font-size:.95rem}
input,textarea{font:inherit;padding:12px;border:1px solid var(--line);border-radius:10px;width:100%;background:var(--bg);color:var(--ink)}
input:focus,textarea:focus,.btn:focus-visible,a:focus-visible{outline:3px solid var(--accent);outline-offset:2px}
.note{color:var(--muted);font-size:.9rem;margin:0}
.done{color:var(--ok);font-weight:700;margin:0}
.hp{position:absolute;left:-9999px}
footer{background:var(--ink);color:var(--bg);padding:32px 0 96px;font-size:.95rem}
footer a{color:var(--bg)}
.sticky{position:fixed;left:0;right:0;bottom:0;padding:10px 14px;background:var(--bg);border-top:1px solid var(--line);display:flex;gap:10px}
.sticky .btn{flex:1;text-align:center;padding:12px}
.sticky .btn-form{background:var(--brand);color:var(--on-brand)}
@media(min-width:780px){.sticky{display:none}footer{padding-bottom:32px}}
@media(max-width:480px){header.top .btn{padding:10px 14px;font-size:.92rem}}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
</style>
</head>
<body>
${demo ? `<div class="demo" role="note">Preview made for ${esc(p.name)}. It is not public and not final.</div>\n` : ''}<header class="top">
  <a class="brand" href="#top">${esc(p.name)}</a>
  <a class="btn btn-call" href="${esc(telHref(p.phone))}">Call ${esc(p.phone)}</a>
</header>

<main id="top">
  <section class="hero">
    <div class="wrap">
      <h1>${esc(p.headline || p.tagline)}</h1>
      <p class="lead">${esc(p.headline ? p.tagline : `Serving ${place}.`)}</p>
      <div class="cta">
        <a class="btn btn-call" href="${esc(telHref(p.phone))}">Call ${esc(p.phone)}</a>
        <a class="btn btn-ghost" href="#request">${esc(formTitle)}</a>
      </div>${points ? `\n      <ul>${points}</ul>` : ''}
    </div>
  </section>
${
  isFood
    ? `
  <section class="block" id="menu">
    <div class="wrap">
      <h2>Menu</h2>${p.menuNote ? `\n      <p class="note">${esc(p.menuNote)}</p>` : ''}${menu}
    </div>
  </section>`
    : `
  <section class="block" id="services">
    <div class="wrap">
      <h2>What we do</h2>
      <ul class="grid">${services}
      </ul>
    </div>
  </section>`
}
${
  quotes
    ? `
  <section class="block alt" id="customers">
    <div class="wrap">
      <h2>What customers say</h2>
      <div class="grid">${quotes}
      </div>
    </div>
  </section>
`
    : ''
}
  <section class="block${quotes ? '' : ' alt'}" id="about">
    <div class="wrap two">
      <div>
        <h2>${esc(p.aboutTitle || `About ${p.name}`)}</h2>
        <p>${esc(p.about || `${p.name} is a local business in ${place}.`)}</p>${p.license ? `\n        <p class="note">${esc(p.license)}</p>` : ''}${
          areas ? `\n        <h3>${isFood ? 'Where to find us' : 'Areas we serve'}</h3>\n        <ul class="chips">${areas}</ul>` : ''
        }
      </div>
      <div>
        <h2>Hours</h2>${hours ? `\n        <table class="hours"><tbody>${hours}</tbody></table>` : '\n        <p class="note">Call for hours.</p>'}${
          p.street ? `\n        <p style="margin-top:16px">${esc(p.street)}<br>${esc(place)}${p.postal ? ' ' + esc(p.postal) : ''}</p>` : ''
        }
      </div>
    </div>
  </section>

  <section class="block${quotes ? ' alt' : ''}" id="request">
    <div class="wrap two">
      <div>
        <h2>${esc(formTitle)}</h2>
        <p>${esc(p.formIntro || (isFood ? 'Tell us the date and the number of guests. We will answer with options and a price.' : 'Tell us what you need. We will answer with a time and a price.'))}</p>
        <p>Or call now: <a href="${esc(telHref(p.phone))}"><strong>${esc(p.phone)}</strong></a></p>
      </div>
      <form id="request-form" method="post" action="${esc(formAction)}" data-connected="${formAction ? 'yes' : 'no'}">
        <label>Your name<input type="text" name="name" autocomplete="name" required></label>
        <label>Your phone<input type="tel" name="phone" autocomplete="tel" inputmode="tel" required></label>
        <label>Your email<input type="email" name="email" autocomplete="email"></label>${eventFields}
        <label>What do you need?<textarea name="message" rows="4" required></textarea></label>
        <label class="hp" aria-hidden="true">Leave this empty<input type="text" name="company_website" tabindex="-1" autocomplete="off"></label>
        <button class="btn btn-solid" type="submit">Send my request</button>
        <p class="note" id="form-note">${formAction ? 'We answer during business hours.' : 'Preview only. This form is not connected yet.'}</p>
      </form>
    </div>
  </section>
</main>

<footer>
  <div class="wrap">
    <p><strong>${esc(p.name)}</strong> · ${esc(place)} · <a href="${esc(telHref(p.phone))}">${esc(p.phone)}</a>${p.email ? ` · <a href="mailto:${esc(p.email)}">${esc(p.email)}</a>` : ''}</p>
    <p>© ${esc(year)} ${esc(p.name)}</p>
  </div>
</footer>

<div class="sticky">
  <a class="btn btn-call" href="${esc(telHref(p.phone))}">Call now</a>
  <a class="btn btn-form" href="#request">${isFood ? 'Catering' : 'Free quote'}</a>
</div>

<script>
(function(){
  var f=document.getElementById('request-form'),n=document.getElementById('form-note');
  if(!f)return;
  f.addEventListener('submit',function(e){
    if(f.getAttribute('data-connected')!=='yes'){
      e.preventDefault();
      n.className='done';
      n.textContent='Preview only. Nothing was sent. When the site is live, the owner gets this request at once.';
    }
  });
})();
</script>
</body>
</html>
`;
}
