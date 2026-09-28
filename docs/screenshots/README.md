# Screenshots

The captured / generated images the README and the plugin market showcase use.

| File | Origin | What it shows |
| --- | --- | --- |
| `rail-widgets.png` | captured | the right-hand rail with its widgets seated |
| `dock-magnify.png` | captured | the macOS-Dock-style magnification wave |
| `add-panel.png` | captured | the add-widget panel |
| `widget-cards.png` | generated | the first five widget cards, screenshotted from `widget-cards-preview.html` with headless Edge |
| `widget-cards-preview.html` | generated | a standalone HTML page reproducing those five cards (re-shoot with `msedge --headless=new --screenshot=widget-cards.png --window-size=900,260 widget-cards-preview.html`) |

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
