#!/bin/bash
cd "$(dirname "$0")"
if command -v open >/dev/null 2>&1; then
  open -a "Google Chrome" "$(pwd)/index.html" 2>/dev/null || open "$(pwd)/index.html"
else
  echo "Open index.html in a browser."
fi
