#!/usr/bin/env bash
# Builds the release folder dist/mini-shop-for-telegram (files listed in .distignore left out)
# and the installable zip dist/mini-shop-for-telegram.zip.
set -euo pipefail
cd "$(dirname "$0")/.."
SLUG=mini-shop-for-telegram
npm run build --silent
rm -rf dist && mkdir -p "dist/$SLUG"
# Copy tracked and new files, minus .distignore entries (rsync is not always installed).
git ls-files --cached --others --exclude-standard | grep -v -E "^($(paste -sd'|' .distignore | sed 's/\./\\./g'))(/|$)" |
	while read -r f; do mkdir -p "dist/$SLUG/$(dirname "$f")" && cp "$f" "dist/$SLUG/$f"; done
(cd dist && zip -qr "$SLUG.zip" "$SLUG")
echo "dist/$SLUG.zip ($(du -h "dist/$SLUG.zip" | cut -f1))"; find "dist/$SLUG" -type f | sed "s#dist/$SLUG/##" | sort
