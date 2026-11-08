<?php
/**
 * Settings screen markup.
 *
 * @package MiniShopTelegram
 *
 * @var array<string, mixed>  $mstg_settings  Public settings.
 * @var bool                  $mstg_has_token Whether a bot token is saved.
 * @var array|false           $mstg_notice    One-shot notice.
 * @var \WP_Term[]            $mstg_terms     Product categories.
 * @var array<string, string> $mstg_statuses  Order statuses.
 */

use MiniShopTelegram\Options;

defined( 'ABSPATH' ) || exit;

$mstg_connected = $mstg_has_token && '' !== $mstg_settings['bot_username'];
?>
<div class="wrap">
	<h1><?php esc_html_e( 'Mini Shop for Telegram', 'mini-shop-for-telegram' ); ?></h1>

	<?php if ( is_array( $mstg_notice ) ) : ?>
		<div class="notice notice-<?php echo 'error' === $mstg_notice['type'] ? 'error' : 'success'; ?> is-dismissible"><p><?php echo esc_html( $mstg_notice['text'] ); ?></p></div>
	<?php endif; ?>

	<h2><?php esc_html_e( 'Bot status', 'mini-shop-for-telegram' ); ?></h2>
	<table class="form-table" role="presentation">
		<tr>
			<th scope="row"><?php esc_html_e( 'Bot', 'mini-shop-for-telegram' ); ?></th>
			<td>
				<?php if ( $mstg_connected ) : ?>
					<span class="dashicons dashicons-yes-alt" style="color:#008a20" aria-hidden="true"></span>
					<?php
					/* translators: %s: bot username. */
					echo esc_html( sprintf( __( 'Connected to @%s', 'mini-shop-for-telegram' ), $mstg_settings['bot_username'] ) );
					?>
					&nbsp;<a href="<?php echo esc_url( 'https://t.me/' . rawurlencode( (string) $mstg_settings['bot_username'] ) ); ?>" target="_blank" rel="noopener noreferrer"><?php esc_html_e( 'Open in Telegram', 'mini-shop-for-telegram' ); ?></a>
				<?php elseif ( $mstg_has_token ) : ?>
					<?php esc_html_e( 'Token saved, bot not connected.', 'mini-shop-for-telegram' ); ?>
				<?php else : ?>
					<?php esc_html_e( 'Not set up. Create a bot with @BotFather and paste its token below.', 'mini-shop-for-telegram' ); ?>
				<?php endif; ?>
				<?php if ( '' !== $mstg_settings['webhook_error'] ) : ?>
					<p class="description" style="color:#b32d2e">
						<?php
						/* translators: %s: last error from Telegram. */
						echo esc_html( sprintf( __( 'Last Telegram error: %s', 'mini-shop-for-telegram' ), $mstg_settings['webhook_error'] ) );
						?>
					</p>
				<?php endif; ?>
			</td>
		</tr>
		<tr>
			<th scope="row"><label for="mstg-app-url"><?php esc_html_e( 'Mini App URL', 'mini-shop-for-telegram' ); ?></label></th>
			<td>
				<input id="mstg-app-url" type="url" class="large-text code" readonly value="<?php echo esc_attr( Options::app_url() ); ?>">
				<p class="description"><?php esc_html_e( 'Set automatically as the bot menu button. Telegram needs an HTTPS site.', 'mini-shop-for-telegram' ); ?></p>
			</td>
		</tr>
	</table>
	<?php if ( $mstg_has_token ) : ?>
		<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" style="display:inline">
			<?php wp_nonce_field( 'mstg_connect' ); ?>
			<input type="hidden" name="action" value="mstg_connect">
			<?php submit_button( $mstg_connected ? __( 'Reconnect bot', 'mini-shop-for-telegram' ) : __( 'Connect bot', 'mini-shop-for-telegram' ), 'secondary', 'submit', false ); ?>
		</form>
		<?php if ( $mstg_connected ) : ?>
			<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" style="display:inline">
				<?php wp_nonce_field( 'mstg_disconnect' ); ?>
				<input type="hidden" name="action" value="mstg_disconnect">
				<?php submit_button( __( 'Disconnect', 'mini-shop-for-telegram' ), 'link-delete', 'submit', false ); ?>
			</form>
		<?php endif; ?>
	<?php endif; ?>

	<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
		<?php wp_nonce_field( 'mstg_save' ); ?>
		<input type="hidden" name="action" value="mstg_save">

		<h2><?php esc_html_e( 'Bot', 'mini-shop-for-telegram' ); ?></h2>
		<table class="form-table" role="presentation">
			<tr>
				<th scope="row"><label for="mstg-token"><?php esc_html_e( 'Bot token', 'mini-shop-for-telegram' ); ?></label></th>
				<td>
					<input id="mstg-token" name="bot_token" type="password" class="regular-text code" autocomplete="off" spellcheck="false"
						placeholder="<?php echo esc_attr( $mstg_has_token ? __( 'Saved. Paste a new token to replace it.', 'mini-shop-for-telegram' ) : '123456789:AA...' ); ?>">
					<p class="description"><?php esc_html_e( 'Stored on this site only and never shown again. Saving a new token connects the bot.', 'mini-shop-for-telegram' ); ?></p>
					<?php if ( $mstg_has_token ) : ?>
						<label><input type="checkbox" name="remove_token" value="1"> <?php esc_html_e( 'Remove the saved token', 'mini-shop-for-telegram' ); ?></label>
					<?php endif; ?>
				</td>
			</tr>
			<tr>
				<th scope="row"><label for="mstg-welcome"><?php esc_html_e( 'Reply to /start', 'mini-shop-for-telegram' ); ?></label></th>
				<td><textarea id="mstg-welcome" name="welcome" rows="3" class="large-text" placeholder="<?php esc_attr_e( 'Default: a short welcome with the shop name.', 'mini-shop-for-telegram' ); ?>"><?php echo esc_textarea( (string) $mstg_settings['welcome'] ); ?></textarea></td>
			</tr>
			<tr>
				<th scope="row"><label for="mstg-button"><?php esc_html_e( 'Button text', 'mini-shop-for-telegram' ); ?></label></th>
				<td><input id="mstg-button" name="button_text" type="text" maxlength="30" class="regular-text" value="<?php echo esc_attr( (string) $mstg_settings['button_text'] ); ?>" placeholder="<?php esc_attr_e( 'Shop', 'mini-shop-for-telegram' ); ?>"></td>
			</tr>
		</table>

		<h2><?php esc_html_e( 'Storefront', 'mini-shop-for-telegram' ); ?></h2>
		<table class="form-table" role="presentation">
			<tr>
				<th scope="row"><label for="mstg-title"><?php esc_html_e( 'Shop title', 'mini-shop-for-telegram' ); ?></label></th>
				<td><input id="mstg-title" name="shop_title" type="text" class="regular-text" value="<?php echo esc_attr( (string) $mstg_settings['shop_title'] ); ?>" placeholder="<?php echo esc_attr( get_bloginfo( 'name' ) ); ?>"></td>
			</tr>
			<tr>
				<th scope="row"><label for="mstg-accent"><?php esc_html_e( 'Accent colour', 'mini-shop-for-telegram' ); ?></label></th>
				<td>
					<input id="mstg-accent" name="accent" type="text" class="code" style="width:8em" pattern="#[0-9a-fA-F]{6}" value="<?php echo esc_attr( (string) $mstg_settings['accent'] ); ?>" placeholder="#d9480f">
					<p class="description"><?php esc_html_e( 'Hex colour for prices and badges. Leave empty to follow the buyer’s Telegram theme.', 'mini-shop-for-telegram' ); ?></p>
				</td>
			</tr>
			<tr>
				<th scope="row"><?php esc_html_e( 'Categories', 'mini-shop-for-telegram' ); ?></th>
				<td>
					<fieldset>
						<legend class="screen-reader-text"><?php esc_html_e( 'Categories', 'mini-shop-for-telegram' ); ?></legend>
						<?php foreach ( $mstg_terms as $mstg_term ) : ?>
							<label style="display:block"><input type="checkbox" name="categories[]" value="<?php echo esc_attr( (string) $mstg_term->term_id ); ?>" <?php checked( in_array( (int) $mstg_term->term_id, (array) $mstg_settings['categories'], true ) ); ?>> <?php echo esc_html( $mstg_term->name ); ?></label>
						<?php endforeach; ?>
						<p class="description"><?php esc_html_e( 'None ticked: the whole catalog (simple and variable products).', 'mini-shop-for-telegram' ); ?></p>
					</fieldset>
				</td>
			</tr>
		</table>

		<h2><?php esc_html_e( 'Buyer messages', 'mini-shop-for-telegram' ); ?></h2>
		<table class="form-table" role="presentation">
			<tr>
				<th scope="row"><?php esc_html_e( 'Send a Telegram message when an order becomes', 'mini-shop-for-telegram' ); ?></th>
				<td>
					<fieldset>
						<legend class="screen-reader-text"><?php esc_html_e( 'Order statuses', 'mini-shop-for-telegram' ); ?></legend>
						<?php foreach ( $mstg_statuses as $mstg_status => $mstg_label ) : ?>
							<label style="display:block"><input type="checkbox" name="notify_status[]" value="<?php echo esc_attr( $mstg_status ); ?>" <?php checked( in_array( $mstg_status, (array) $mstg_settings['notify_status'], true ) ); ?>> <?php echo esc_html( $mstg_label ); ?></label>
						<?php endforeach; ?>
					</fieldset>
				</td>
			</tr>
		</table>

		<?php submit_button(); ?>
	</form>
</div>
