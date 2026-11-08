# Telegram Mini App shop for WooCommerce (WordPress plugin)

A personal project: a free, self-hosted WordPress plugin that turns a WooCommerce store into a Telegram Mini App
on the merchant's own bot. Buyers browse and fill a cart inside Telegram, pay on the store's normal checkout, and
get order status messages from the bot. Everything runs on the WordPress site, with no SaaS in between. Products
in the screenshots are sample data.

Code: https://github.com/atokim4/mini-shop-for-telegram

## Skills
WordPress plugin development (PHP 8.1, coding standards, REST API with permission callbacks, settings page,
i18n, uninstall), WooCommerce (HPOS and checkout blocks compatibility, programmatic cart, order meta, status
hooks, Action Scheduler), Telegram Bot API and Mini Apps (initData HMAC validation, webhook secret, MainButton,
BackButton, theme params), vanilla JavaScript + esbuild, PHPUnit, Vitest, Playwright E2E in WordPress Playground.

## What works (tested end to end)
- Bot setup from the settings page: getMe, setWebhook with a secret header, menu button that opens the shop; the token is never shown again
- Mini App catalog with categories, search, variable products, cart, Telegram light and dark themes
- Checkout handoff: signed initData checked server-side (tampered data gets 401), cart re-validated, one-time 15-minute link into the WooCommerce checkout (classic and block)
- Orders linked to the Telegram buyer; status changes ("completed" etc.) send the buyer a message from the bot
- Russian and Uzbek translations; official WordPress Plugin Check passes with 0 errors

## Screens to show
1. docs/screenshots/light-catalog.png: catalog, light theme
2. docs/screenshots/dark-product.png: variable product sheet, dark theme
3. docs/screenshots/light-cart.png: cart with the Telegram checkout button
4. docs/screenshots/admin-settings.png: settings page under WooCommerce
