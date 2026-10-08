# Screenshots

The captured / generated images the README and the plugin market showcase use.

| File | Origin | What it shows |
| --- | --- | --- |
| `cover.png` | generated | the poster on the README's first screen (English copy) — `docs/poster/index.html` via `node docs/poster/render.cjs` |
| `cover.zh-CN.png` | generated | the same poster with the Chinese copy (`?lang=zh`), used by `README.zh-CN.md` |
| `desktop-rail.png` | captured, desktop app | the rail in a 4-column grid with the hover wave engaged (shot by `scripts/demo/desktop-shots.cjs`; the poster embeds it as `docs/poster/rail-portrait.png`) |
| `desktop-rail-rest.png` | captured, desktop app | the same rail at rest, 3 columns |
| `desktop-market.png` | captured, desktop app | the market panel — install, resize and switch cards off |
| `rail-demo.gif` | captured, frame-stepped | the magnification wave in motion (13 fps palette GIF, 480×784, 3.8 MB) |
| `rail-demo-still.png` | captured, frame-stepped | the resting rail (frame 16 of the same clip, before the pointer starts gliding), the README's first-screen still — `ffmpeg -i rail-demo.mp4 -vf "select=eq(n\,16),scale=960:-1:flags=lanczos" -vframes 1 rail-demo-still.png` (192-colour palette PNG, 188 KB) |
| `rail-demo.mp4` | captured, frame-stepped | the same clip at full resolution (948×1548, 25 fps, 1.5 MB) |
| `rail-widgets.png` | captured | the right-hand rail with its widgets seated |
| `dock-magnify.png` | captured | the macOS-Dock-style magnification wave |
| `add-panel.png` | captured | the add-widget panel |
| `widget-cards.png` | generated | the first five widget cards, screenshotted from `widget-cards-preview.html` with headless Edge |
| `widget-cards-preview.html` | generated | a standalone HTML page reproducing those five cards (re-shoot with `msedge --headless=new --screenshot=widget-cards.png --window-size=900,260 widget-cards-preview.html`) |

The `desktop-*` files come from `scripts/demo/desktop-shots.cjs` — captures of the running
app with the type forced to HarmonyOS Sans SC at capture time (verified with CDP's platform
font report), cropped so the owner's conversation is never in a public asset. The two
`rail-demo.*` files come from `scripts/demo/rail-demo.cjs`, which steps the page on CDP
virtual time (one exact per-frame budget per screenshot) instead of screen-recording it.

## Plugin market (dsh-market) PR — optional

To control which screenshots the market shows and in what order, add one entry to the
dsh-market repository's `data/screenshots.json`: **the key is this plugin's GitHub URL**,
and the images are `raw.githubusercontent.com` links:

```jsonc
"https://github.com/Physicolor/dsh-widgets": [
  "https://raw.githubusercontent.com/Physicolor/dsh-widgets/main/docs/screenshots/rail-widgets.png",
  "https://raw.githubusercontent.com/Physicolor/dsh-widgets/main/docs/screenshots/dock-magnify.png",
  "https://raw.githubusercontent.com/Physicolor/dsh-widgets/main/docs/screenshots/add-panel.png"
]
```

One to eight images; without a PR the market falls back to extracting images from the README.
