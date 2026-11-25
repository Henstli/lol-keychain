# lol-keychain
## macOS

- Run from source: double-click `Alts (Mac).command` (first run installs dependencies), or `npm install` then `npm start`.
- Install your current code as a normal app: double-click `Build and install Alts (Mac).command`. It builds Alts and puts it in Applications.
- Releases: every new version on GitHub also gets a Mac .dmg and .zip. The installed app downloads new versions by itself and swaps them in when it quits or after "Restart now".
- The app has no paid Apple signature (only a free ad hoc one). The first install from a download needs System Settings, Privacy & Security, Open Anyway. After an update macOS may ask once more for Keychain access (choose Always Allow) and Accessibility (for the mini window).
- Touch ID replaces Windows Hello. Attaching the mini window to the Riot Client needs the Accessibility permission and is off until you turn it on.
