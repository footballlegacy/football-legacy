#!/bin/zsh
set -e
cd "$(dirname "$0")"
echo "Local two-player is unavailable while its match authority is migrated to FL V2."
TEST_URL="file://$PWD/quick-play/index.html?mode=co-op&engine=fl-v2&candidate=5"
if [[ -d "/Applications/Google Chrome.app" ]]; then
  open -a "/Applications/Google Chrome.app" "$TEST_URL"
else
  open "$TEST_URL"
fi
