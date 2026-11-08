<?php
/**
 * Bootstrap.
 *
 * @package MiniShopTelegram
 */

namespace MiniShopTelegram;

defined( 'ABSPATH' ) || exit;

/**
 * Wires the plugin into WordPress once WooCommerce is available.
 */
final class Plugin {

	/**
	 * Runs on plugins_loaded.
	 */
	public static function boot(): void {
		add_action( 'init', array( self::class, 'load_textdomain' ) );
		if ( ! class_exists( 'WooCommerce' ) ) {
			add_action( 'admin_notices', array( self::class, 'missing_woocommerce' ) );
			return;
		}
		add_action( 'rest_api_init', array( Rest_Controller::class, 'register' ) );
		Storefront::register();
		Orders::register();
		Notifications::register();
		if ( is_admin() ) {
			Settings_Page::register();
		}
	}

	/**
	 * Loads the bundled ru/uz translations. Language packs from translate.wordpress.org take precedence.
	 */
	public static function load_textdomain(): void {
		load_plugin_textdomain( 'mini-shop-for-telegram', false, dirname( plugin_basename( MSTG_FILE ) ) . '/languages' ); // phpcs:ignore PluginCheck.CodeAnalysis.DiscouragedFunctions.load_plugin_textdomainFound -- the plugin also ships outside wordpress.org.
	}

	/**
	 * Admin notice when WooCommerce is not active.
	 */
	public static function missing_woocommerce(): void {
		if ( current_user_can( 'activate_plugins' ) ) {
			echo '<div class="notice notice-error"><p>' . esc_html__( 'Mini Shop for Telegram needs WooCommerce to be installed and active.', 'mini-shop-for-telegram' ) . '</p></div>';
		}
	}
}
