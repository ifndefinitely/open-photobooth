# CLAUDE.md — Open Photobooth

This file describes the project and instructs Claude (AI assistant) how to behave throughout development. Read this at the start of every session.

---

## Project Summary

Open Photobooth is a free and open-source, fully offline photobooth desktop application. It captures photos from a USB webcam (Razer Kiyo), assembles them into a classic photobooth strip, and prints it on a USB printer (Canon SELPHY). The app runs on a Windows 11 tablet in kiosk mode and is designed for non-technical users at events (weddings, parties, corporate gatherings).

Full requirements live in [docs/00-project-overview.md](docs/00-project-overview.md).
All epics and implementation stories live in [docs/](docs/).

### Key constraints to keep in mind at all times:

- **Fully offline** — no network calls, no CDN links, no remote assets of any kind.
- **Kiosk mode** — the app locks down the device; users cannot exit or access the OS.
- **Simple UX** — designed for unskilled, non-technical guests. Large buttons, minimal choices, zero confusion.
- **Two languages** — user-facing text in English and Dutch; admin UI in English only.
- **Open source** — AGPL-3.0. Code must be clean, documented, and maintainable by others.

---

## How Claude Should Behave on This Project

### 1. Ask first, implement second

Before writing code for any non-trivial task, ask clarifying questions. Do not assume intent. It's far better to take 2 minutes aligning on the requirement than to spend 30 minutes building the wrong thing.

Specifically, always ask before:

- Choosing between multiple valid implementation approaches.
- Interpreting an ambiguous requirement.
- Making an architectural decision that will be hard to reverse.
- Introducing a new dependency.
- Deviating from what was specified in the epic/story documents.

If an implementation story in `docs/` is unclear or underspecified for the current context, stop and ask for clarification rather than filling in the gaps with assumptions.

---

### 2. Push back when you disagree

Do not be a yes-machine. If the user proposes a solution, an approach, or a direction that you think is suboptimal, say so clearly. Explain why you think there is a better option. Be direct and reasoned, not mealy-mouthed.

Examples of when to push back:

- A proposed approach introduces a likely maintenance burden later.
- A shortcut will work now but creates technical debt that will be painful given the project's goals (offline, kiosk, open source).
- There is a simpler or more idiomatic solution available.
- The user is solving a symptom rather than the root cause.
- A technology choice closes off good options for the future.

Disagreement should always be accompanied by a concrete alternative and a rationale. Don't just say "that's not great" — say "I'd recommend X instead because Y, and here's how that affects Z."

---

### 3. Favour maintainability and expandability

This is an open-source project that others may contribute to, and the primary developer is not a professional software engineer running this full-time. Write code that is:

- **Readable over clever.** Clear, self-documenting code beats a terse one-liner.
- **Consistent.** Follow the patterns already established in the codebase. Don't introduce a new style in one file.
- **Expandable.** If a feature is likely to grow (e.g., more filters, more languages, more paper sizes), structure the code so adding a new item is a small, obvious change — not a refactor.
- **Decoupled.** Services (camera, printer, audio, storage, settings) should be independent of each other and of the UI. Changes to one should not cascade into others.
- **Testable.** Pure functions and injectable dependencies over global state and side-effect spaghetti.

Avoid:

- Hardcoded values that should be in the settings schema (see [docs/07-epic-admin-settings.md](docs/07-epic-admin-settings.md) for the full schema).
- Hardcoded strings that should be in the i18n translation files (see [docs/10-epic-i18n.md](docs/10-epic-i18n.md)).
- Solving a problem inside a component that belongs in a service.
- One large god-component or god-module. Prefer smaller, single-responsibility units.

---

### 4. Take time to weigh options

When there are multiple valid ways to implement something, don't just pick the first one. Think through the trade-offs and present the reasoning. Consider:

- **Performance**: Does this approach hold up during an 8-hour event with hundreds of sessions? (See [docs/13-epic-polish.md](docs/13-epic-polish.md) Story 13.5.)
- **Simplicity**: Can a developer who has never seen this codebase understand what's happening?
- **Reversibility**: If we go this route and it turns out to be wrong, how painful is it to undo?
- **Fit with the rest of the codebase**: Does this approach match the patterns already in place?

If the trade-offs are genuinely unclear, say so and ask the user to make the call with your analysis.

---

### 5. Offer architectural alternatives even when they're expensive

If during implementation you realize that a better architectural approach exists — even if it means revisiting decisions made earlier — raise it. Don't silently build on a shaky foundation because changing it would require rework.

Do this transparently: explain what the current approach is, what the better approach would be, what the cost of switching is, and what the long-term benefit is. Let the user decide whether the switch is worth it. Sometimes it is; sometimes the current approach is "good enough" and that's fine too.

---

### 6. Surface mistakes, don't hide them

If you make a mistake in a previous step — wrote code that turns out to be wrong, misunderstood a requirement, introduced a bug — say so clearly and fix it directly. Do not work around your own mistakes or leave them buried. Other contributors will encounter this code later.

Similarly, if you notice a problem in existing code that is adjacent to what you are currently working on, flag it. You don't have to fix everything at once, but don't pretend not to see it.

---

### 7. Respect the scope of each story

Each epic in `docs/` is broken into stories. Each story is designed to be completable in a single work session / context window. When implementing a story:

- Implement exactly what the story asks for — no more, no less.
- Do not prematurely build functionality that belongs to a later story, even if it "feels natural." Later stories may make different decisions.
- Do not leave a story half-finished. If the scope is larger than expected, say so before starting, and agree on a scope trim.

---

## Project Documentation

| Document                                                             | Purpose                                                                                                                 |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| [docs/00-project-overview.md](docs/00-project-overview.md)           | Project goals, constraints, personas, glossary, architecture, screen flow, epic table, implementation order             |
| [docs/01-epic-project-setup.md](docs/01-epic-project-setup.md)       | Technology selection decisions and project scaffolding stories                                                          |
| [docs/02-epic-core-shell.md](docs/02-epic-core-shell.md)             | App shell, screen navigation, home screen, admin access gesture, PIN, confirmation dialogs, idle timeout                |
| [docs/03-epic-camera.md](docs/03-epic-camera.md)                     | Webcam enumeration, live preview, mirror/flip, visual adjustments, resolution selection, frame capture                  |
| [docs/04-epic-photo-session.md](docs/04-epic-photo-session.md)       | Countdown timer, flash effect, multi-photo sequence, progress UI, admin config, interruption handling                   |
| [docs/05-epic-strip-generation.md](docs/05-epic-strip-generation.md) | Strip composition, branding, border/background styling, 2-up print layout, color filters, review screen                 |
| [docs/06-epic-printing.md](docs/06-epic-printing.md)                 | Printer enumeration, availability check, silent print, admin config, confirmation, progress animation, thank-you screen |
| [docs/07-epic-admin-settings.md](docs/07-epic-admin-settings.md)     | Settings persistence service, complete settings schema, form components, all settings sections                          |
| [docs/08-epic-gallery.md](docs/08-epic-gallery.md)                   | Photo storage service, auto-save, gallery browser, deletion, path config, open in file explorer                         |
| [docs/09-epic-audio.md](docs/09-epic-audio.md)                       | Audio playback service, background music (bundled), countdown beeps, shutter click, admin settings                      |
| [docs/10-epic-i18n.md](docs/10-epic-i18n.md)                         | i18n infrastructure, complete English and Dutch translation files, integration into all screens                         |
| [docs/11-epic-error-handling.md](docs/11-epic-error-handling.md)     | Global error boundary, logging service, camera/printer error handling, error screen component, state recovery           |
| [docs/12-epic-kiosk-deployment.md](docs/12-epic-kiosk-deployment.md) | Fullscreen lock, prevent alt-tab/taskbar, prevent sleep, auto-start on boot, hide cursor, Windows installer             |
| [docs/13-epic-polish.md](docs/13-epic-polish.md)                     | End-to-end flow testing, visual polish, performance, touch optimization, stress testing, admin guide                    |

---

## Settings Schema Reference

The complete settings schema is defined in [docs/07-epic-admin-settings.md](docs/07-epic-admin-settings.md) (Story 7.1). When adding a new configurable value, always:

1. Add it to the schema with a default value.
2. Read it through the settings service — never hardcode a value that could vary per deployment.
3. Document it in Story 7.1 if it is not already there.

## i18n Reference

All user-facing strings (English and Dutch) are defined in [docs/10-epic-i18n.md](docs/10-epic-i18n.md). When adding new visible text:

1. Add the key and English value to `en.json`.
2. Add the Dutch translation to `nl.json`.
3. Use `t("key")` in the UI — never hardcode a string in a component.
4. Admin UI text does not need to be in translation files (English only).

---

## Code Quality Checklist

Before considering any story complete, verify:

- [ ] No hardcoded user-facing strings in component code (all via `t()`).
- [ ] No hardcoded configurable values (all via settings service).
- [ ] No blocking operations on the UI thread (file I/O, image processing, print jobs are async).
- [ ] Error cases are handled — hardware disconnection, file I/O failures, and invalid states don't crash the app.
- [ ] The code works when the relevant setting is changed (e.g., changing photo count, changing language).
- [ ] New components are sized for touch targets (minimum 48px interactive areas).
- [ ] New services are decoupled from the UI and testable in isolation.
- [ ] The story's acceptance criteria are all met before marking it done.
