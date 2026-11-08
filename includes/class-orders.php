<?php
/**
 * Links WooCommerce orders to the Telegram buyer. HPOS safe: only WC_Order meta APIs are used.
 *
 * @package MiniShopTelegram
 */

namespace MiniShopTelegram;

defined( 'ABSPATH' ) || exit;

/**
 * Copies the Telegram user from the WooCommerce session into the order.
 */
final class Orders {

	public const META_USER_ID  = '_mstg_tg_user_id';
	public const META_USERNAME = '_mstg_tg_username';
	public const SESSION_KEY   = 'mstg_tg_user';

	/**
	 * Hooks.
	 */
	public static function register(): void {
		add_action( 'woocommerce_checkout_create_order', array( self::class, 'attach' ) );
		add_action( 'woocommerce_store_api_checkout_update_order_from_request', array( self::class, 'attach' ) );
		add_action( 'woocommerce_admin_order_data_after_billing_address', array( self::class, 'admin_details' ) );
	}

	/**
	 * Telegram user id of an order, or 0.
	 *
	 * @param \WC_Order $order Order.
	 */
	public static function telegram_user_id( \WC_Order $order ): int {
		return absint( $order->get_meta( self::META_USER_ID ) );
	}

	/**
	 * Adds the buyer's Telegram id to an order that is being created from a Mini App cart.
	 *
	 * @param \WC_Order $order Order (saved by WooCommerce after this hook).
	 */
	public static function attach( $order ): void {
		if ( ! $order instanceof \WC_Order || ! function_exists( 'WC' ) || ! WC()->session ) {
			return;
		}
		$user = WC()->session->get( self::SESSION_KEY );
		if ( ! is_array( $user ) || empty( $user['id'] ) || self::telegram_user_id( $order ) ) {
			return;
		}
		$order->update_meta_data( self::META_USER_ID, (string) absint( $user['id'] ) );
		$order->update_meta_data( self::META_USERNAME, (string) ( $user['username'] ?? '' ) );
	}

	/**
	 * Shows the Telegram buyer on the admin order screen.
	 *
	 * @param \WC_Order $order Order.
	 */
	public static function admin_details( $order ): void {
		if ( ! $order instanceof \WC_Order || ! self::telegram_user_id( $order ) ) {
			return;
		}
		$username = (string) $order->get_meta( self::META_USERNAME );
		echo '<p><strong>' . esc_html__( 'Telegram buyer:', 'mini-shop-for-telegram' ) . '</strong> ';
		if ( '' !== $username ) {
			echo '<a href="' . esc_url( 'https://t.me/' . rawurlencode( $username ) ) . '" target="_blank" rel="noopener noreferrer">@' . esc_html( $username ) . '</a> ';
		}
		/* translators: %d: Telegram user id. */
		echo esc_html( sprintf( __( '(id %d)', 'mini-shop-for-telegram' ), self::telegram_user_id( $order ) ) ) . '</p>';
	}
}
