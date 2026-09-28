/**
 * tsdown config for the OFFLINE CARD GALLERY (not a shipped artifact).
 *
 * The plugin's own build is `tsdown.config.ts`; this one bundles the render
 * closure alone — `src/client/render/preview/gallery.tsx` — into ONE
 * self-contained IIFE for a bare page, so a widget's real `CardBody` output can
 * be looked at in a browser without a running harness.
 *
 * React stays external and is resolved from the UMD global the page loads;
 * `react/jsx-runtime` (which the tsconfig's `react-jsx` emits) is bundled,
 * because it in turn requires the same external `react`.
 *
 * Usage: npx tsdown --config tsdown.gallery.config.ts
 */
import type { UserConfig } from 'tsdown'

const galleryConfig: UserConfig = {
  name: 'dsh-widgets/gallery',
  entry: { gallery: 'src/client/render/preview/gallery.tsx' },
  outDir: '.tmp-gallery',
  format: ['iife'],
  platform: 'browser',
  target: 'es2022',
  dts: false,
  sourcemap: false,
  clean: false,
  external: ['react'],
  define: { 'process.env.NODE_ENV': JSON.stringify('development') },
  outputOptions: {
    entryFileNames: 'gallery.js',
    name: 'DSHGallery',
    globals: { react: 'React' },
  },
}

export default [galleryConfig]
