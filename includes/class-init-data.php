<?php
/**
 * Telegram Mini App initData validation.
 *
 * Implements https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 * Pure PHP so it can be unit tested without WordPress.
 *
 * @package MiniShopTelegram
 */

namespace MiniShopTelegram;

defined( 'ABSPATH' ) || exit;

/**
 * Validates and parses the initData string a Mini App receives from Telegram.
 */
final class Init_Data {

	/**
	 * Default maximum age of initData in seconds (24 hours).
	 */
	public const DEFAULT_MAX_AGE = 86400;

	/**
	 * Parsed, verified fields.
	 *
	 * @param array<string, mixed> $user      Telegram user object (id, first_name, username, language_code...).
	 * @param int                  $auth_date Unix time Telegram signed the data.
	 * @param string               $query_id  Optional query id.
	 * @param string               $start_param Optional deep-link start parameter.
	 */
	private function __construct(
		public readonly array $user,
		public readonly int $auth_date,
		public readonly string $query_id,
		public readonly string $start_param
	) {}

	/**
	 * Telegram user id of the buyer.
	 */
	public function user_id(): int {
		return (int) $this->user['id'];
	}

	/**
	 * Verifies the signature and age, then returns the parsed data.
	 *
	 * @param string   $init_data Raw Telegram.WebApp.initData query string.
	 * @param string   $bot_token Bot token from @BotFather.
	 * @param int      $max_age   Max accepted age in seconds; 0 disables the age check.
	 * @param int|null $now       Current unix time (injectable for tests).
	 *
	 * @throws Init_Data_Exception When the data is missing, tampered with, expired or malformed.
	 */
	public static function verify( string $init_data, string $bot_token, int $max_age = self::DEFAULT_MAX_AGE, ?int $now = null ): self {
		if ( '' === $bot_token ) {
			throw new Init_Data_Exception( 'bot_not_configured' );
		}
		if ( '' === $init_data || strlen( $init_data ) > 8192 ) {
			throw new Init_Data_Exception( 'missing' );
		}

		$fields = self::parse( $init_data );
		$hash   = $fields['hash'] ?? '';
		unset( $fields['hash'] );
		if ( ! is_string( $hash ) || ! preg_match( '/^[a-f0-9]{64}$/', $hash ) ) {
			throw new Init_Data_Exception( 'bad_hash' );
		}

		ksort( $fields, SORT_STRING );
		$lines = array();
		foreach ( $fields as $key => $value ) {
			$lines[] = $key . '=' . $value;
		}
		$secret   = hash_hmac( 'sha256', $bot_token, 'WebAppData', true );
		$expected = hash_hmac( 'sha256', implode( "\n", $lines ), $secret );
		if ( ! hash_equals( $expected, $hash ) ) {
			throw new Init_Data_Exception( 'bad_hash' );
		}

		$auth_date = isset( $fields['auth_date'] ) && ctype_digit( $fields['auth_date'] ) ? (int) $fields['auth_date'] : 0;
		$now       = $now ?? time();
		if ( 0 === $auth_date || $auth_date > $now + 60 ) {
			throw new Init_Data_Exception( 'bad_auth_date' );
		}
		if ( $max_age > 0 && $now - $auth_date > $max_age ) {
			throw new Init_Data_Exception( 'expired' );
		}

		$user = json_decode( $fields['user'] ?? '', true );
		if ( ! is_array( $user ) || ! isset( $user['id'] ) || ! is_int( $user['id'] ) || $user['id'] <= 0 ) {
			throw new Init_Data_Exception( 'no_user' );
		}

		return new self( $user, $auth_date, (string) ( $fields['query_id'] ?? '' ), (string) ( $fields['start_param'] ?? '' ) );
	}

	/**
	 * Splits a query string into decoded key => value pairs without PHP's key mangling.
	 *
	 * @param string $query Raw query string.
	 * @return array<string, string>
	 */
	private static function parse( string $query ): array {
		$fields = array();
		foreach ( explode( '&', $query ) as $pair ) {
			if ( '' === $pair ) {
				continue;
			}
			$parts = explode( '=', $pair, 2 );
			$key   = urldecode( $parts[0] );
			if ( isset( $fields[ $key ] ) ) {
				throw new Init_Data_Exception( 'duplicate_field' );
			}
			$fields[ $key ] = urldecode( $parts[1] ?? '' );
		}
		return $fields;
	}
}
