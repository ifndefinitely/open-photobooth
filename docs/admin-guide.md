# Open Photobooth — Admin Setup Guide

This guide explains how to install, configure, and operate the Open Photobooth application. It is written for event organizers and booth operators — no programming knowledge is required.

---

## 1. Hardware Requirements

### Minimum Computer Specs

- **Operating System:** Windows 10 or 11 (64-bit)
- **Processor:** Intel Core i5 or equivalent (any generation from 2018 onwards)
- **RAM:** 4 GB minimum, 8 GB recommended
- **Storage:** 2 GB free space for the app, plus space for saved photos (approximately 5 MB per session)
- **Display:** Touchscreen tablet or monitor recommended, minimum 10 inches

### Webcam

- **Supported:** Any USB webcam that works with Windows
- **Recommended:** Razer Kiyo or similar 1080p USB webcam
- **Connection:** USB 2.0 or 3.0 port

### Printer (Optional)

- **Supported:** Any printer recognized by Windows
- **Recommended:** Canon SELPHY CP1500 or similar compact photo printer
- **Paper:** 4x6 inch (postcard size) photo paper recommended
- **Connection:** USB cable to the computer

### Other

- **USB hub:** If your tablet has limited USB ports, use a powered USB hub for the webcam and printer
- **Power:** Ensure all devices have stable power for multi-hour events

---

## 2. Installation

### Step 1: Download the Installer

Download the latest `Open-Photobooth-Setup.exe` from the project's releases page.

### Step 2: Run the Installer

1. Double-click the downloaded `.exe` file.
2. If Windows SmartScreen warns about an unrecognized app, click "More info" then "Run anyway."
3. Follow the on-screen prompts. Accept the default installation folder.
4. The installer will create a desktop shortcut.

### Step 3: Launch the App

Double-click the "Open Photobooth" shortcut on your desktop. The app opens in fullscreen with a live camera preview.

---

## 3. First-Time Setup

When you first launch the app, you need to configure it through the Admin Panel.

### Accessing the Admin Panel

1. On the Home screen, tap the **top-right corner** of the screen **5 times quickly** (within 3 seconds).
2. A PIN keypad will appear. Enter the PIN: **0000** (four zeros — this is the default).
3. The Admin Settings panel will open.

### Configuring the Webcam

1. In the Admin Panel, tap **Webcam** in the sidebar.
2. Select your camera from the "Camera" dropdown.
3. The live preview will update to show the selected camera's feed.
4. Adjust settings as needed:
   - **Mirror Horizontal:** Flip the preview so it feels like a mirror (recommended: ON).
   - **Resolution:** Choose the camera resolution. Higher = better quality but slower.
   - **Brightness / Contrast / Saturation:** Fine-tune the image to match your lighting conditions.

### Configuring the Printer

1. Tap **Printer** in the sidebar.
2. Select your printer from the "Printer" dropdown. Make sure the printer is connected and powered on.
3. Set the **Paper Size** to match your loaded paper (e.g., "4x6" for standard photo paper).
4. Adjust copies, color mode, and margins as needed.

### Setting the Event Name and Logo

1. Tap **Appearance** in the sidebar.
2. Enter the **Event Name** (e.g., "Sarah & Tom's Wedding"). This appears on the photo strip.
3. To add a **Logo**, click "Browse" and select an image file (PNG recommended, transparent background works best).
4. Toggle **Date Stamp** on or off to add the date to the strip.
5. Customize the strip colors (border color, background color) to match your event theme.

### Choosing the Language

1. Tap **Language** in the sidebar.
2. Select **English** or **Dutch** for the user-facing interface.
3. The Admin Panel itself always stays in English.

### Changing the PIN

1. Tap **PIN** in the sidebar.
2. Enter a new 4-digit PIN. Remember this PIN — you need it to access the Admin Panel.

### Exiting the Admin Panel

Tap **Exit Admin** in the top-right corner to return to the Home screen. Your settings are saved automatically.

---

## 4. Operating the Booth

### What Guests Experience

1. The Home screen shows a live camera preview and a "Take Photos" button.
2. The guest taps "Take Photos." A countdown (3, 2, 1) plays with beep sounds.
3. A photo is taken with a flash effect and shutter sound. This repeats for the configured number of photos (default: 4).
4. The guest sees their assembled photo strip with optional filter choices (Original, Black & White, Sepia, Vintage).
5. The guest taps "Print" to print their strip, or "Redo" to retake.
6. The printer prints the photo strip. A "Thank You" screen appears.
7. The guest taps "Done" and the app returns to the Home screen, ready for the next person.

### What to Watch For

- **Paper and ink:** Check the printer periodically. Refill paper and ink cartridges as needed.
- **Camera position:** Make sure the webcam stays pointed at the booth area.
- **Idle timeout:** If a guest walks away without finishing, the app automatically returns to the Home screen after the configured timeout (default: 60 seconds).
- **Audio:** Background music plays during the Home screen. It pauses during photo capture.

---

## 5. Troubleshooting

### Camera Not Detected

- Check that the USB cable is securely plugged in on both ends.
- Try a different USB port.
- Close the app completely and restart it.
- Make sure no other application (like Zoom or Skype) is using the camera.
- On Windows, check Settings > Privacy > Camera and ensure camera access is allowed.

### Printer Not Printing

- Check that the USB cable is securely plugged in.
- Make sure the printer is powered on and not showing any error lights.
- Check that the printer has paper and ink/ribbon loaded.
- Open Windows Settings > Devices > Printers & scanners. Ensure the printer appears and is not paused.
- In the Admin Panel > Printer section, reselect the printer from the dropdown.

### App is Frozen or Not Responding

1. Press **Ctrl + Alt + Delete** on the keyboard.
2. Open **Task Manager**.
3. Find "Open Photobooth" in the list and click "End Task."
4. Restart the app from the desktop shortcut.

### Photos Not Saving to Gallery

- In the Admin Panel > Gallery section, check that the save path is valid and the folder exists.
- Check that the drive has enough free disk space.
- Try the "Open in Explorer" button to verify the gallery folder is accessible.

### No Sound / Audio Not Playing

- Check that the system volume is not muted (look for the speaker icon in the Windows taskbar).
- In the Admin Panel > Audio section, make sure audio is enabled and the volume slider is above zero.
- Try restarting the app.

---

## 6. Resetting to Defaults

If you need to reset all settings to their original values:

1. Open the Admin Panel (5 taps + PIN).
2. Any individual setting can be changed back to its default by manually entering the default value.
3. To reset everything at once: delete the settings file from the app's data folder, then restart the app. The data folder is located at:
   - **Windows:** `C:\Users\<YourName>\AppData\Roaming\open-photobooth\`
   - Delete the `settings.json` file. The app will recreate it with defaults on next launch.

Note: Resetting settings does **not** delete your saved photos. The gallery is stored separately.

---

## 7. Updating the App

1. Download the latest installer from the project's releases page.
2. Close the running app.
3. Run the new installer. It will replace the old version.
4. Your settings and photo gallery are preserved across updates.

---

## 8. Finding Log Files

If you need to report a problem, log files can help with diagnosis.

### Log File Location

- **Windows:** `C:\Users\<YourName>\AppData\Roaming\open-photobooth\logs\`

### What the Logs Contain

- Timestamps and event descriptions (camera started, photo captured, print job sent, errors encountered).
- No personal data or photo content is stored in the logs.

### Log Rotation

- Log files are automatically rotated daily and when they reach 5 MB.
- Files older than 7 days are automatically deleted.
- Total log storage will not exceed approximately 50 MB.

### Sharing Logs

To share logs for troubleshooting:

1. Open the Admin Panel > Gallery section and click "Open in Explorer."
2. Navigate up one folder level to find the `logs` folder.
3. Alternatively, type the path above directly into the Windows File Explorer address bar.
4. Share the `.log` files with the person helping you.
