<?php
/**
 * Local development only (mounted by dev/blueprint.json, never shipped): sends Bot API calls
 * to the fake server from dev/fake-bot-api.mjs.
 *
 * @package MiniShopTelegram
 */

add_filter( 'mstg_bot_api_base', static fn() => 'http://127.0.0.1:8081' );
// The fake server runs on localhost, which wp_safe_remote_* and the HTTP API block by default.
add_filter( 'http_request_host_is_external', '__return_true' );
