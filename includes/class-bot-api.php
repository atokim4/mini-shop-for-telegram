<?php
/**
 * Minimal Telegram Bot API client on top of the WordPress HTTP API.
 *
 * @package MiniShopTelegram
 */

namespace MiniShopTelegram;

defined( 'ABSPATH' ) || exit;

/**
 * Calls https://api.telegram.org/bot<token>/<method>. The base URL can be changed with the
 * `mstg_bot_api_base` filter (used by the test suite to point at a local fake Bot API).
 */
final class Bot_Api {

	/**
	 * Constructor.
	 *
	 * @param string $token Bot token.
	 */
	public function __construct( private string $token ) {}

	/**
	 * Client for the configured bot.
	 */
	public static function from_options(): self {
		return new self( Options::token() );
	}

	/**
	 * Whether a token is configured.
	 */
	public function is_configured(): bool {
		return '' !== $this->token;
	}

	/**
	 * Calls a Bot API method and returns its `result`.
	 *
	 * @param string               $method Bot API method, e.g. sendMessage.
	 * @param array<string, mixed> $params JSON parameters.
	 * @return mixed
	 *
	 * @throws Bot_Api_Exception On transport errors or when Telegram answers ok=false.
	 */
	public function call( string $method, array $params = array() ) {
		if ( ! $this->is_configured() ) {
			throw new Bot_Api_Exception( 'Bot token is not set.' ); // Static text, nothing to escape.
		}
		$base     = untrailingslashit( (string) apply_filters( 'mstg_bot_api_base', 'https://api.telegram.org' ) );
		$response = wp_remote_post(
			$base . '/bot' . $this->token . '/' . rawurlencode( $method ),
			array(
				'timeout' => 10,
				'headers' => array( 'Content-Type' => 'application/json' ),
				'body'    => (string) wp_json_encode( (object) $params ),
			)
		);
		if ( is_wp_error( $response ) ) {
			// Transport messages from cURL can include the request URL, and with it the token.
			throw new Bot_Api_Exception( esc_html( str_replace( $this->token, '***', $response->get_error_message() ) ) );
		}
		$body = json_decode( (string) wp_remote_retrieve_body( $response ), true );
		if ( ! is_array( $body ) ) {
			/* translators: %d: HTTP status code. */
			throw new Bot_Api_Exception( esc_html( sprintf( __( 'Unexpected answer from Telegram (HTTP %d).', 'mini-shop-for-telegram' ), (int) wp_remote_retrieve_response_code( $response ) ) ) );
		}
		if ( empty( $body['ok'] ) ) {
			throw new Bot_Api_Exception( esc_html( (string) ( $body['description'] ?? __( 'Telegram rejected the request.', 'mini-shop-for-telegram' ) ) ) );
		}
		return $body['result'] ?? null;
	}

	/**
	 * Sends a text message.
	 *
	 * @param int                  $chat_id Chat id (for private chats this is the user id).
	 * @param string               $text    Text with HTML formatting.
	 * @param array<string, mixed> $extra   Extra sendMessage parameters.
	 * @return mixed
	 */
	public function send_message( int $chat_id, string $text, array $extra = array() ) {
		return $this->call(
			'sendMessage',
			array_merge(
				array(
					'chat_id'              => $chat_id,
					'text'                 => $text,
					'parse_mode'           => 'HTML',
					'link_preview_options' => array( 'is_disabled' => true ),
				),
				$extra
			)
		);
	}
}
