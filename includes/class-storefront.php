<?php
/**
 * Front-end entry points: the Mini App page and the checkout handoff link.
 *
 * @package MiniShopTelegram
 */

namespace MiniShopTelegram;

defined( 'ABSPATH' ) || exit;

/**
 * Serves /?mstg_app=1 (the Mini App) and /?mstg_handoff=<token> (fills the cart, then redirects to checkout).
 */
final class Storefront {

	public const APP_QUERY_VAR = 'mstg_app';
	public const TELEGRAM_SDK  = 'https://telegram.org/js/telegram-web-app.js';

	/**
	 * Hooks.
	 */
	public static function register(): void {
		add_filter( 'query_vars', array( self::class, 'query_vars' ) );
		add_action( 'template_redirect', array( self::class, 'route' ), 1 );
	}

	/**
	 * Public query vars.
	 *
	 * @param string[] $vars Vars.
	 * @return string[]
	 */
	public static function query_vars( array $vars ): array {
		$vars[] = self::APP_QUERY_VAR;
		$vars[] = Handoff::QUERY_VAR;
		return $vars;
	}

	/**
	 * Dispatches our two URLs; any other request passes through.
	 */
	public static function route(): void {
		$token = (string) get_query_var( Handoff::QUERY_VAR );
		if ( '' !== $token ) {
			self::redeem( $token );
		}
		if ( '1' === (string) get_query_var( self::APP_QUERY_VAR ) ) {
			self::render_app();
		}
	}

	/**
	 * Fills the WooCommerce cart from a handoff token and sends the buyer to checkout.
	 *
	 * @param string $token Handoff token.
	 * @return never
	 */
	private static function redeem( string $token ): void {
		nocache_headers();
		$payload = Handoff::consume( $token );
		if ( null === $payload || ! WC()->session || ! WC()->cart ) {
			wc_add_notice( __( 'This checkout link has expired. Open the shop in Telegram and tap Checkout again.', 'mini-shop-for-telegram' ), 'error' );
			wp_safe_redirect( wc_get_cart_url() );
			exit;
		}

		WC()->session->set_customer_session_cookie( true );
		WC()->cart->empty_cart();
		foreach ( (array) $payload['lines'] as $line ) {
			// add_to_cart() re-checks stock and adds its own notice when a line cannot be added.
			WC()->cart->add_to_cart( (int) $line['product_id'], (int) $line['quantity'], (int) $line['variation_id'], (array) $line['attributes'] );
		}
		WC()->session->set( Orders::SESSION_KEY, $payload['user'] );

		wp_safe_redirect( WC()->cart->is_empty() ? wc_get_cart_url() : wc_get_checkout_url() );
		exit;
	}

	/**
	 * Outputs the Mini App page.
	 *
	 * @return never
	 */
	private static function render_app(): void {
		nocache_headers();
		header( 'Content-Type: text/html; charset=' . get_bloginfo( 'charset' ) );
		$asset = MSTG_DIR . 'assets/app.asset.php';
		$ver   = is_readable( $asset ) ? (string) ( include $asset )['version'] : MSTG_VERSION;

		// The Telegram SDK must load from telegram.org: it is the bridge to the Telegram client.
		wp_register_script( 'telegram-web-app', self::TELEGRAM_SDK, array(), null, false ); // phpcs:ignore WordPress.WP.EnqueuedResourceParameters.MissingVersion
		wp_register_script( 'mstg-app', MSTG_URL . 'assets/app.js', array( 'telegram-web-app' ), $ver, true );
		wp_register_style( 'mstg-app', MSTG_URL . 'assets/app.css', array(), $ver );
		wp_add_inline_script( 'mstg-app', 'window.mstgConfig = ' . wp_json_encode( self::config() ) . ';', 'before' );

		load_template( MSTG_DIR . 'templates/app.php', false );
		exit;
	}

	/**
	 * Settings the Mini App needs at boot.
	 *
	 * @return array<string, mixed>
	 */
	private static function config(): array {
		$accent = sanitize_hex_color( (string) Options::get( 'accent' ) );
		return array(
			'restUrl' => esc_url_raw( rest_url( Rest_Controller::NAMESPACE . '/' ) ),
			'title'   => Options::shop_title(),
			'accent'  => $accent ? $accent : '',
			'locale'  => str_replace( '_', '-', determine_locale() ),
			'i18n'    => I18n::app_strings(),
		);
	}
}
