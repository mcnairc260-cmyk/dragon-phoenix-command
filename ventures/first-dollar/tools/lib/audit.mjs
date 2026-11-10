// Pure website checks. No network, no dependencies.
// Input: the HTML of ONE page plus facts about how it loaded.
// Output: a list of findings a business owner can understand.
//
// Rule: a finding states only what was observed in the page. It never
// guesses about contracts, prices, traffic, or lost sales.

export const VENDORS = [
  // rented: the vendor normally hosts and controls the site for a monthly fee
  { id: 'hibu', name: 'Hibu', rented: true, re: /\bhibu\b|hibu\.com/i },
  { id: 'thryv', name: 'Thryv', rented: true, re: /\bthryv\b/i },
  { id: 'yp', name: 'YP / Yellow Pages', rented: true, re: /yp\.com|yellowpages\.com|dexyp|dexknows/i },
  { id: 'webcom', name: 'Web.com / Network Solutions', rented: true, re: /\bweb\.com\b|networksolutions\.com|register\.com/i },
  { id: 'vistaprint', name: 'Vistaprint', rented: true, re: /vistaprint|vpweb\./i },
  { id: 'popmenu', name: 'Popmenu', rented: true, re: /popmenu/i },
  { id: 'bentobox', name: 'BentoBox', rented: true, re: /getbento\.com|bentobox/i },
  { id: 'spothopper', name: 'SpotHopper', rented: true, re: /spothopper/i },
  { id: 'menufy', name: 'Menufy', rented: true, re: /menufy/i },
  { id: 'godaddy', name: 'GoDaddy Website Builder', rented: false, re: /img1\.wsimg\.com|godaddy website builder|websites\.godaddy\.com/i },
  { id: 'wix', name: 'Wix', rented: false, re: /wixstatic\.com|wix\.com/i },
  { id: 'squarespace', name: 'Squarespace', rented: false, re: /squarespace/i },
  { id: 'weebly', name: 'Weebly', rented: false, re: /weebly/i },
  { id: 'duda', name: 'Duda', rented: false, re: /multiscreensite\.com|dudaone|duda\.co\b/i },
  { id: 'googlesites', name: 'Google Sites', rented: false, re: /sites\.google\.com/i },
  { id: 'toast', name: 'Toast', rented: false, re: /toasttab\.com/i },
  { id: 'square', name: 'Square', rented: false, re: /square\.site|squareup\.com/i },
  { id: 'wordpress', name: 'WordPress', rented: false, re: /wp-content|wp-includes/i },
];

const SOCIAL_HOSTS = /(^|\.)(facebook\.com|fb\.com|instagram\.com|linktr\.ee|yelp\.com|nextdoor\.com)$/i;

const stripTags = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();

const hostOf = (url) => {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
};

function finding(id, status, label, detail, ownerText) {
  return { id, status, label, detail, ownerText };
}

/**
 * @param {string} html  raw HTML of the page ('' if it did not load)
 * @param {object} meta
 * @param {string} meta.requestedUrl
 * @param {string} [meta.finalUrl]
 * @param {number|null} [meta.status]   HTTP status, null if no response
 * @param {string} [meta.error]         network error text, if any
 * @param {number} [meta.ms]            time to receive the page
 * @param {number} [meta.currentYear]
 */
export function auditHtml(html, meta) {
  const year = meta.currentYear ?? new Date().getFullYear();
  const finalUrl = meta.finalUrl || meta.requestedUrl;
  const host = hostOf(finalUrl);
  const out = [];

  // 1. Is there an owned website at all?
  if (SOCIAL_HOSTS.test(host)) {
    out.push(
      finding(
        'owned-site',
        'fail',
        'No website of its own',
        `The only web address found is a ${host} page.`,
        `Your only web page is on ${host.replace(/^www\./, '')}. People who search on Google and do not use that app cannot see your services, prices, or phone number in one place.`,
      ),
    );
    return summarize(out, meta, { vendor: null, text: '' });
  }

  // 2. Did the page load?
  if (meta.error || meta.status == null || meta.status >= 400 || !html) {
    const why = meta.error ? meta.error : `the server answered with code ${meta.status}`;
    out.push(
      finding(
        'loads',
        'fail',
        'Website did not load',
        `Request to ${meta.requestedUrl} failed: ${why}.`,
        `When I opened your website, it did not load (${why}). A customer who sees that will call the next company.`,
      ),
    );
    return summarize(out, meta, { vendor: null, text: '' });
  }
  out.push(finding('loads', 'pass', 'Website loads', `HTTP ${meta.status} in ${meta.ms ?? '?'} ms.`, ''));

  const text = stripTags(html);
  const lower = html.toLowerCase();

  // 3. Secure connection
  if (finalUrl.startsWith('https://')) {
    out.push(finding('https', 'pass', 'Secure connection (https)', finalUrl, ''));
  } else {
    out.push(
      finding(
        'https',
        'fail',
        'No secure connection',
        `Final address is ${finalUrl}.`,
        'Your site opens without the padlock (http, not https). Browsers show a "Not secure" warning next to your business name.',
      ),
    );
  }

  // 4. Mobile layout
  if (/<meta[^>]+name=["']?viewport/i.test(html)) {
    out.push(finding('mobile', 'pass', 'Has a mobile layout tag', 'viewport meta tag present.', ''));
  } else {
    out.push(
      finding(
        'mobile',
        'fail',
        'Not set up for phones',
        'No viewport meta tag.',
        'Your site is not set up for phone screens. On a phone the text is very small and people must pinch and zoom.',
      ),
    );
  }

  // 5. Tap-to-call
  const hasTel = /href=["']tel:/i.test(html);
  const phoneInText = /\(?\b\d{3}\)?[\s.\-]\d{3}[\s.\-]\d{4}\b/.test(text);
  if (hasTel) {
    out.push(finding('tap-to-call', 'pass', 'Phone number can be tapped', 'tel: link present.', ''));
  } else if (phoneInText) {
    out.push(
      finding(
        'tap-to-call',
        'fail',
        'Phone number cannot be tapped',
        'A phone number is in the text but there is no tel: link.',
        'Your phone number is on the page, but a customer on a phone cannot tap it to call you.',
      ),
    );
  } else {
    out.push(
      finding(
        'tap-to-call',
        'fail',
        'No phone number found on the page',
        'No tel: link and no phone number pattern in the text.',
        'I could not find a phone number on your home page.',
      ),
    );
  }

  // 6. A way to send a request
  const hasForm = /<form[\s>]/i.test(html);
  const hasMailto = /href=["']mailto:/i.test(html);
  if (hasForm) {
    out.push(finding('request-form', 'pass', 'Has a form', '<form> present.', ''));
  } else {
    out.push(
      finding(
        'request-form',
        hasMailto ? 'warn' : 'fail',
        hasMailto ? 'No request form (email link only)' : 'No request form',
        hasMailto ? 'mailto: link but no <form>.' : 'No <form> and no mailto: link.',
        'There is no form on your home page. A customer who looks at 10 pm cannot leave a request for you to see in the morning.',
      ),
    );
  }

  // 7. Page title and description (what Google shows)
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').replace(/\s+/g, ' ').trim();
  if (!title || /^(home|index|untitled|welcome|my site|website)$/i.test(title)) {
    out.push(
      finding(
        'title',
        'fail',
        'Weak page title',
        title ? `Title is "${title}".` : 'No <title>.',
        `The title Google shows for your site is ${title ? `"${title}"` : 'empty'}. It does not say what you do or where.`,
      ),
    );
  } else {
    out.push(finding('title', 'pass', 'Has a page title', `"${title}"`, ''));
  }
  if (/<meta[^>]+name=["']description["'][^>]*content=["'][^"']{20,}/i.test(html) || /<meta[^>]+content=["'][^"']{20,}["'][^>]*name=["']description["']/i.test(html)) {
    out.push(finding('description', 'pass', 'Has a search description', 'meta description present.', ''));
  } else {
    out.push(
      finding(
        'description',
        'warn',
        'No search description',
        'meta description missing or shorter than 20 characters.',
        'Your site does not give Google a short description, so Google makes one up from random page text.',
      ),
    );
  }

  // 8. Business data for Google (schema.org)
  if (/application\/ld\+json/i.test(html) && /"@type"\s*:\s*"[^"]*(LocalBusiness|Restaurant|Plumber|Electrician|HVACBusiness|RoofingContractor|HomeAndConstructionBusiness|FoodEstablishment|BarOrPub|Brewery|CafeOrCoffeeShop|Bakery|GeneralContractor|Organization)/i.test(html)) {
    out.push(finding('schema', 'pass', 'Tells Google the business details', 'schema.org JSON-LD present.', ''));
  } else {
    out.push(
      finding(
        'schema',
        'warn',
        'No business data tag for Google',
        'No schema.org LocalBusiness JSON-LD.',
        'Your site does not include the hidden business card (name, address, hours) that Google reads.',
      ),
    );
  }

  // 9. Old copyright year
  const years = [...text.matchAll(/(?:©|&copy;|copyright)\s*(?:\(c\)\s*)?(?:\d{4}\s*[-–]\s*)?((?:19|20)\d{2})/gi)].map((m) => Number(m[1]));
  const htmlYears = [...html.matchAll(/&copy;\s*(?:\d{4}\s*[-–]\s*)?((?:19|20)\d{2})/gi)].map((m) => Number(m[1]));
  const newest = Math.max(-Infinity, ...years, ...htmlYears);
  if (Number.isFinite(newest)) {
    if (newest <= year - 2) {
      out.push(
        finding(
          'fresh',
          'fail',
          'Looks out of date',
          `Newest copyright year on the page is ${newest}.`,
          `The bottom of your site says ${newest}. A customer can think the business is closed.`,
        ),
      );
    } else {
      out.push(finding('fresh', 'pass', 'Copyright year is current', String(newest), ''));
    }
  }

  // 10. Placeholder or unfinished text
  const placeholder = text.match(/lorem ipsum|under construction|coming soon|website coming|this site is parked|domain is for sale|default web page/i)?.[0];
  if (placeholder) {
    out.push(
      finding(
        'placeholder',
        'fail',
        'Unfinished or placeholder text',
        `Found "${placeholder}".`,
        `Your site shows the words "${placeholder}". It looks unfinished.`,
      ),
    );
  }

  // 11. Thin page
  const words = text ? text.split(' ').length : 0;
  if (words < 120) {
    out.push(
      finding(
        'thin',
        'warn',
        'Very little text',
        `About ${words} words on the page.`,
        `Your home page has about ${words} words. Google and customers get very little information about your services and area.`,
      ),
    );
  }

  // 12. Menu or price list only as a PDF or image
  const pdfLinks = [...html.matchAll(/href=["']([^"']+\.pdf)(?:[?#][^"']*)?["']/gi)].map((m) => m[1]);
  if (pdfLinks.length && /menu|price|service/i.test(pdfLinks.join(' ') + ' ' + text.slice(0, 4000))) {
    out.push(
      finding(
        'pdf-only',
        'warn',
        'Menu or price list is a PDF',
        `PDF link: ${pdfLinks[0]}`,
        'Your menu or price list opens as a PDF. On a phone it is slow and hard to read, and Google does not show it well.',
      ),
    );
  }

  // 13. Images without descriptions
  const imgs = html.match(/<img\b[^>]*>/gi) || [];
  const noAlt = imgs.filter((t) => !/\balt=["'][^"']+["']/i.test(t)).length;
  if (imgs.length >= 3 && noAlt / imgs.length > 0.5) {
    out.push(
      finding(
        'alt',
        'warn',
        'Photos have no descriptions',
        `${noAlt} of ${imgs.length} images have no alt text.`,
        'Most photos on your site have no text description. Google cannot tell that they show your work.',
      ),
    );
  }

  // 14. Who controls the site
  // Ignore plain links (a link to a Yellow Pages profile does not mean
  // the site is built there). Scripts, images, and footer text still count.
  const vendorHaystack = lower.replace(/<a\b[^>]*>/g, ' ');
  const vendor = VENDORS.find((v) => v.re.test(vendorHaystack)) || null;
  if (vendor) {
    out.push(
      finding(
        'vendor',
        'info',
        `Built on ${vendor.name}`,
        `Page source contains a ${vendor.name} signature.`,
        vendor.rented
          ? `Your site appears to be built on ${vendor.name}. It is worth checking if you own the site and the web address, or if you rent them.`
          : '',
      ),
    );
  }

  return summarize(out, meta, { vendor, text });
}

function summarize(findings, meta, extra) {
  const count = (s) => findings.filter((f) => f.status === s).length;
  return {
    requestedUrl: meta.requestedUrl,
    finalUrl: meta.finalUrl || meta.requestedUrl,
    status: meta.status ?? null,
    ms: meta.ms ?? null,
    vendor: extra.vendor ? { id: extra.vendor.id, name: extra.vendor.name, rented: extra.vendor.rented } : null,
    fails: count('fail'),
    warns: count('warn'),
    passes: count('pass'),
    findings,
    // The sentences an owner would care about, most serious first.
    ownerPoints: findings
      .filter((f) => f.ownerText && (f.status === 'fail' || f.status === 'warn' || f.status === 'info'))
      .sort((a, b) => rank(a.status) - rank(b.status))
      .map((f) => f.ownerText),
  };
}

const rank = (s) => ({ fail: 0, warn: 1, info: 2, pass: 3 })[s] ?? 9;

/** Plain-text report for one audited site. */
export function renderReport(result, businessName = '') {
  const lines = [];
  lines.push(`WEBSITE CHECK${businessName ? ` - ${businessName}` : ''}`);
  lines.push(`Address checked: ${result.requestedUrl}`);
  if (result.finalUrl !== result.requestedUrl) lines.push(`Ended at: ${result.finalUrl}`);
  lines.push(`Result: ${result.fails} problem(s), ${result.warns} caution(s), ${result.passes} good.`);
  lines.push('');
  for (const f of [...result.findings].sort((a, b) => rank(a.status) - rank(b.status))) {
    const mark = { fail: '[PROBLEM]', warn: '[CAUTION]', info: '[NOTE]   ', pass: '[GOOD]   ' }[f.status];
    lines.push(`${mark} ${f.label} - ${f.detail}`);
  }
  return lines.join('\n');
}
