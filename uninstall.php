<?php
/**
 * Removes the plugin's options and pending handoff tokens. Orders keep their Telegram meta,
 * because they are the merchant's records.
 *
 * @package MiniShopTelegram
 */

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

$mstg_token = get_option( 'mstg_bot_token', '' );
if ( is_string( $mstg_token ) && '' !== $mstg_token ) {
	// Stop Telegram from posting to a webhook that no longer exists.
	wp_remote_post( 'https://api.telegram.org/bot' . $mstg_token . '/deleteWebhook', array( 'timeout' => 5 ) );
}

delete_option( 'mstg_bot_token' );
delete_option( 'mstg_webhook_secret' );
delete_option( 'mstg_settings' );

global $wpdb;
// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- one-off cleanup of our own transients.
$wpdb->query( "DELETE FROM {$wpdb->options} WHERE option_name LIKE '\\_transient\\_mstg\\_ho\\_%' OR option_name LIKE '\\_transient\\_timeout\\_mstg\\_ho\\_%'" );
