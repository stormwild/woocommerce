/**
 * External dependencies
 */
import { createRoot } from '@wordpress/element';

/**
 * Internal dependencies
 */
import { initRemoteLogging } from './lib/init-remote-logging';
// Initialize remote logging early to log any errors that occur during initialization.
initRemoteLogging();

/**
 * Internal dependencies
 */
import './stylesheets/_embed.scss';
import { renderCustomerEffortScoreTracks } from './shared';
import { getAdminSetting } from '~/utils/admin-settings';
import { renderEmbeddedLayout } from './embedded-body-layout';
import {
	SettingsPaymentsMainWrapper,
	SettingsPaymentsOfflineWrapper,
	SettingsPaymentsWooCommercePaymentsWrapper,
} from './settings-payments';

const embeddedRoot = document.getElementById( 'woocommerce-embedded-root' );

if ( embeddedRoot ) {
	const settingsGroup = 'wc_admin';
	const hydrateUser = getAdminSetting( 'currentUserData' );

	renderEmbeddedLayout( embeddedRoot, hydrateUser, settingsGroup );
	renderCustomerEffortScoreTracks( embeddedRoot );
}

const renderPaymentsSettings = () => {
	if (
		! window.wcAdminFeatures ||
		window.wcAdminFeatures[ 'reactify-classic-payments-settings' ] !== true
	) {
		// Render the payment settings components only if the feature flag is enabled.
		return;
	}

	const paymentsMainRoot = document.getElementById(
		'experimental_wc_settings_payments_main'
	);
	const paymentsOfflineRoot = document.getElementById(
		'experimental_wc_settings_payments_offline'
	);
	const paymentsWooCommercePaymentsRoot = document.getElementById(
		'experimental_wc_settings_payments_woocommerce_payments'
	);

	if ( paymentsMainRoot ) {
		createRoot(
			paymentsMainRoot.insertBefore(
				document.createElement( 'div' ),
				null
			)
		).render( <SettingsPaymentsMainWrapper /> );
	}

	if ( paymentsOfflineRoot ) {
		createRoot(
			paymentsOfflineRoot.insertBefore(
				document.createElement( 'div' ),
				null
			)
		).render( <SettingsPaymentsOfflineWrapper /> );
	}

	if ( paymentsWooCommercePaymentsRoot ) {
		createRoot(
			paymentsWooCommercePaymentsRoot.insertBefore(
				document.createElement( 'div' ),
				null
			)
		).render( <SettingsPaymentsWooCommercePaymentsWrapper /> );
	}
};

renderPaymentsSettings();
