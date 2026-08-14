#!/bin/bash
cd "$(dirname "$0")/.."
QUICK_PLAY_URL="file://$(pwd)/quick-play/index.html?mode=single-player&engine=fl-v2&candidate=5"
if command -v open >/dev/null 2>&1; then
  open -a "Google Chrome" "$QUICK_PLAY_URL" 2>/dev/null || open "$QUICK_PLAY_URL"
else
  echo "Open quick-play/index.html?mode=single-player&engine=fl-v2&candidate=5 in a browser."
fi
