<?php
/**
 * Plugin Name:          Mini Shop for Telegram
 * Plugin URI:           https://github.com/atokim4/mini-shop-for-telegram
 * Description:          Turns your WooCommerce store into a Telegram Mini App shop run by your own bot: catalog, cart, checkout handoff and order status messages. Self-hosted, no third-party service.
 * Version:              0.1.0
 * Requires at least:    6.6
 * Requires PHP:         8.1
 * Requires Plugins:     woocommerce
 * Author:               Sunnatulla E.
 * Author URI:           https://github.com/atokim4
 * License:              GPL-2.0-or-later
 * License URI:          https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:          mini-shop-for-telegram
 * Domain Path:          /languages
 * WC requires at least: 9.0
 * WC tested up to:      11.2
 *
 * @package MiniShopTelegram
 */

defined( 'ABSPATH' ) || exit;

define( 'MSTG_VERSION', '0.1.0' );
define( 'MSTG_FILE', __FILE__ );
define( 'MSTG_DIR', plugin_dir_path( __FILE__ ) );
define( 'MSTG_URL', plugin_dir_url( __FILE__ ) );

require_once MSTG_DIR . 'includes/autoload.php';

add_action(
	'before_woocommerce_init',
	static function () {
		if ( class_exists( \Automattic\WooCommerce\Utilities\FeaturesUtil::class ) ) {
			\Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'custom_order_tables', __FILE__, true );
			\Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'cart_checkout_blocks', __FILE__, true );
		}
	}
);

add_action( 'plugins_loaded', array( \MiniShopTelegram\Plugin::class, 'boot' ) );
