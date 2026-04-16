# Epic 10: Internationalization (English & Dutch)

## Description

Implement internationalization support so that all user-facing text can be displayed in English or Dutch. The admin interface remains English-only. All user-facing strings are externalized into translation files.

**Dependencies:** Epic 02 (All user-facing screens must exist). Epic 07 (Language setting must be configurable).

---

## Stories

### Story 10.1: Set Up i18n Infrastructure

> As a developer, I want an i18n system that loads translations from structured files and provides a translation function so that UI text is never hardcoded.

**Acceptance Criteria:**

- An i18n service/module exists with:
  - `t(key)`: Returns the translated string for the current locale. Example: `t("home.takePhotos")` → "Take Photos".
  - `t(key, params)`: Supports interpolation. Example: `t("session.photoProgress", { current: 2, total: 4 })` → "Photo 2 of 4".
  - `setLocale(locale)`: Switches the active language ("en" or "nl").
  - `getLocale()`: Returns the current locale string.
- Translation files are structured as flat key-value JSON maps in separate files per locale:
  - `en.json` — English translations.
  - `nl.json` — Dutch translations.
- Missing translation keys fall back to the English value (never show a raw key to the user).
- The service loads the locale from admin settings (`language.userLocale`) on startup.
- The service is importable/accessible from any UI component.
- Changing the locale updates all visible user-facing text (either immediately via reactivity or on next screen navigation).

---

### Story 10.2: Create English Translation File

> As a developer, I want a complete English translation file so that all user-facing strings are defined in one place.

**Acceptance Criteria:**

- An `en.json` file contains all user-facing strings. The complete key set:

```json
{
  "home.takePhotos": "Take Photos",
  "home.eventName": "{eventName}",

  "session.getReady": "Get Ready!",
  "session.countdown": "{count}",
  "session.photoProgress": "Photo {current} of {total}",

  "review.title": "Your Photos",
  "review.print": "Print",
  "review.abort": "Start Over",

  "review.confirmAbort.title": "Start Over?",
  "review.confirmAbort.message": "This will discard your photos and return to the home screen. Are you sure?",
  "review.confirmAbort.confirm": "Yes, Start Over",
  "review.confirmAbort.cancel": "No, Keep Photos",

  "print.printing": "Printing your photos...",
  "print.stillPrinting": "Still printing, please wait...",
  "print.helpHint": "Printer not starting? Ask the store owner for help.",

  "thankyou.title": "Enjoy Your Photos!",
  "thankyou.subtitle": "Thank you for visiting our photobooth!",
  "thankyou.done": "Done",

  "error.title": "Something Went Wrong",
  "error.cameraDisconnected": "The camera is not connected. Please contact the store owner.",
  "error.cameraInUse": "The camera is being used by another application.",
  "error.printerNotFound": "The printer is not connected. Please contact the store owner.",
  "error.printFailed": "Printing failed. Please try again or contact the store owner.",
  "error.generic": "An unexpected error occurred. Please contact the store owner.",
  "error.contactOwner": "Please contact the store owner for assistance.",
  "error.debugDetails": "Technical details",
  "error.tryAgain": "Try Again",
  "error.backToHome": "Back to Home",

  "filter.none": "Original",
  "filter.bw": "Black & White",
  "filter.sepia": "Sepia",
  "filter.vintage": "Vintage",

  "idle.returning": "Returning to home in {seconds}s..."
}
```

- No user-facing text exists as hardcoded strings in UI component code — all text comes from `t()` calls.
- Keys are organized by screen/feature using dot notation for namespacing.

---

### Story 10.3: Create Dutch Translation File

> As a user, I want all user-facing text available in Dutch so that Dutch-speaking guests can use the booth comfortably.

**Acceptance Criteria:**

- An `nl.json` file contains Dutch translations for every key in the English file.
- Translations are natural, native-sounding Dutch (not machine-translated).
- All interpolation parameters (`{eventName}`, `{current}`, `{total}`, `{count}`, `{seconds}`) are preserved exactly.

```json
{
  "home.takePhotos": "Maak Foto's",
  "home.eventName": "{eventName}",

  "session.getReady": "Maak je klaar!",
  "session.countdown": "{count}",
  "session.photoProgress": "Foto {current} van {total}",

  "review.title": "Jouw Foto's",
  "review.print": "Afdrukken",
  "review.abort": "Opnieuw Beginnen",

  "review.confirmAbort.title": "Opnieuw beginnen?",
  "review.confirmAbort.message": "Je foto's worden verwijderd en je keert terug naar het startscherm. Weet je het zeker?",
  "review.confirmAbort.confirm": "Ja, opnieuw beginnen",
  "review.confirmAbort.cancel": "Nee, bewaar foto's",

  "print.printing": "Bezig met afdrukken...",
  "print.stillPrinting": "Nog even geduld, we zijn nog aan het afdrukken...",
  "print.helpHint": "Printer start niet? Vraag de eigenaar om hulp.",

  "thankyou.title": "Geniet van je foto's!",
  "thankyou.subtitle": "Bedankt voor je bezoek aan onze photobooth!",
  "thankyou.done": "Klaar",

  "error.title": "Er is iets misgegaan",
  "error.cameraDisconnected": "De camera is niet aangesloten. Neem contact op met de winkeleigenaar.",
  "error.cameraInUse": "De camera wordt door een andere applicatie gebruikt.",
  "error.printerNotFound": "De printer is niet aangesloten. Neem contact op met de winkeleigenaar.",
  "error.printFailed": "Het afdrukken is mislukt. Probeer het opnieuw of neem contact op met de winkeleigenaar.",
  "error.generic": "Er is een onverwachte fout opgetreden. Neem contact op met de winkeleigenaar.",
  "error.contactOwner": "Neem contact op met de winkeleigenaar voor hulp.",
  "error.debugDetails": "Technische details",
  "error.tryAgain": "Opnieuw proberen",
  "error.backToHome": "Terug naar start",

  "filter.none": "Origineel",
  "filter.bw": "Zwart-wit",
  "filter.sepia": "Sepia",
  "filter.vintage": "Vintage",

  "idle.returning": "Terug naar start over {seconds}s..."
}
```

- The Dutch translation file covers 100% of the keys in the English file.

---

### Story 10.4: Integrate i18n into All User-Facing Screens

> As a developer, I want all hardcoded strings on user-facing screens replaced with translation function calls so that language switching works.

**Acceptance Criteria:**

- Every user-facing screen (Home, Session, Review, Print Progress, Thank You, Error) uses `t(key)` for ALL displayed text.
- No hardcoded English or Dutch strings exist in UI component code.
- Switching the locale in admin settings is reflected on user-facing screens (either immediately or on next screen navigation).
- The admin panel remains in English regardless of the `language.userLocale` setting.
- All confirmation dialog texts (Redo, Abort, Print) use translated strings.
- The idle timeout indicator ("Returning to home in Xs...") uses a translated string with interpolation.
- Filter labels ("Original", "Black & White", etc.) use translated strings.

**Verification:**

- Switch to Dutch in admin settings, navigate to Home, go through the full photo session flow. Every piece of visible text should be in Dutch.
- Switch back to English. Every piece of visible text should be in English.
- The admin panel should remain in English in both cases.
