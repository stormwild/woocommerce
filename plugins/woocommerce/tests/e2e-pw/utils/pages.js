/**
 * External dependencies
 */
import {
	goToPageEditor,
	insertBlockByShortcut,
	publishPage,
} from '@woocommerce/e2e-utils-playwright/src';

/**
 * Internal dependencies
 */
import { fillPageTitle } from './editor';
import apiClient from './api-client';
import { ADMIN_STATE_PATH } from '../playwright.config';

export const BLOCKS_CHECKOUT_PAGE = {
	name: 'blocks checkout',
	slug: 'blocks-checkout',
};

export async function existsBlocksCheckoutPage() {
	const pages = await apiClient().get(
		`wp/v2/pages?slug=${ BLOCKS_CHECKOUT_PAGE.slug }`,
		{
			data: {
				_fields: [ 'id' ],
			},
		}
	);

	return pages.data.length > 0;
}

export async function createBlocksCheckoutPage( browser ) {
	if ( ! ( await existsBlocksCheckoutPage() ) ) {
		console.log( 'Creating Checkout Blocks page' );
		const context = await browser.newContext( {
			storageState: ADMIN_STATE_PATH,
		} );
		const page = await context.newPage();
		await goToPageEditor( { page } );
		await fillPageTitle( page, BLOCKS_CHECKOUT_PAGE.name );
		await insertBlockByShortcut( page, 'Checkout' );
		await publishPage( page, BLOCKS_CHECKOUT_PAGE.name );
		await page.close();
		await context.close();
	}
}
