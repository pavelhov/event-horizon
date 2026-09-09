#!/bin/bash
cd "$(dirname "$0")"
if ! command -v npm >/dev/null 2>&1; then
  [ -s "$HOME/.nvm/nvm.sh" ] && . "$HOME/.nvm/nvm.sh"
fi
if ! command -v npm >/dev/null 2>&1; then
  echo 'Node.js is required to launch this game. Install it from https://nodejs.org.'
  read -r -p 'Press Enter to close.'
  exit 1
fi
[ -d node_modules ] || npm install
open http://localhost:5187
npm run dev -- --port 5187
