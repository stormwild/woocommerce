<?php
/**
 * Controller Tests.
 */

namespace Automattic\WooCommerce\Tests\Blocks\StoreApi\Routes;

use Automattic\WooCommerce\Tests\Blocks\StoreApi\Routes\ControllerTestCase;
use Automattic\WooCommerce\Tests\Blocks\Helpers\FixtureData;
use Automattic\WooCommerce\Tests\Blocks\Helpers\ValidateSchema;
use Automattic\WooCommerce\Enums\ProductStockStatus;

/**
 * Products Controller Tests.
 */
class Products extends ControllerTestCase {

	/**
	 * Setup test product data. Called before every test.
	 */
	protected function setUp(): void {
		parent::setUp();

		$fixtures = new FixtureData();

		$this->products = array(
			$fixtures->get_simple_product(
				array(
					'name'              => 'Test Product 1',
					'stock_status'      => ProductStockStatus::IN_STOCK,
					'regular_price'     => 10,
					'image_id'          => $fixtures->sideload_image(),
					'gallery_image_ids' => array(),
				)
			),
			$fixtures->get_simple_product(
				array(
					'name'          => 'Test Product 2',
					'stock_status'  => ProductStockStatus::IN_STOCK,
					'regular_price' => 10,
					'image_id'      => $fixtures->sideload_image(),
				)
			),
			$fixtures->get_grouped_product( array() ),
		);
	}

	/**
	 * Test getting item.
	 */
	public function test_get_item() {
		$response = rest_get_server()->dispatch( new \WP_REST_Request( 'GET', '/wc/store/v1/products/' . $this->products[0]->get_id() ) );
		$data     = $response->get_data();

		$this->assertEquals( 200, $response->get_status() );
		$this->assertEquals( $this->products[0]->get_id(), $data['id'] );
		$this->assertEquals( $this->products[0]->get_title(), $data['name'] );
		$this->assertEquals( $this->products[0]->get_slug(), $data['slug'] );
		$this->assertEquals( $this->products[0]->get_permalink(), $data['permalink'] );
		$this->assertEquals( $this->products[0]->get_sku(), $data['sku'] );
		$this->assertEquals( $this->products[0]->get_price(), $data['prices']->price / ( 10 ** $data['prices']->currency_minor_unit ) );
		$this->assertEquals( $this->products[0]->get_average_rating(), $data['average_rating'] );
		$this->assertEquals( $this->products[0]->get_review_count(), $data['review_count'] );
		$this->assertEquals( $this->products[0]->has_options(), $data['has_options'] );
		$this->assertEquals( $this->products[0]->is_purchasable(), $data['is_purchasable'] );
		$this->assertEquals( $this->products[0]->is_in_stock(), $data['is_in_stock'] );
		$this->assertEquals( $this->products[0]->add_to_cart_text(), $data['add_to_cart']->text );
		$this->assertEquals( $this->products[0]->add_to_cart_description(), $data['add_to_cart']->description );
		$this->assertEquals( $this->products[0]->single_add_to_cart_text(), $data['add_to_cart']->single_text );
		$this->assertEquals( $this->products[0]->is_on_sale(), $data['on_sale'] );
		$this->assertCount( 0, $data['grouped_products'] );

		$this->assertCount( 1, $data['images'] );
		$this->assertIsObject( $data['images'][0] );
		$this->assertEquals( $this->products[0]->get_image_id(), $data['images'][0]->id );
	}

	/**
	 * Test get grouped product.
	 */
	public function test_grouped_product() {
		$response = rest_get_server()->dispatch( new \WP_REST_Request( 'GET', '/wc/store/v1/products/' . $this->products[2]->get_id() ) );
		$data     = $response->get_data();

		$grouped_product_ids = array_map(
			function ( $child ) {
				return $child->get_id();
			},
			$this->products[2]->get_visible_children(),
		);
		$total_ids           = count( $grouped_product_ids );

		$this->assertEquals( 200, $response->get_status() );
		$this->assertCount( $total_ids, $data['grouped_products'] );

		for ( $index = 0; $index < $total_ids; $index++ ) {
			$this->assertEquals( $grouped_product_ids[ $index ], $data['grouped_products'][ $index ] );
		}
	}

	/**
	 * Test getting items.
	 */
	public function test_get_items() {
		$response = rest_get_server()->dispatch( new \WP_REST_Request( 'GET', '/wc/store/v1/products' ) );
		$data     = $response->get_data();

		$this->assertEquals( 200, $response->get_status() );
		$this->assertEquals( 6, count( $data ) );
		$this->assertArrayHasKey( 'id', $data[0] );
		$this->assertArrayHasKey( 'name', $data[0] );
		$this->assertArrayHasKey( 'variation', $data[0] );
		$this->assertArrayHasKey( 'permalink', $data[0] );
		$this->assertArrayHasKey( 'description', $data[0] );
		$this->assertArrayHasKey( 'on_sale', $data[0] );
		$this->assertArrayHasKey( 'sku', $data[0] );
		$this->assertArrayHasKey( 'prices', $data[0] );
		$this->assertArrayHasKey( 'average_rating', $data[0] );
		$this->assertArrayHasKey( 'review_count', $data[0] );
		$this->assertArrayHasKey( 'images', $data[0] );
		$this->assertArrayHasKey( 'has_options', $data[0] );
		$this->assertArrayHasKey( 'is_purchasable', $data[0] );
		$this->assertArrayHasKey( 'is_in_stock', $data[0] );
		$this->assertArrayHasKey( 'add_to_cart', $data[0] );
		$this->assertArrayHasKey( 'extensions', $data[0] );
	}

	/**
	 * Test searching by SKU.
	 */
	public function test_search_by_sku() {
		$product = new \WC_Product_Simple();
		$product->set_sku( 'search-for-this-value' );
		$product->save();

		$request = new \WP_REST_Request( 'GET', '/wc/store/v1/products' );
		$request->set_param( 'search', 'search-for-this' );

		$response = rest_get_server()->dispatch( $request );
		$data     = $response->get_data();

		$this->assertEquals( 200, $response->get_status() );
		$this->assertEquals( 1, count( $data ) );
		$this->assertArrayHasKey( 'sku', $data[0] );
		$this->assertEquals( 'search-for-this-value', $data[0]['sku'] );
	}

	/**
	 * Test conversion of product to rest response.
	 */
	public function test_prepare_item() {
		$schemas    = new \Automattic\WooCommerce\StoreApi\SchemaController( $this->mock_extend );
		$routes     = new \Automattic\WooCommerce\StoreApi\RoutesController( $schemas );
		$schema     = $schemas->get( 'product' );
		$controller = $routes->get( 'products' );
		$response   = $controller->prepare_item_for_response( $this->products[0], new \WP_REST_Request() );
		$data       = $response->get_data();

		$this->assertArrayHasKey( 'id', $data );
		$this->assertArrayHasKey( 'name', $data );
		$this->assertArrayHasKey( 'variation', $data );
		$this->assertArrayHasKey( 'permalink', $data );
		$this->assertArrayHasKey( 'description', $data );
		$this->assertArrayHasKey( 'on_sale', $data );
		$this->assertArrayHasKey( 'sku', $data );
		$this->assertArrayHasKey( 'prices', $data );
		$this->assertArrayHasKey( 'average_rating', $data );
		$this->assertArrayHasKey( 'review_count', $data );
		$this->assertArrayHasKey( 'images', $data );
		$this->assertArrayHasKey( 'has_options', $data );
		$this->assertArrayHasKey( 'is_purchasable', $data );
		$this->assertArrayHasKey( 'is_in_stock', $data );
		$this->assertArrayHasKey( 'add_to_cart', $data );
	}

	/**
	 * Test collection params getter.
	 */
	public function test_get_collection_params() {
		$routes     = new \Automattic\WooCommerce\StoreApi\RoutesController( new \Automattic\WooCommerce\StoreApi\SchemaController( $this->mock_extend ) );
		$controller = $routes->get( 'products' );
		$params     = $controller->get_collection_params();

		$this->assertArrayHasKey( 'page', $params );
		$this->assertArrayHasKey( 'per_page', $params );
		$this->assertArrayHasKey( 'search', $params );
		$this->assertArrayHasKey( 'after', $params );
		$this->assertArrayHasKey( 'before', $params );
		$this->assertArrayHasKey( 'date_column', $params );
		$this->assertArrayHasKey( 'exclude', $params );
		$this->assertArrayHasKey( 'include', $params );
		$this->assertArrayHasKey( 'offset', $params );
		$this->assertArrayHasKey( 'order', $params );
		$this->assertArrayHasKey( 'orderby', $params );
		$this->assertArrayHasKey( 'parent', $params );
		$this->assertArrayHasKey( 'parent_exclude', $params );
		$this->assertArrayHasKey( 'type', $params );
		$this->assertArrayHasKey( 'sku', $params );
		$this->assertArrayHasKey( 'featured', $params );
		$this->assertArrayHasKey( 'category', $params );
		$this->assertArrayHasKey( 'tag', $params );
		$this->assertArrayHasKey( 'on_sale', $params );
		$this->assertArrayHasKey( 'min_price', $params );
		$this->assertArrayHasKey( 'max_price', $params );
		$this->assertArrayHasKey( 'stock_status', $params );
		$this->assertArrayHasKey( 'category_operator', $params );
		$this->assertArrayHasKey( 'tag_operator', $params );
		$this->assertArrayHasKey( 'attribute_relation', $params );
		$this->assertArrayHasKey( 'attributes', $params );
		$this->assertArrayHasKey( 'catalog_visibility', $params );
		$this->assertArrayHasKey( 'rating', $params );
	}

	/**
	 * Test schema matches responses.
	 */
	public function test_get_item_schema() {
		$routes     = new \Automattic\WooCommerce\StoreApi\RoutesController( new \Automattic\WooCommerce\StoreApi\SchemaController( $this->mock_extend ) );
		$controller = $routes->get( 'products' );
		$schema     = $controller->get_item_schema();
		$response   = $controller->prepare_item_for_response( $this->products[0], new \WP_REST_Request() );
		$validate   = new ValidateSchema( $schema );

		$diff = $validate->get_diff_from_object( $response->get_data() );
		$this->assertEmpty( $diff, print_r( $diff, true ) ); // @phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_print_r
	}

	/**
	 * Test return types when no image is available.
	 */
	public function test_without_image() {
		$fixtures = new FixtureData();
		$product  = $fixtures->get_simple_product(
			array(
				'name'              => 'Test Product 1',
				'stock_status'      => ProductStockStatus::IN_STOCK,
				'regular_price'     => 10,
				'image_id'          => '',
				'gallery_image_ids' => array(),
			)
		);

		$response = rest_get_server()->dispatch( new \WP_REST_Request( 'GET', '/wc/store/v1/products/' . $product->get_id() ) );
		$data     = $response->get_data();

		$this->assertIsArray( $data['images'] );
		$this->assertCount( 0, $data['images'] );

		$image_id = $fixtures->sideload_image();
		$product  = $fixtures->get_simple_product(
			array(
				'name'              => 'Test Product 1',
				'stock_status'      => ProductStockStatus::IN_STOCK,
				'regular_price'     => 10,
				'image_id'          => $image_id,
				'gallery_image_ids' => array(),
			)
		);
		wp_delete_attachment( $image_id, true );

		$response = rest_get_server()->dispatch( new \WP_REST_Request( 'GET', '/wc/store/v1/products/' . $product->get_id() ) );
		$data     = $response->get_data();

		$this->assertIsArray( $data['images'] );
		$this->assertCount( 0, $data['images'] );
	}

	/**
	 * Test product category image return types.
	 */
	public function test_product_category_image_return_types() {
		$fixtures = new FixtureData();
		$image_id = $fixtures->sideload_image();
		$term     = wp_insert_term( 'Test Category', 'product_cat' );

		update_term_meta( $term['term_id'], 'thumbnail_id', $image_id );

		$response = rest_get_server()->dispatch( new \WP_REST_Request( 'GET', '/wc/store/v1/products/categories/' . $term['term_id'] ) );
		$data     = $response->get_data();

		$this->assertIsObject( $data['image'] );
		$this->assertEquals( $data['image']->id, $image_id );

		delete_term_meta( $term['term_id'], 'thumbnail_id' );

		$response = rest_get_server()->dispatch( new \WP_REST_Request( 'GET', '/wc/store/v1/products/categories/' . $term['term_id'] ) );
		$data     = $response->get_data();

		$this->assertNull( $data['image'] );
	}
}
