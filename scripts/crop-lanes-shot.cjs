/**
 * Crop a probe screenshot (scripts/crop-lanes-shot.cjs)
 *
 * `node scripts/crop-lanes-shot.cjs <full.png> <rect.json> <out.png> [dsf]`
 *
 * The lanes probes cannot use playwright's `clip`: inside the fixed rail the
 * clip rectangle is interpreted against the page, not the viewport, so the
 * captured region lands wherever the document happens to be scrolled. They save
 * a full-viewport shot plus the card's viewport rect instead, and this crops it.
 */
const fs = require('fs')
const { execFileSync } = require('child_process')

const [full, rectFile, out, dsfArg] = process.argv.slice(2)
const dsf = Number(dsfArg || 3)
const r = JSON.parse(fs.readFileSync(rectFile, 'utf8'))
const ps = `
Add-Type -AssemblyName System.Drawing
$src = [System.Drawing.Image]::FromFile('${full.replace(/'/g, "''")}')
$rect = New-Object System.Drawing.Rectangle(${Math.round(r.x * dsf)}, ${Math.round(r.y * dsf)}, ${Math.round(r.width * dsf)}, ${Math.round(r.height * dsf)})
$bmp = New-Object System.Drawing.Bitmap($rect.Width, $rect.Height)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.DrawImage($src, (New-Object System.Drawing.Rectangle(0, 0, $rect.Width, $rect.Height)), $rect, [System.Drawing.GraphicsUnit]::Pixel)
$bmp.Save('${out.replace(/'/g, "''")}', [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose(); $src.Dispose()
Write-Output "cropped ${out} $($rect.Width)x$($rect.Height)"
`
const res = execFileSync('pwsh', ['-NoProfile', '-Command', ps], { encoding: 'utf8' })
process.stdout.write(res)
