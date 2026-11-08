<?php
/**
 * Mini App page. Kept outside the theme so it looks native in Telegram.
 *
 * @package MiniShopTelegram
 */

defined( 'ABSPATH' ) || exit;
?><!doctype html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>">
	<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
	<meta name="robots" content="noindex">
	<meta name="color-scheme" content="light dark">
	<title><?php echo esc_html( \MiniShopTelegram\Options::shop_title() ); ?></title>
	<?php wp_print_styles( array( 'mstg-app' ) ); ?>
	<?php wp_print_scripts( array( 'telegram-web-app' ) ); ?>
</head>
<body>
	<div id="mstg-app" class="mstg" aria-live="polite"></div>
	<noscript><?php esc_html_e( 'This shop needs JavaScript. Open it from the Telegram bot.', 'mini-shop-for-telegram' ); ?></noscript>
	<?php wp_print_scripts( array( 'mstg-app' ) ); ?>
</body>
</html>
