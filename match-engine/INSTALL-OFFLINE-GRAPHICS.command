#!/bin/bash
set -e
cd "$(dirname "$0")"
mkdir -p vendor
URL="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"
echo "Installing the local Three.js graphics file..."
curl -L --fail --silent --show-error "$URL" -o vendor/three.min.js
if [ ! -s vendor/three.min.js ]; then
  echo "The download failed."
  exit 1
fi
echo "Done. The match can now load its graphics from this folder."
read -n 1 -s -r -p "Press any key to close."
echo
