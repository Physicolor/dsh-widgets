#!/usr/bin/env python
"""glow-scan.py — find the leftmost painted pixel of a glow strip in a screenshot.

Usage:
  python scripts/lib/glow-scan.py <png> <regionLeftCssPx> [--tol 6] [--top <regionTopCssPx>]

For every row of the image it walks in from the left and records the first column
whose colour differs from that row's own leftmost pixel by more than `--tol` in any
channel. Reported in CSS pixels (the screenshot is device-scale 1).

With `--top`, it ALSO scans every column downward and records the first row whose
colour differs from that column's topmost pixel — the same test on the other axis,
which is how a clip on the TOP edge of a glow (a horizontal hard line) is found.

Why per-row: a glow fades out smoothly, so its leftmost visible pixel drifts row by
row; a CLIP produces a hard vertical edge, i.e. a spike in the histogram where many
neighbouring rows share the exact same leftmost column. The histogram is the
evidence, not the min.
"""
import sys
from collections import Counter

from PIL import Image


def scan(im, horizontal, tol):
    """(index -> first differing position) along the chosen axis, or None."""
    w, h = im.size
    px = im.load()
    out = []
    if horizontal:
        for y in range(h):
            base = px[0, y]
            found = None
            for x in range(w):
                p = px[x, y]
                if max(abs(p[0] - base[0]), abs(p[1] - base[1]), abs(p[2] - base[2])) > tol:
                    found = x
                    break
            out.append((y, found))
    else:
        for x in range(w):
            base = px[x, 0]
            found = None
            for y in range(h):
                p = px[x, y]
                if max(abs(p[0] - base[0]), abs(p[1] - base[1]), abs(p[2] - base[2])) > tol:
                    found = y
                    break
            out.append((x, found))
    return out


def report(label, rows, origin, axis):
    found = [(i, v) for i, v in rows if v is not None]
    print(f"  [{label}] scanned {len(rows)} {axis}; with paint: {len(found)}")
    if not found:
        print("    nothing painted")
        return
    vals = [v for _, v in found]
    print(f"    first painted {axis} position: min={origin + min(vals):.1f} max={origin + max(vals):.1f}")
    hist = Counter(vals)
    for col, n in hist.most_common(4):
        print(f"      {axis}={origin + col:8.1f}  lines={n:4d}  {'#' * min(60, n)}")
    edge, n = hist.most_common(1)[0]
    print(f"    HARD-EDGE CANDIDATE: {axis}={origin + edge:.1f} shared by {n} lines ({100.0 * n / len(rows):.0f}%)")


def main() -> int:
    if len(sys.argv) < 3:
        print(__doc__)
        return 2
    path = sys.argv[1]
    left_css = float(sys.argv[2])
    tol = 6
    if "--tol" in sys.argv:
        tol = int(sys.argv[sys.argv.index("--tol") + 1])
    top_css = None
    if "--top" in sys.argv:
        top_css = float(sys.argv[sys.argv.index("--top") + 1])

    im = Image.open(path).convert("RGB")
    w, h = im.size
    print(f"file={path} size={w}x{h} regionLeftCss={left_css}")
    report("LEFT", scan(im, True, tol), left_css, "col")
    if top_css is not None:
        report("TOP", scan(im, False, tol), top_css, "row")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
