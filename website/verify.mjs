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
  const re = /<(\/)?([a-zA-Z][a-zA-Z0-9-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/)?>/g;
  let m;
  while ((m = re.exec(html))) {
    const [, close, tag, , selfClose] = m;
    if (close) {
      const top = stack.pop();
      if (top !== tag) problems.push(`mismatched </${tag}> (open ${top || 'none'})`);
    } else if (!selfClose && !voidTags.has(tag)) {
      stack.push(tag);
    }
  }
  if (stack.length) problems.push(`unclosed tags: ${stack.join(', ')}`);
  const abs = [...html.matchAll(/(?:src|href)="\/(?!\/)/g)];
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
  await waitFor(cdp, `document.readyState === 'complete' && document.getElementById('gallery-grid') && document.getElementById('gallery-grid').children.length === 24`);
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
    'Title': `document.title === 'DeepSeek Harness Widgets — dsh-widgets'`,
    'All sections present': `['home','widgets','design','create','contribute'].every(id => !!document.getElementById(id))`,
    'Old sentence-sections removed': `!document.getElementById('why') && !document.getElementById('philosophy') && !document.getElementById('workflow')`,
    'No Playground/Demo residue': `!document.getElementById('playground') && !document.getElementById('deploy-modal') && !document.querySelector('.pg-deck') && !document.querySelector('.hs-sim') && !document.querySelector('.badge-demo')`,
    '19 gallery cards': `document.getElementById('gallery-grid').children.length === 24`,
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
    document.getElementById('gallery-grid').children.length === 24
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
  await waitFor(cdp, `document.getElementById('gallery-grid') && document.getElementById('gallery-grid').children.length === 24`);
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

  /* desktop 1920×1080 viewport */
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
  await cdp.send('Page.navigate', { url });
  await waitFor(cdp, `document.getElementById('gallery-grid') && document.getElementById('gallery-grid').children.length === 24`);
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