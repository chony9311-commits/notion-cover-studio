# Notion Cover Studio

A free, single-page browser tool that makes minimal Notion covers (1500 × 600) and phone wallpapers (1080 × 1920) and exports them as sharp PNGs. No sign-up, no watermark, no upload — the image is drawn locally with the Canvas API.

Live (after Vercel import): `https://notion-cover-studio.vercel.app/`

## What's inside

| Path | Purpose |
|---|---|
| `index.html` | The page: studio, copy, FAQ, SEO/OG meta, JSON-LD, ad slot |
| `styles.css` | All styling (no framework, no build step) |
| `app.js` | Presets, canvas renderer, controls, PNG export |
| `og-image.png` | 1200 × 630 social card |
| `apple-touch-icon.png`, `favicon.svg` | Icons |
| `robots.txt`, `sitemap.xml` | Crawling |
| `tools/make_assets.py` | Rebuilds `og-image.png` and the touch icon from the default preset |

16 presets: 11 gradients (blush, sage, arctic, lavender, sand, charcoal, terracotta, olive, mist, powder, dusk) plus cotton paper, linen, graph paper, dot grid and concentric rings. Text: headline + optional subtitle, four fonts (Inter, Playfair Display, Lora, Space Mono), three alignments, size slider and any ink colour. The last settings are remembered in `localStorage`; `R` shuffles.

## Run locally

Any static server works:

```bash
cd notion-cover-studio
python3 -m http.server 8000
# open http://localhost:8000
```

Opening `index.html` directly from disk also works (no absolute-path fetches, no modules).

## Deploy to Vercel

Zero config: every path is absolute from the repo root and `index.html` sits at the top level, so Vercel's static preset serves it as is.

1. https://vercel.com/new → Import Git Repository → `chony9311-commits/notion-cover-studio`
2. Framework preset: **Other**. Build command: **empty**. Output directory: **empty** (root).
3. Deploy. The project gets `notion-cover-studio.vercel.app`.
4. Optional: add a custom domain in Project → Settings → Domains.

CLI alternative:

```bash
npm i -g vercel
cd notion-cover-studio
vercel --prod
```

## After the first deploy

- **Swap the domain** if it is not `notion-cover-studio.vercel.app`: search `notion-cover-studio.vercel.app` in `index.html` (canonical, OG, Twitter, JSON-LD), `robots.txt` and `sitemap.xml`.
- **Google AdSense**: add the site in AdSense, paste the verification snippet into `<head>` (the meta tag is already stubbed in `index.html`), then fill `data-ad-client` / `data-ad-slot` in the display unit under the studio and remove its `hidden` attribute. AdSense also asks for an `ads.txt` at the domain root once approved — it must contain your own `pub-` line, so add it then (a placeholder file would be worse than none). Approval needs the live URL and some traffic; the FAQ and explanatory copy exist partly for that.
- **Search Console**: submit `sitemap.xml`, then request indexing for `/`.
- **Analytics**: none is included on purpose (no cookies, no consent banner needed). Add Vercel Analytics or Plausible if wanted.

## Editing

- Presets live in the `PRESETS` array at the top of `app.js`: `colors`, `angle`, `ink`, and `kind` (`gradient`, `paper`, `grid`, `dots`, `rings`).
- Fonts: add a family to the Google Fonts `<link>` in `index.html` and to `FONTS` in `app.js`.
- `index.html` links `styles.css?v=20261118` and `app.js?v=20261118`; bump that number when you change those files so returning visitors do not get a cached copy.
- The Gumroad call to action appears three times in `index.html` (sidebar card, dark band, footer link). Current link: `https://jaehwan0.gumroad.com/l/cozy-minimal-wallpaper-pack/LAUNCH40` (40% off, $4.99 → $2.99).

## Notes

- Not affiliated with Notion Labs, Inc. "Notion" is used descriptively.
- Fonts are loaded from Google Fonts under the OFL; `tools/fonts/` is only used to rebuild the social image and is not deployed.
