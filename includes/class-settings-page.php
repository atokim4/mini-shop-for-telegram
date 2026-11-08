<?php
/**
 * WooCommerce → Telegram Mini Shop settings screen.
 *
 * @package MiniShopTelegram
 */

namespace MiniShopTelegram;

defined( 'ABSPATH' ) || exit;

/**
 * Plain admin-post handlers instead of the Settings API so the bot token is write-only:
 * it is stored non-autoloaded and never printed back into the page.
 */
final class Settings_Page {

	public const SLUG       = 'mini-shop-for-telegram';
	private const CAP       = 'manage_woocommerce';
	private const NOTICE    = 'mstg_notice_';

	/**
	 * Hooks.
	 */
	public static function register(): void {
		add_action( 'admin_menu', array( self::class, 'menu' ) );
		add_action( 'admin_post_mstg_save', array( self::class, 'save' ) );
		add_action( 'admin_post_mstg_connect', array( self::class, 'connect' ) );
		add_action( 'admin_post_mstg_disconnect', array( self::class, 'disconnect' ) );
		add_filter( 'plugin_action_links_' . plugin_basename( MSTG_FILE ), array( self::class, 'action_links' ) );
	}

	/**
	 * Settings page URL.
	 */
	public static function url(): string {
		return admin_url( 'admin.php?page=' . self::SLUG );
	}

	/**
	 * Adds the submenu under WooCommerce.
	 */
	public static function menu(): void {
		add_submenu_page(
			'woocommerce',
			__( 'Mini Shop for Telegram', 'mini-shop-for-telegram' ),
			__( 'Telegram Mini Shop', 'mini-shop-for-telegram' ),
			self::CAP,
			self::SLUG,
			array( self::class, 'render' )
		);
	}

	/**
	 * "Settings" link on the Plugins screen.
	 *
	 * @param string[] $links Links.
	 * @return string[]
	 */
	public static function action_links( array $links ): array {
		array_unshift( $links, '<a href="' . esc_url( self::url() ) . '">' . esc_html__( 'Settings', 'mini-shop-for-telegram' ) . '</a>' );
		return $links;
	}

	/**
	 * Saves the form, and connects the bot when a new token was entered.
	 */
	public static function save(): void {
		self::guard( 'mstg_save' );

		// phpcs:disable WordPress.Security.NonceVerification.Missing -- verified in guard().
		$token      = isset( $_POST['bot_token'] ) ? trim( sanitize_text_field( wp_unslash( $_POST['bot_token'] ) ) ) : '';
		$categories = isset( $_POST['categories'] ) ? array_map( 'absint', (array) wp_unslash( $_POST['categories'] ) ) : array();
		$statuses   = isset( $_POST['notify_status'] ) ? array_map( 'sanitize_key', (array) wp_unslash( $_POST['notify_status'] ) ) : array();
		$accent     = isset( $_POST['accent'] ) ? sanitize_hex_color( sanitize_text_field( wp_unslash( $_POST['accent'] ) ) ) : '';
		Options::update(
			array(
				'shop_title'    => isset( $_POST['shop_title'] ) ? sanitize_text_field( wp_unslash( $_POST['shop_title'] ) ) : '',
				'welcome'       => isset( $_POST['welcome'] ) ? sanitize_textarea_field( wp_unslash( $_POST['welcome'] ) ) : '',
				'button_text'   => isset( $_POST['button_text'] ) ? mb_substr( sanitize_text_field( wp_unslash( $_POST['button_text'] ) ), 0, 30 ) : '',
				'accent'        => $accent ? $accent : '',
				'categories'    => array_values( array_filter( $categories ) ),
				'notify_status' => array_values( array_intersect( $statuses, array_keys( self::statuses() ) ) ),
			)
		);
		$remove = ! empty( $_POST['remove_token'] );
		// phpcs:enable WordPress.Security.NonceVerification.Missing

		if ( $remove ) {
			Bot_Setup::disconnect();
			Options::set_token( '' );
			self::redirect( 'success', __( 'Settings saved. The bot token was removed.', 'mini-shop-for-telegram' ) );
		}
		if ( '' !== $token ) {
			if ( ! preg_match( '/^\d{3,}:[A-Za-z0-9_-]{20,}$/', $token ) ) {
				self::redirect( 'error', __( 'Settings saved, but that does not look like a bot token. Copy it from @BotFather again.', 'mini-shop-for-telegram' ) );
			}
			if ( Options::token() !== $token ) {
				Options::set_token( $token );
				self::connect_and_redirect();
			}
		}
		self::redirect( 'success', __( 'Settings saved.', 'mini-shop-for-telegram' ) );
	}

	/**
	 * Re-runs the bot setup (for example after the site URL changed).
	 */
	public static function connect(): void {
		self::guard( 'mstg_connect' );
		self::connect_and_redirect();
	}

	/**
	 * Removes the webhook and the menu button.
	 */
	public static function disconnect(): void {
		self::guard( 'mstg_disconnect' );
		Bot_Setup::disconnect();
		self::redirect( 'success', __( 'Bot disconnected. The token is still saved.', 'mini-shop-for-telegram' ) );
	}

	/**
	 * Connects and redirects with the result.
	 *
	 * @return never
	 */
	private static function connect_and_redirect(): void {
		try {
			$username = Bot_Setup::connect();
			/* translators: %s: bot username. */
			self::redirect( 'success', sprintf( __( 'Connected to @%s. Open the bot in Telegram and send /start.', 'mini-shop-for-telegram' ), $username ) );
		} catch ( Bot_Api_Exception $e ) {
			Options::update( array( 'webhook_error' => sanitize_text_field( $e->text() ) ) );
			/* translators: %s: error from Telegram. */
			self::redirect( 'error', sprintf( __( 'Telegram said: %s', 'mini-shop-for-telegram' ), $e->text() ) );
		}
	}

	/**
	 * Capability + nonce check for admin-post handlers.
	 *
	 * @param string $action Nonce action.
	 */
	private static function guard( string $action ): void {
		if ( ! current_user_can( self::CAP ) ) {
			wp_die( esc_html__( 'You are not allowed to change these settings.', 'mini-shop-for-telegram' ), 403 );
		}
		check_admin_referer( $action );
	}

	/**
	 * Stores a one-shot notice for the current user and returns to the settings page.
	 *
	 * @param string $type    success|error.
	 * @param string $message Text.
	 * @return never
	 */
	private static function redirect( string $type, string $message ): void {
		set_transient(
			self::NOTICE . get_current_user_id(),
			array(
				'type' => $type,
				'text' => $message,
			),
			60
		);
		wp_safe_redirect( self::url() );
		exit;
	}

	/**
	 * Order statuses the buyer can be told about.
	 *
	 * @return array<string, string> status (without wc-) => label.
	 */
	public static function statuses(): array {
		$out = array();
		foreach ( wc_get_order_statuses() as $key => $label ) {
			$out[ substr( $key, 3 ) ] = $label;
		}
		unset( $out['pending'], $out['checkout-draft'], $out['failed'] );
		return $out;
	}

	/**
	 * Renders the page.
	 */
	public static function render(): void {
		if ( ! current_user_can( self::CAP ) ) {
			return;
		}
		// Template variables carry the plugin prefix (they are locals, but sniffs read templates as global scope).
		$mstg_settings  = Options::all();
		$mstg_has_token = '' !== Options::token();
		$mstg_notice    = get_transient( self::NOTICE . get_current_user_id() );
		delete_transient( self::NOTICE . get_current_user_id() );
		$mstg_terms = get_terms(
			array(
				'taxonomy'   => 'product_cat',
				'hide_empty' => false,
			)
		);
		$mstg_terms    = is_array( $mstg_terms ) ? $mstg_terms : array();
		$mstg_statuses = self::statuses();
		require MSTG_DIR . 'templates/admin-settings.php';
	}
}
