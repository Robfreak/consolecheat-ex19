# Retro-Banner-Generator

Text eingeben, Pixel-Schrift und Effekte wählen, PNG exportieren: Verlauf, Outline, Schatten und Scanlines, für Stream-Overlays und Profilbanner. Teil der inoffiziellen consolecheat-Werkzeuge rund um [consolecheat.com](https://consolecheat.com). German is the primary language, English is the other. Light and dark theme, self-hosted fonts, footer, Impressum, and Datenschutz are included.

No account, no tracking, nothing uploaded. UI fonts (Outfit, Source Sans 3) are self-hosted from `@fontsource`; the banner pixel fonts are bitmap fonts defined in code (`src/banner/fonts.ts`). The page makes no request to Google or any other third party. The Impressum fields are placeholders until the operator fills them in. No name or address was invented.

Site: <https://robfreak.github.io/consolecheat-ex19/>

Inoffiziell. Nicht von Sony.

## Features

- **Text:** multi-line, at most 6 lines and 160 characters. Lowercase letters are drawn with the capital glyph (ä → Ä); ß has its own glyph. Characters without a glyph show `?`.
- **Pixel fonts (own bitmap fonts, no font files):** *Pixel 5×7*, *Pixel 5×7 fett* (strokes doubled to the right), and *Mini 3×5*. Each covers A–Z, 0–9, ÄÖÜß and `. , ! ? : ; - + = _ ' " ( ) / & # * % < > @`. Punctuation is proportional.
- **Effects:** colour gradient with 2 or 3 stops (horizontal or vertical, quantised per font pixel), outline (0–4 font pixels, square corners, colour), drop shadow (offset −6…6 font pixels, colour, on/off), scanlines (0–80 %, every second band of half a font pixel is darkened), pixel scale (automatic or 1–32×), background (transparent, colour, or 2-colour gradient), letter spacing, line spacing, alignment (left/centre/right), padding.
- **Size presets:** Stream-Overlay 1920×240, Twitch-Profilbanner 1200×480, YouTube-Kanalbanner 2560×1440, Profil-Header 1500×500, Twitch-Panel 320×100, and a custom size (16–4096 px each side).
- **Live preview** on a canvas with `image-rendering: pixelated` over a checkerboard, so transparency is visible. A note appears when the text does not fit at a manual scale.
- **PNG export** at exactly the preset size (`consolecheat-banner-<preset>-<w>x<h>.png`). With a transparent background every pixel outside text, outline, and shadow has alpha 0; drawn pixels are fully opaque.
- **Styles:** Arcade, Game Boy, Synthwave, Terminal, Neon, Overlay (transparent), plus **Zufallsstil** (deterministic per seed, picks from a curated 16-colour retro palette and keeps fill and background apart in brightness). Styles change look only, never text, size, or layout. All colour pickers suggest the same retro palette.
- **Undo/redo** (100 steps). One slider drag or one typing burst is one step.
- **Meine Designs:** save under a name (same name overwrites), load, delete, export all as JSON, import JSON with validation.

## Controls

| Action | Keyboard | Controller (standard mapping) |
| --- | --- | --- |
| Previous / next style | `[` / `]` | D-pad ←/→ or L1/R1 |
| Previous / next font | | D-pad ↑/↓ (left stick beyond 0.5 too) |
| Random style | R | △ |
| Export PNG | E | Options |
| Undo / redo | Ctrl/⌘+Z, Ctrl/⌘+Shift+Z or Ctrl/⌘+Y | |

No shortcut fires while a text field, the text area, or a select has focus (gamepad input is ignored too, but its state keeps being tracked). Gamepads are polled once per `requestAnimationFrame` with the `pollPad` pattern from consolecheat-ex15: the **first poll** of a pad, and the first after a reconnect or with a different pad, only records which buttons are held and triggers nothing.

The status line is an `aria-live="polite"` region, the preview canvas has `role="img"` with a text label, every control has a label, and the layout works down to 390px.

## Storage

- `consolecheat-banner-v1` (localStorage): `{ "schema": "consolecheat-banner", "version": 1, "current": Design, "designs": [{ "name", "savedAt", "design" }] }`. It is created after the first change or save (debounced). Bad JSON, a foreign schema, or another version falls back to the default design and does not crash; single broken designs are skipped and a note is shown.
- JSON export/import uses the same shape without `current`. Import rejects files over 1 MB, invalid JSON, a wrong schema or version, or files without one valid design; single invalid designs are skipped and counted. Imported designs overwrite saved ones with the same name.
- `consolecheat-lang` and `consolecheat-theme` (localStorage, shared with the other consolecheat tools on robfreak.github.io)

The Datenschutz page names the key, says everything stays in the browser, cites Art. 6 Abs. 1 lit. f DSGVO for the host’s connection logs, and has a button that removes only `consolecheat-banner-v1`. Nothing else is stored.

## Run and test

```bash
npm install
npm test        # node --experimental-strip-types --test src/banner/*.test.ts
npm run dev     # http://127.0.0.1:5173/consolecheat-ex19/
npm run build   # typecheck, Vite build (base /consolecheat-ex19/), offline check of dist/
npm run preview # http://127.0.0.1:4173/consolecheat-ex19/
```

Node `>=22.6` (`package.json` `engines`).

## Files

- `index.html`: the HTML entry (Vite input)
- `src/banner/`: React + TypeScript source, styles, and tests
  - `fonts.ts` (bitmap fonts), `layout.ts` (text width/height/wrap and mask), `effects.ts` (gradient, outline, shadow, scanline math), `render.ts` (pure RGBA renderer at the exact export size), `design.ts` (design type, size presets, styles, random style, validation), `history.ts` (undo/redo), `library.ts` (storage, JSON import/export), `gamepad.ts` (`pollPad`), `input.ts` (keyboard)
  - `Generator.tsx` (the tool), `App.tsx`, `chrome.tsx`, `legal.tsx`, `messages.ts` (DE/EN)
  - `tools.ts` and `tool-links.tsx`: the footer list **Weitere Werkzeuge** (keep it identical across the consolecheat repos)
- `public/`: `favicon.svg`, `FONT-OFL.txt`, `.nojekyll`
- `scripts/check-dist.mjs`: offline check of `dist/` (no third-party hosts, no `.woff` fallback, woff2 fonts present)
- `.github/workflows/pages.yml`: test, build, and deploy to `gh-pages`

## Other tools

The footer group **Weitere Werkzeuge** (English: **Other tools**) links to the other consolecheat tools ex1 to ex18 at `https://robfreak.github.io/consolecheat-exN/`, including the [Spiele-Merkliste](https://robfreak.github.io/consolecheat-ex6/), [Button-Mash-Battle](https://robfreak.github.io/consolecheat-ex17/), and [Gaming-Bingo](https://robfreak.github.io/consolecheat-ex18/). This tool (ex19) is left out of its own footer. These are ordinary links. The page does not request those sites.

## GitHub Pages

`.github/workflows/pages.yml` runs install, test, and build on pull requests and on every push. A push to `main` also pushes `dist/` to the orphan branch `gh-pages` (`peaceiris/actions-gh-pages`, Jekyll off). Vite `base` is `/consolecheat-ex19/`, which matches the project site <https://robfreak.github.io/consolecheat-ex19/>.

Enable once in the repository settings:

1. **Settings → Actions → General → Workflow permissions → Read and write permissions.** Save.
2. **Settings → Pages → Build and deployment → Source: Deploy from a branch.** Branch: **`gh-pages`**, folder: **`/ (root)`.** Save.

After that, every push to `main` updates the site.

## Credits

Outfit and Source Sans 3 are bundled from `@fontsource` under the SIL Open Font License; see `public/FONT-OFL.txt` and `THIRD_PARTY_NOTICES.md`. The banner pixel fonts are original to this project.

Replace the Impressum placeholders with the operator’s real details before treating that page as a legal notice.
