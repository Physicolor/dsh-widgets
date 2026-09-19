#!/usr/bin/env node
/**
 * dsh-widgets website — Open Graph card generator.
 *
 * Renders website/assets/og.png (1200×630) with a local Edge/Chrome over CDP,
 * from a template that uses the SITE's own tokens and the REAL widget preview
 * renderer — so the social card shows the same cards the product shows.
 *
 * Usage: node website/gen-og.mjs
 */
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, extname, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = dirname(fileURLToPath(import.meta.url));
const OUT = join(SITE, 'assets', 'og.png');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png'
};

const TEMPLATE = `<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
<meta charset="utf-8" />
<link rel="stylesheet" href="css/tokens.css" />
<link rel="stylesheet" href="css/widgets.css" />
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; }
  body {
    font-family: var(--font-sans);
    background:
      radial-gradient(760px 420px at 78% 4%, rgba(65, 118, 230, 0.18), transparent 62%),
      linear-gradient(160deg, #f4f8fc, #e6f0fa 70%, #dfeafa);
    display: flex; flex-direction: column; justify-content: space-between;
    padding: 54px 64px 44px;
  }
  .og-top { display: flex; align-items: center; gap: 14px; }
  .og-mark { width: 44px; height: 44px; display: block; }
  .og-brand { font-size: 20px; font-weight: 700; color: #0f1115; letter-spacing: -0.01em; }
  .og-brand small { display: block; font-size: 12.5px; font-weight: 500; color: #61666b; letter-spacing: 0; }
  h1 { margin: 22px 0 0; font-size: 54px; line-height: 1.06; letter-spacing: -0.035em; color: #0f1115; }
  h1 span { color: #4176e6; }
  .og-sub { margin: 14px 0 0; font-size: 19px; color: #414a56; max-width: 640px; line-height: 1.5; }
  .og-tags { margin: 20px 0 0; display: flex; gap: 10px; flex-wrap: wrap; }
  .og-tag { padding: 6px 14px; border-radius: 999px; border: 1px solid rgba(65, 118, 230, 0.35); background: rgba(65, 118, 230, 0.09); color: #2f63d8; font-size: 13.5px; font-weight: 600; }
  .og-rail { display: flex; gap: 18px; align-items: flex-end; }
  .og-rail .wg-slot { flex: none; }
  .og-foot { display: flex; align-items: center; justify-content: space-between; font-size: 14px; color: #61666b; }
  .og-foot code { font-family: var(--font-mono); font-size: 13px; color: #2f63d8; }
</style>
</head>
<body>
  <div>
    <div class="og-top">
      <img class="og-mark" src="assets/icon.svg" alt="" />
      <div class="og-brand">dsh-widgets<small>for DeepSeek Harness</small></div>
    </div>
    <h1>Widget <span>Design System</span></h1>
    <p class="og-sub">33 compact widgets on a 150px grid — spatial grammar, continuous magnification, and a rule-based visual audit.</p>
    <div class="og-tags">
      <span class="og-tag">33 widgets</span>
      <span class="og-tag">150px grid · 24px gutter</span>
      <span class="og-tag">13 audit rules</span>
      <span class="og-tag">Agent-produced units</span>
    </div>
  </div>
  <div class="og-rail" id="og-rail"></div>
  <div class="og-foot">
    <span>physicolor.github.io/dsh-widgets</span>
    <code>dsh plugin --profile web add dsh-widgets</code>
  </div>
  <script src="js/data.js"></script>
  <script src="js/i18n.js"></script>
  <script src="js/previews.js"></script>
  <script>
    var ids = ['counts', 'context-water', 'usage-rings', 'peak-pricing', 'task'];
    var rail = document.getElementById('og-rail');
    ids.forEach(function (id) {
      var w = window.DASH_WIDGETS.byId[id];
      if (!w) return;
      var slot = document.createElement('div');
      slot.className = 'wg-slot';
      slot.style.transform = 'scale(0.86)';
      slot.style.transformOrigin = 'bottom left';
      slot.innerHTML = window.DASH_PREVIEWS.render(w, { unit: 150, size: '2x2' });
      rail.appendChild(slot);
    });
  </script>
</body>
</html>`;

function findBrowser() {
  const c = [
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe'
  ];
  for (const x of c) if (existsSync(x)) return x;
  return null;
}

function serve() {
  return new Promise((res) => {
    const server = createServer(async (req, res) => {
      const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (path === '/og') {
        res.writeHead(200, { 'content-type': MIME['.html'] });
        res.end(TEMPLATE);
        return;
      }
      const file = join(SITE, path);
      if (!file.startsWith(SITE) || !existsSync(file)) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'content-type': MIME[extname(file).toLowerCase()] || 'application/octet-stream' });
      res.end(await readFile(file));
    });
    server.listen(0, '127.0.0.1', () => res(server));
  });
}

class Cdp {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.pending = new Map();
    ws.addEventListener('message', (e) => {
      const msg = JSON.parse(e.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve: ok, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? reject(new Error(msg.error.message)) : ok(msg.result);
      }
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((ok, reject) => {
      this.pending.set(id, { resolve: ok, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
}

const browser = findBrowser();
if (!browser) { console.error('no Chrome/Edge found'); process.exit(1); }
const server = await serve();
const url = `http://127.0.0.1:${server.address().port}/og`;
const profile = join(tmpdir(), 'dsh-widgets-og-' + Date.now());
const proc = spawn(browser, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--hide-scrollbars', '--window-size=1200,630', '--remote-debugging-port=0',
  `--user-data-dir=${profile}`, 'about:blank'
], { stdio: ['ignore', 'ignore', 'pipe'] });

const browserWs = await new Promise((ok, bad) => {
  let buf = '';
  proc.stderr.on('data', (d) => {
    buf += d;
    const m = buf.match(/DevTools listening on (ws:\/\/[^\s]+)/);
    if (m) ok(m[1]);
  });
  proc.on('exit', (c) => bad(new Error('browser exited early ' + c)));
  setTimeout(() => bad(new Error('DevTools timeout')), 20000);
});

const base = 'http://' + browserWs.replace(/^ws:\/\//, '').replace(/\/devtools\/browser\/.*/, '');
const targets = await (await fetch(base + '/json')).json();
const page = targets.find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((ok, bad) => { ws.onopen = ok; ws.onerror = bad; });
const cdp = new Cdp(ws);
await cdp.send('Page.enable');
await cdp.send('Runtime.enable');
await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1200, height: 630, deviceScaleFactor: 1, mobile: false });
await cdp.send('Page.navigate', { url });

for (let i = 0; i < 60; i++) {
  const r = await cdp.send('Runtime.evaluate', {
    expression: `document.querySelectorAll('#og-rail .wg-card').length`,
    returnByValue: true
  });
  if (r.result.value >= 5) break;
  await new Promise((r2) => setTimeout(r2, 150));
}
await new Promise((r2) => setTimeout(r2, 500));
const shot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
await writeFile(OUT, Buffer.from(shot.data, 'base64'));
proc.kill();
server.close();
console.log(`wrote ${OUT} (1200×630)`);
