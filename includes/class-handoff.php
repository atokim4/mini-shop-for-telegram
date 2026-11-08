<?php
/**
 * One-time tokens that carry a validated Mini App cart to the WooCommerce checkout.
 *
 * @package MiniShopTelegram
 */

namespace MiniShopTelegram;

defined( 'ABSPATH' ) || exit;

/**
 * The token is random and only its SHA-256 is stored, so a leaked database row cannot be replayed.
 * Each token works once and expires after TTL seconds.
 */
final class Handoff {

	public const TTL         = 900;
	public const QUERY_VAR   = 'mstg_handoff';
	private const KEY_PREFIX = 'mstg_ho_';

	/**
	 * Stores a cart and returns the checkout URL that redeems it.
	 *
	 * @param array<string, mixed>             $user  Telegram user (id, first_name, username).
	 * @param array<int, array<string, mixed>> $lines Validated cart lines.
	 */
	public static function create( array $user, array $lines ): string {
		$token = wp_generate_password( 40, false, false );
		set_transient(
			self::key( $token ),
			array(
				'user'  => $user,
				'lines' => $lines,
			),
			self::TTL
		);
		return add_query_arg( self::QUERY_VAR, $token, home_url( '/' ) );
	}

	/**
	 * Returns the stored cart and deletes it, or null when the token is unknown, used or expired.
	 *
	 * @param string $token Token from the URL.
	 * @return array<string, mixed>|null
	 */
	public static function consume( string $token ): ?array {
		if ( ! preg_match( '/^[A-Za-z0-9]{40}$/', $token ) ) {
			return null;
		}
		$key     = self::key( $token );
		$payload = get_transient( $key );
		// delete_transient() succeeds once, which stops two parallel requests redeeming the same token.
		if ( ! is_array( $payload ) || ! delete_transient( $key ) ) {
			return null;
		}
		return $payload;
	}

	/**
	 * Transient key for a token.
	 *
	 * @param string $token Token.
	 */
	private static function key( string $token ): string {
		return self::KEY_PREFIX . substr( hash( 'sha256', $token ), 0, 40 );
	}
}
