<?php
/**
 * Unit tests for wc-product-functions.php.
 *
 * @package WooCommerce\Tests\Functions\Stock
 */

use Automattic\WooCommerce\Testing\Tools\CodeHacking\Hacks\FunctionsMockerHack;
use Automattic\WooCommerce\Testing\Tools\CodeHacking\Hacks\StaticMockerHack;

// phpcs:disable Squiz.Classes.ClassFileName.NoMatch, Squiz.Classes.ValidClassName.NotCamelCaps -- Backward compatibility.
/**
 * Class WC_Stock_Functions_Tests.
 */
class WC_Product_Functions_Tests extends \WC_Unit_Test_Case {

	/**
	 * @testdox If 'wc_get_price_excluding_tax' gets an order as argument, it passes the order customer to 'WC_Tax::get_rates'.
	 *
	 * @testWith [true, 1, true]
	 *           [true, 1, false]
	 *           [true, 0, true]
	 *           [true, 0, false]
	 *           [false, null, true]
	 *           [false, null, false]
	 *
	 * @param bool     $pass_order Whether an order is passed to 'wc_get_price_excluding_tax' or not.
	 * @param int|null $customer_id Id of the customer associated to the order.
	 * @param bool     $set_filter Whether the 'woocommerce_adjust_non_base_location_prices' filter should be set to return false.
	 */
	public function test_wc_get_price_excluding_tax_passes_order_customer_to_get_rates_if_order_is_available( $pass_order, $customer_id, $set_filter ) {
		$customer_passed_to_get_rates                  = false;
		$get_base_rates_invoked                        = false;
		$customer_id_passed_to_wc_customer_constructor = false;

		if ( $set_filter ) {
			add_filter( 'woocommerce_adjust_non_base_location_prices', '__return_false' );
		}

		FunctionsMockerHack::add_function_mocks(
			array(
				'wc_prices_include_tax' => '__return_true',
			)
		);

		StaticMockerHack::add_method_mocks(
			array(
				'WC_Tax' =>
				array(
					'get_rates'          => function ( $tax_class, $customer ) use ( &$customer_passed_to_get_rates ) {
						$customer_passed_to_get_rates = $customer;
					},
					'get_base_tax_rates' => function () use ( &$get_base_rates_invoked ) {
						$get_base_rates_invoked = true;
						return 0;
					},
					'calc_tax'           => function () {
						return array( 0 );
					},
				),
			)
		);

		// phpcs:disable Squiz.Commenting

		$product = new class() extends WC_Product {
			public function get_price( $context = 'view' ) {
				return 0;
			}

			public function is_taxable() {
				return true;
			}

			public function get_tax_class( $context = 'view' ) {
				return '';
			}
		};

		$customer = new stdClass();
		$this->register_legacy_proxy_class_mocks(
			array(
				'WC_Customer' => function ( $customer_id ) use ( &$customer_id_passed_to_wc_customer_constructor, $customer ) {
					$customer_id_passed_to_wc_customer_constructor = $customer_id;
					return $customer;
				},
			)
		);

		if ( $pass_order ) {
			$order = new class( $customer_id ) {
				private $customer_id;

				public function __construct( $customer_id ) {
					$this->customer_id = $customer_id;
				}

				public function get_customer_id() {
					return $this->customer_id;
				}
			};

			wc_get_price_excluding_tax( $product, array( 'order' => $order ) );

			if ( $customer_id && $set_filter ) {
				$this->assertEquals( $order->get_customer_id(), $customer_id_passed_to_wc_customer_constructor );
				$this->assertFalse( $get_base_rates_invoked );
				$this->assertSame( $customer, $customer_passed_to_get_rates );
			} elseif ( ! $customer_id && $set_filter ) {
				$this->assertFalse( $customer_id_passed_to_wc_customer_constructor );
				$this->assertNull( $customer_passed_to_get_rates );
				$this->assertFalse( $get_base_rates_invoked );
			} else {
				$this->assertFalse( $customer_id_passed_to_wc_customer_constructor );
				$this->assertFalse( $customer_passed_to_get_rates );
				$this->assertTrue( $get_base_rates_invoked );
			}
		} else {
			wc_get_price_excluding_tax( $product );

			$this->assertFalse( $customer_id_passed_to_wc_customer_constructor );
			$this->assertEquals( $set_filter ? null : false, $customer_passed_to_get_rates );
			$this->assertEquals( ! $set_filter, $get_base_rates_invoked );
		}

		// phpcs:enable Squiz.Commenting

		if ( $set_filter ) {
			remove_filter( 'woocommerce_adjust_non_base_location_prices', '__return_false' );
		}
	}

	/**
	 * @testdox Test 'wc_get_price_including_tax'.
	 *
	 * @testWith [true, true]
	 *           [true, false]
	 *           [false, true]
	 *           [false, false]
	 *
	 * @param bool $prices_include_tax Whether entered prices are inclusive of tax.
	 * @param bool $is_vat_exempt      Whether the VAT is exempted for customer.
	 */
	public function test_wc_get_price_including_tax( $prices_include_tax, $is_vat_exempt ) {
		// Set VAT exempt and Mock prices_include_tax.
		WC()->customer->set_is_vat_exempt( $is_vat_exempt );
		FunctionsMockerHack::add_function_mocks(
			array(
				'wc_prices_include_tax' => $prices_include_tax ? '__return_true' : '__return_false',
			)
		);

		// Add dummy tax-rate.
		$tax_rate    = array(
			'tax_rate_country'  => '',
			'tax_rate_state'    => '',
			'tax_rate'          => '20.0000',
			'tax_rate_name'     => 'VAT',
			'tax_rate_priority' => '1',
			'tax_rate_compound' => '0',
			'tax_rate_shipping' => '1',
			'tax_rate_order'    => '1',
			'tax_rate_class'    => '',
		);
		$tax_rate_id = WC_Tax::_insert_tax_rate( $tax_rate );

		$wc_tax_enabled = wc_tax_enabled();
		if ( ! $wc_tax_enabled ) {
			update_option( 'woocommerce_calc_taxes', 'yes' );
		}

		$product         = WC_Helper_Product::create_simple_product();
		$expected_prices = array(
			'10'  => array( 8.33, 10, 10, 12 ),
			'50'  => array( 41.67, 50, 50, 60 ),
			'100' => array( 83.33, 100, 100, 120 ),
		);

		foreach ( $expected_prices as $price => $value ) {
			$product->set_price( $price );
			$product->save();
			if ( $prices_include_tax && $is_vat_exempt ) {
				$this->assertEquals( $value[0], wc_get_price_including_tax( $product ) );
			} elseif ( $prices_include_tax && ! $is_vat_exempt ) {
				$this->assertEquals( $value[1], wc_get_price_including_tax( $product ) );
			} elseif ( ! $prices_include_tax && $is_vat_exempt ) {
				$this->assertEquals( $value[2], wc_get_price_including_tax( $product ) );
			} elseif ( ! $prices_include_tax && ! $is_vat_exempt ) {
				$this->assertEquals( $value[3], wc_get_price_including_tax( $product ) );
			}
		}

		// Test clean up.
		WC()->customer->set_is_vat_exempt( false );
		WC_Tax::_delete_tax_rate( $tax_rate_id );
		WC_Helper_Product::delete_product( $product->get_id() );
		if ( ! $wc_tax_enabled ) {
			update_option( 'woocommerce_calc_taxes', 'no' );
		}
	}

	/**
	 * @testDox Sales price is applied when scheduled sale starts.
	 */
	public function test_wc_scheduled_sales_sale_start() {
		$product = WC_Helper_Product::create_simple_product();
		$product->set_price( 100 );
		$product->set_regular_price( 100 );
		$product->set_sale_price( 50 );
		$product->set_date_on_sale_from( gmdate( 'Y-m-d H:i:s', time() + 10 ) );
		$product->save();

		// Bypass product after save hook to prevent price change on save.
		update_post_meta( $product->get_id(), '_sale_price_dates_from', time() - 5 );

		$this->assertEquals( 100, wc_get_product( $product->get_id() )->get_price() );

		wc_scheduled_sales();

		$this->assertEquals( 50, wc_get_product( $product->get_id() )->get_price() );
	}

	/**
	 * @testDox Sales price is removed when scheduled sale ends.
	 */
	public function test_wc_scheduled_sales_sale_end() {
		$product = WC_Helper_Product::create_simple_product();
		$product->set_price( 100 );
		$product->set_regular_price( 100 );
		$product->set_sale_price( 50 );
		$product->set_date_on_sale_to( gmdate( 'Y-m-d H:i:s', time() + 10 ) );
		$product->save();

		// Bypass product after save hook to prevent price change on save.
		update_post_meta( $product->get_id(), '_sale_price_dates_to', time() - 5 );

		$this->assertEquals( 50, wc_get_product( $product->get_id() )->get_price() );

		wc_scheduled_sales();

		$this->assertEquals( 100, wc_get_product( $product->get_id() )->get_price() );
	}

	/**
	 * @testDox Test 'wc_get_related_products' with actual related products.
	 */
	public function test_wc_get_related_products_with_actual_related_products() {
		$main_product = WC_Helper_Product::create_simple_product();

		// Create related products.
		$related_product1 = WC_Helper_Product::create_simple_product();
		$related_product2 = WC_Helper_Product::create_simple_product();
		$related_product3 = WC_Helper_Product::create_simple_product();

		// Set up relationships - products can be related by category.
		$category_term = wp_insert_term( 'Test Category', 'product_cat' );
		wp_set_object_terms( $main_product->get_id(), $category_term['term_id'], 'product_cat' );
		wp_set_object_terms( $related_product1->get_id(), $category_term['term_id'], 'product_cat' );
		wp_set_object_terms( $related_product2->get_id(), $category_term['term_id'], 'product_cat' );
		wp_set_object_terms( $related_product3->get_id(), $category_term['term_id'], 'product_cat' );

		// Save all products.
		$main_product->save();
		$related_product1->save();
		$related_product2->save();
		$related_product3->save();

		// Get related products with a limit of 2.
		$related_products = wc_get_related_products( $main_product->get_id(), 2 );

		// Test that we got related products (limited to 2).
		$this->assertCount( 2, $related_products );

		$related_products_numeric = wc_get_related_products( $main_product->get_id(), '2' );
		$this->assertCount( 2, $related_products_numeric );

		// Test with a larger limit to get all related products.
		$all_related_products = wc_get_related_products( $main_product->get_id(), 10 );
		$this->assertCount( 3, $all_related_products );

		$empty_related_products = wc_get_related_products( $main_product->get_id(), 'non-numeric-limit' );
		$this->assertEquals( array(), $empty_related_products );

		// Clean up.
		WC_Helper_Product::delete_product( $main_product->get_id() );
		WC_Helper_Product::delete_product( $related_product1->get_id() );
		WC_Helper_Product::delete_product( $related_product2->get_id() );
		WC_Helper_Product::delete_product( $related_product3->get_id() );
	}
}
