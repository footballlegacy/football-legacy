#!/bin/zsh
set -e
cd "$(dirname "$0")"
TEST_URL="file://$PWD/match-engine/match.html?year=2026&difficulty=medium&weather=clear&camera=broadcast&controllerTest=1&singleController=1"
if [[ -d "/Applications/Google Chrome.app" ]]; then
  open -a "/Applications/Google Chrome.app" "$TEST_URL"
else
  open "$TEST_URL"
fi
