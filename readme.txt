=== Mini Shop for Telegram ===
Contributors: atokim4
Tags: telegram, mini app, woocommerce, telegram shop, telegram bot
Requires at least: 6.6
Tested up to: 7.1
Requires PHP: 8.1
Requires Plugins: woocommerce
Stable tag: 0.1.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Sell from your WooCommerce store inside Telegram: a Mini App catalog and cart on your own bot, checkout on your site, order updates in the chat.

== Description ==

Mini Shop for Telegram turns your WooCommerce store into a Telegram Mini App that runs on your own bot. Buyers browse the catalog, pick variations and fill a cart without leaving Telegram, then pay on your normal WooCommerce checkout. When the order status changes, your bot tells them in the chat.

Everything runs on your WordPress site. There is no SaaS account, no monthly fee and no data sent anywhere except to Telegram itself.

= What it does =

* **Mini App storefront** opened from the bot's menu button: category chips, search, product grid, a product sheet with variation options, quantity steppers and a cart. It follows the buyer's Telegram light or dark theme and uses Telegram's own main and back buttons.
* **Simple and variable products**, including "any" attributes. Prices, stock and quantity limits come from WooCommerce.
* **Safe checkout handoff.** The Mini App sends the cart with the buyer's Telegram `initData`. The plugin checks its signature with your bot token, re-validates every line against live product data and returns a one-time checkout link (valid 15 minutes). The link fills the WooCommerce cart and opens your checkout, so your payment gateways, shipping, taxes and coupons work as usual. Classic and block checkout are both supported.
* **Orders remember the Telegram buyer**, shown on the order screen.
* **Order status messages** from your bot (choose which statuses), sent in the background with Action Scheduler.
* **Bot setup in one step:** paste the token from @BotFather and the plugin sets the webhook (with a secret header), the menu button and the reply to /start.
* HPOS (custom order tables) and cart/checkout blocks compatible. Translation ready, ships with Russian and Uzbek.

= Requirements =

* WooCommerce 9.0 or newer.
* Your site must be reachable over **HTTPS** (Telegram only opens Mini Apps and sends webhooks to HTTPS URLs).
* A Telegram bot of your own, created with @BotFather.

== External services ==

This plugin connects to Telegram, which is required for it to work:

* **Telegram Bot API** (`https://api.telegram.org`). When you save a bot token or click Connect, the plugin calls `getMe`, `setWebhook` and `setChatMenuButton`. When a buyer writes to your bot, it calls `sendMessage` to reply with the shop button. When an order status you selected changes, it calls `sendMessage` with the order number, status, item names and quantities, and the total. Data goes only to your own bot's chats. Uninstalling the plugin calls `deleteWebhook`.
* **Telegram Mini App script** (`https://telegram.org/js/telegram-web-app.js`) is loaded on the Mini App page only. It connects the page to the Telegram app (theme colours, buttons, the signed user data). Telegram requires Mini Apps to load it from telegram.org.

Telegram terms of service: https://telegram.org/tos — Bot platform terms: https://telegram.org/tos/bot-developers — Privacy policy: https://telegram.org/privacy

== Installation ==

1. Install and activate WooCommerce.
2. Upload the plugin folder to `/wp-content/plugins/` (or install the zip from Plugins → Add New → Upload) and activate it.
3. In Telegram, open @BotFather, send `/newbot` and copy the token.
4. Go to **WooCommerce → Telegram Mini Shop**, paste the token and save. The plugin connects the bot.
5. Open your bot in Telegram and send `/start`.

== Frequently Asked Questions ==

= Does the buyer pay inside Telegram? =

No. Payment happens on your WooCommerce checkout page, which opens inside Telegram's in-app browser. Any payment gateway that works on your site works here.

= Can someone fake a Telegram user and place orders as them? =

The checkout endpoint only accepts `initData` signed by Telegram for your bot (HMAC-SHA256 with your bot token, compared in constant time, at most 24 hours old). Tampered or foreign data gets HTTP 401. The age limit can be changed with the `mstg_init_data_max_age` filter.

= Where is the bot token stored? =

In a WordPress option that is not autoloaded. The settings page never prints it back; you can only replace or remove it.

= Which products are shown? =

Published simple and variable products that are visible in the catalog, from all categories or only the ones you tick. Other product types are not shown.

= Can I change the status message? =

Yes, with the `mstg_status_message` filter (Telegram HTML; escape what you add).

== Screenshots ==

1. Catalog in Telegram's light theme, with category chips and price stickers.
2. Variable product sheet with options and the Telegram main button.
3. Cart in Telegram's dark theme.
4. Settings screen under WooCommerce.

== Changelog ==

= 0.1.0 =
* First release: Mini App catalog and cart, signed checkout handoff, order linking, status messages, bot setup, ru and uz translations.
