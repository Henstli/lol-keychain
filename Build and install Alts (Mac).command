#!/bin/bash
# Builds Alts from this folder and installs it to Applications (macOS). Double-click in Finder.
cd "$(dirname "$0")" || exit 1
if ! command -v npm >/dev/null 2>&1; then
  echo "Node.js is missing. Install the LTS version from https://nodejs.org and run this again."
  read -r -p "Press Enter to close…"; exit 1
fi
[ -d node_modules ] || npm install
ARCH=$(uname -m); [ "$ARCH" = "x86_64" ] && ARCH=x64
echo "Building Alts…"
if ! npx electron-builder --mac dir --"$ARCH" --publish never; then
  echo "The build failed. Send the text above to whoever helps you with Alts."
  read -r -p "Press Enter to close…"; exit 1
fi
SRC=$(ls -d dist/mac*/Alts.app 2>/dev/null | head -1)
[ -z "$SRC" ] && { echo "Alts.app was not found in dist."; read -r -p "Press Enter to close…"; exit 1; }
echo "Installing to Applications…"
osascript -e 'quit app "Alts"' >/dev/null 2>&1; sleep 1
rm -rf /Applications/Alts.app && ditto "$SRC" /Applications/Alts.app
xattr -dr com.apple.quarantine /Applications/Alts.app 2>/dev/null
open /Applications/Alts.app
echo "Done. Alts is in Applications."
