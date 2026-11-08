<?php
/**
 * Handles updates Telegram posts to the webhook.
 *
 * @package MiniShopTelegram
 */

namespace MiniShopTelegram;

defined( 'ABSPATH' ) || exit;

/**
 * Answers /start (and any other private message) with a button that opens the Mini App.
 */
final class Webhook {

	/**
	 * Permission callback: Telegram must send our secret in X-Telegram-Bot-Api-Secret-Token.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return true|\WP_Error
	 */
	public static function authorize( \WP_REST_Request $request ) {
		$sent = (string) $request->get_header( 'x_telegram_bot_api_secret_token' );
		if ( '' === $sent || '' === Options::token() || ! hash_equals( Options::webhook_secret(), $sent ) ) {
			return new \WP_Error( 'mstg_forbidden', 'Forbidden', array( 'status' => 403 ) );
		}
		return true;
	}

	/**
	 * Processes one update. Always answers 200 so Telegram does not retry forever.
	 *
	 * @param \WP_REST_Request $request Request.
	 */
	public static function handle( \WP_REST_Request $request ): \WP_REST_Response {
		$update  = $request->get_json_params();
		$message = is_array( $update ) && isset( $update['message'] ) && is_array( $update['message'] ) ? $update['message'] : null;
		$chat    = $message['chat'] ?? null;

		if ( is_array( $chat ) && 'private' === ( $chat['type'] ?? '' ) && isset( $chat['id'] ) && is_int( $chat['id'] ) ) {
			try {
				Bot_Api::from_options()->send_message(
					$chat['id'],
					esc_html( self::welcome_text() ),
					array(
						'reply_markup' => array(
							'inline_keyboard' => array(
								array(
									array(
										'text'    => Bot_Setup::button_text(),
										'web_app' => array( 'url' => Options::app_url() ),
									),
								),
							),
						),
					)
				);
			} catch ( Bot_Api_Exception $e ) {
				Options::update( array( 'webhook_error' => sanitize_text_field( $e->text() ) ) );
			}
		}

		return new \WP_REST_Response( array( 'ok' => true ), 200 );
	}

	/**
	 * Greeting sent in reply to /start.
	 */
	private static function welcome_text(): string {
		$text = trim( (string) Options::get( 'welcome' ) );
		if ( '' !== $text ) {
			return $text;
		}
		/* translators: %s: shop name. */
		return sprintf( __( 'Welcome to %s! Tap the button below to browse the catalog and order right here in Telegram.', 'mini-shop-for-telegram' ), Options::shop_title() );
	}
}
