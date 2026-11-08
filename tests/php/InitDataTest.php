<?php
/**
 * Tests for Telegram initData validation.
 *
 * @package MiniShopTelegram
 */

use MiniShopTelegram\Init_Data;
use MiniShopTelegram\Init_Data_Exception;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class InitDataTest extends TestCase {

	private const TOKEN = '123456:TEST-token-for-unit-tests';
	private const NOW   = 1_760_000_000;

	/**
	 * Signs fields the way Telegram does and returns the query string.
	 *
	 * @param array<string, string> $fields Fields without hash.
	 */
	private static function sign( array $fields, string $token = self::TOKEN ): string {
		ksort( $fields );
		$check  = implode( "\n", array_map( fn( $k, $v ) => "$k=$v", array_keys( $fields ), $fields ) );
		$secret = hash_hmac( 'sha256', $token, 'WebAppData', true );
		$fields['hash'] = hash_hmac( 'sha256', $check, $secret );
		return http_build_query( $fields, '', '&', PHP_QUERY_RFC3986 );
	}

	private static function fields( array $override = array() ): array {
		return array_merge(
			array(
				'query_id'  => 'AAE-test',
				'user'      => json_encode( array( 'id' => 42, 'first_name' => 'Ана & Co', 'username' => 'ana', 'language_code' => 'ru' ), JSON_UNESCAPED_UNICODE ),
				'auth_date' => (string) ( self::NOW - 60 ),
			),
			$override
		);
	}

	public function test_valid_data_is_parsed(): void {
		$data = Init_Data::verify( self::sign( self::fields() ), self::TOKEN, 3600, self::NOW );
		$this->assertSame( 42, $data->user_id() );
		$this->assertSame( 'Ана & Co', $data->user['first_name'] );
		$this->assertSame( 'AAE-test', $data->query_id );
		$this->assertSame( self::NOW - 60, $data->auth_date );
	}

	public function test_form_encoded_plus_signs_decode_like_telegram(): void {
		$query = str_replace( '%20', '+', self::sign( self::fields() ) );
		$this->assertSame( 'Ана & Co', Init_Data::verify( $query, self::TOKEN, 3600, self::NOW )->user['first_name'] );
	}

	public function test_known_vector_from_independent_implementation(): void {
		// Produced with Node's crypto (a one-off Node crypto script), not with the code under test.
		$query = 'auth_date=1760000000&query_id=AAQ&user=%7B%22id%22%3A7%2C%22first_name%22%3A%22Test%22%7D&hash=' . self::node_vector_hash();
		$this->assertSame( 7, Init_Data::verify( $query, self::TOKEN, 0, self::NOW )->user_id() );
	}

	private static function node_vector_hash(): string {
		return trim( (string) file_get_contents( __DIR__ . '/fixtures/node-vector.hash' ) );
	}

	public function test_wrong_token_is_rejected(): void {
		$this->expect_code( 'bad_hash' );
		Init_Data::verify( self::sign( self::fields(), '999:other' ), self::TOKEN, 3600, self::NOW );
	}

	public function test_tampered_user_is_rejected(): void {
		$query = self::sign( self::fields() );
		$query = str_replace( '%3A42', '%3A43', $query );
		$this->expect_code( 'bad_hash' );
		Init_Data::verify( $query, self::TOKEN, 3600, self::NOW );
	}

	public function test_missing_hash_is_rejected(): void {
		$this->expect_code( 'bad_hash' );
		Init_Data::verify( http_build_query( self::fields() ), self::TOKEN, 3600, self::NOW );
	}

	public function test_expired_data_is_rejected(): void {
		$this->expect_code( 'expired' );
		Init_Data::verify( self::sign( self::fields( array( 'auth_date' => (string) ( self::NOW - 7200 ) ) ) ), self::TOKEN, 3600, self::NOW );
	}

	public function test_age_check_can_be_disabled(): void {
		$query = self::sign( self::fields( array( 'auth_date' => (string) ( self::NOW - 999999 ) ) ) );
		$this->assertSame( 42, Init_Data::verify( $query, self::TOKEN, 0, self::NOW )->user_id() );
	}

	public function test_future_auth_date_is_rejected(): void {
		$this->expect_code( 'bad_auth_date' );
		Init_Data::verify( self::sign( self::fields( array( 'auth_date' => (string) ( self::NOW + 3600 ) ) ) ), self::TOKEN, 3600, self::NOW );
	}

	public function test_signed_data_without_user_is_rejected(): void {
		$fields = self::fields();
		unset( $fields['user'] );
		$this->expect_code( 'no_user' );
		Init_Data::verify( self::sign( $fields ), self::TOKEN, 3600, self::NOW );
	}

	public function test_duplicate_fields_are_rejected(): void {
		$this->expect_code( 'duplicate_field' );
		Init_Data::verify( self::sign( self::fields() ) . '&auth_date=1', self::TOKEN, 3600, self::NOW );
	}

	#[DataProvider( 'empty_inputs' )]
	public function test_empty_input( string $init_data, string $token, string $code ): void {
		$this->expect_code( $code );
		Init_Data::verify( $init_data, $token, 3600, self::NOW );
	}

	public static function empty_inputs(): array {
		return array(
			'no data'  => array( '', self::TOKEN, 'missing' ),
			'no token' => array( 'a=b', '', 'bot_not_configured' ),
			'too long' => array( str_repeat( 'a', 9000 ), self::TOKEN, 'missing' ),
		);
	}

	private function expect_code( string $code ): void {
		$this->expectException( Init_Data_Exception::class );
		$this->expectExceptionMessage( $code );
	}
}
