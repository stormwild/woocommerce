<?php

use PHPUnit\Framework\TestCase;
use Automattic\WooCommerce\Blueprint\Steps\ActivatePlugin;

/**
 * Unit tests for ActivatePlugin class.
 */
class ActivatePluginTest extends TestCase {
	/**
	 * Clean up Mockery after each test.
	 */
	public function tearDown(): void {
		Mockery::close();
	}

	/**
	 * Test the constructor and JSON preparation.
	 */
	public function testConstructorAndPrepareJsonArray() {
		$plugin_name     = 'sample-plugin/sample-plugin.php';
		$activate_plugin = new ActivatePlugin( $plugin_name );

		$expected_array = array(
			'step'       => 'activatePlugin',
			'pluginPath' => $plugin_name,
		);

		$this->assertEquals( $expected_array, $activate_plugin->prepare_json_array() );
	}

	/**
	 * Test the static get_step_name method.
	 */
	public function testGetStepName() {
		$this->assertEquals( 'activatePlugin', ActivatePlugin::get_step_name() );
	}

	/**
	 * Test the static get_schema method.
	 */
	public function testGetSchema() {
		$expected_schema = array(
			'type'       => 'object',
			'properties' => array(
				'step'       => array(
					'type' => 'string',
					'enum' => array( 'activatePlugin' ),
				),
				'pluginName' => array(
					'type' => 'string',
				),
				'pluginPath' => array(
					'type' => 'string',
				),
			),
			'required'   => array( 'step', 'pluginPath' ),
		);

		$this->assertEquals( $expected_schema, ActivatePlugin::get_schema() );
	}
}
