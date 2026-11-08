<?php
/**
 * Raised when Telegram initData fails validation.
 *
 * @package MiniShopTelegram
 */

namespace MiniShopTelegram;

defined( 'ABSPATH' ) || exit;

/**
 * The message is a short machine code: missing, bad_hash, bad_auth_date, expired, no_user,
 * duplicate_field or bot_not_configured.
 */
final class Init_Data_Exception extends \RuntimeException {}
