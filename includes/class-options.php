<?php
/**
 * Typed access to the plugin options.
 *
 * @package MiniShopTelegram
 */

namespace MiniShopTelegram;

defined( 'ABSPATH' ) || exit;

/**
 * The bot token and webhook secret live in their own non-autoloaded options so they are not
 * loaded on every page view and never travel with the public settings array.
 */
final class Options {

	public const TOKEN    = 'mstg_bot_token';
	public const SECRET   = 'mstg_webhook_secret';
	public const SETTINGS = 'mstg_settings';

	/**
	 * Default values of the public settings.
	 *
	 * @return array<string, mixed>
	 */
	public static function defaults(): array {
		return array(
			'bot_username'   => '',
			'shop_title'     => '',
			'welcome'        => '',
			'button_text'    => '',
			'categories'     => array(),
			'accent'         => '',
			'notify_status'  => array( 'processing', 'on-hold', 'completed', 'cancelled', 'refunded' ),
			'connected_at'   => 0,
			'webhook_error'  => '',
		);
	}

	/**
	 * All public settings merged with defaults.
	 *
	 * @return array<string, mixed>
	 */
	public static function all(): array {
		$saved = get_option( self::SETTINGS, array() );
		return array_merge( self::defaults(), is_array( $saved ) ? $saved : array() );
	}

	/**
	 * One public setting.
	 *
	 * @param string $key Setting key.
	 * @return mixed
	 */
	public static function get( string $key ) {
		return self::all()[ $key ] ?? null;
	}

	/**
	 * Merges and saves public settings.
	 *
	 * @param array<string, mixed> $values Values to change.
	 */
	public static function update( array $values ): void {
		update_option( self::SETTINGS, array_merge( self::all(), $values ) );
	}

	/**
	 * Bot token, or '' when not configured.
	 */
	public static function token(): string {
		$token = get_option( self::TOKEN, '' );
		return is_string( $token ) ? $token : '';
	}

	/**
	 * Saves the bot token without autoloading it.
	 *
	 * @param string $token Token from @BotFather.
	 */
	public static function set_token( string $token ): void {
		delete_option( self::TOKEN );
		if ( '' !== $token ) {
			add_option( self::TOKEN, $token, '', false );
		}
	}

	/**
	 * Secret Telegram sends back in the X-Telegram-Bot-Api-Secret-Token header. Created on first use.
	 */
	public static function webhook_secret(): string {
		$secret = get_option( self::SECRET, '' );
		if ( ! is_string( $secret ) || strlen( $secret ) < 32 ) {
			$secret = wp_generate_password( 48, false, false );
			delete_option( self::SECRET );
			add_option( self::SECRET, $secret, '', false );
		}
		return $secret;
	}

	/**
	 * Shop title shown in the Mini App header.
	 */
	public static function shop_title(): string {
		$title = (string) self::get( 'shop_title' );
		return '' !== $title ? $title : get_bloginfo( 'name' );
	}

	/**
	 * Category ids the Mini App shows; empty means all.
	 *
	 * @return int[]
	 */
	public static function category_ids(): array {
		return array_values( array_filter( array_map( 'absint', (array) self::get( 'categories' ) ) ) );
	}

	/**
	 * Public URL of the Mini App page.
	 */
	public static function app_url(): string {
		return add_query_arg( Storefront::APP_QUERY_VAR, '1', home_url( '/' ) );
	}

	/**
	 * Webhook endpoint Telegram posts updates to.
	 */
	public static function webhook_url(): string {
		return rest_url( Rest_Controller::NAMESPACE . '/webhook' );
	}
}
