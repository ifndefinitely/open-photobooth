# Epic 09: Audio System (Music & Sound Effects)

## Description

Implement background music playback and sound effects (countdown beeps, shutter click) with full admin configurability. All audio assets are bundled with the application for fully offline use.

**Dependencies:** Epic 02 (App shell for screen lifecycle hooks). Epic 07 (Settings service for audio configuration).

---

## Stories

### Story 9.1: Implement Audio Playback Service

> As a developer, I want a centralized audio service that can play, pause, stop, and loop audio so that all audio is managed consistently.

**Acceptance Criteria:**

- An audio service exposes:
  - `playMusic(trackOrPlaylist)`: Starts playing a background music track (looping). If a playlist, plays tracks in sequence and loops the playlist.
  - `stopMusic()`: Stops background music.
  - `pauseMusic()` / `resumeMusic()`: Pause and resume music playback.
  - `setMusicVolume(0-100)`: Sets the music volume. 0 = silent, 100 = full volume.
  - `playSFX(soundName)`: Plays a one-shot sound effect. Does NOT interrupt or pause music — sound effects overlay on top of the music.
- Music and sound effects use separate audio channels/instances so they can play simultaneously without conflict.
- Only one music track plays at a time. Calling `playMusic()` stops any currently playing track before starting the new one.
- The service reads initial configuration (volume, mode) from the settings service on initialization.
- Volume changes take effect immediately on currently playing audio.

---

### Story 9.2: Bundle and Play Background Music

> As a user, I want to hear fun background music while the photobooth is running so that the atmosphere is lively.

**Acceptance Criteria:**

- At least 2–3 royalty-free, upbeat music tracks are bundled with the app as audio files.
- Suggested genres: upbeat pop/funk instrumental, lounge/chill, retro/disco — tracks that work well for a photobooth party atmosphere.
- File format: MP3 (widely supported, good compression for bundling).
- Music behavior is controlled by the admin setting `audio.musicMode`:
  - **"idle":** Music plays only on the Home screen. Fades out when transitioning to Session. Fades back in when returning to Home.
  - **"session":** Music plays only during the photo session (Session + Review screens). Silent on Home.
  - **"always":** Music plays on all user-facing screens (Home, Session, Review, Print, Thank You). Continuous — does not restart on screen transitions.
  - **"off":** No music at all.
- Music loops continuously. When one track ends, the next starts (or the same track loops if only one).
- Music fades in and out smoothly (0.5 second fade) on screen transitions where the mode dictates starting/stopping.
- Music volume is controlled by `audio.musicVolume` setting.
- Music does NOT play in the Admin panel (always silent in admin, regardless of mode).

---

### Story 9.3: Implement Countdown Beep Sound Effects

> As a user, I want to hear a beep on each countdown number so that I have an audio cue for when the photo will be taken.

**Acceptance Criteria:**

- A short beep sound effect plays on each countdown number (e.g., 3, 2, 1).
- The beeps are timed to coincide exactly with the visual countdown number appearing.
- The final beep (on "1" or at capture moment) is a different/louder tone to signal the imminent capture. Alternatively, the capture itself plays the shutter sound (Story 9.4) instead.
- Beep sound files are bundled with the app (short, clean beep tones — royalty-free).
- Beeps are toggleable via admin setting `audio.countdownBeep` (default: enabled).
- When disabled, the countdown is silent (visual only).
- Beeps play even when background music is active (separate audio channel).
- Beep volume follows the music volume setting (or is proportionally louder to be heard over music).

---

### Story 9.4: Implement Shutter Click Sound Effect

> As a user, I want to hear a camera shutter click when my photo is taken so that the experience feels authentic.

**Acceptance Criteria:**

- A realistic camera shutter click sound plays at the exact moment of photo capture.
- The sound is a bundled, royalty-free shutter click audio file.
- The sound plays simultaneously with the flash effect (if flash is enabled).
- The shutter sound is toggleable via admin setting `audio.shutterSound` (default: enabled).
- When disabled, the capture is silent.
- The shutter sound plays on the SFX audio channel (does not interrupt music).
- The sound is short (under 500ms) and does not overlap with the start of the next countdown's first beep.

---

### Story 9.5: Implement Audio Settings in Admin Panel

> As an admin, I want to configure background music behavior, volume, and sound effect toggles so that I can customize the audio experience.

**Acceptance Criteria:**

- The "Audio" section in the admin panel contains:
  - **Music mode:** Dropdown with options:
    - "Play during idle" (`idle`)
    - "Play during photo session" (`session`)
    - "Play always" (`always`)
    - "Off" (`off`)
  - **Music volume:** Slider 0–100, default 50. Shows the numeric value.
  - **Countdown beep:** Toggle on/off (default: on).
  - **Shutter sound:** Toggle on/off (default: on).
  - **Flash effect:** Toggle on/off (default: on). Note: this is a visual effect, but it's grouped here because it's a capture feedback setting alongside audio.
- A "Preview Music" button plays a 10-second sample of the background music at the current volume setting.
- A "Preview Beep" button plays the countdown beep sound once.
- A "Preview Shutter" button plays the shutter click sound once.
- All settings are saved to the settings persistence service.
- Changes to music mode and volume take effect immediately if music is currently playing (e.g., changing volume updates the live playback).
