# Phase 1a — Foundation

Goal: lay the token groundwork that Phase 1b/1c cleanup tasks will target. No user-visible change at the end of this phase slice.

Read [README.md](README.md) first for the full picture and git policy.

---

## Admin token mapping table (reference for all cleanup tasks)

Every admin cleanup task (1.5–1.22 + admin entries in 1.23) substitutes hardcoded hex values against this table. Keep it open while working.

| Hardcoded value (any case)                              | Replace with                                                                            |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `#f5f5f5` (page bg / button bg)                         | `var(--admin-bg)` if it's the outer container background, else `var(--admin-button-bg)` |
| `#ffffff` / `#fff` (surface)                            | `var(--admin-surface)`                                                                  |
| `#ffffff` / `#fff` (text on colored bg)                 | `var(--admin-text-on-accent)`                                                           |
| `#f0f0f0`                                               | `var(--admin-surface-hover)`                                                            |
| `#f9f9f9`                                               | `var(--admin-surface-hover)`                                                            |
| `#e8e8e8`                                               | `var(--admin-button-hover-bg)`                                                          |
| `#ddd` / `#dddddd` (border)                             | `var(--admin-border)`                                                                   |
| `#ddd` / `#dddddd` (hover bg, e.g. `.stepButton:hover`) | `var(--admin-button-active-bg)`                                                         |
| `#e0e0e0`                                               | `var(--admin-border-light)`                                                             |
| `#ccc` / `#cccccc`                                      | `var(--admin-border-input)`                                                             |
| `#222` / `#222222`                                      | `var(--admin-text)`                                                                     |
| `#333` / `#333333`                                      | `var(--admin-text-strong)`                                                              |
| `#555` / `#555555`                                      | `var(--admin-text-muted)`                                                               |
| `#666` / `#666666`                                      | `var(--admin-text-muted)`                                                               |
| `#888` / `#888888`                                      | `var(--admin-text-hint)`                                                                |
| `#999` / `#999999`                                      | `var(--admin-text-hint)`                                                                |
| `#bbb` / `#bbbbbb`                                      | `var(--admin-text-disabled)`                                                            |
| `#d0d0d0`                                               | `var(--admin-text-disabled)`                                                            |
| `#eef4fb`                                               | `var(--admin-accent-bg-subtle)`                                                         |
| `#d32f2f`                                               | `var(--admin-danger)`                                                                   |
| `#ef5350`                                               | `var(--admin-danger-strong)`                                                            |
| `#e53935`                                               | `var(--admin-danger-hover)`                                                             |
| `#ffebee`                                               | `var(--admin-danger-bg)`                                                                |
| `#c62828`                                               | `var(--admin-danger-text)`                                                              |
| `#c0392b`                                               | `var(--admin-danger-hover)`                                                             |
| `#c8e6c9`                                               | `var(--admin-success-border)`                                                           |
| `#e8f5e9`                                               | `var(--admin-success-bg)`                                                               |
| `#2e7d32`                                               | `var(--admin-success-text)`                                                             |
| `#1565c0`                                               | `var(--admin-info-text)`                                                                |
| `#fff8e1`                                               | `var(--admin-warning-bg)`                                                               |
| `#ffcc02`                                               | `var(--admin-warning-border)`                                                           |
| `#795548`                                               | `var(--admin-warning-text)`                                                             |
| `#b8860b`                                               | `var(--admin-warning-text)`                                                             |
| `rgba(211, 47, 47, 0.05)`                               | `var(--admin-danger-tint)`                                                              |
| `rgba(0, 0, 0, 0.12)`                                   | `var(--admin-shadow-sm)` when used as a box-shadow, else keep                           |
| `rgba(0, 0, 0, 0.2)` (shadow)                           | `var(--admin-shadow-md)` when used as a box-shadow, else keep                           |
| `var(--color-accent)` inside an admin file              | `var(--admin-accent)`                                                                   |
| `var(--color-accent-active)` inside an admin file       | `var(--admin-accent-active)`                                                            |
| `var(--button-radius)` inside an admin file             | `var(--admin-button-radius)`                                                            |

**Exact token values are defined in Task 1.1 below.** If during cleanup you find a hex value not in this table, pause and flag it to the user — do not invent a new token.

---

## Task 1.1 — Rewrite variables.css with admin token set

**Files:**

- Modify: `src/renderer/src/styles/variables.css`

This task removes the themed tokens that currently live in `variables.css` (they will move to `tokens.css` in Task 1.2) and replaces them with the complete non-themed admin palette.

- [ ] **Step 1: Replace variables.css entirely**

Open `src/renderer/src/styles/variables.css` and replace its contents with:

```css
:root {
  /* ── Non-themed infrastructure ───────────────────────────── */
  /* Touch targets */
  --touch-target-min: 48px;
  --touch-target-dialog: 60px;
  --touch-target-primary: 80px;
  --touch-target-admin: 44px;

  /* Z-index layers */
  --z-index-modal: 1000;
  --z-index-dialog: 1100;

  /* Semantic status colors (constant across themes) */
  --color-error: #e74c3c;
  --color-success: #2ecc71;

  /* ── Admin UI palette (fixed — does NOT theme) ──────────── */
  /* Admin surfaces & layout */
  --admin-bg: #f5f5f5;
  --admin-surface: #ffffff;
  --admin-surface-hover: #f0f0f0;
  --admin-border: #dddddd;
  --admin-border-light: #e0e0e0;
  --admin-border-input: #cccccc;

  /* Admin text */
  --admin-text: #222222;
  --admin-text-strong: #333333;
  --admin-text-muted: #555555;
  --admin-text-hint: #888888;
  --admin-text-disabled: #bbbbbb;
  --admin-text-on-accent: #ffffff;

  /* Admin buttons */
  --admin-button-bg: #f5f5f5;
  --admin-button-hover-bg: #e8e8e8;
  --admin-button-active-bg: #dddddd;
  --admin-button-radius: 12px;
  --admin-input-radius: 6px;

  /* Admin accent */
  --admin-accent: #4a90d9;
  --admin-accent-active: #3a7bc8;
  --admin-accent-bg-subtle: #eef4fb;

  /* Admin feedback */
  --admin-danger: #d32f2f;
  --admin-danger-strong: #ef5350;
  --admin-danger-hover: #e53935;
  --admin-danger-bg: #ffebee;
  --admin-danger-text: #c62828;
  --admin-danger-tint: rgba(211, 47, 47, 0.05);

  --admin-success-bg: #e8f5e9;
  --admin-success-text: #2e7d32;
  --admin-success-border: #c8e6c9;

  --admin-info-text: #1565c0;

  --admin-warning-bg: #fff8e1;
  --admin-warning-border: #ffcc02;
  --admin-warning-text: #795548;

  /* Admin shadows */
  --admin-shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.2);
  --admin-shadow-md: 0 2px 8px rgba(0, 0, 0, 0.12);
  --admin-shadow-dialog: 0 8px 24px rgba(0, 0, 0, 0.25);
}
```

- [ ] **Step 2: Verify the build still loads**

Run: `npm run dev`

Expected: app launches without CSS parse errors. The entire user-facing UI will look broken (accent gone, etc.) because nothing references the admin tokens yet **and** the themed tokens are gone. That is expected — Task 1.2 restores the themed tokens under a new name.

Stop the dev server after visually confirming it starts.

- [ ] **Step 3: Commit**

Stop. Tell the user this is ready to commit with suggested message:

```
refactor(theme): introduce admin token set, remove themed tokens from variables.css

Strip themed tokens out of variables.css in preparation for themes/tokens.css.
Add the full --admin-* palette that the admin UI will reference in its
stable, non-themed form.
```

Wait for confirmation before starting Task 1.2.

---

## Task 1.2 — Create tokens.css with themed default values

**Files:**

- Create: `src/renderer/src/themes/tokens.css`
- Modify: `src/renderer/src/styles/global.css`

`tokens.css` is the themed-token contract. Its `:root` block defines **defaults** that match the current look (so the app keeps working until Phase 2 adds the real themes).

- [ ] **Step 1: Create the themes directory and tokens.css**

Run: `mkdir -p src/renderer/src/themes`

Write `src/renderer/src/themes/tokens.css`:

```css
/*
 * Theme token contract.
 *
 * :root defines the default themed token values — used when no
 * data-theme attribute is set. Per-theme overrides live in
 * drugstore.css, artDeco.css, wedding.css and use
 * :root[data-theme="X"] selectors (specificity 0,1,1) to beat
 * the bare :root default regardless of @import order.
 *
 * Non-themed tokens (touch targets, z-indices, error/success,
 * admin palette) live in ../styles/variables.css.
 */
:root {
  /* ── Color tokens ─────────────────────────────────────── */
  --color-bg: #000000;
  --color-surface: #1a1a1a;
  --color-surface-light: #2a2a2a;
  --color-text: #ffffff;
  --color-text-muted: #aaaaaa;
  --color-accent: #4a90d9;
  --color-accent-active: #3a7bc8;
  --color-accent-contrast: #ffffff;
  --color-border: #ffffff;

  /* ── Typography tokens ────────────────────────────────── */
  --font-display: 'Inter', sans-serif;
  --font-body: 'Inter', sans-serif;
  --font-weight-display: 700;
  --letter-spacing-display: 0;

  /* ── Shape tokens ─────────────────────────────────────── */
  --button-radius: 12px;
  --button-border-width: 0;
  --button-border-style: none;
  --button-shadow: none;
  --card-radius: 12px;
  --card-shadow: none;
  --input-radius: 6px;
}
```

- [ ] **Step 2: Update global.css to import tokens.css**

Edit `src/renderer/src/styles/global.css`. Replace line 1 (`@import './variables.css';`) with:

```css
@import './variables.css';
@import '../themes/tokens.css';
```

- [ ] **Step 3: Run the app and verify it visually matches the pre-task state**

Run: `npm run dev`

Walk the home screen, session screen, and an admin section. The UI should look identical to how it looked before Task 1.1 — the themed tokens are restored via their new home.

Stop the dev server.

- [ ] **Step 4: Commit**

Stop. Tell the user this is ready to commit with suggested message:

```
feat(theme): add themes/tokens.css with default themed token contract

Introduces the token contract that the three upcoming themes will
override. Defaults match the current app look so nothing visually
changes yet.
```

Wait for confirmation.

---

## Task 1.3 — Fix the Inter body font bug

**Files:**

- Modify: `src/renderer/src/styles/global.css`

[global.css:37](../../../src/renderer/src/styles/global.css#L37) currently has `body { font-family: sans-serif }`, so the Inter `@font-face` declarations are never applied. Point the body font at the new `--font-body` token instead.

- [ ] **Step 1: Edit global.css**

Change:

```css
body {
  font-family: sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

to:

```css
body {
  font-family: var(--font-body, sans-serif);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

The `sans-serif` fallback only matters for the ~1ms before the stylesheets resolve; once `tokens.css` loads, `--font-body` always has a value.

- [ ] **Step 2: Verify Inter renders on the home screen**

Run: `npm run dev`

Navigate to the home screen. Text should render in Inter (subtly different weight/shape from the previous generic sans-serif). If the DOM inspector shows `font-family: "Inter", sans-serif` on the body element, the fix worked.

Stop the dev server.

- [ ] **Step 3: Commit**

Stop. Tell the user this is ready to commit with suggested message:

```
fix(theme): apply Inter to body via --font-body token

The Inter @font-face declarations loaded but were never applied
because body was set to sans-serif literal. Route the body font
through the new --font-body token so themes can swap it.
```

Wait for confirmation.

---

## Task 1.4 — Add the hardcoded-color guardrail script

**Files:**

- Create: `scripts/check-hardcoded-colors.sh`

A shell script that greps all user-facing `.module.css` files for stray hex values and fails if any appear outside a small whitelist. Run it locally before declaring Phase 1 cleanup done (Task 1.24) and whenever a new themed CSS module is added.

The whitelist covers genuinely functional hardcoded values that should _not_ theme:

- `FlashOverlay.module.css` — pure white `#ffffff` flash is an intentional on-camera effect, not a theme color.
- Any `rgba(0, 0, 0, *)` used as a backdrop/overlay — overlays are darkening effects and stay hardcoded.
- Any `rgba(255, 255, 255, *)` used as a highlight/semi-transparent overlay.

- [ ] **Step 1: Create the script**

Run: `mkdir -p scripts`

Write `scripts/check-hardcoded-colors.sh`:

```bash
#!/usr/bin/env bash
#
# Guardrail: fail if any themed (user-facing) .module.css file contains a
# hardcoded hex color outside the whitelist.
#
# Usage: ./scripts/check-hardcoded-colors.sh
#
# This script enforces the rule that themed files must reference CSS
# custom properties from src/renderer/src/themes/tokens.css instead of
# hex literals. Admin files (under AdminScreen/ and components/admin/)
# are exempt — they use the stable --admin-* palette and are not checked.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Themed modules = everything under src/renderer/src/**/*.module.css
# EXCEPT files under screens/AdminScreen/ or components/admin/.
FILES=$(find src/renderer/src -name '*.module.css' \
  ! -path '*/screens/AdminScreen/*' \
  ! -path '*/components/admin/*')

# Files explicitly whitelisted (functional hardcoded colors).
WHITELIST=(
  "src/renderer/src/components/FlashOverlay/FlashOverlay.module.css"
)

is_whitelisted() {
  local f="$1"
  for w in "${WHITELIST[@]}"; do
    [[ "$f" == "$w" ]] && return 0
  done
  return 1
}

violations=0
for f in $FILES; do
  if is_whitelisted "$f"; then
    continue
  fi
  # Match #rgb, #rrggbb, #rrggbbaa anywhere in the file.
  if matches=$(grep -n -E '#[0-9a-fA-F]{3,8}\b' "$f"); then
    echo "❌ Hardcoded hex in $f:"
    echo "$matches" | sed 's/^/    /'
    violations=$((violations + 1))
  fi
done

if [[ $violations -gt 0 ]]; then
  echo ""
  echo "Found hardcoded hex colors in $violations themed module(s)."
  echo "Replace them with references to tokens from src/renderer/src/themes/tokens.css,"
  echo "or add the file to the WHITELIST if the color is intentionally static."
  exit 1
fi

echo "✓ No hardcoded hex colors in themed modules."
```

- [ ] **Step 2: Make it executable**

Run: `chmod +x scripts/check-hardcoded-colors.sh`

- [ ] **Step 3: Run the script to establish baseline**

Run: `./scripts/check-hardcoded-colors.sh`

Expected: the script **fails** with a long list of violations across the themed modules that Phase 1b/1c will clean up. That's correct — the point of the script is to start failing now so we can verify "green" at the end of Phase 1 (Task 1.24).

- [ ] **Step 4: Commit**

Stop. Tell the user this is ready to commit with suggested message:

```
build(theme): add hardcoded-color guardrail script

scripts/check-hardcoded-colors.sh greps themed .module.css files
for hex literals and fails if any appear outside the whitelist.
Currently failing — Phase 1b/1c cleanup tasks will bring it green.
```

Wait for confirmation.

---

Phase 1a complete. Proceed to [phase-1b-cleanup-heavy.md](phase-1b-cleanup-heavy.md).
