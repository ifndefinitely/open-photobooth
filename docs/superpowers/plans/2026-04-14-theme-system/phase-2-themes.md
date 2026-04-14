# Phase 2 — Themes

Goal: author the three actual themes (Drugstore, Art Deco, Elegant Wedding), bundle the six display/body font families, and wire everything up so setting `data-theme` on `<html>` in DevTools flips the app between themes live.

Read [README.md](README.md) first for the full picture and git policy. Phase 1 must be complete before starting Phase 2 — the guardrail script (Task 1.4) should be passing.

---

## Task 2.1 — Download and bundle the six theme fonts

**Files:**

- Create: `src/renderer/src/assets/fonts/AlfaSlabOne-Regular.ttf`
- Create: `src/renderer/src/assets/fonts/RobotoSlab-Regular.ttf`
- Create: `src/renderer/src/assets/fonts/RobotoSlab-Bold.ttf`
- Create: `src/renderer/src/assets/fonts/Limelight-Regular.ttf`
- Create: `src/renderer/src/assets/fonts/Jost-Regular.ttf`
- Create: `src/renderer/src/assets/fonts/Jost-Bold.ttf`
- Create: `src/renderer/src/assets/fonts/PlayfairDisplay-Regular.ttf`
- Create: `src/renderer/src/assets/fonts/PlayfairDisplay-Bold.ttf`
- Create: `src/renderer/src/assets/fonts/Lato-Regular.ttf`
- Create: `src/renderer/src/assets/fonts/Lato-Bold.ttf`
- Create: `src/renderer/src/assets/fonts/LICENSES.md`

All six font families are hosted in the [google/fonts](https://github.com/google/fonts) GitHub repo under `ofl/<family>/`. They're SIL OFL 1.1 licensed, which is compatible with AGPL-3.0 redistribution — we bundle them locally, commit them to the repo, and include the license texts.

**Why a single task, not six:** each download is a one-liner and they're truly independent. Batching keeps the plan length reasonable.

- [ ] **Step 1: Download all 10 font files**

Run the following from the project root. Each `curl -L` follows GitHub's redirect to the raw file.

```bash
cd src/renderer/src/assets/fonts

curl -L -o AlfaSlabOne-Regular.ttf \
  https://github.com/google/fonts/raw/main/ofl/alfaslabone/AlfaSlabOne-Regular.ttf

curl -L -o RobotoSlab-Regular.ttf \
  https://github.com/google/fonts/raw/main/ofl/robotoslab/static/RobotoSlab-Regular.ttf
curl -L -o RobotoSlab-Bold.ttf \
  https://github.com/google/fonts/raw/main/ofl/robotoslab/static/RobotoSlab-Bold.ttf

curl -L -o Limelight-Regular.ttf \
  https://github.com/google/fonts/raw/main/ofl/limelight/Limelight-Regular.ttf

curl -L -o Jost-Regular.ttf \
  https://github.com/google/fonts/raw/main/ofl/jost/static/Jost-Regular.ttf
curl -L -o Jost-Bold.ttf \
  https://github.com/google/fonts/raw/main/ofl/jost/static/Jost-Bold.ttf

curl -L -o PlayfairDisplay-Regular.ttf \
  https://github.com/google/fonts/raw/main/ofl/playfairdisplay/static/PlayfairDisplay-Regular.ttf
curl -L -o PlayfairDisplay-Bold.ttf \
  https://github.com/google/fonts/raw/main/ofl/playfairdisplay/static/PlayfairDisplay-Bold.ttf

curl -L -o Lato-Regular.ttf \
  https://github.com/google/fonts/raw/main/ofl/lato/Lato-Regular.ttf
curl -L -o Lato-Bold.ttf \
  https://github.com/google/fonts/raw/main/ofl/lato/Lato-Bold.ttf

cd -
```

- [ ] **Step 2: Sanity-check the downloads**

Run: `ls -lh src/renderer/src/assets/fonts/*.ttf`

Expected: 11 files listed (the new 10 + the existing `Inter-Regular.ttf` and `Inter-Bold.ttf` — actually 12 files). Every file size is non-trivial (50 KB–400 KB range). If any file is <5 KB, the download failed (GitHub returned an HTML error page); re-run the failing line.

Also run: `file src/renderer/src/assets/fonts/AlfaSlabOne-Regular.ttf`

Expected output contains `TrueType Font data`. Any other output (especially `HTML document`) means the download is broken — re-run.

If a path on `main` has moved (Google fonts repo reorganizes occasionally), the download will 404 quietly into a small HTML file. In that case, pause and tell the user — do not invent a new URL; ask the user to locate the correct path.

- [ ] **Step 3: Create LICENSES.md**

Each font's upstream repository has an `OFL.txt` file next to the font files. The text is identical except for the copyright line. Rather than embedding all six full license texts, write a concise `LICENSES.md` that lists each family, its copyright holder, and a reference link.

Write `src/renderer/src/assets/fonts/LICENSES.md`:

```markdown
# Bundled Fonts — Licensing

All fonts in this directory are licensed under the **SIL Open Font License, Version 1.1** (SIL OFL 1.1). This license permits redistribution under AGPL-3.0 (the project's license), including within bundled binaries, provided the license text is distributed alongside the fonts.

The full SIL OFL 1.1 text is available at: https://openfontlicense.org/open-font-license-official-text/

Each font's upstream repository also contains the same license text in an `OFL.txt` file.

---

## Inter

- **Family:** Inter
- **Files:** `Inter-Regular.ttf`, `Inter-Bold.ttf`
- **Copyright:** Copyright 2020 The Inter Project Authors (https://github.com/rsms/inter)
- **Upstream:** https://github.com/rsms/inter
- **License file:** https://github.com/rsms/inter/blob/master/LICENSE.txt

## Alfa Slab One

- **Family:** Alfa Slab One
- **Files:** `AlfaSlabOne-Regular.ttf`
- **Copyright:** Copyright 2011 The Alfa Slab One Project Authors (https://github.com/googlefonts/alfaslabone)
- **Upstream:** https://github.com/googlefonts/alfaslabone
- **License file:** https://github.com/google/fonts/blob/main/ofl/alfaslabone/OFL.txt

## Roboto Slab

- **Family:** Roboto Slab
- **Files:** `RobotoSlab-Regular.ttf`, `RobotoSlab-Bold.ttf`
- **Copyright:** Copyright 2011 The Roboto Slab Project Authors (https://github.com/googlefonts/robotoslab)
- **Upstream:** https://github.com/googlefonts/robotoslab
- **License file:** https://github.com/google/fonts/blob/main/ofl/robotoslab/OFL.txt

## Limelight

- **Family:** Limelight
- **Files:** `Limelight-Regular.ttf`
- **Copyright:** Copyright (c) 2011 Ascender Fonts (www.ascenderfonts.com)
- **Upstream:** https://github.com/google/fonts/tree/main/ofl/limelight
- **License file:** https://github.com/google/fonts/blob/main/ofl/limelight/OFL.txt

## Jost

- **Family:** Jost
- **Files:** `Jost-Regular.ttf`, `Jost-Bold.ttf`
- **Copyright:** Copyright 2020 The Jost Project Authors (https://github.com/indestructible-type/Jost)
- **Upstream:** https://github.com/indestructible-type/Jost
- **License file:** https://github.com/google/fonts/blob/main/ofl/jost/OFL.txt

## Playfair Display

- **Family:** Playfair Display
- **Files:** `PlayfairDisplay-Regular.ttf`, `PlayfairDisplay-Bold.ttf`
- **Copyright:** Copyright 2017 The Playfair Display Project Authors (https://github.com/clauseggers/Playfair-Display)
- **Upstream:** https://github.com/clauseggers/Playfair-Display
- **License file:** https://github.com/google/fonts/blob/main/ofl/playfairdisplay/OFL.txt

## Lato

- **Family:** Lato
- **Files:** `Lato-Regular.ttf`, `Lato-Bold.ttf`
- **Copyright:** Copyright 2010-2014 by tyPoland Lukasz Dziedzic (www.latofonts.com)
- **Upstream:** https://www.latofonts.com/
- **License file:** https://github.com/google/fonts/blob/main/ofl/lato/OFL.txt
```

- [ ] **Step 4: Commit**

Stop. Tell the user this is ready to commit with suggested message:

```
feat(theme): bundle SIL OFL fonts for three theme presets

Adds 10 new .ttf files (Alfa Slab One, Roboto Slab R/B, Limelight,
Jost R/B, Playfair Display R/B, Lato R/B) under assets/fonts/ plus
LICENSES.md documenting each family's SIL OFL copyright and upstream.
Fonts are bundled locally per the fully-offline constraint — no CDN.
```

Wait for confirmation before starting Task 2.2.

---

## Task 2.2 — Register the new fonts via @font-face

**Files:**

- Modify: `src/renderer/src/styles/global.css`

The six new families need `@font-face` declarations so CSS `font-family: 'Alfa Slab One'` resolves to the bundled file.

- [ ] **Step 1: Edit global.css**

Open `src/renderer/src/styles/global.css`. After the existing Inter `@font-face` declarations (end of current line 17) and **before** the `*, *::before, *::after` rule, insert the 10 new declarations.

After edit, the top of the file (through the `@font-face` block) should read:

```css
@import './variables.css';
@import '../themes/tokens.css';

@font-face {
  font-family: 'Inter';
  font-weight: 400;
  font-style: normal;
  src: url('../assets/fonts/Inter-Regular.ttf') format('truetype');
  font-display: swap;
}

@font-face {
  font-family: 'Inter';
  font-weight: 700;
  font-style: normal;
  src: url('../assets/fonts/Inter-Bold.ttf') format('truetype');
  font-display: swap;
}

@font-face {
  font-family: 'Alfa Slab One';
  font-weight: 400;
  font-style: normal;
  src: url('../assets/fonts/AlfaSlabOne-Regular.ttf') format('truetype');
  font-display: swap;
}

@font-face {
  font-family: 'Roboto Slab';
  font-weight: 400;
  font-style: normal;
  src: url('../assets/fonts/RobotoSlab-Regular.ttf') format('truetype');
  font-display: swap;
}

@font-face {
  font-family: 'Roboto Slab';
  font-weight: 700;
  font-style: normal;
  src: url('../assets/fonts/RobotoSlab-Bold.ttf') format('truetype');
  font-display: swap;
}

@font-face {
  font-family: 'Limelight';
  font-weight: 400;
  font-style: normal;
  src: url('../assets/fonts/Limelight-Regular.ttf') format('truetype');
  font-display: swap;
}

@font-face {
  font-family: 'Jost';
  font-weight: 400;
  font-style: normal;
  src: url('../assets/fonts/Jost-Regular.ttf') format('truetype');
  font-display: swap;
}

@font-face {
  font-family: 'Jost';
  font-weight: 700;
  font-style: normal;
  src: url('../assets/fonts/Jost-Bold.ttf') format('truetype');
  font-display: swap;
}

@font-face {
  font-family: 'Playfair Display';
  font-weight: 400;
  font-style: normal;
  src: url('../assets/fonts/PlayfairDisplay-Regular.ttf') format('truetype');
  font-display: swap;
}

@font-face {
  font-family: 'Playfair Display';
  font-weight: 700;
  font-style: normal;
  src: url('../assets/fonts/PlayfairDisplay-Bold.ttf') format('truetype');
  font-display: swap;
}

@font-face {
  font-family: 'Lato';
  font-weight: 400;
  font-style: normal;
  src: url('../assets/fonts/Lato-Regular.ttf') format('truetype');
  font-display: swap;
}

@font-face {
  font-family: 'Lato';
  font-weight: 700;
  font-style: normal;
  src: url('../assets/fonts/Lato-Bold.ttf') format('truetype');
  font-display: swap;
}
```

Do not touch the `*, *::before, *::after`, `html, body, #root`, or `body` rules below — they stay exactly as Task 1.3 left them.

- [ ] **Step 2: Verify all fonts load**

Run: `npm run dev`

Open DevTools → Network tab and filter by `.ttf`. Hard-refresh the renderer. Expected: all 12 `.ttf` files load with 200 status and no 404s. If any file 404s, the download in Task 2.1 likely failed silently.

Also open DevTools → Console and run:

```js
document.fonts.ready.then(() => {
  console.log([...document.fonts].map((f) => `${f.family} ${f.weight} → ${f.status}`))
})
```

Expected output lists all 12 faces with status `loaded`.

Stop the dev server.

- [ ] **Step 3: Commit**

Stop. Tell the user this is ready to commit with suggested message:

```
feat(theme): register theme fonts via @font-face

Adds 10 @font-face declarations in global.css covering the
Alfa Slab One, Roboto Slab, Limelight, Jost, Playfair Display,
and Lato families. Themes added in the next tasks will reference
these family names through --font-display / --font-body tokens.
```

Wait for confirmation.

---

## Task 2.3 — Author drugstore.css

**Files:**

- Create: `src/renderer/src/themes/drugstore.css`

Drugstore is the default theme — 1950s carnival photobooth, warm, loud, poster-y. Values come directly from the spec §5.1.

- [ ] **Step 1: Write the file**

Write `src/renderer/src/themes/drugstore.css`:

```css
/*
 * Drugstore theme — 1950s carnival photobooth.
 * Warm, loud, poster-y. Carnival red accent on warm near-black background.
 * Typography: Alfa Slab One display + Roboto Slab body.
 * Shape: hard retro offsets, solid cream borders.
 *
 * Values sourced from docs/superpowers/specs/2026-04-14-theme-system-design.md §5.1.
 */
:root[data-theme='drugstore'] {
  /* ── Colors ──────────────────────────────────────────── */
  --color-bg: #1a1210;
  --color-surface: #2a1a15;
  --color-surface-light: #3a241f;
  --color-text: #faf3e7;
  --color-text-muted: #c4b098;
  --color-accent: #d32f2f;
  --color-accent-active: #a82323;
  --color-accent-contrast: #faf3e7;
  --color-border: #faf3e7;
  --color-accent-glow: rgba(211, 47, 47, 0.25);

  /* ── Typography ──────────────────────────────────────── */
  --font-display: 'Alfa Slab One', serif;
  --font-body: 'Roboto Slab', serif;
  --font-weight-display: 400;
  --letter-spacing-display: -0.01em;

  /* ── Shape ───────────────────────────────────────────── */
  --button-radius: 8px;
  --button-border-width: 3px;
  --button-border-style: solid;
  --button-shadow: 4px 4px 0 rgba(0, 0, 0, 0.5);
  --card-radius: 4px;
  --card-shadow: 6px 6px 0 rgba(0, 0, 0, 0.4);
  --input-radius: 4px;
}
```

Note: `--color-accent-glow` is set to match the accent (added in Task 1.18 to tokens.css), so the PrintScreen focus ring tints correctly in each theme.

- [ ] **Step 2: Commit**

Stop. Tell the user this is ready to commit with suggested message:

```
feat(theme): add Drugstore theme (1950s carnival photobooth)

Warm near-black background with carnival red accent, cream text,
Alfa Slab One display over Roboto Slab body, and hard retro offset
shadows. Scoped to :root[data-theme="drugstore"]. Not yet imported
from global.css — that happens in Task 2.6.
```

Wait for confirmation.

---

## Task 2.4 — Author artDeco.css

**Files:**

- Create: `src/renderer/src/themes/artDeco.css`

Art Deco is the second theme — 1920s Gatsby glamour, sharp, architectural, gold and black. Values come from spec §5.2.

- [ ] **Step 1: Write the file**

Write `src/renderer/src/themes/artDeco.css`:

```css
/*
 * Art Deco theme — 1920s Gatsby glamour.
 * Rich black background with antique gold accent, ivory text.
 * Typography: Limelight display + Jost body, wide deco tracking.
 * Shape: sharp rectangles, flat (no shadows), thin gold borders.
 *
 * Values sourced from docs/superpowers/specs/2026-04-14-theme-system-design.md §5.2.
 */
:root[data-theme='artDeco'] {
  /* ── Colors ──────────────────────────────────────────── */
  --color-bg: #0a0908;
  --color-surface: #141210;
  --color-surface-light: #1f1b15;
  --color-text: #f6f0e4;
  --color-text-muted: #9b8c6e;
  --color-accent: #c9a646;
  --color-accent-active: #a68734;
  --color-accent-contrast: #0a0908;
  --color-border: #c9a646;
  --color-accent-glow: rgba(201, 166, 70, 0.3);

  /* ── Typography ──────────────────────────────────────── */
  --font-display: 'Limelight', serif;
  --font-body: 'Jost', sans-serif;
  --font-weight-display: 400;
  --letter-spacing-display: 0.15em;

  /* ── Shape ───────────────────────────────────────────── */
  --button-radius: 0;
  --button-border-width: 2px;
  --button-border-style: solid;
  --button-shadow: none;
  --card-radius: 0;
  --card-shadow: none;
  --input-radius: 0;
}
```

- [ ] **Step 2: Commit**

Stop. Tell the user this is ready to commit with suggested message:

```
feat(theme): add Art Deco theme (1920s Gatsby glamour)

Rich black with antique gold accent, ivory text, Limelight display
over Jost body, wide 0.15em tracking, sharp-edged buttons and cards,
no shadows. Scoped to :root[data-theme="artDeco"]. Imported in 2.6.
```

Wait for confirmation.

---

## Task 2.5 — Author wedding.css

**Files:**

- Create: `src/renderer/src/themes/wedding.css`

Wedding is the third theme and the **only light theme**. This means any leftover hardcoded `#fff` / `#ffffff` in themed CSS modules will render as white-on-ivory (invisible). Phase 1 cleanup should have caught those; if the verification gate in Task 2.7 reveals any, fix them there before declaring Phase 2 done.

Values come from spec §5.3.

- [ ] **Step 1: Write the file**

Write `src/renderer/src/themes/wedding.css`:

```css
/*
 * Elegant Wedding theme — refined, timeless, the ONLY light theme.
 * Warm ivory background with deep-charcoal accent, soft shadows.
 * Typography: Playfair Display display + Lato body.
 * Shape: pill buttons (999px), rounded cards, soft drop shadows.
 *
 * Because this is the only light theme, any hardcoded #fff text in
 * themed CSS modules becomes invisible here — Phase 1 cleanup removes
 * those, and Task 2.7 walks every screen to verify no regressions.
 *
 * Values sourced from docs/superpowers/specs/2026-04-14-theme-system-design.md §5.3.
 */
:root[data-theme='wedding'] {
  /* ── Colors ──────────────────────────────────────────── */
  --color-bg: #f4efe6;
  --color-surface: #ffffff;
  --color-surface-light: #faf7f0;
  --color-text: #2a2622;
  --color-text-muted: #6e6760;
  --color-accent: #3a3532;
  --color-accent-active: #1a1614;
  --color-accent-contrast: #ffffff;
  --color-border: #d4c9b8;
  --color-accent-glow: rgba(58, 53, 50, 0.2);

  /* ── Typography ──────────────────────────────────────── */
  --font-display: 'Playfair Display', serif;
  --font-body: 'Lato', sans-serif;
  --font-weight-display: 700;
  --letter-spacing-display: 0;

  /* ── Shape ───────────────────────────────────────────── */
  --button-radius: 999px;
  --button-border-width: 0;
  --button-border-style: none;
  --button-shadow: 0 4px 12px rgba(42, 38, 34, 0.15);
  --card-radius: 12px;
  --card-shadow: 0 2px 8px rgba(42, 38, 34, 0.08);
  --input-radius: 8px;
}
```

- [ ] **Step 2: Commit**

Stop. Tell the user this is ready to commit with suggested message:

```
feat(theme): add Elegant Wedding theme (light, refined)

Warm ivory background with deep charcoal accent, Playfair Display
display over Lato body, pill buttons, rounded cards, soft drop
shadows. The only light theme — verification walkthrough in 2.7
specifically stress-tests it for white-on-ivory invisibility bugs.
```

Wait for confirmation.

---

## Task 2.6 — Import theme files from global.css

**Files:**

- Modify: `src/renderer/src/styles/global.css`

The three theme files exist but nothing loads them yet. `global.css` needs to `@import` all three after `tokens.css`.

**Why import order matters:** `:root[data-theme="X"]` has specificity (0, 1, 1), higher than the bare `:root` (0, 0, 1) in `tokens.css`. That means the themes win regardless of source order. However, if two theme files somehow defined the same `data-theme`, the later import would win — our three files are disjoint so this is a non-issue, but worth keeping in mind if a future theme accidentally duplicates a selector.

- [ ] **Step 1: Edit global.css**

Edit the top of `src/renderer/src/styles/global.css`. Change:

```css
@import './variables.css';
@import '../themes/tokens.css';
```

to:

```css
@import './variables.css';
@import '../themes/tokens.css';
@import '../themes/drugstore.css';
@import '../themes/artDeco.css';
@import '../themes/wedding.css';
```

Nothing else in `global.css` changes.

- [ ] **Step 2: Verify the default view still matches pre-Phase-2 look**

Run: `npm run dev`

With no `data-theme` attribute set on `<html>`, the app should look exactly like it did at the end of Phase 1 — the bare `:root` defaults in `tokens.css` still apply. Visit Home and the Admin shell to confirm nothing visually regressed.

Stop the dev server.

- [ ] **Step 3: Commit**

Stop. Tell the user this is ready to commit with suggested message:

```
feat(theme): import three theme files from global.css

Loads drugstore.css, artDeco.css, and wedding.css after tokens.css.
With no data-theme attribute on <html>, the default tokens still
apply — no visual change. Next step: setting the attribute in
DevTools will flip the whole UI between themes.
```

Wait for confirmation.

---

## Task 2.7 — Phase 2 verification gate (DevTools walkthrough)

**Files:** none (manual verification only)

This is the Phase 2 exit criterion. All three themes must render correctly across every user-facing screen before moving to Phase 3.

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`

Leave it running for the whole walkthrough. Open DevTools.

- [ ] **Step 2: Prepare a theme-switch snippet**

Paste this into DevTools Console once, so you can flip themes quickly:

```js
const setTheme = (t) =>
  t
    ? document.documentElement.setAttribute('data-theme', t)
    : document.documentElement.removeAttribute('data-theme')
```

You'll call `setTheme('drugstore')`, `setTheme('artDeco')`, `setTheme('wedding')`, or `setTheme()` to clear.

- [ ] **Step 3: Walk every user-facing screen in Drugstore**

Run: `setTheme('drugstore')`

Visit each screen in turn and check visually. For each screen, confirm:

- Background is warm near-black (`#1a1210`) — not the default black.
- Primary buttons are carnival red with cream borders and a hard offset shadow.
- Headings render in **Alfa Slab One** (chunky slab display).
- Body text renders in **Roboto Slab**.

Screens:

- **HomeScreen** — enter admin to start, exit back out. Background, heading, take-photo button all themed.
- **SessionScreen** — start a session, watch countdown + flash + photo progress. PhotoProgress dots use accent.
- **ReviewScreen** — after session, the strip preview + filter selector.
- **PrintScreen** — click "Print". Confirmation buttons themed.
- **ThankYouScreen** — after print.
- **ErrorScreen** — trigger an error (disconnect camera mid-session, or cancel print after submit).
- **PinDialog** — via admin gesture from Home. Number pad themed.
- **ConfirmationDialog** — shown on idle timeout or print cancellation.

- [ ] **Step 4: Walk every screen in Art Deco**

Run: `setTheme('artDeco')`

Repeat the walk. Confirm:

- Background is deep black (`#0a0908`).
- Buttons are flat sharp rectangles with antique gold borders (no radius, no shadow).
- Headings render in **Limelight** with wide tracking (0.15em).
- Body text renders in **Jost**.
- Gold on black contrast feels architectural rather than decorative.

- [ ] **Step 5: Walk every screen in Wedding (LIGHT THEME STRESS TEST)**

Run: `setTheme('wedding')`

Walk every screen from Step 3 **in order**. This is the critical test — any hardcoded `#fff` text in a themed module will render white-on-ivory and be invisible.

For each screen, actively look for:

- **Invisible text:** labels/buttons/headings that appear blank. Read every piece of text out loud to yourself.
- **Invisible borders:** white borders on white cards.
- **Invisible icons:** stroke or fill that's hardcoded white.
- **Ghost buttons:** pill shapes that should be charcoal but appear ivory-on-ivory.

Also confirm the positives:

- Background is warm ivory (`#f4efe6`), not pure white.
- Cards (surfaces) are pure white with soft drop shadows (`0 2px 8px rgba(42,38,34,0.08)`).
- Buttons are pills (fully rounded, 999px radius).
- Accent is deep charcoal, not a bright color.
- Headings render in **Playfair Display** bold (serif with contrast).
- Body text renders in **Lato**.

If any regression is found (invisible text, wrong color, wrong font, wrong shape), **stop the walkthrough**, fix the underlying CSS module (find the rule, replace the hardcoded value with the appropriate token), restart the dev server, and resume from the start of Step 5.

- [ ] **Step 6: Clear the attribute and confirm default still works**

Run: `setTheme()`

Expected: snaps back to the Phase 1 default look (dark background, Inter font, blue accent). No visual glitches mid-transition.

- [ ] **Step 7: Stop the dev server**

Only after Steps 3–6 all pass with zero regressions.

- [ ] **Step 8: Commit (or non-commit if no code changed)**

This task is verification-only and usually produces no file changes. If the walkthrough surfaced regressions that you fixed, the fix itself is a separate small commit — tell the user with a message like:

```
fix(theme): replace hardcoded <color> in <file> with <token>

Surfaced by Phase 2 wedding-theme walkthrough (Task 2.7): the
<selector> rule in <file> rendered white-on-ivory in the light theme
because it referenced <hex> directly instead of var(<token>).
```

If no regressions were found, there is nothing to commit. Just tell the user:

```
Phase 2 verification gate passed. No code changes produced —
ready to move to Phase 3 (admin UX & settings integration).
```

---

Phase 2 complete. Proceed to [phase-3-admin-ux.md](phase-3-admin-ux.md).
