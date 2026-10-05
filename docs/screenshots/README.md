# Screenshots

The captured / generated images the README and the plugin market showcase use.

| File | Origin | What it shows |
| --- | --- | --- |
| `rail-widgets.png` | captured | the right-hand rail with its widgets seated |
| `dock-magnify.png` | captured | the macOS-Dock-style magnification wave |
| `add-panel.png` | captured | the add-widget panel |
| `rail-demo.gif` | captured, frame-stepped | the magnification wave in motion — the README's motion asset (13 fps palette GIF, 480×784, 3.8 MB) |
| `rail-demo.mp4` | captured, frame-stepped | the same clip at full resolution (948×1548, 25 fps, 1.5 MB) |
| `widget-cards.png` | generated | the first five widget cards, screenshotted from `widget-cards-preview.html` with headless Edge |
| `widget-cards-preview.html` | generated | a standalone HTML page reproducing those five cards (re-shoot with `msedge --headless=new --screenshot=widget-cards.png --window-size=900,260 widget-cards-preview.html`) |

The two `rail-demo.*` files come from `node scripts/demo/rail-demo.cjs` — **not** a screen
recorder. The script steps the live page on CDP virtual time (one exact per-frame budget
per screenshot), so the same input renders the same clip, and it crops to the rail alone
so the owner's conversation never lands in a public asset. Re-run it after a visual change
that deserves to be seen in motion.

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
