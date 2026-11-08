<?php
/**
 * Sample data for local testing: 6 products (one variable) in 3 categories, cash on delivery on.
 * Run inside WordPress (blueprint runPHP step). All products are made-up demo items.
 *
 * @package MiniShopTelegram
 */

update_option( 'woocommerce_currency', 'USD' );
update_option( 'woocommerce_onboarding_profile', array( 'skipped' => true ) );
update_option( 'woocommerce_coming_soon', 'no' );
update_option( 'woocommerce_cod_settings', array( 'enabled' => 'yes', 'title' => 'Cash on delivery', 'enable_for_virtual' => 'yes' ) );
update_option( 'woocommerce_enable_guest_checkout', 'yes' );
update_option( 'woocommerce_enable_checkout_login_reminder', 'no' );

$cats = array();
foreach ( array( 'Coffee' => 'coffee', 'Tea' => 'tea', 'Brewing gear' => 'brewing-gear' ) as $name => $slug ) {
	$term          = term_exists( $slug, 'product_cat' ) ?: wp_insert_term( $name, 'product_cat', array( 'slug' => $slug ) );
	$cats[ $slug ] = (int) $term['term_id'];
}

$simple = array(
	array( 'Ethiopia Guji, 250 g', 'coffee', '14.50', '', 'Washed single origin. Notes of bergamot, peach and black tea.' ),
	array( 'House Espresso Blend, 1 kg', 'coffee', '32.00', '27.90', 'Chocolate and hazelnut, made for milk drinks.' ),
	array( 'Sencha Kabuse, 100 g', 'tea', '11.00', '', 'Shaded green tea with a sweet, grassy cup.' ),
	array( 'Pour-over Dripper', 'brewing-gear', '24.00', '', 'Ceramic cone dripper for size 02 paper filters.' ),
	array( 'Gooseneck Kettle 0.9 L', 'brewing-gear', '49.00', '', 'Stainless steel kettle with a thermometer in the lid.' ),
);
foreach ( $simple as $i => [ $name, $cat, $regular, $sale, $desc ] ) {
	$p = new WC_Product_Simple();
	$p->set_name( $name );
	$p->set_status( 'publish' );
	$p->set_regular_price( $regular );
	if ( $sale ) {
		$p->set_sale_price( $sale );
	}
	$p->set_short_description( $desc );
	$p->set_category_ids( array( $cats[ $cat ] ) );
	$p->set_menu_order( $i );
	if ( 4 === $i ) {
		$p->set_manage_stock( true );
		$p->set_stock_quantity( 3 );
	}
	$p->save();
}

// Variable product with a global attribute (grind) and a local one (size).
$grind = wc_create_attribute( array( 'name' => 'Grind', 'slug' => 'grind' ) );
register_taxonomy( 'pa_grind', 'product' );
$terms = array();
foreach ( array( 'Whole bean', 'Filter', 'Espresso' ) as $t ) {
	$terms[] = wp_insert_term( $t, 'pa_grind' )['term_id'];
}

$v = new WC_Product_Variable();
$v->set_name( 'Colombia Huila' );
$v->set_status( 'publish' );
$v->set_short_description( 'Red apple, caramel and cocoa. Pick a bag size and grind.' );
$v->set_category_ids( array( $cats['coffee'] ) );
$v->set_menu_order( 10 );
$a1 = new WC_Product_Attribute();
$a1->set_id( $grind );
$a1->set_name( 'pa_grind' );
$a1->set_options( $terms );
$a1->set_variation( true );
$a1->set_visible( true );
$a2 = new WC_Product_Attribute();
$a2->set_name( 'Size' );
$a2->set_options( array( '250 g', '1 kg' ) );
$a2->set_variation( true );
$a2->set_visible( true );
$v->set_attributes( array( $a1, $a2 ) );
$parent_id = $v->save();

foreach ( array( '250 g' => '13.00', '1 kg' => '42.00' ) as $size => $price ) {
	$var = new WC_Product_Variation();
	$var->set_parent_id( $parent_id );
	// Grind left empty = "any grind", so the buyer's choice must be validated server-side.
	$var->set_attributes( array( 'pa_grind' => '', 'size' => $size ) );
	$var->set_regular_price( $price );
	$var->set_status( 'publish' );
	$var->save();
}
WC_Product_Variable::sync( $parent_id );
echo "seeded\n";
