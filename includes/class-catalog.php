<?php
/**
 * Builds the compact catalog JSON the Mini App renders.
 *
 * @package MiniShopTelegram
 */

namespace MiniShopTelegram;

defined( 'ABSPATH' ) || exit;

/**
 * Reads products through the WooCommerce CRUD API and reshapes them for a phone screen:
 * prices in minor units (like the Store API), plain-text descriptions, one image size.
 */
final class Catalog {

	/**
	 * Hard cap on products per response. A Telegram shop with more should narrow the categories.
	 */
	public const MAX_PRODUCTS = 300;

	/**
	 * Full catalog payload.
	 *
	 * @return array<string, mixed>
	 */
	public static function build(): array {
		$categories = self::categories();
		$query      = array(
			'status'     => 'publish',
			'visibility' => 'catalog',
			'type'       => array( 'simple', 'variable' ),
			'limit'      => self::MAX_PRODUCTS,
			'orderby'    => array(
				'menu_order' => 'ASC',
				'title'      => 'ASC',
			),
			'return'     => 'objects',
		);
		if ( Options::category_ids() ) {
			$slugs = array();
			foreach ( Options::category_ids() as $term_id ) {
				$term = get_term( $term_id, 'product_cat' );
				if ( $term instanceof \WP_Term ) {
					$slugs[] = $term->slug;
				}
			}
			$query['category'] = $slugs ? $slugs : array( '__none__' );
		}
		if ( 'yes' === get_option( 'woocommerce_hide_out_of_stock_items' ) ) {
			$query['stock_status'] = array( 'instock', 'onbackorder' );
		}

		$products = array();
		foreach ( wc_get_products( $query ) as $product ) {
			if ( $product instanceof \WC_Product && $product->is_purchasable() ) {
				$products[] = self::product( $product );
			}
		}

		// Only list categories that have at least one sellable product.
		$used = array();
		foreach ( $products as $product ) {
			foreach ( $product['category_ids'] as $term_id ) {
				$used[ $term_id ] = true;
			}
		}
		$categories = array_values( array_filter( $categories, static fn( $c ) => isset( $used[ $c['id'] ] ) ) );

		return array(
			'store'      => array(
				'title'    => Options::shop_title(),
				'currency' => self::currency(),
			),
			'categories' => $categories,
			'products'   => $products,
		);
	}

	/**
	 * Whether a product may be sold through the Mini App.
	 *
	 * @param \WC_Product $product Simple or variable (parent) product.
	 */
	public static function is_sellable( \WC_Product $product ): bool {
		if ( 'publish' !== $product->get_status() || ! in_array( $product->get_type(), array( 'simple', 'variable' ), true ) ) {
			return false;
		}
		if ( ! in_array( $product->get_catalog_visibility(), array( 'visible', 'catalog' ), true ) ) {
			return false;
		}
		$allowed = Options::category_ids();
		return ! $allowed || array_intersect( $allowed, $product->get_category_ids() );
	}

	/**
	 * Product categories the shop may show (all, or the ones chosen in settings).
	 *
	 * @return array<int, array<string, mixed>>
	 */
	private static function categories(): array {
		$args = array(
			'taxonomy'   => 'product_cat',
			'hide_empty' => true,
			'orderby'    => 'name',
		);
		if ( Options::category_ids() ) {
			$args['include'] = Options::category_ids();
		}
		$terms = get_terms( $args );
		if ( ! is_array( $terms ) ) {
			return array();
		}
		$out = array();
		foreach ( $terms as $term ) {
			if ( 'uncategorized' === $term->slug && ! Options::category_ids() ) {
				continue;
			}
			$out[] = array(
				'id'   => (int) $term->term_id,
				'name' => html_entity_decode( $term->name, ENT_QUOTES ),
			);
		}
		return $out;
	}

	/**
	 * One product.
	 *
	 * @param \WC_Product $product Product.
	 * @return array<string, mixed>
	 */
	private static function product( \WC_Product $product ): array {
		$data = array(
			'id'           => $product->get_id(),
			'type'         => $product->get_type(),
			'name'         => html_entity_decode( $product->get_name(), ENT_QUOTES ),
			'description'  => self::plain( $product->get_short_description() ? $product->get_short_description() : $product->get_description() ),
			'category_ids' => array_map( 'intval', $product->get_category_ids() ),
			'price'        => self::minor( (float) wc_get_price_to_display( $product ) ),
			'regular'      => self::minor( (float) wc_get_price_to_display( $product, array( 'price' => $product->get_regular_price() ) ) ),
			'in_stock'     => $product->is_in_stock(),
			'max_qty'      => self::max_qty( $product ),
			'image'        => self::image( $product->get_image_id() ),
			'gallery'      => array_values( array_filter( array_map( array( self::class, 'image' ), array_slice( $product->get_gallery_image_ids(), 0, 4 ) ) ) ),
		);

		if ( $product instanceof \WC_Product_Variable ) {
			$prices          = $product->get_variation_prices( true );
			$data['price']   = self::minor( (float) ( $prices['price'] ? min( $prices['price'] ) : 0 ) );
			$data['regular'] = self::minor( (float) ( $prices['regular_price'] ? min( $prices['regular_price'] ) : 0 ) );
			$data['price_max'] = self::minor( (float) ( $prices['price'] ? max( $prices['price'] ) : 0 ) );
			$data['attributes'] = self::attributes( $product );
			$data['variations'] = self::variations( $product );
		}
		return $data;
	}

	/**
	 * Variation attributes with their selectable options, in the product's order.
	 *
	 * @param \WC_Product_Variable $product Variable product.
	 * @return array<int, array<string, mixed>>
	 */
	private static function attributes( \WC_Product_Variable $product ): array {
		$out = array();
		foreach ( $product->get_variation_attributes() as $name => $values ) {
			$options = array();
			if ( taxonomy_exists( $name ) ) {
				$terms = wc_get_product_terms( $product->get_id(), $name, array( 'fields' => 'all' ) );
				foreach ( $terms as $term ) {
					if ( in_array( $term->slug, $values, true ) ) {
						$options[] = array(
							'value' => $term->slug,
							'label' => html_entity_decode( $term->name, ENT_QUOTES ),
						);
					}
				}
			} else {
				foreach ( $values as $value ) {
					$options[] = array(
						'value' => $value,
						'label' => $value,
					);
				}
			}
			$out[] = array(
				'key'     => 'attribute_' . sanitize_title( $name ),
				'label'   => html_entity_decode( wc_attribute_label( $name, $product ), ENT_QUOTES ),
				'options' => $options,
			);
		}
		return $out;
	}

	/**
	 * Purchasable variations. An empty attribute value means "any".
	 *
	 * @param \WC_Product_Variable $product Variable product.
	 * @return array<int, array<string, mixed>>
	 */
	private static function variations( \WC_Product_Variable $product ): array {
		$out = array();
		foreach ( $product->get_children() as $child_id ) {
			$variation = wc_get_product( $child_id );
			if ( ! $variation instanceof \WC_Product_Variation || ! $variation->is_purchasable() || 'publish' !== $variation->get_status() ) {
				continue;
			}
			$out[] = array(
				'id'         => $variation->get_id(),
				'attributes' => (object) $variation->get_variation_attributes( true ),
				'price'      => self::minor( (float) wc_get_price_to_display( $variation ) ),
				'regular'    => self::minor( (float) wc_get_price_to_display( $variation, array( 'price' => $variation->get_regular_price() ) ) ),
				'in_stock'   => $variation->is_in_stock(),
				'max_qty'    => self::max_qty( $variation ),
				'image'      => $variation->get_image_id() ? self::image( $variation->get_image_id() ) : null,
			);
		}
		return $out;
	}

	/**
	 * Largest quantity a buyer may put in the cart (99 when stock is not managed).
	 *
	 * @param \WC_Product $product Product or variation.
	 */
	public static function max_qty( \WC_Product $product ): int {
		$max = $product->get_max_purchase_quantity();
		if ( $product->is_sold_individually() ) {
			return 1;
		}
		return $max > 0 ? min( 99, (int) $max ) : 99;
	}

	/**
	 * Image URL and alt text.
	 *
	 * @param int|string $attachment_id Attachment id.
	 * @return array<string, string>|null
	 */
	private static function image( $attachment_id ): ?array {
		$attachment_id = (int) $attachment_id;
		if ( ! $attachment_id ) {
			return null;
		}
		$src = wp_get_attachment_image_src( $attachment_id, 'woocommerce_single' );
		if ( ! $src ) {
			return null;
		}
		return array(
			'src' => (string) $src[0],
			'alt' => (string) get_post_meta( $attachment_id, '_wp_attachment_image_alt', true ),
		);
	}

	/**
	 * Store currency format for the client-side formatter.
	 *
	 * @return array<string, mixed>
	 */
	public static function currency(): array {
		return array(
			'code'      => get_woocommerce_currency(),
			'symbol'    => html_entity_decode( get_woocommerce_currency_symbol(), ENT_QUOTES ),
			'decimals'  => wc_get_price_decimals(),
			'decimal'   => wc_get_price_decimal_separator(),
			'thousand'  => wc_get_price_thousand_separator(),
			'position'  => (string) get_option( 'woocommerce_currency_pos', 'left' ),
		);
	}

	/**
	 * Price in minor units (cents), like the Store API.
	 *
	 * @param float $amount Amount in major units.
	 */
	private static function minor( float $amount ): int {
		return (int) round( $amount * ( 10 ** wc_get_price_decimals() ) );
	}

	/**
	 * HTML description to short plain text.
	 *
	 * @param string $html Description HTML.
	 */
	private static function plain( string $html ): string {
		$text = trim( preg_replace( '/\s+/u', ' ', html_entity_decode( wp_strip_all_tags( strip_shortcodes( $html ) ), ENT_QUOTES ) ) ?? '' );
		return mb_strlen( $text ) > 600 ? rtrim( mb_substr( $text, 0, 597 ) ) . '…' : $text;
	}
}
