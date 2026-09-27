#!/bin/sh
# Switch the site's favicon to one of the variants in _notes/favicons/.
#   sh _notes/scripts/favicon.sh            # list variants
#   sh _notes/scripts/favicon.sh allah      # install one, then commit
# Copies that variant's three files over the live ones; the <link> tags in
# _includes/head/custom.html don't change.
set -e
cd "$(dirname "$0")/../.."
if [ -z "$1" ]; then ls _notes/favicons; exit 0; fi
src="_notes/favicons/$1"
[ -d "$src" ] || { echo "no variant '$1' (try: $(ls _notes/favicons | tr '\n' ' '))" >&2; exit 1; }
cp "$src/favicon.svg" "$src/apple-touch-icon.png" assets/images/
cp "$src/favicon.ico" favicon.ico
echo "favicon is now '$1'"
