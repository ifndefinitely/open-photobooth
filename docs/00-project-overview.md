# Project Overview: Open Photobooth

## Project Description

Open Photobooth is a free and open-source, fully offline photobooth application. It captures photos from an external USB webcam, assembles them into a classic photobooth strip, and prints the strip on a USB photo printer. The app is designed for events (weddings, parties, corporate gatherings) and is operated on a dedicated tablet in kiosk mode.

## Goals

1. **Primary:** Provide a turnkey, self-contained photobooth experience that runs on a Windows 11 tablet or Linux Mint machine without requiring internet connectivity after initial installation.
2. **Secondary:** Be configurable enough for different events through a hidden admin settings panel (appearance, hardware, audio, language).
3. **Tertiary:** Be open source (AGPL-3.0) and maintainable so the community or the owner can extend it.

## Constraints

| Constraint          | Detail                                                                                                                                                                                            |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Fully Offline**   | No network calls after installation. All assets (fonts, audio, images) must be bundled.                                                                                                           |
| **Target Hardware** | Windows 11 tablet or Linux Mint 22+ (Cinnamon DE) machine, USB webcam (Razer Kiyo), USB printer (Canon SELPHY). On Linux, the Canon SELPHY requires the `printer-driver-gutenprint` CUPS package. |
| **Kiosk Mode**      | Must lock down the device so casual users cannot exit the app, switch applications, or access the OS.                                                                                             |
| **Two Languages**   | English and Dutch for user-facing UI. Admin UI in English only.                                                                                                                                   |
| **Single User**     | The photobooth serves one user/group at a time in a linear flow.                                                                                                                                  |
| **Simple UX**       | Designed for unskilled users — large buttons, minimal choices, clear visual feedback.                                                                                                             |

## User Personas

| Persona                 | Description                                                                                                        | Goals                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| **Booth User**          | A guest at an event (wedding, party, corporate event). Non-technical. Interacts only with the main flow screens.   | Take photos, see the strip, print it, have fun.                                      |
| **Admin / Store Owner** | The person who sets up and manages the photobooth. Moderately technical. Accesses the hidden admin settings panel. | Configure the booth for each event, troubleshoot hardware, manage the photo gallery. |

## Glossary

| Term              | Definition                                                                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Photo Strip**   | A vertical composition of N photos (1–6, default 4) arranged in a single column, with optional logo, event name, date, and border styling. |
| **Strip Sheet**   | The printed output: two identical copies of the photo strip side-by-side on a single print sheet (user can tear/cut in half to share).     |
| **Photo Session** | The complete flow from pressing "Take Photos" through capturing all N photos.                                                              |
| **Countdown**     | A visual 3→2→1 countdown displayed before each individual photo capture. Duration is admin-configurable.                                   |
| **Kiosk Mode**    | A locked-down mode preventing users from exiting the app, accessing the taskbar, or switching windows.                                     |
| **Admin Panel**   | A hidden settings screen accessible via a secret gesture (5 taps on top-right corner) followed by a 4-digit PIN.                           |
| **Gallery**       | A local folder where all captured photos and generated strips are automatically saved, also browsable from the admin panel.                |
| **Flash Effect**  | A brief white screen overlay animation triggered at the moment of photo capture, simulating a camera flash.                                |
| **Filter**        | A color effect applied to all photos in a strip (e.g., black & white, sepia, vintage).                                                     |

## High-Level Architecture

```
+--------------------------------------------------+
|                Application Shell                  |
|  +----------------------------------------------+|
|  |              Screen Router                    ||
|  |  +-----------+  +-------------+  +---------+ ||
|  |  | Home      |  | Session     |  | Review  | ||
|  |  | Screen    |  | Screen      |  | Screen  | ||
|  |  +-----------+  +-------------+  +---------+ ||
|  |  +-----------+  +-------------+  +---------+ ||
|  |  | Print     |  | Thank You   |  | Error   | ||
|  |  | Screen    |  | Screen      |  | Screen  | ||
|  |  +-----------+  +-------------+  +---------+ ||
|  |  +-----------+                                ||
|  |  | Admin     |                                ||
|  |  | Panel     |                                ||
|  |  +-----------+                                ||
|  +----------------------------------------------+|
|                                                  |
|  +----------------------------------------------+|
|  |              Core Services                    ||
|  |  Camera | Printer | Audio | Storage           ||
|  |  Settings | i18n | Strip Composer             ||
|  +----------------------------------------------+|
+--------------------------------------------------+
```

## Screen Flow

```
                    +--------+
                    | Home   | <-------------------------------+
                    | Screen |                                 |
                    +---+----+                                 |
                        |                                      |
                   "Take Photos"                               |
                        |                                      |
                    +---v------+                               |
                    | Photo    |                               |
                    | Session  |  (countdown -> snap) x N      |
                    +---+------+                               |
                        |                                      |
                    +---v------+                               |
                    | Review   |                               |
                    | Screen   |                               |
                    +---+------+                               |
                   /    |       \                               |
              Print   Redo    Abort                            |
              /        |        \                              |
    +--------v--+  +---v----+  +--v-------+                    |
    | Print     |  | Confirm|  | Confirm  |                    |
    | Flow      |  | Redo?  |  | Abort?   |                    |
    +---+-------+  +---+----+  +----+-----+                    |
        |              |            |                           |
   +----v-----+   Back to     Back to Home                     |
   | Thank    |   Session         |                            |
   | You      |                   +---------->>----------------+
   +----+-----+
        |
        +----------->>------------------------------------>>---+
```

## Epic Overview

| #   | Epic                                      | Stories | Dependencies    |
| --- | ----------------------------------------- | ------- | --------------- |
| 01  | Technology Selection & Project Setup      | 7       | None            |
| 02  | App Shell, Navigation & Screen Management | 9       | Epic 01         |
| 03  | Webcam Integration & Live Preview         | 7       | Epic 02         |
| 04  | Photo Session Flow                        | 6       | Epic 03         |
| 05  | Photo Strip Composition & Filters         | 6       | Epic 04         |
| 06  | Printer Integration & Print Flow          | 8       | Epic 05         |
| 07  | Admin Settings Panel                      | 8       | Epic 02         |
| 08  | Local Gallery & Storage                   | 6       | Epic 04, 05, 07 |
| 09  | Audio System (Music & Sound Effects)      | 5       | Epic 02, 07     |
| 10  | Internationalization (EN/NL)              | 4       | Epic 02, 07     |
| 11  | Error Handling & Resilience               | 6       | Epic 02, 10     |
| 12  | Kiosk Mode & Deployment                   | 7       | Epic 02, 07, 01 |
| 13  | Final Polish, Testing & Integration       | 6       | All             |
|     | **Total**                                 | **85**  |                 |

## Recommended Implementation Order

| Phase       | Epics                               | Rationale                                                                   |
| ----------- | ----------------------------------- | --------------------------------------------------------------------------- |
| **Phase 1** | Epic 01                             | Foundation — nothing else can start without it.                             |
| **Phase 2** | Epic 02                             | All screens depend on the app shell and navigation.                         |
| **Phase 3** | Epic 03 + Epic 07 (Stories 7.1–7.2) | Camera and settings infrastructure can be developed in parallel.            |
| **Phase 4** | Epic 04 + Epic 09                   | Session needs camera. Audio can be built in parallel.                       |
| **Phase 5** | Epic 05                             | Strip composition needs captured photos.                                    |
| **Phase 6** | Epic 06 + Epic 08                   | Printing needs strips. Gallery needs photos. Can be parallel.               |
| **Phase 7** | Remaining Epic 07 + Epic 10         | Fill in all admin sections now that features exist. i18n wraps all screens. |
| **Phase 8** | Epic 11 + Epic 12                   | Hardening — needs all features working first.                               |
| **Phase 9** | Epic 13                             | Final pass after everything is integrated.                                  |
