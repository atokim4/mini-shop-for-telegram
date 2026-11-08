<?php
/**
 * Class autoloader: MiniShopTelegram\Foo_Bar => includes/class-foo-bar.php.
 *
 * @package MiniShopTelegram
 */

defined( 'ABSPATH' ) || exit;

spl_autoload_register(
	static function ( string $class_name ): void {
		$prefix = 'MiniShopTelegram\\';
		if ( ! str_starts_with( $class_name, $prefix ) ) {
			return;
		}
		$relative = substr( $class_name, strlen( $prefix ) );
		$file     = __DIR__ . '/class-' . strtolower( str_replace( '_', '-', $relative ) ) . '.php';
		if ( is_readable( $file ) ) {
			require_once $file;
		}
	}
);
