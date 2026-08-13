#!/bin/zsh
set -e
cd "$(dirname "$0")"
TEST_URL="file://$PWD/quick-play/index.html?mode=single-player&engine=fl-v2&candidate=4"
if [[ -d "/Applications/Google Chrome.app" ]]; then
  open -a "/Applications/Google Chrome.app" "$TEST_URL"
else
  open "$TEST_URL"
fi
