<?php
/**
 * REST routes under /wp-json/mstg/v1.
 *
 * @package MiniShopTelegram
 */

namespace MiniShopTelegram;

defined( 'ABSPATH' ) || exit;

/**
 * GET catalog (public), POST checkout (Telegram buyer), POST webhook (Telegram servers).
 */
final class Rest_Controller {

	public const NAMESPACE = 'mstg/v1';

	/**
	 * Registers the routes.
	 */
	public static function register(): void {
		register_rest_route(
			self::NAMESPACE,
			'/catalog',
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( self::class, 'catalog' ),
				// The catalog holds the same public product data as the shop pages.
				'permission_callback' => '__return_true',
			)
		);
		register_rest_route(
			self::NAMESPACE,
			'/checkout',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( Checkout::class, 'create' ),
				'permission_callback' => array( Checkout::class, 'authorize' ),
				'args'                => array(
					'items' => array(
						'type'     => 'array',
						'required' => true,
						'maxItems' => Checkout::MAX_LINES,
						'items'    => array(
							'type'       => 'object',
							'properties' => array(
								'id'           => array(
									'type'     => 'integer',
									'required' => true,
								),
								'variation_id' => array( 'type' => 'integer' ),
								'quantity'     => array(
									'type'     => 'integer',
									'required' => true,
								),
								'attributes'   => array( 'type' => 'object' ),
							),
						),
					),
				),
			)
		);
		register_rest_route(
			self::NAMESPACE,
			'/webhook',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( Webhook::class, 'handle' ),
				'permission_callback' => array( Webhook::class, 'authorize' ),
			)
		);
	}

	/**
	 * GET /catalog.
	 */
	public static function catalog(): \WP_REST_Response {
		$response = new \WP_REST_Response( Catalog::build() );
		$response->header( 'Cache-Control', 'public, max-age=60' );
		return $response;
	}
}
