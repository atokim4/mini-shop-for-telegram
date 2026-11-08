<?php
/**
 * Translatable strings used by the Mini App JavaScript.
 *
 * @package MiniShopTelegram
 */

namespace MiniShopTelegram;

defined( 'ABSPATH' ) || exit;

/**
 * Strings are translated in PHP and passed to the app, so one .po file covers PHP and JS.
 */
final class I18n {

	/**
	 * Mini App strings keyed by id.
	 *
	 * @return array<string, string>
	 */
	public static function app_strings(): array {
		return array(
			'all'            => __( 'All', 'mini-shop-for-telegram' ),
			'search'         => __( 'Search products', 'mini-shop-for-telegram' ),
			'add'            => __( 'Add to cart', 'mini-shop-for-telegram' ),
			'added'          => __( 'In cart', 'mini-shop-for-telegram' ),
			'outOfStock'     => __( 'Out of stock', 'mini-shop-for-telegram' ),
			'from'           => __( 'from %s', 'mini-shop-for-telegram' ), // phpcs:ignore WordPress.WP.I18n.MissingTranslatorsComment -- %s: price.
			'choose'         => __( 'Choose %s', 'mini-shop-for-telegram' ), // phpcs:ignore WordPress.WP.I18n.MissingTranslatorsComment -- %s: attribute name.
			'unavailable'    => __( 'This combination is not available', 'mini-shop-for-telegram' ),
			'cart'           => __( 'Cart', 'mini-shop-for-telegram' ),
			'cartEmpty'      => __( 'Your cart is empty', 'mini-shop-for-telegram' ),
			'cartEmptyHint'  => __( 'Add something from the catalog and it will wait here.', 'mini-shop-for-telegram' ),
			'browse'         => __( 'Browse the catalog', 'mini-shop-for-telegram' ),
			'remove'         => __( 'Remove', 'mini-shop-for-telegram' ),
			'decrease'       => __( 'Decrease quantity', 'mini-shop-for-telegram' ),
			'increase'       => __( 'Increase quantity', 'mini-shop-for-telegram' ),
			'subtotal'       => __( 'Subtotal', 'mini-shop-for-telegram' ),
			'shippingNote'   => __( 'Shipping and taxes are calculated at checkout.', 'mini-shop-for-telegram' ),
			'viewCart'       => __( 'View cart · %s', 'mini-shop-for-telegram' ), // phpcs:ignore WordPress.WP.I18n.MissingTranslatorsComment -- %s: subtotal.
			'checkout'       => __( 'Checkout · %s', 'mini-shop-for-telegram' ), // phpcs:ignore WordPress.WP.I18n.MissingTranslatorsComment -- %s: subtotal.
			'loading'        => __( 'Loading the catalog…', 'mini-shop-for-telegram' ),
			'loadError'      => __( 'Could not load the shop. Check your connection.', 'mini-shop-for-telegram' ),
			'retry'          => __( 'Try again', 'mini-shop-for-telegram' ),
			'noProducts'     => __( 'Nothing here yet', 'mini-shop-for-telegram' ),
			'noResults'      => __( 'No products match “%s”', 'mini-shop-for-telegram' ), // phpcs:ignore WordPress.WP.I18n.MissingTranslatorsComment -- %s: search text.
			'checkoutError'  => __( 'Checkout failed. Please try again.', 'mini-shop-for-telegram' ),
			'outsideTg'      => __( 'Open this shop from its Telegram bot to place an order.', 'mini-shop-for-telegram' ),
			'cartChanged'    => __( 'Some items changed since you added them and were updated.', 'mini-shop-for-telegram' ),
			'back'           => __( 'Back', 'mini-shop-for-telegram' ),
		);
	}
}
