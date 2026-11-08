<?php
/**
 * Connects the merchant's bot to this site: webhook + menu button.
 *
 * @package MiniShopTelegram
 */

namespace MiniShopTelegram;

defined( 'ABSPATH' ) || exit;

/**
 * Runs getMe, setWebhook and setChatMenuButton for the configured token.
 */
final class Bot_Setup {

	/**
	 * Connects the bot and stores its username.
	 *
	 * @return string Bot username.
	 *
	 * @throws Bot_Api_Exception When any Bot API call fails.
	 */
	public static function connect(): string {
		$api = Bot_Api::from_options();
		$me  = $api->call( 'getMe' );
		if ( ! is_array( $me ) || empty( $me['username'] ) ) {
			throw new Bot_Api_Exception( esc_html__( 'Telegram did not return the bot profile.', 'mini-shop-for-telegram' ) );
		}

		$api->call(
			'setWebhook',
			array(
				'url'             => Options::webhook_url(),
				'secret_token'    => Options::webhook_secret(),
				'allowed_updates' => array( 'message' ),
			)
		);
		$api->call(
			'setChatMenuButton',
			array(
				'menu_button' => array(
					'type'    => 'web_app',
					'text'    => self::button_text(),
					'web_app' => array( 'url' => Options::app_url() ),
				),
			)
		);

		Options::update(
			array(
				'bot_username'  => sanitize_user( (string) $me['username'], true ),
				'connected_at'  => time(),
				'webhook_error' => '',
			)
		);
		return (string) $me['username'];
	}

	/**
	 * Removes the webhook and menu button. Errors are ignored: the token may already be revoked.
	 */
	public static function disconnect(): void {
		$api = Bot_Api::from_options();
		if ( $api->is_configured() ) {
			try {
				$api->call( 'deleteWebhook' );
				$api->call( 'setChatMenuButton', array( 'menu_button' => array( 'type' => 'default' ) ) );
			} catch ( Bot_Api_Exception $e ) {
				unset( $e );
			}
		}
		Options::update(
			array(
				'bot_username' => '',
				'connected_at' => 0,
			)
		);
	}

	/**
	 * Label of the button that opens the shop.
	 */
	public static function button_text(): string {
		$text = trim( (string) Options::get( 'button_text' ) );
		return '' !== $text ? $text : __( 'Shop', 'mini-shop-for-telegram' );
	}
}
