<?php
/**
 * Tells Telegram buyers when their order status changes.
 *
 * @package MiniShopTelegram
 */

namespace MiniShopTelegram;

defined( 'ABSPATH' ) || exit;

/**
 * Status changes are queued with Action Scheduler (bundled with WooCommerce) so a bulk edit in the
 * admin never waits on Telegram. The message is built when the action runs, from the live order.
 */
final class Notifications {

	public const ACTION = 'mstg_send_status_message';
	public const GROUP  = 'mini-shop-for-telegram';

	/**
	 * Hooks.
	 */
	public static function register(): void {
		add_action( 'woocommerce_order_status_changed', array( self::class, 'queue' ), 10, 3 );
		add_action( self::ACTION, array( self::class, 'send' ), 10, 2 );
	}

	/**
	 * Queues a message for an order that came from the Mini App.
	 *
	 * @param int    $order_id Order id.
	 * @param string $from     Old status.
	 * @param string $to       New status.
	 */
	public static function queue( $order_id, $from, $to ): void {
		unset( $from );
		$order = wc_get_order( $order_id );
		if ( ! $order instanceof \WC_Order || ! Orders::telegram_user_id( $order ) ) {
			return;
		}
		if ( ! in_array( (string) $to, (array) Options::get( 'notify_status' ), true ) ) {
			return;
		}
		$args = array( (int) $order_id, (string) $to );
		if ( function_exists( 'as_enqueue_async_action' ) ) {
			as_enqueue_async_action( self::ACTION, $args, self::GROUP );
		} else {
			self::send( ...$args );
		}
	}

	/**
	 * Sends the message. Skips it when the order moved on to another status in the meantime.
	 *
	 * @param int    $order_id Order id.
	 * @param string $status   Status the message is about.
	 */
	public static function send( $order_id, $status ): void {
		$order = wc_get_order( $order_id );
		if ( ! $order instanceof \WC_Order || $order->get_status() !== $status ) {
			return;
		}
		$chat_id = Orders::telegram_user_id( $order );
		$api     = Bot_Api::from_options();
		if ( ! $chat_id || ! $api->is_configured() ) {
			return;
		}
		try {
			$api->send_message( $chat_id, self::text( $order ) );
			/* translators: %s: order status label. */
			$order->add_order_note( sprintf( __( 'Telegram: buyer was told the order is “%s”.', 'mini-shop-for-telegram' ), wc_get_order_status_name( $status ) ) );
		} catch ( Bot_Api_Exception $e ) {
			/* translators: %s: error from Telegram. */
			$order->add_order_note( sprintf( __( 'Telegram message failed: %s', 'mini-shop-for-telegram' ), $e->text() ) );
		}
	}

	/**
	 * Message text (Telegram HTML).
	 *
	 * @param \WC_Order $order Order.
	 */
	public static function text( \WC_Order $order ): string {
		$status = $order->get_status();
		$lines  = array(
			sprintf(
				/* translators: 1: order number, 2: status label. */
				__( 'Order %1$s: %2$s', 'mini-shop-for-telegram' ),
				'<b>#' . esc_html( $order->get_order_number() ) . '</b>',
				'<b>' . esc_html( wc_get_order_status_name( $status ) ) . '</b>'
			),
		);
		$hint = self::status_hint( $status );
		if ( '' !== $hint ) {
			$lines[] = esc_html( $hint );
		}
		$lines[] = '';
		foreach ( $order->get_items() as $item ) {
			$lines[] = esc_html( sprintf( '%d × %s', $item->get_quantity(), wp_strip_all_tags( $item->get_name() ) ) );
		}
		/* translators: %s: order total. */
		$lines[] = esc_html( sprintf( __( 'Total: %s', 'mini-shop-for-telegram' ), html_entity_decode( wp_strip_all_tags( wc_price( (float) $order->get_total(), array( 'currency' => $order->get_currency() ) ) ), ENT_QUOTES ) ) );

		/**
		 * Filters the Telegram message sent to the buyer (Telegram HTML; escape what you add).
		 *
		 * @param string    $text  Message.
		 * @param \WC_Order $order Order.
		 */
		return (string) apply_filters( 'mstg_status_message', implode( "\n", $lines ), $order );
	}

	/**
	 * Short human sentence per core status.
	 *
	 * @param string $status Status without wc- prefix.
	 */
	private static function status_hint( string $status ): string {
		switch ( $status ) {
			case 'processing':
				return __( 'Payment received. We are preparing your order.', 'mini-shop-for-telegram' );
			case 'on-hold':
				return __( 'We are waiting for your payment to be confirmed.', 'mini-shop-for-telegram' );
			case 'completed':
				return __( 'Your order is complete. Thank you for shopping with us!', 'mini-shop-for-telegram' );
			case 'cancelled':
				return __( 'Your order was cancelled. Contact the shop if you have questions.', 'mini-shop-for-telegram' );
			case 'refunded':
				return __( 'Your order was refunded.', 'mini-shop-for-telegram' );
			default:
				return '';
		}
	}
}
