#!/usr/bin/env bash
# Boots WordPress + WooCommerce in WordPress Playground (no local PHP needed) with this plugin mounted,
# sample data seeded and the fake Bot API on :8081. Ctrl+C stops both.
set -euo pipefail
cd "$(dirname "$0")/.."
PORT="${PORT:-9400}"

node dev/fake-bot-api.mjs &
FAKE_PID=$!
trap 'kill $FAKE_PID 2>/dev/null || true' EXIT

npx -y @wp-playground/cli@3.1.62 server \
	--port="$PORT" --php=8.3 --workers=1 \
	--mount="$PWD:/wordpress/wp-content/plugins/mini-shop-for-telegram" \
	--mount="$PWD/dev:/mstg-dev" \
	--mount="$PWD/dev/mu-plugins:/wordpress/wp-content/mu-plugins" \
	--blueprint=dev/blueprint.json --blueprint-may-read-adjacent-files
