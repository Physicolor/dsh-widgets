#!/usr/bin/env node
/**
 * dsh-widgets website — self-contained verification.
 *
 * Requirements: Node >= 22 (global WebSocket) + a Chrome/Edge install.
 * No npm dependencies: static checks use node & lightningcss from the repo
 * devDependencies (if present), rendering uses local Edge headless over CDP.
 *
 * Checks:
 *  1. static — JS syntax (node --check), CSS syntax (lightningcss), HTML
 *     well-formedness + asset references resolve, no absolute asset paths.
 *  2. serve — local static server on a random port.
 *  3. browser — Edge headless: default theme LIGHT + default language zh,
 *     theme toggle + persistence, language toggle (full nav/gallery re-render),
 *     console errors, network failures, nav anchors, copy button, gallery
 *     filter, real-card rails + hero showcase, spec generator (missing +
 *     full), reveal-on-scroll, mobile burger, 1920 viewport;
 *     mobile burger; screenshots saved to a temp dir.
 *
 * Run from the repo root:  node website/verify.mjs
 * Exit code 0 = all green.
 */
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, extname, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = join(ROOT, 'website');
const OUT = join(tmpdir(), 'dsh-widgets-website-verify');
const require = createRequire(import.meta.url);

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail: detail || '' });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

/* ── 1. static ─────────────────────────────────────────────── */
async function jsSyntax() {
  const dir = join(SITE, 'js');
  const files = (await readdir(dir)).filter((f) => f.endsWith('.js'));
  let ok = true;
  for (const f of files) {
    const r = await new Promise((res) => {
      const p = spawn(process.execPath, ['--check', join(dir, f)]);
      let err = '';
      p.stderr.on('data', (d) => (err += d));
      p.on('close', (code) => res({ code, err: err.trim() }));
    });
    if (r.code !== 0) { ok = false; console.log(`  ${r.err}`); }
  }
  return { ok, count: files.length };
}

async function cssSyntax() {
  let lc;
  try { lc = require('lightningcss'); } catch { return { ok: true, note: 'lightningcss unavailable — skipped' }; }
  const dir = join(SITE, 'css');
  const files = (await readdir(dir)).filter((f) => f.endsWith('.css'));
  let ok = true;
  for (const f of files) {
    const code = await readFile(join(dir, f), 'utf8');
    try { lc.transform({ filename: join(dir, f), code: Buffer.from(code), minify: false }); }
    catch (e) { ok = false; console.log(`  css/${f}: ${e.message}`); }
  }
  return { ok, count: files.length };
}

function htmlCheck(html) {
  const problems = [];
  const voidTags = new Set(['meta', 'link', 'input', 'br', 'img', 'hr', 'source', 'area', 'base', 'col', 'embed', 'track', 'wbr']);
  const stack = [];
  // script/style contents are RAW TEXT in HTML — never markup, never scanned
  const scanned = html
    .replace(/<script[\s\S]*?<\/script>/gi, '<script></script>')
    .replace(/<style[\s\S]*?<\/style>/gi, '<style></style>');
  const re = /<(\/)?([a-zA-Z][a-zA-Z0-9-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/)?>/g;
  let m;
  while ((m = re.exec(scanned))) {
    const [, close, tag, , selfClose] = m;
    if (close) {
      const top = stack.pop();
      if (top !== tag) problems.push(`mismatched </${tag}> (open ${top || 'none'})`);
    } else if (!selfClose && !voidTags.has(tag)) {
      stack.push(tag);
    }
  }
  if (stack.length) problems.push(`unclosed tags: ${stack.join(', ')}`);
  const abs = [...scanned.matchAll(/(?:src|href)="\/(?!\/)/g)];
  if (abs.length) problems.push(`${abs.length} absolute asset path(s) starting with /`);
  return problems;
}

/* missing i18n keys scan */
function i18nKeyScan() {
  const html = readFileSync0(join(SITE, 'index.html'));
  const matches = new Set();
  for (const k of ['data-i18n="', 'data-i18n-ph="', 'data-i18n-aria="', 'data-i18n-title="']) {
    const re = new RegExp(k + '([^"]+)"', 'g');
    let m;
    while ((m = re.exec(html))) matches.add(m[1]);
  }
  return { keys: [...matches] };
}
import { readFileSync as readFileSync0 } from 'node:fs';

/* ── 2. server ─────────────────────────────────────────────── */
function serve() {
  return new Promise((resolveServe) => {
    const server = createServer(async (req, res) => {
      try {
        let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
        if (path === '/') path = '/index.html';
        const file = join(SITE, path);
        if (!file.startsWith(SITE) || !existsSync(file) || (await stat(file)).isDirectory()) {
          res.writeHead(404); res.end('not found'); return;
        }
        const body = await readFile(file);
        res.writeHead(200, { 'content-type': MIME[extname(file).toLowerCase()] || 'application/octet-stream' });
        res.end(body);
      } catch { res.writeHead(500); res.end(); }
    });
    server.listen(0, '127.0.0.1', () => resolveServe(server));
  });
}

/* ── 3. Edge + CDP ─────────────────────────────────────────── */
function findEdge() {
  const c = [
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe'
  ];
  for (const x of c) if (existsSync(x)) return x;
  return null;
}

function launchEdge() {
  const edge = findEdge();
  if (!edge) return null;
  const profile = join(tmpdir(), 'dsh-widgets-edge-' + Date.now());
  const p = spawn(edge, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--disable-background-networking', '--hide-scrollbars', '--window-size=1440,1000',
    '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  return new Promise((res, rej) => {
    let buf = '';
    p.stderr.on('data', (d) => {
      buf += d;
      const m = buf.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (m) res({ proc: p, browserWs: m[1] });
    });
    p.on('exit', (code) => rej(new Error(`Edge exited early (${code})`)));
    setTimeout(() => rej(new Error('Edge DevTools endpoint timeout')), 20000);
  });
}

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.events = [];
    ws.addEventListener('message', (e) => {
      const msg = JSON.parse(e.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
      } else if (msg.method) {
        this.events.push(msg);
      }
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
}

async function pageTarget(browserWsUrl) {
  const base = 'http://' + browserWsUrl.replace(/^ws:\/\//, '').replace(/\/devtools\/browser\/.*/, '');
  const targets = await (await fetch(base + '/json')).json();
  const page = targets.find((t) => t.type === 'page');
  if (!page) throw new Error('no page target');
  return page.webSocketDebuggerUrl;
}

async function evalJs(cdp, expression) {
  const r = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text || 'eval error');
  return r.result ? r.result.value : undefined;
}

async function waitFor(cdp, expr, timeoutMs = 15000) {
  const start = Date.now();
  for (;;) {
    const v = await evalJs(cdp, expr);
    if (v) return v;
    if (Date.now() - start > timeoutMs) throw new Error(`timeout waiting for: ${expr.slice(0, 80)}`);
    await new Promise((r) => setTimeout(r, 150));
  }
}

async function screenshot(cdp, file) {
  const r = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await writeFile(file, Buffer.from(r.data, 'base64'));
  return file;
}

async function openPage(url) {
  const edge = await launchEdge();
  const pageWs = await pageTarget(edge.browserWs);
  const ws = new WebSocket(pageWs);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  const cdp = new Cdp(ws);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Network.enable');
  await cdp.send('Log.enable');
  await cdp.send('Page.navigate', { url });
  await waitFor(cdp, `document.readyState === 'complete' && document.getElementById('gallery-grid') && document.getElementById('gallery-grid').children.length === 34`);
  await new Promise((r) => setTimeout(r, 400));
  return { edge, cdp };
}

function collectBrowserIssues(cdp) {
  const errors = [];
  const failed = [];
  for (const ev of cdp.events) {
    if (ev.method === 'Runtime.exceptionThrown') {
      const d = ev.params.exceptionDetails;
      errors.push('exception: ' + (d.exception ? d.exception.description || d.text : d.text));
    } else if (ev.method === 'Runtime.consoleAPICalled' && ev.params.type === 'error') {
      errors.push('console.error: ' + ev.params.args.map((a) => a.value || a.description || '').join(' '));
    } else if (ev.method === 'Log.entryAdded' && ev.params.entry.level === 'error') {
      errors.push('log.error: ' + ev.params.entry.text);
    } else if (ev.method === 'Network.loadingFailed' && !String(ev.params.errorText || '').includes('ERR_ABORTED')) {
      failed.push('net: ' + (ev.params.requestId || '') + ' ' + (ev.params.errorText || ''));
    } else if (ev.method === 'Network.responseReceived') {
      const { status, url } = ev.params.response;
      if (status >= 400 && !url.startsWith('data:')) failed.push(`http ${status} ${url}`);
    }
  }
  return { errors, failed };
}

/* ── main ──────────────────────────────────────────────────── */
let server;
let exitCode = 0;
function finish(code) { exitCode = code; setTimeout(() => process.exit(exitCode), 50); }

try {
  await mkdir(OUT, { recursive: true });
  console.log(`Artifacts: ${OUT}\n`);

  /* static */
  const js = await jsSyntax();
  check(`JS syntax (${js.count} files)`, js.ok);
  const css = await cssSyntax();
  check(`CSS syntax (${css.count} files)`, css.ok, css.note || '');
  const html = await readFile(join(SITE, 'index.html'), 'utf8');
  const htmlProblems = htmlCheck(html);
  check('HTML well-formed + no absolute asset paths', htmlProblems.length === 0, htmlProblems.join('; '));

  let refsMissing = [];
  const refRe = /(?:src|href)="(?!https?:|#|data:)([^"]+)"/g;
  let rm;
  while ((rm = refRe.exec(html))) {
    const ref = rm[1];
    if (ref.startsWith('http')) continue;
    const clean = ref.split('#')[0].split('?')[0];
    if (!clean) continue;
    if (!existsSync(join(SITE, clean))) refsMissing.push(clean);
  }
  check('All local asset references resolve', refsMissing.length === 0, refsMissing.join(', '));

  const i18n = i18nKeyScan();
  check('i18n keys present in HTML', i18n.keys.length >= 60, i18n.keys.length + ' keys found');

  /* generated artifacts: data.js + the static gallery/ItemList in index.html */
  const gen = await new Promise((res) => {
    const p = spawn(process.execPath, [join(SITE, 'gen-site.mjs'), '--check']);
    let out = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (out += d));
    p.on('close', (code) => res({ code, out: out.trim() }));
  });
  check('gen-site --check: data.js + index.html up to date', gen.code === 0, gen.out.slice(0, 200));

  /* crawlability: the widget list must exist in the HTML source itself */
  const staticCards = (html.match(/<article class="widget-card"/g) || []).length;
  check('Gallery is in the HTML source (34 static cards)', staticCards === 34, `found ${staticCards}`);
  check('Static gallery carries names + descriptions', /widget-name/.test(html) && /widget-desc/.test(html) &&
    html.includes('轮次·步数') && html.includes('上下文水位'));

  /* SEO surface */
  const seo = [
    ['<title> has the project + harness + design-system wording', /<title>[^<]*dsh-widgets[^<]*DeepSeek Harness[^<]*Design System/i.test(html)],
    ['meta description present (>=120 chars)', /<meta name="description" content="([^"]{120,})"/.test(html)],
    ['canonical points at the real Pages URL', html.includes('<link rel="canonical" href="https://physicolor.github.io/dsh-widgets/"')],
    ['robots meta allows indexing', /<meta name="robots" content="index,follow/.test(html)],
    ['Open Graph title/description/image/url', ['og:title', 'og:description', 'og:image', 'og:url'].every((p) => html.includes(`property="${p}"`))],
    ['Twitter card = summary_large_image', html.includes('name="twitter:card" content="summary_large_image"')],
    ['JSON-LD graph present', html.includes('"@type": "SoftwareApplication"') && html.includes('"@type": "ItemList"') && html.includes('"@type": "WebSite"')],
    ['robots.txt exists', existsSync(join(SITE, 'robots.txt'))],
    ['sitemap.xml exists', existsSync(join(SITE, 'sitemap.xml'))],
    ['OG image exists (png)', existsSync(join(SITE, 'assets', 'og.png'))]
  ];
  for (const [name, ok] of seo) check(name, ok);

  const robots = existsSync(join(SITE, 'robots.txt')) ? await readFile(join(SITE, 'robots.txt'), 'utf8') : '';
  check('robots.txt allows crawling + points at the sitemap', /User-agent:\s*\*/i.test(robots) && !/Disallow:\s*\/\s*$/m.test(robots) && robots.includes('sitemap.xml'));
  const sitemap = existsSync(join(SITE, 'sitemap.xml')) ? await readFile(join(SITE, 'sitemap.xml'), 'utf8') : '';
  check('sitemap.xml lists the canonical URL', sitemap.includes('<loc>https://physicolor.github.io/dsh-widgets/</loc>'));

  /* structured data must actually parse (two blocks: static graph + generated ItemList) */
  const ldBlocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  let ld = null, ldErr = '';
  const graphs = [];
  for (const b of ldBlocks) {
    try {
      const parsed = JSON.parse(b);
      graphs.push(parsed);
    } catch (e) { ldErr = e.message; }
  }
  for (const g of graphs) {
    if (g['@graph']) graphs.push(...g['@graph']);
    if (g['@type'] === 'ItemList') ld = g;
  }
  check('JSON-LD parses and lists all 34 widgets',
    !!ld && ld.itemListElement.length === 34 && ld.numberOfItems === 34 && !ldErr,
    ldErr || (ld ? `${ld.itemListElement.length} items in ${ldBlocks.length} block(s)` : 'no ItemList block'));

  /* serve + browser */
  server = await serve();
  const url = `http://127.0.0.1:${server.address().port}/`;

  let ctx;
  try {
    ctx = await openPage(url);
  } catch (e) {
    check('Edge headless launch', false, e.message);
    finish(1);
  }
  const { cdp } = ctx;

  const checks = {
    'Title': `document.title.startsWith('dsh-widgets — DeepSeek Harness Widget Design System')`,
    'All sections present': `['home','widgets','design','create','contribute','grammar','audit','anatomy'].every(id => !!document.getElementById(id))`,
    'Old sentence-sections removed': `!document.getElementById('why') && !document.getElementById('philosophy') && !document.getElementById('workflow')`,
    'No Playground/Demo residue': `!document.getElementById('playground') && !document.getElementById('deploy-modal') && !document.querySelector('.pg-deck') && !document.querySelector('.hs-sim') && !document.querySelector('.badge-demo')`,
    '34 gallery cards': `document.getElementById('gallery-grid').children.length === 34`,
    'Rails + hero showcase populated': `['rail-a','rail-b','rail-c'].every(id => document.getElementById(id).children.length >= 6) && document.getElementById('hs-cards').children.length === 7`
  };
  for (const [name, expr] of Object.entries(checks)) {
    check(name, await evalJs(cdp, expr));
  }

  /* hero: ~1150px first screen + install = hero footer */
  check('Hero desktop min-height >= 1150px', await evalJs(cdp, `parseFloat(getComputedStyle(document.getElementById('home')).minHeight) >= 1150`) &&
    await evalJs(cdp, `document.getElementById('home').getBoundingClientRect().height >= 1150`));
  check('Install terminal is inside the hero', await evalJs(cdp, `!!document.querySelector('#home #install')`));
  const heroGrid = await evalJs(cdp, `(() => {
    const g = getComputedStyle(document.getElementById('hs-cards'));
    const first = window.DASH_PREVIEWS.GRID;
    return g.gridTemplateColumns.split(' ').length === 2 && g.columnGap === '24px' && first.unit === 150 && first.gap === 24;
  })()`);
  check('Hero showcase uses the REAL grid (150px · gap 24px)', heroGrid === true);
  const glassSheen = await evalJs(cdp, `getComputedStyle(document.getElementById('top-nav'), '::after').animationName === 'nav-sheen'`);
  check('Liquid-glass sheen animation active', glassSheen === true);
  check('Design GOOD card is a real widget', await evalJs(cdp, `!!document.querySelector('#gb-good .wg-card')`));
  check('Create: simple pipeline (5) + requirement form', await evalJs(cdp, `document.querySelectorAll('.pipe-simple li').length === 5 && !!document.querySelector('#create-form #req-form')`));
  check('Contribute: workflow strip (5)', await evalJs(cdp, `document.querySelectorAll('.ct-track li').length === 5`));

  /* ── design philosophy: 6 principles, each with real evidence ── */
  check('Design: 6 principles, each with a source ref + a real number', await evalJs(cdp, `(() => {
    const ps = document.querySelectorAll('.principle');
    return ps.length === 6 && Array.from(ps).every(p => /src\\/|components\\.tsx|index\\.ts/.test(p.querySelector('footer code').textContent) && p.querySelector('footer em').textContent.trim().length > 2);
  })()`));

  /* ── Design Grammar: constants + the REAL magnification math ── */
  check('Grammar: constant table lists the real constants', await evalJs(cdp, `document.querySelectorAll('#gr-consts .gr-const').length >= 12 &&
    document.getElementById('gr-consts').textContent.includes('cardSide') && document.getElementById('gr-consts').textContent.includes('unit / 150')`));
  check('Grammar: rail renders real widget cards', await evalJs(cdp, `document.querySelectorAll('#gr-rail .gr-card .wg-card').length === 7`));
  check('Grammar: stepScale matches src/client/index.ts', await evalJs(cdp, `(() => {
    const G = window.DASH_GRAMMAR;
    return Math.abs(G.stepScale(0, 1.2) - 1.2) < 1e-9 && Math.abs(G.stepScale(3, 1.2) - 1) < 1e-9 &&
      G.stepScale(1, 1.2) > 1 && G.stepScale(1, 1.2) < 1.2 && Math.abs(G.stepScale(1.5, 1.2) - (1 + 0.2 * Math.pow(0.5, 1.6))) < 1e-9;
  })()`));
  check('Grammar: grid formulas match the plugin defaults', await evalJs(cdp, `(() => {
    const G = window.DASH_GRAMMAR;
    // radius = round(unit · 16 / 100) — a share of the SHORT side — while the
    // content inset stays FLAT at round(12 · scale) and never follows the corner.
    return G.railWidth(150, 24, 2) === 372 && G.wideWidth(150, 24) === 324 &&
      G.metric(150).radius === 24 && G.metric(150).pad === 12 &&
      G.metric(300).radius === 48 && G.metric(300).pad === 24 && G.metric(300).title === 26 &&
      G.metric(150, 12).radius === 18 && G.metric(150, 24).radius === 36;
  })()`));

  const railMove = await evalJs(cdp, `(() => {
    const host = document.getElementById('gr-rail');
    const stage = document.getElementById('gr-stage');
    const before = Array.from(host.children).map(c => c.style.width);
    const r = host.getBoundingClientRect();
    stage.dispatchEvent(new PointerEvent('pointermove', { clientX: r.left + 20, clientY: r.top + 20, bubbles: true }));
    return new Promise(res => setTimeout(() => {
      const after = Array.from(host.children).map(c => c.style.width);
      const heights = new Set(Array.from(host.children).map(c => c.style.height));
      res({ changed: before.join() !== after.join(), maxW: Math.max.apply(null, Array.from(host.children).map(c => parseFloat(c.style.width))), rows: heights.size, readout: document.getElementById('gr-readout').textContent });
    }, 260));
  })()`);
  check('Grammar: hovering runs the real magnification reflow', railMove.changed === true && railMove.maxW > 150, `maxW=${railMove.maxW} rows=${railMove.rows} ${railMove.readout}`);

  const railSlider = await evalJs(cdp, `(() => {
    const s = document.getElementById('gr-side');
    s.value = '200';
    s.dispatchEvent(new Event('input', { bubbles: true }));
    const f = document.getElementById('gr-formula').textContent;
    const w = document.getElementById('gr-rail').style.width;
    s.value = '150';
    s.dispatchEvent(new Event('input', { bubbles: true }));
    return { f: f.includes('2 × 200'), w: w };
  })()`);
  check('Grammar: cardSide slider drives the rail width formula', railSlider.f === true && railSlider.w === '424px', `width=${railSlider.w}`);

  /* ── Anatomy: measured, not drawn ── */
  const anatomy = await evalJs(cdp, `(() => {
    const rows = document.querySelectorAll('#an-table .an-row');
    const svg = document.querySelectorAll('#an-overlay > *');
    const before = document.getElementById('an-host').innerHTML.length;
    document.querySelectorAll('#an-pick .an-chip')[1].click();
    const after = document.getElementById('an-host').innerHTML.length;
    const active = document.querySelector('#an-pick .an-chip.is-active').getAttribute('data-an');
    return { rows: rows.length, svg: svg.length, before: before, after: after, active: active,
             outer: document.querySelector('#an-table .an-row dd').textContent };
  })()`);
  check('Anatomy: annotations + measured table', anatomy.rows >= 8 && anatomy.svg >= 8, `rows=${anatomy.rows} svg=${anatomy.svg}`);
  check('Anatomy: switching widgets re-renders the stage', anatomy.active === 'context-water', `active=${anatomy.active}`);

  const measured = await evalJs(cdp, `(() => {
    const w = window.DASH_WIDGETS.byId['counts'];
    const host = document.createElement('div');
    host.className = 'wg-slot';
    host.style.cssText = 'position:absolute;left:-9999px;top:0';
    host.innerHTML = window.DASH_PREVIEWS.render(w, { unit: 150, size: '2x2' });
    document.body.appendChild(host);
    const m150 = window.DASH_GRAMMAR.measure(host.firstElementChild, w, 150, '2x2');
    host.innerHTML = window.DASH_PREVIEWS.render(w, { unit: 300, size: '2x2' });
    const m300 = window.DASH_GRAMMAR.measure(host.firstElementChild, w, 300, '2x2');
    const res = { pad150: m150.pad.t, pad300: m300.pad.t, radius150: m150.radius, radius300: m300.radius,
                  titleDelta: Math.abs((m150.title.left - m150.card.left) - m150.metric.pad) };
    document.body.removeChild(host);
    return res;
  })()`);
  check('Audit engine measures the real DOM (12px @150 → 24px @300, corners 24 → 48)', measured.pad150 === 12 && measured.pad300 === 24 &&
    measured.radius150 === 24 && measured.radius300 === 48 && measured.titleDelta <= 1,
    JSON.stringify(measured));

  /* ── Visual Audit ── */
  const audit = await evalJs(cdp, `(() => {
    const rows = document.querySelectorAll('#au-list .au-row');
    const dims = rows[0].querySelectorAll('.au-dim');
    const scored = Array.from(rows).filter(r => /\\d/.test(r.querySelector('.au-overall').textContent)).length;
    const flagged = document.querySelector('#au-list .au-row[data-w="cc-window-monthly"] .au-flag');
    return { rows: rows.length, dims: dims.length, scored: scored, flagged: !!flagged };
  })()`);
  check('Audit: all 34 widgets scored on 5 dimensions', audit.rows === 34 && audit.dims === 5 && audit.scored === 34, JSON.stringify(audit));
  check('Audit: the real copy/implementation finding is flagged', audit.flagged === true);

  const auditDetail = await evalJs(cdp, `(() => {
    document.querySelector('#au-list .au-row[data-w="heatmap"]').click();
    const d = document.getElementById('au-detail');
    return { rules: d.querySelectorAll('.au-rule').length,
             geo: d.querySelectorAll('.au-geo > div').length,
             layer: d.querySelector('.au-layer').textContent.trim(),
             source: d.querySelector('.au-links a').getAttribute('href').includes('/src/widgets/heatmap/index.ts') };
  })()`);
  check('Audit: detail shows 13 rules + measured geometry for the picked widget',
    auditDetail.rules === 13 && auditDetail.geo >= 6 && auditDetail.source === true, JSON.stringify(auditDetail));

  const cases = await evalJs(cdp, `(() => {
    const li = document.querySelectorAll('#au-cases li');
    const top = document.querySelector('#au-list .au-row');
    return { n: li.length, text: Array.from(li).map(x => x.textContent.replace(/\\s+/g, ' ').trim()).slice(0, 6),
             firstRowFlagged: !!top.querySelector('.au-flag') };
  })()`);
  check('Audit: exception list names the real findings (and sorts them first)',
    cases.n >= 4 && cases.firstRowFlagged === true, cases.text.join(' ;; ').slice(0, 300));

  /* ── component detail ── */
  const detail = await evalJs(cdp, `(() => {
    const btn = document.querySelector('#gallery-grid .widget-open');
    btn.click();
    const d = document.getElementById('wg-detail');
    return { open: d.open === true, variants: d.querySelectorAll('.dt-variant .wg-card').length,
             scores: d.querySelectorAll('.dt-score').length, rules: d.querySelectorAll('#wg-detail .au-rule').length,
             geo: d.querySelectorAll('.dt-geo > div').length, links: d.querySelectorAll('.dt-links a').length,
             isButton: btn.tagName === 'BUTTON' };
  })()`);
  check('Detail: dialog opens with variants, geometry, audit, source',
    detail.open === true && detail.variants >= 1 && detail.scores === 5 && detail.rules === 13 && detail.geo >= 6 && detail.links === 3,
    JSON.stringify(detail));
  check('Detail: the gallery entry point is a real button (keyboard reachable)', detail.isButton === true);
  await screenshot(cdp, join(OUT, 'detail-audit.png'));
  const closed = await evalJs(cdp, `(() => { document.getElementById('wg-detail-close').click(); return document.getElementById('wg-detail').open === false; })()`);
  check('Detail: closes cleanly', closed === true);

  /* gallery hydration */
  check('Gallery: every card hydrated with the real widget render', await evalJs(cdp, `document.querySelectorAll('#gallery-grid .widget-stage-lg .wg-card').length === 34`));

  /* regression: one wide (2×4) preview must never widen its grid column */
  const columns = await evalJs(cdp, `(() => {
    const pv = Array.from(document.querySelectorAll('#gallery-grid .widget-preview')).map(p => Math.round(p.getBoundingClientRect().width));
    const cards = Array.from(document.querySelectorAll('#gallery-grid .wg-card')).map(c => Math.round(c.getBoundingClientRect().width));
    return { widths: [...new Set(pv)], widest: Math.max.apply(null, pv), thin: Math.min.apply(null, pv), cards: [...new Set(cards)] };
  })()`);
  check('Gallery: all 4 columns equal (a 2×4 preview cannot blow out a track)',
    columns.widths.length === 1, `column widths=${columns.widths.join(',')} card widths=${columns.cards.join(',')}`);

  /* section screenshots (evidence for the visual audit of the page itself) */
  for (const [id, file] of [['design', 'section-design.png'], ['grammar', 'section-grammar.png'], ['audit', 'section-audit.png'], ['widgets', 'section-gallery.png']]) {
    await evalJs(cdp, `document.getElementById('${id}').scrollIntoView({ block: 'start' })`);
    await new Promise((r) => setTimeout(r, 700));
    await screenshot(cdp, join(OUT, file));
  }
  await evalJs(cdp, `window.scrollTo(0, 0)`);
  await new Promise((r) => setTimeout(r, 200));

  /* default theme LIGHT + default language zh */
  check('Default theme is LIGHT', await evalJs(cdp, `document.documentElement.getAttribute('data-theme') === 'light'`));
  check('Default language is Chinese', await evalJs(cdp, `document.documentElement.getAttribute('lang') === 'zh-CN' && document.getElementById('nav-links').querySelector('a').textContent === '首页'`));

  /* language toggle → EN (nav + gallery re-render + filter label) */
  await evalJs(cdp, `document.getElementById('lang-toggle').click()`);
  await new Promise((r) => setTimeout(r, 200));
  const enState = await evalJs(cdp, `
    document.documentElement.getAttribute('lang') === 'en' &&
    document.getElementById('nav-links').querySelector('a').textContent === 'Home' &&
    document.querySelector('.filter[data-filter="all"]').textContent === 'All' &&
    document.getElementById('gallery-grid').children.length === 34
  `);
  check('Language toggle → English (nav/gallery/filter)', enState === true);
  await screenshot(cdp, join(OUT, 'light-en.png'));
  await evalJs(cdp, `document.getElementById('lang-toggle').click()`);
  await new Promise((r) => setTimeout(r, 150));
  check('Language toggle → back to Chinese', await evalJs(cdp, `document.documentElement.getAttribute('lang') === 'zh-CN'`));

  /* gallery filter */
  await evalJs(cdp, `document.querySelector('.filter[data-filter="pricing"]').click()`);
  await new Promise((r) => setTimeout(r, 100));
  let visible = await evalJs(cdp, `Array.from(document.querySelectorAll('#gallery-grid .widget-card')).filter(c => !c.classList.contains('is-hidden')).length`);
  check('Gallery filter: pricing = 1 card', visible === 1, `visible=${visible}`);
  await evalJs(cdp, `document.querySelector('.filter[data-filter="all"]').click()`);

  /* theme toggle light → dark + persistence */
  await evalJs(cdp, `document.getElementById('theme-toggle').click()`);
  await new Promise((r) => setTimeout(r, 150));
  const darkOk = await evalJs(cdp, `
    document.documentElement.getAttribute('data-theme') === 'dark' &&
    localStorage.getItem('dsh-widgets-site-theme') === 'dark'
  `);
  check('Theme toggle light→dark + persisted', darkOk === true);
  await screenshot(cdp, join(OUT, 'dark-zh.png'));
  await evalJs(cdp, `document.getElementById('theme-toggle').click()`);
  await new Promise((r) => setTimeout(r, 120));
  check('Theme toggle back to light', await evalJs(cdp, `document.documentElement.getAttribute('data-theme') === 'light'`));

  /* i18n completeness: every data-i18n key must resolve in BOTH languages */
  const missingKeys = await evalJs(cdp, `(() => {
    const keys = new Set();
    document.querySelectorAll('[data-i18n],[data-i18n-ph],[data-i18n-aria],[data-i18n-title]').forEach(el => {
      [el.getAttribute('data-i18n'), el.getAttribute('data-i18n-ph'), el.getAttribute('data-i18n-aria'), el.getAttribute('data-i18n-title')].forEach(k => { if (k) keys.add(k); });
    });
    const miss = [];
    keys.forEach(k => { if (window.DASH_I18N.t(k) === k) miss.push(k); });
    const missEn = [];
    keys.forEach(k => { if (window.DASH_I18N.dict.en[k] === undefined) missEn.push(k); });
    return { miss: miss, missEn: missEn };
  })()`);
  check('Every i18n key resolves in zh + en', missingKeys.miss.length === 0 && missingKeys.missEn.length === 0,
    'zh-missing: ' + missingKeys.miss.slice(0, 5).join(',') + ' en-missing: ' + missingKeys.missEn.slice(0, 5).join(','));

  /* visual probes */
  const noOverflow = await evalJs(cdp, `document.documentElement.scrollWidth <= window.innerWidth + 1`);
  check('No horizontal page overflow (desktop)', noOverflow === true);
  const railBefore = await evalJs(cdp, `getComputedStyle(document.getElementById('rail-a')).transform`);
  await new Promise((r) => setTimeout(r, 400));
  const railAfter = await evalJs(cdp, `getComputedStyle(document.getElementById('rail-a')).transform`);
  check('Hero rail animation is running', railBefore !== railAfter);
  const heroColor = await evalJs(cdp, `getComputedStyle(document.querySelector('.hero-brand')).color`);
  check('Hero headline uses DeepSeek brand blue', heroColor === 'rgb(65, 118, 230)', heroColor);
  const realCardBg = await evalJs(cdp, `getComputedStyle(document.querySelector('#hs-cards .wg-card')).backgroundColor`);
  check('Showcase cards use REAL DSH card background', realCardBg === 'rgb(255, 255, 255)', realCardBg);
  await screenshot(cdp, join(OUT, 'hero-top.png'));

  /* dark-mode REAL widget tokens */
  await evalJs(cdp, `document.getElementById('theme-toggle').click()`);
  await new Promise((r) => setTimeout(r, 150));
  const darkCard = await evalJs(cdp, `
    getComputedStyle(document.querySelector('#hs-cards .wg-card')).backgroundColor === 'rgb(44, 44, 46)' &&
    getComputedStyle(document.querySelector('#hs-cards .wg-card .wg-title-row')).color === 'rgb(103, 158, 254)'
  `);
  check('Dark mode uses REAL DSH widget tokens (bg #2c2c2e, title #679efe)', darkCard === true);
  await evalJs(cdp, `document.getElementById('theme-toggle').click()`);
  await new Promise((r) => setTimeout(r, 120));

  /* nav anchor */
  await evalJs(cdp, `document.querySelector('.nav-link[href="#widgets"]').click()`);
  await new Promise((r) => setTimeout(r, 600));
  check('Nav anchor scrolls to #widgets', await evalJs(cdp, `location.hash === '#widgets'`));

  /* copy install */
  await evalJs(cdp, `document.getElementById('copy-install').click()`);
  await new Promise((r) => setTimeout(r, 300));
  const copyState = await evalJs(cdp, `document.getElementById('copy-install').classList.contains('is-copied') || (document.getElementById('toast') && !document.getElementById('toast').hidden)`);
  check('Install copy button responds', copyState === true);

  /* reveal */
  await evalJs(cdp, `window.scrollTo(0, document.body.scrollHeight)`);
  await new Promise((r) => setTimeout(r, 900));
  const unRevealed = await evalJs(cdp, `document.querySelectorAll('.reveal:not(.in)').length`);
  check('Reveal-on-scroll activates sections', unRevealed === 0, `remaining=${unRevealed}`);
  await screenshot(cdp, join(OUT, 'light-zh.png'));
  await evalJs(cdp, `window.scrollTo(0, 0)`);

  /* spec generator */
  await evalJs(cdp, `document.getElementById('gen-spec').click()`);
  await new Promise((r) => setTimeout(r, 120));
  const missingMsg = await evalJs(cdp, `document.getElementById('spec-pre').textContent.includes('缺少必填字段')`);
  check('Spec generator flags missing fields', missingMsg === true);
  await evalJs(cdp, `
    ['f-name','f-purpose','f-title','f-content','f-display'].forEach(id => {
      const el = document.getElementById(id);
      el.value = id === 'f-name' ? '心率' : id === 'f-purpose' ? '展示今日心率' : '示例 ' + id;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    document.getElementById('f-size').value = 'both';
    document.getElementById('f-category').value = 'other';
    document.getElementById('gen-spec').click();
  `);
  await new Promise((r) => setTimeout(r, 120));
  const specOk = await evalJs(cdp, `
    const t = document.getElementById('spec-pre').textContent;
    t.includes('Widget Specification') && t.includes('widget-spec/v1') && t.includes('心率') && t.includes('size: 2x2, 2x4')
  `);
  check('Spec generator produces valid spec', specOk === true);
  const copyEnabled = await evalJs(cdp, `!document.getElementById('copy-spec').disabled`);
  check('Copy-spec button enabled after generation', copyEnabled === true);

  /* mobile */
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await cdp.send('Page.navigate', { url });
  await waitFor(cdp, `document.getElementById('gallery-grid') && document.getElementById('gallery-grid').children.length === 34`);
  await new Promise((r) => setTimeout(r, 500));
  const burgerVisible = await evalJs(cdp, `getComputedStyle(document.getElementById('nav-burger')).display !== 'none'`);
  check('Mobile: burger visible', burgerVisible === true);
  await evalJs(cdp, `document.getElementById('nav-burger').click()`);
  await new Promise((r) => setTimeout(r, 150));
  const menuOpen = await evalJs(cdp, `document.getElementById('nav-links').classList.contains('open')`);
  check('Mobile: burger opens menu', menuOpen === true);
  const mNoOverflow = await evalJs(cdp, `document.documentElement.scrollWidth <= window.innerWidth + 1`);
  check('No horizontal page overflow (mobile)', mNoOverflow === true);
  const mCols = await evalJs(cdp, `getComputedStyle(document.getElementById('gallery-grid')).gridTemplateColumns.split(' ').length`);
  check('Gallery 1 column on mobile', mCols === 1, `cols=${mCols}`);
  await screenshot(cdp, join(OUT, 'mobile.png'));
  for (const [id, file] of [['grammar', 'mobile-grammar.png'], ['anatomy', 'mobile-anatomy.png'], ['audit', 'mobile-audit.png']]) {
    await evalJs(cdp, `document.getElementById('${id}').scrollIntoView({ block: 'start' })`);
    await new Promise((r) => setTimeout(r, 500));
    await screenshot(cdp, join(OUT, file));
  }
  const mobileOk = await evalJs(cdp, `(() => {
    const svg = document.querySelectorAll('#an-overlay > *').length;
    const grid = getComputedStyle(document.querySelector('.principles')).gridTemplateColumns.split(' ').length;
    const rows = document.querySelectorAll('#au-list .au-row').length;
    return { svg: svg, principles: grid, rows: rows, overflow: document.documentElement.scrollWidth <= window.innerWidth + 1 };
  })()`);
  check('Mobile: anatomy labels + audit table survive the narrow layout',
    mobileOk.svg >= 8 && mobileOk.principles === 1 && mobileOk.rows === 34 && mobileOk.overflow === true, JSON.stringify(mobileOk));

  /* desktop 1920×1080 viewport */
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
  await cdp.send('Page.navigate', { url });
  await waitFor(cdp, `document.getElementById('gallery-grid') && document.getElementById('gallery-grid').children.length === 34`);
  await new Promise((r) => setTimeout(r, 500));
  const wideOk = await evalJs(cdp, `
    document.documentElement.scrollWidth <= window.innerWidth + 1 &&
    document.getElementById('home').getBoundingClientRect().height >= 1100
  `);
  check('1920×1080: no overflow + hero >= 1100px', wideOk === true);
  await screenshot(cdp, join(OUT, 'desktop-1920.png'));

  const issues = collectBrowserIssues(cdp);
  check('No console errors / exceptions', issues.errors.length === 0, issues.errors.slice(0, 3).join(' | '));
  check('No failed network requests (>=400)', issues.failed.length === 0, issues.failed.slice(0, 3).join(' | '));

  ctx.edge.proc.kill();
} catch (e) {
  check('Verification run', false, e.message);
} finally {
  if (server) server.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed — artifacts in ${OUT}`);
finish(failed.length ? 1 : 0);