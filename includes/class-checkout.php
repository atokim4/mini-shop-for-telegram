<?php
/**
 * POST /checkout: turns a Mini App cart into a one-time checkout link.
 *
 * @package MiniShopTelegram
 */

namespace MiniShopTelegram;

defined( 'ABSPATH' ) || exit;

/**
 * Validates the buyer (Telegram initData) and every cart line against live product data.
 * Prices are never taken from the client: WooCommerce prices the cart at checkout.
 */
final class Checkout {

	public const MAX_LINES  = 50;
	public const INIT_HEADER = 'x_telegram_init_data';

	/**
	 * Permission callback: a valid, fresh initData signed for our bot.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return true|\WP_Error
	 */
	public static function authorize( \WP_REST_Request $request ) {
		try {
			self::buyer( $request );
			return true;
		} catch ( Init_Data_Exception $e ) {
			return new \WP_Error(
				'mstg_unauthorized',
				__( 'Open the shop from the Telegram bot to place an order.', 'mini-shop-for-telegram' ),
				array(
					'status' => 401,
					'reason' => $e->getMessage(),
				)
			);
		}
	}

	/**
	 * Verified Telegram buyer of a request.
	 *
	 * @param \WP_REST_Request $request Request.
	 *
	 * @throws Init_Data_Exception When initData is invalid.
	 */
	public static function buyer( \WP_REST_Request $request ): Init_Data {
		$max_age = (int) apply_filters( 'mstg_init_data_max_age', Init_Data::DEFAULT_MAX_AGE );
		return Init_Data::verify( (string) $request->get_header( self::INIT_HEADER ), Options::token(), $max_age );
	}

	/**
	 * Route callback.
	 *
	 * @param \WP_REST_Request $request Request with JSON body {"items":[{"id":1,"variation_id":0,"quantity":2,"attributes":{}}]}.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function create( \WP_REST_Request $request ) {
		$buyer = self::buyer( $request );
		$items = $request->get_param( 'items' );
		if ( ! is_array( $items ) || ! $items || count( $items ) > self::MAX_LINES ) {
			return self::error( 'mstg_empty_cart', __( 'Your cart is empty.', 'mini-shop-for-telegram' ) );
		}

		$lines = array();
		foreach ( array_values( $items ) as $index => $item ) {
			$line = self::line( is_array( $item ) ? $item : array() );
			if ( is_wp_error( $line ) ) {
				return new \WP_Error(
					$line->get_error_code(),
					$line->get_error_message(),
					array(
						'status' => 422,
						'line'   => $index,
					)
				);
			}
			$lines[] = $line;
		}

		$user = array(
			'id'         => $buyer->user_id(),
			'first_name' => sanitize_text_field( (string) ( $buyer->user['first_name'] ?? '' ) ),
			'username'   => sanitize_user( (string) ( $buyer->user['username'] ?? '' ), true ),
		);

		return new \WP_REST_Response(
			array(
				'checkout_url' => Handoff::create( $user, $lines ),
				'expires_in'   => Handoff::TTL,
			),
			201
		);
	}

	/**
	 * Validates one cart line.
	 *
	 * @param array<string, mixed> $item Raw line.
	 * @return array<string, mixed>|\WP_Error
	 */
	private static function line( array $item ) {
		$product_id   = isset( $item['id'] ) && is_int( $item['id'] ) ? $item['id'] : 0;
		$variation_id = isset( $item['variation_id'] ) && is_int( $item['variation_id'] ) ? $item['variation_id'] : 0;
		$quantity     = isset( $item['quantity'] ) && is_int( $item['quantity'] ) ? $item['quantity'] : 0;
		$product      = $product_id > 0 ? wc_get_product( $product_id ) : null;

		if ( ! $product instanceof \WC_Product || ! Catalog::is_sellable( $product ) ) {
			return self::error( 'mstg_unknown_product', __( 'A product in your cart is no longer available.', 'mini-shop-for-telegram' ) );
		}

		$attributes = array();
		$sellable   = $product;
		if ( $product instanceof \WC_Product_Variable ) {
			$variation = $variation_id > 0 ? wc_get_product( $variation_id ) : null;
			if ( ! $variation instanceof \WC_Product_Variation || $variation->get_parent_id() !== $product->get_id() || 'publish' !== $variation->get_status() ) {
				/* translators: %s: product name. */
				return self::error( 'mstg_bad_variation', sprintf( __( 'Choose the options of “%s” again.', 'mini-shop-for-telegram' ), $product->get_name() ) );
			}
			$attributes = self::variation_attributes( $product, $variation, is_array( $item['attributes'] ?? null ) ? $item['attributes'] : array() );
			if ( is_wp_error( $attributes ) ) {
				return $attributes;
			}
			$sellable = $variation;
		} elseif ( 0 !== $variation_id ) {
			return self::error( 'mstg_bad_variation', __( 'A product in your cart is no longer available.', 'mini-shop-for-telegram' ) );
		}

		if ( ! $sellable->is_purchasable() || ! $sellable->is_in_stock() ) {
			/* translators: %s: product name. */
			return self::error( 'mstg_out_of_stock', sprintf( __( '“%s” is out of stock.', 'mini-shop-for-telegram' ), $sellable->get_name() ) );
		}
		if ( $quantity < 1 || $quantity > Catalog::max_qty( $sellable ) || ! $sellable->has_enough_stock( $quantity ) ) {
			/* translators: %s: product name. */
			return self::error( 'mstg_bad_quantity', sprintf( __( 'That quantity of “%s” is not available.', 'mini-shop-for-telegram' ), $sellable->get_name() ) );
		}

		return array(
			'product_id'   => $product->get_id(),
			'variation_id' => $sellable instanceof \WC_Product_Variation ? $sellable->get_id() : 0,
			'quantity'     => $quantity,
			'attributes'   => $attributes,
		);
	}

	/**
	 * Resolves the variation's attributes; "any" attributes must come from the buyer and be valid options.
	 *
	 * @param \WC_Product_Variable  $product   Parent.
	 * @param \WC_Product_Variation $variation Variation.
	 * @param array<string, mixed>  $chosen    Buyer's choices keyed attribute_<slug>.
	 * @return array<string, string>|\WP_Error
	 */
	private static function variation_attributes( \WC_Product_Variable $product, \WC_Product_Variation $variation, array $chosen ) {
		$options = array();
		foreach ( $product->get_variation_attributes() as $name => $values ) {
			$options[ 'attribute_' . sanitize_title( $name ) ] = array_map( 'strval', $values );
		}
		$resolved = array();
		foreach ( $variation->get_variation_attributes( true ) as $key => $value ) {
			if ( '' === $value ) {
				$value = isset( $chosen[ $key ] ) && is_string( $chosen[ $key ] ) ? $chosen[ $key ] : '';
				if ( '' === $value || ! in_array( $value, $options[ $key ] ?? array(), true ) ) {
					/* translators: %s: product name. */
					return self::error( 'mstg_bad_variation', sprintf( __( 'Choose the options of “%s” again.', 'mini-shop-for-telegram' ), $product->get_name() ) );
				}
			}
			$resolved[ $key ] = (string) $value;
		}
		return $resolved;
	}

	/**
	 * 422 error.
	 *
	 * @param string $code    Error code.
	 * @param string $message Message for the buyer.
	 */
	private static function error( string $code, string $message ): \WP_Error {
		return new \WP_Error( $code, $message, array( 'status' => 422 ) );
	}
}
