/**
 * External dependencies
 */
import { render, screen } from '@testing-library/react';
import { recordEvent } from '@woocommerce/tracks';

/**
 * Internal dependencies
 */
import WooCommerceShippingItem from '../experimental-woocommerce-shipping-item';
jest.mock( '@woocommerce/tracks', () => ( {
	...jest.requireActual( '@woocommerce/tracks' ),
	recordEvent: jest.fn(),
} ) );

jest.mock( '@woocommerce/admin-layout', () => {
	const mockContext = {
		layoutPath: [ 'root' ],
		layoutString: 'root',
		extendLayout: () => {},
		isDescendantOf: () => false,
	};
	return {
		...jest.requireActual( '@woocommerce/admin-layout' ),
		useLayoutContext: jest.fn().mockReturnValue( mockContext ),
		useExtendLayout: jest.fn().mockReturnValue( mockContext ),
	};
} );

describe( 'WooCommerceShippingItem', () => {
	it( 'should render WC Shipping item with CTA = "Get started" when WC Shipping is not installed', () => {
		render( <WooCommerceShippingItem isPluginInstalled={ false } /> );

		expect(
			screen.queryByText( 'WooCommerce Shipping' )
		).toBeInTheDocument();

		expect(
			screen.queryByRole( 'button', { name: 'Get started' } )
		).toBeInTheDocument();
	} );

	it( 'should render WC Shipping item with CTA = "Activate" when WC Shipping is installed', () => {
		render( <WooCommerceShippingItem isPluginInstalled={ true } /> );

		expect(
			screen.queryByText( 'WooCommerce Shipping' )
		).toBeInTheDocument();

		expect(
			screen.queryByRole( 'button', { name: 'Activate' } )
		).toBeInTheDocument();
	} );

	it( 'should record track when clicking setup button', () => {
		render( <WooCommerceShippingItem isPluginInstalled={ false } /> );

		screen.queryByRole( 'button', { name: 'Get started' } )?.click();
		expect( recordEvent ).toHaveBeenCalledWith( 'tasklist_click', {
			context: 'root/wc-settings',
			task_name: 'shipping-recommendation',
		} );
	} );
} );
