// Builds the /services pages and the sitemap from scripts/pages/services.mjs.
// Run: npm run build-pages   (then commit the files it writes in public/)
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SERVICES } from './pages/services.mjs';
import { INDUSTRIES } from './pages/industries.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const SITE = 'https://stingcode.com';
const TODAY = new Date().toISOString().slice(0, 10);
const bySlug = Object.fromEntries(SERVICES.map(s => [s.slug, s]));

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const plain = s => String(s).replace(/<[^>]+>/g, '');
const quoteUrl = s => `/?service=${encodeURIComponent(s.formOption)}#contact`;

// Deterministic mountain ridges (same idea as the homepage hero), drawn once at build time.
function ridge(seed, w, h, base, amp, rough) {
  let st = seed >>> 0; const r = () => (st = (st * 1664525 + 1013904223) >>> 0) / 4294967296;
  const n = 65, ys = new Array(n).fill(0);
  ys[0] = base + (r() - .5) * amp; ys[n - 1] = base + (r() - .5) * amp;
  for (let step = n - 1, a = amp; step > 1; step >>= 1, a *= rough)
    for (let i = step / 2; i < n; i += step) ys[i] = (ys[i - step / 2] + ys[i + step / 2]) / 2 + (r() - .5) * a;
  return `M0 ${h} ` + ys.map((y, i) => `L${(i * w / (n - 1)).toFixed(0)} ${y.toFixed(0)}`).join(' ') + ` L${w} ${h}Z`;
}
const ridges = (seed, layers = 5) => {
  const W = 1440, H = 320, out = [];
  for (let i = 0; i < layers; i++) out.push(`<path d="${ridge(seed + i * 977, W, H, 90 + i * 48, 150 - i * 22, .55)}" fill="var(--m${i + 1})"/>`);
  return `<svg class="ridges" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">${out.join('')}</svg>`;
};

const LOGO = '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 3 L35 12 V28 L20 37 L5 28 V12 Z" fill="var(--accent-strong)"/><path d="M11 25 L17 16 L21 21 L24 17 L29 25 Z" fill="var(--accent-ink)"/><path d="M20 30 l-2.4-4.2h4.8z" fill="var(--accent-ink)"/></svg>';
const CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>';
const icon = s => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${s.icon}</svg>`;

const head = ({ title, description, path, schema }) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${SITE}${path}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<meta property="og:type" content="website">
<meta property="og:site_name" content="StingCode">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${SITE}${path}">
<meta property="og:image" content="${SITE}/og-image.jpg">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@600;700;800&family=Figtree:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap">
<link rel="stylesheet" href="/css/pages.css?v=3">
<script type="application/ld+json">${JSON.stringify(schema)}</script>
</head>`;

const nav = current => `<header class="nav">
  <div class="wrap">
    <a class="brand" href="/" aria-label="StingCode home">${LOGO}StingCode</a>
    <nav class="nav-links" aria-label="Main">
      <a href="/services/"${current === 'services' ? ' aria-current="page"' : ''}>Services</a><a href="/industries/"${current === 'industries' ? ' aria-current="page"' : ''}>Industries</a><a href="/#route">Process</a><a href="/#pricing">Pricing</a><a href="/#ai">AI</a><a href="/#contact">Contact</a>
    </nav>
    <div class="nav-cta"><a class="btn btn-gold btn-sm" href="/#contact">Book a free call</a></div>
  </div>
</header>`;

const ctaBand = (href, label) => `<section class="cta-band">
  ${ridges(8848, 4)}
  <div class="wrap">
    <div>
      <div class="eyebrow">Base camp · Next step</div>
      <h2>Let's map your <em>route</em></h2>
      <p>A free 30-minute call with a local developer. You'll leave with a clear next step, and a fixed price if we're a fit.</p>
    </div>
    <div class="acts">
      <a class="btn btn-gold" href="${href}">${esc(label)} →</a>
      <a class="mail" href="mailto:hello@stingcode.com">hello@stingcode.com</a>
    </div>
  </div>
</section>`;

const footer = () => `<footer>
  <div class="wrap">
    <div class="cols">
      <div class="about"><a class="brand" href="/">${LOGO}StingCode</a><p>Custom software, dashboards and AI for Denver and Colorado businesses. Fixed prices, and you own the code.</p></div>
      <div><h4>Services</h4><ul>${SERVICES.map(s => `<li><a href="/services/${s.slug}">${esc(s.short)}</a></li>`).join('')}</ul></div>
      <div><h4>Industries</h4><ul>${INDUSTRIES.map(i => `<li><a href="/industries/${i.slug}">${esc(i.short)}</a></li>`).join('')}<li><a href="/industries/">All industries</a></li></ul></div>
      <div><h4>Company</h4><ul><li><a href="/services/">All services</a></li><li><a href="/#route">How we work</a></li><li><a href="/#pricing">Pricing</a></li><li><a href="/#contact">Contact</a></li><li><a href="mailto:hello@stingcode.com">hello@stingcode.com</a></li></ul></div>
    </div>
    <div class="legal"><span>© ${new Date().getFullYear()} StingCode · Denver, Colorado</span><a href="/privacy">Privacy policy</a></div>
  </div>
</footer>`;

const STEPS = `<div class="steps">
      <div class="step"><div class="dot">1</div><h3>Free intro call</h3><p>30 minutes to understand the problem and check the fit.</p></div>
      <div class="step"><div class="dot">2</div><h3>Paid discovery</h3><p>We map your systems and data, define "done" and show a mockup. Credited to the project.</p></div>
      <div class="step"><div class="dot">3</div><h3>Fixed proposal</h3><p>Price, milestones and acceptance criteria in writing.</p></div>
      <div class="step"><div class="dot">4</div><h3>Build & launch</h3><p>Short sprints with a demo each time, then training and full handover.</p></div>
    </div>`;
const provider = { '@type': 'ProfessionalService', '@id': `${SITE}/#business`, name: 'StingCode', url: `${SITE}/`, email: 'hello@stingcode.com', address: { '@type': 'PostalAddress', addressLocality: 'Denver', addressRegion: 'CO', addressCountry: 'US' } };
const crumbs = items => ({ '@type': 'BreadcrumbList', itemListElement: items.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: `${SITE}${path}` })) });

function servicePage(s) {
  const path = `/services/${s.slug}`;
  const schema = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'Service', name: plain(s.h1), serviceType: s.short, description: s.description, url: `${SITE}${path}`, provider, areaServed: [{ '@type': 'City', name: 'Denver' }, { '@type': 'State', name: 'Colorado' }] },
    { '@type': 'FAQPage', mainEntity: s.faqs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
    crumbs([['Home', '/'], ['Services', '/services/'], [s.short, path]]),
  ] };
  return `${head({ title: s.title, description: s.description, path, schema })}
<body>
${nav('services')}
<main>
<section class="p-hero">
  ${ridges(5280 + s.slug.length * 31)}
  <div class="wrap">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a><span>/</span><a href="/services/">Services</a><span>/</span>${esc(s.short)}</nav>
    <div class="chip-alt"><b>${esc(s.eyebrow)}</b> · Denver, Colorado</div>
    <h1>${s.h1}</h1>
    <p class="lede">${esc(s.lede)}</p>
    <div class="acts"><a class="btn btn-gold" href="${quoteUrl(s)}">Get a fixed quote →</a><a class="btn btn-ghost" href="#pricing">See pricing</a></div>
  </div>
</section>
<div class="facts"><div class="wrap"><div class="row">${s.facts.map(([k, v, sub]) => `<div class="f"><div class="k">${esc(k)}</div><div class="v">${esc(v)}</div><div class="s">${esc(sub)}</div></div>`).join('')}</div></div></div>

<section class="block">
  <div class="wrap">
    <div class="sec-head"><div><div class="eyebrow">What we build</div><h2>Six common routes</h2></div><p>${esc(s.buildsIntro)}</p></div>
    <div class="builds">${s.builds.map(([t, d], i) => `<article class="build"><div class="n">0${i + 1}</div><h3>${esc(t)}</h3><p>${esc(d)}</p></article>`).join('')}</div>
  </div>
</section>

<section class="block" style="padding-top:0">
  <div class="wrap fit">
    <div class="card"><div class="eyebrow">Is this you?</div><h3 style="margin-top:8px">A good fit if…</h3><ul class="checks">${s.fit.map(f => `<li>${CHECK}<span>${esc(f)}</span></li>`).join('')}</ul></div>
    <div class="card"><div class="eyebrow">Tools we use</div><h3 style="margin-top:8px">Your stack, not ours</h3><div class="tools">${s.tools.map(t => `<span>${esc(t)}</span>`).join('')}</div><p class="note">${esc(s.toolsNote)}</p></div>
  </div>
</section>

<section class="block" style="padding-top:0">
  <div class="wrap">
    <div class="sec-head"><div><div class="eyebrow">What it looks like</div><h2>Example projects</h2></div><p>Typical projects of this kind, to show the shape of the work: the problem, and what changes.</p></div>
    <div class="examples">${s.examples.map(([ind, t, before, after]) => `<article class="ex"><div class="ind">${esc(ind)}</div><h3>${esc(t)}</h3><dl><dt>Before</dt><dd>${esc(before)}</dd><dt>After</dt><dd>${esc(after)}</dd></dl></article>`).join('')}</div>
    <p class="disclaim">Illustrative examples of the kind of work we do, not specific client results.</p>
  </div>
</section>

<section class="block" style="padding-top:0">
  <div class="wrap">
    <div class="sec-head"><div><div class="eyebrow">How it works</div><h2>Four steps, no surprises</h2></div><p>Every project follows the same route, so you always know where it stands and what it costs.</p></div>
    ${STEPS}
  </div>
</section>

<section class="block" id="pricing" style="padding-top:0">
  <div class="wrap"><div class="price">
    <div class="l">
      <div class="eyebrow">Pricing</div>
      <h3>${esc(s.pkg.name)}</h3>
      <div class="amt">${esc(s.pkg.amount)}</div>
      <p>${esc(s.pkg.blurb)} Every project starts with a paid discovery ($500–$1,500), credited to the build.</p>
      <a class="btn btn-gold" href="${quoteUrl(s)}">Get a fixed quote →</a>
    </div>
    <div class="r">
      <h4>Included</h4>
      <ul class="checks">${s.pkg.includes.map(f => `<li>${CHECK}<span>${esc(f)}</span></li>`).join('')}</ul>
      <p class="terms">Payment: under $10k, 50% to start and 50% at launch. $10k and up, 30 / 40 / 30 by milestone. You own all code and data.</p>
    </div>
  </div></div>
</section>

<section class="block" style="padding-top:0">
  <div class="wrap">
    <div class="sec-head"><div><div class="eyebrow">Questions</div><h2>FAQ</h2></div><p>Straight answers to what people ask us most about ${esc(s.faqTopic || s.short)}.</p></div>
    <div class="faq">${s.faqs.map(([q, a], i) => `<details${i === 0 ? ' open' : ''}><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div>
  </div>
</section>

<section class="block" style="padding-top:0">
  <div class="wrap">
    <div class="eyebrow" style="margin-bottom:14px">Related services</div>
    <div class="related">${s.related.map(r => bySlug[r]).map(r => `<a class="rel" href="/services/${r.slug}"><b>${esc(r.short)}</b><span>${esc(r.card)}</span><i>Explore →</i></a>`).join('')}</div>
  </div>
</section>
</main>
${ctaBand(quoteUrl(s), 'Book your free call')}
${footer()}
</body>
</html>
`;
}

function indexPage() {
  const path = '/services/';
  const title = 'Software, Dashboard & AI Services in Denver | StingCode';
  const description = 'StingCode services for Denver businesses: Power BI dashboards, automated reporting, AI chatbots, custom web apps, integrations and care plans. Fixed prices.';
  const schema = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'ItemList', name: 'StingCode services', itemListElement: SERVICES.map((s, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE}/services/${s.slug}`, name: s.short })) },
    crumbs([['Home', '/'], ['Services', path]]),
  ] };
  return `${head({ title, description, path, schema })}
<body>
${nav('services')}
<main>
<section class="p-hero">
  ${ridges(4410)}
  <div class="wrap">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a><span>/</span>Services</nav>
    <div class="chip-alt"><b>Services</b> · Denver, Colorado</div>
    <h1>Every route, <em>one guide</em></h1>
    <p class="lede">From a dashboard that pays for itself in weeks to a full custom application, all from the same local team, at a fixed price, and you own the code.</p>
    <div class="acts"><a class="btn btn-gold" href="/#contact">Book a free call →</a><a class="btn btn-ghost" href="/#pricing">All pricing</a></div>
  </div>
</section>
<div class="facts"><div class="wrap"><div class="row"><div class="f"><div class="k">Projects from</div><div class="v">$3,000</div><div class="s">Fixed price, agreed up front</div></div><div class="f"><div class="k">First result</div><div class="v">Weeks</div><div class="s">Demos every 1–2 weeks</div></div><div class="f"><div class="k">Based in</div><div class="v">Denver</div><div class="s">Meet us in person</div></div></div></div></div>
<section class="block">
  <div class="wrap">
    <div class="sec-head"><div><div class="eyebrow">Services</div><h2>Pick your trail</h2></div><p>Not sure which fits? Book a free call and we'll point you to the right one, even if it's not us.</p></div>
    <div class="svc-grid">${SERVICES.map(s => `<a class="svc" href="/services/${s.slug}"><div class="ic">${icon(s)}</div><h2>${esc(s.short)}</h2><p>${esc(s.card)}</p><div class="from"><span>From <b>${esc(s.facts[0][1])}</b></span><i>Explore →</i></div></a>`).join('')}</div>
  </div>
</section>
</main>
${ctaBand('/#contact', 'Book your free call')}
${footer()}
</body>
</html>
`;
}

function industryPage(ind) {
  const path = `/industries/${ind.slug}`;
  const schema = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'WebPage', name: plain(ind.h1), description: ind.description, url: `${SITE}${path}`, about: ind.short, provider },
    { '@type': 'FAQPage', mainEntity: ind.faqs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
    crumbs([['Home', '/'], ['Industries', '/industries/'], [ind.short, path]]),
  ] };
  const first = bySlug[ind.services[0]];
  return `${head({ title: ind.title, description: ind.description, path, schema })}
<body>
${nav('industries')}
<main>
<section class="p-hero">
  ${ridges(6200 + ind.slug.length * 17)}
  <div class="wrap">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a><span>/</span><a href="/industries/">Industries</a><span>/</span>${esc(ind.short)}</nav>
    <div class="chip-alt"><b>${esc(ind.eyebrow)}</b> · Denver, Colorado</div>
    <h1>${ind.h1}</h1>
    <p class="lede">${esc(ind.lede)}</p>
    <div class="acts"><a class="btn btn-gold" href="${quoteUrl(first)}">Book a free call →</a><a class="btn btn-ghost" href="#solutions">What we build</a></div>
  </div>
</section>
<div class="facts"><div class="wrap"><div class="row">${ind.facts.map(([k, v, sub]) => `<div class="f"><div class="k">${esc(k)}</div><div class="v">${esc(v)}</div><div class="s">${esc(sub)}</div></div>`).join('')}</div></div></div>

<section class="block">
  <div class="wrap">
    <div class="sec-head"><div><div class="eyebrow">Sound familiar?</div><h2>Where the time goes</h2></div><p>We hear the same three problems from ${esc(ind.who)} again and again.</p></div>
    <div class="pains">${ind.pains.map(([t, d]) => `<article class="pain"><h3>${esc(t)}</h3><p>${esc(d)}</p></article>`).join('')}</div>
  </div>
</section>

<section class="block" id="solutions" style="padding-top:0">
  <div class="wrap">
    <div class="sec-head"><div><div class="eyebrow">What we build</div><h2>${esc(ind.builtFor)}</h2></div><p>Start with the one that saves the most time. Each links to the full service, with pricing.</p></div>
    <div class="builds">${ind.solves.map(([t, d, svc], i) => `<a class="build solve" href="/services/${svc}"><div class="n">0${i + 1}</div><h3>${esc(t)}</h3><p>${esc(d)}</p><span class="go">${esc(bySlug[svc].short)} →</span></a>`).join('')}</div>
  </div>
</section>

<section class="block" style="padding-top:0">
  <div class="wrap fit">
    <div class="card"><div class="eyebrow">Systems we work with</div><h3 style="margin-top:8px">Your tools, connected</h3><div class="tools">${ind.systems.map(t => `<span>${esc(t)}</span>`).join('')}</div><p class="note">${esc(ind.systemsNote)} Product names belong to their owners.</p></div>
    <div class="card"><div class="eyebrow">Where to start</div><h3 style="margin-top:8px">Typical first projects</h3><ul class="starts">${ind.services.map(sl => bySlug[sl]).map(sv => `<li><a href="/services/${sv.slug}"><span>${esc(sv.short)}</span><b>from ${esc(sv.facts[0][1])}</b></a></li>`).join('')}</ul><p class="note">Every project is quoted at a fixed price after a short paid discovery.</p></div>
  </div>
</section>

<section class="block" style="padding-top:0">
  <div class="wrap">
    <div class="sec-head"><div><div class="eyebrow">What it looks like</div><h2>Example projects</h2></div><p>Typical projects for ${esc(ind.who)}, to show the shape of the work.</p></div>
    <div class="examples">${ind.examples.map(([sub, t, before, after]) => `<article class="ex"><div class="ind">${esc(sub)}</div><h3>${esc(t)}</h3><dl><dt>Before</dt><dd>${esc(before)}</dd><dt>After</dt><dd>${esc(after)}</dd></dl></article>`).join('')}</div>
    <p class="disclaim">Illustrative examples of the kind of work we do, not specific client results.</p>
  </div>
</section>

<section class="block" style="padding-top:0">
  <div class="wrap">
    <div class="sec-head"><div><div class="eyebrow">How it works</div><h2>Four steps, no surprises</h2></div><p>Every project follows the same route, so you always know where it stands and what it costs.</p></div>
    ${STEPS}
  </div>
</section>

<section class="block" style="padding-top:0">
  <div class="wrap">
    <div class="sec-head"><div><div class="eyebrow">Questions</div><h2>FAQ</h2></div><p>What ${esc(ind.who)} ask us most.</p></div>
    <div class="faq">${ind.faqs.map(([q, a], i) => `<details${i === 0 ? ' open' : ''}><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div>
  </div>
</section>
</main>
${ctaBand(quoteUrl(first), 'Book your free call')}
${footer()}
</body>
</html>
`;
}

function industriesIndex() {
  const path = '/industries/';
  const title = 'Software & AI for Denver Businesses by Industry | StingCode';
  const description = 'Dashboards, automation, AI chatbots and custom software for Denver contractors, property managers and medical and dental offices.';
  const schema = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'ItemList', name: 'Industries StingCode serves', itemListElement: INDUSTRIES.map((ind, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE}/industries/${ind.slug}`, name: ind.short })) },
    crumbs([['Home', '/'], ['Industries', path]]),
  ] };
  return `${head({ title, description, path, schema })}
<body>
${nav('industries')}
<main>
<section class="p-hero">
  ${ridges(7300)}
  <div class="wrap">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a><span>/</span>Industries</nav>
    <div class="chip-alt"><b>Industries</b> · Denver, Colorado</div>
    <h1>Built for <em>how you work</em></h1>
    <p class="lede">Every industry has its own spreadsheets, software and busywork. These are the businesses we build for most, and what we usually build first.</p>
    <div class="acts"><a class="btn btn-gold" href="/#contact">Book a free call →</a><a class="btn btn-ghost" href="/services/">All services</a></div>
  </div>
</section>
<section class="block" style="padding-top:clamp(40px,6vw,72px)">
  <div class="wrap">
    <div class="svc-grid">${INDUSTRIES.map(ind => `<a class="svc" href="/industries/${ind.slug}"><div class="eyebrow">${esc(ind.eyebrow)}</div><h2>${esc(ind.short)}</h2><p>${esc(ind.card)}</p><div class="from"><span>Most start with <b>${esc(ind.facts[0][1])}</b></span><i>Explore →</i></div></a>`).join('')}</div>
    <p class="disclaim" style="margin-top:22px">Don't see your industry? We work with most small and mid-size businesses. <a href="/#contact">Tell us what you do.</a></p>
  </div>
</section>
</main>
${ctaBand('/#contact', 'Book your free call')}
${footer()}
</body>
</html>
`;
}

function write(rel, html) { const f = join(ROOT, rel); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, html); console.log('wrote', rel); }

for (const s of SERVICES) write(`services/${s.slug}.html`, servicePage(s));
write('services/index.html', indexPage());
for (const ind of INDUSTRIES) write(`industries/${ind.slug}.html`, industryPage(ind));
write('industries/index.html', industriesIndex());

const urls = [['/', '1.0'], ['/services/', '0.9'], ...SERVICES.map(s => [`/services/${s.slug}`, '0.8']), ['/industries/', '0.7'], ...INDUSTRIES.map(i => [`/industries/${i.slug}`, '0.7']), ['/privacy', '0.3']];
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(([u, p]) => `  <url><loc>${SITE}${u}</loc><lastmod>${TODAY}</lastmod><priority>${p}</priority></url>`).join('\n')}
</urlset>
`);
