# Epic 05: Photo Strip Composition & Filters

## Description

Compose the captured photos into a classic photobooth strip layout, apply optional color filters, add customizable branding (logo, event name, date), and generate the final print-ready image. The strip is a vertical arrangement of N photos with optional decorative elements.

**Dependencies:** Epic 04 (Photos must be captured and available in memory). Partially depends on Epic 07 (admin settings for appearance customization) — can be built with sensible defaults first and wired to settings later.

---

## Stories

### Story 5.1: Compose Basic Photo Strip

> As a user, I want my photos assembled into a vertical photobooth strip so that I get the classic photobooth look.

**Acceptance Criteria:**

- A strip composition service/function takes an array of N photo images and produces a single strip image.
- The strip layout is vertical: photos stacked top-to-bottom in capture order.
- Each photo has equal dimensions within the strip.
- Photos maintain their aspect ratio — if the photo aspect ratio does not match the slot, crop to fit (centered crop).
- The strip has padding between photos (default: 10px at 300 DPI equivalent, configurable later).
- The output is a high-resolution image suitable for printing (at least 300 DPI equivalent for a 2" × 6" strip = ~600 × 1800 pixels minimum).
- The output format is PNG (lossless) for print quality.
- The strip background color is configurable (default: white, read from settings `appearance.backgroundColor`).

**Notes:**

- The exact pixel dimensions depend on the target print paper size. For a 4×6" sheet at 300 DPI = 1200×1800 pixels. Each strip is half: 600×1800 pixels. With 4 photos, each photo slot is approximately 600×420 pixels (leaving room for branding).

---

### Story 5.2: Add Branding to Photo Strip

> As an admin, I want to add a logo, event name, and date stamp to the strip so that it serves as an event memento.

**Acceptance Criteria:**

- The strip composition supports these optional branding elements:
  - **Logo:** An image file (PNG, JPG) displayed at the top or bottom of the strip.
    - Admin uploads the file via the Appearance settings (file path stored in `appearance.logoPath`).
    - Scaled to fit the strip width while maintaining aspect ratio.
    - Maximum height: 15% of total strip height.
    - Position: bottom of strip (below the last photo).
  - **Event name:** Text displayed below the last photo (or above the logo if both exist).
    - Admin configures the text in `appearance.eventName`.
    - Font: a clean, readable font bundled with the app.
    - Font size auto-scales to fit the strip width with padding.
    - Text color auto-contrasts against the background color (dark text on light background, light text on dark background) or is configurable.
  - **Date stamp:** The current date rendered on the strip.
    - Format configurable: "February 13, 2026", "13-02-2026", "2026-02-13" (setting: `appearance.dateStampFormat`).
    - Toggleable on/off (`appearance.dateStampEnabled`).
    - Smaller font size than event name.
    - Position: below event name or at the very bottom.
- Each element can be independently enabled/disabled (logo by presence of file, event name by non-empty text, date by toggle).
- If no branding elements are configured, the strip is just the photos + background.

---

### Story 5.3: Apply Strip Styling (Border, Background)

> As an admin, I want to customize the strip border and background color so that the strip matches the event theme.

**Acceptance Criteria:**

- Admin settings provide (in the Appearance section):
  - **Background color:** Color picker. Default: white (`#FFFFFF`). Setting: `appearance.backgroundColor`.
  - **Border color:** Color picker. Default: black (`#000000`). Setting: `appearance.borderColor`.
  - **Border style:** Dropdown — none, solid, dashed, double. Default: none. Setting: `appearance.borderStyle`.
  - **Border width:** Slider 0–20px. Default: 0 (no border). Setting: `appearance.borderWidth`.
- The background color fills the entire strip canvas, including the padding areas between photos and around branding.
- The border is drawn around each individual photo within the strip (not around the entire strip).
- When border style is "none" or border width is 0, no border is drawn.

---

### Story 5.4: Generate Print-Ready Strip Sheet (2-Up Layout)

> As a developer, I want to generate a print-ready image with two identical strips side-by-side so that one print produces two copies.

**Acceptance Criteria:**

- A function takes a single strip image and produces a "2-up" layout: two identical strips placed side-by-side on a canvas matching the print paper size.
- The paper size is configurable (default: 4×6 inches at 300 DPI = 1200×1800 pixels). Setting: `printer.paperSize`.
- Strips are centered on the paper with equal margins on all sides.
- A small optional cut guide (dashed, light gray, 1px line) is drawn between the two strips to indicate where to cut/tear.
- The output is a high-resolution image suitable for direct printing (PNG or high-quality JPEG, quality >= 0.95).
- If the paper orientation needs to be landscape for the strips to fit better, the layout rotates accordingly.

**Edge Cases:**

- If the strip aspect ratio does not perfectly match half the paper width, add white space symmetrically.
- For very short strips (e.g., 1–2 photos, no branding), scale the strip up to use more of the paper area, maintaining aspect ratio.
- For very tall strips (e.g., 6 photos + full branding), scale down to fit within the paper height.

---

### Story 5.5: Implement Basic Color Filters

> As a user, I want to optionally apply a color filter to my photos so that I can get a fun stylized look.

**Acceptance Criteria:**

- Three filter options are available (plus "no filter"):
  - **None** (original color) — default.
  - **Black & White:** Full desaturation (grayscale).
  - **Sepia:** Warm brownish tone (desaturate, then apply warm color overlay).
  - **Vintage:** Slightly faded, warm tint, reduced contrast, subtle vignette.
- The filter is applied uniformly to ALL photos in the strip (not per-photo selection).
- The filter selection UI appears on the Review screen (before printing), shown as tappable option buttons with small preview thumbnails showing what each filter looks like.
- Selecting a filter updates the strip preview on the Review screen in real-time (or near-real-time — under 1 second for re-composition).
- The filter is applied to the high-resolution images used for strip composition and printing (not just a CSS preview effect).
- The user can change their mind before printing — switching filters regenerates the strip.
- Each filter can be individually enabled/disabled by the admin (settings: `filters.blackAndWhite`, `filters.sepia`, `filters.vintage`).
- If all filters are disabled (or the master toggle `filters.enabled` is off), the filter selection UI is hidden entirely on the Review screen.

---

### Story 5.6: Display Strip Preview on Review Screen

> As a user, I want to see a preview of my assembled photo strip on the Review screen so that I know what will be printed.

**Acceptance Criteria:**

- The Review screen displays the composed strip (output of Stories 5.1 + 5.2 + 5.3).
- The strip is displayed at a size that fits the screen while maintaining aspect ratio (centered, with padding).
- The strip preview updates when a different filter is applied (Story 5.5).
- Below or beside the strip, action buttons are displayed: **Print**, **Redo**, **Abort**.
- If filter options are enabled, filter selection buttons appear above or beside the strip preview.
- The strip is generated asynchronously — show a brief loading spinner/skeleton if composition takes noticeable time (> 200ms).
- All buttons are large enough for tablet use (minimum 48px height, primary action buttons larger).
- Button labels come from the i18n system (hardcoded English initially, wired in Epic 10).
