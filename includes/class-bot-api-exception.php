<?php
/**
 * Raised when a Telegram Bot API call fails.
 *
 * @package MiniShopTelegram
 */

namespace MiniShopTelegram;

defined( 'ABSPATH' ) || exit;

/**
 * The message is Telegram's own description (it never contains the bot token). It is stored HTML-escaped,
 * as WordPress coding standards require for exception messages; text() returns it plain for re-escaping on output.
 */
final class Bot_Api_Exception extends \RuntimeException {

	/**
	 * The message as plain text.
	 */
	public function text(): string {
		return html_entity_decode( $this->getMessage(), ENT_QUOTES | ENT_HTML5, 'UTF-8' );
	}
}
