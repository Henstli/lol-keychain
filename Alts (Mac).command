#!/bin/bash
# Starts Alts from the source code on macOS (double-click in Finder).
cd "$(dirname "$0")" || exit 1
if ! command -v npm >/dev/null 2>&1; then
  echo "Node.js is missing. Install the LTS version from https://nodejs.org and run this again."
  read -r -p "Press Enter to close…"
  exit 1
fi
[ -d node_modules ] || npm install
npm start
