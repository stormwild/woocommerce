/**
 * External dependencies
 */
import prepareFormFields from '@woocommerce/base-components/cart-checkout/form/prepare-form-fields';
import {
	ADDRESS_FORM_KEYS,
	COUNTRIES,
	STATES,
} from '@woocommerce/block-settings';
import {
	AddressForm,
	BillingAddress,
	defaultFields,
	ShippingAddress,
} from '@woocommerce/settings';
import {
	isObject,
	isString,
	type CartResponseBillingAddress,
	type CartResponseShippingAddress,
} from '@woocommerce/types';
import { decodeEntities } from '@wordpress/html-entities';
import { isEmail } from '@wordpress/url';

/**
 * Compare two addresses and see if they are the same.
 */
export const isSameAddress = < T extends ShippingAddress | BillingAddress >(
	address1: T,
	address2: T
): boolean => {
	return ADDRESS_FORM_KEYS.every( ( field ) => {
		return address1[ field ] === address2[ field ];
	} );
};

/**
 * pluckAddress takes a full address object and returns relevant fields for calculating
 * shipping, so we can track when one of them change to update rates.
 *
 * @param {Object} address          An object containing all address information
 * @param {string} address.country  The country.
 * @param {string} address.state    The state.
 * @param {string} address.city     The city.
 * @param {string} address.postcode The postal code.
 *
 * @return {Object} pluckedAddress  An object containing shipping address that are needed to fetch an address.
 */
export const pluckAddress = ( {
	country = '',
	state = '',
	city = '',
	postcode = '',
}: CartResponseBillingAddress | CartResponseShippingAddress ): {
	country: string;
	state: string;
	city: string;
	postcode: string;
} => ( {
	country: country.trim(),
	state: state.trim(),
	city: city.trim(),
	postcode: postcode ? postcode.replace( ' ', '' ).toUpperCase() : '',
} );

/**
 * pluckEmail takes a full address object and returns only the email address, if set and valid. Otherwise returns an empty string.
 *
 * @param {Object} address       An object containing all address information
 * @param {string} address.email The email address.
 * @return {string} The email address.
 */
export const pluckEmail = ( {
	email = '',
}: CartResponseBillingAddress ): string =>
	isEmail( email ) ? email.trim() : '';

/**
 * Type-guard.
 */
const isValidAddressKey = (
	key: keyof AddressForm,
	address: CartResponseBillingAddress | CartResponseShippingAddress
): key is keyof typeof address => {
	return key in address;
};

/**
 * Sets fields to an empty string in an address if they are hidden by the settings in countryLocale.
 *
 * @param {Object} address The address to empty fields from.
 * @return {Object} The address with hidden fields values removed.
 */
export const emptyHiddenAddressFields = <
	T extends CartResponseBillingAddress | CartResponseShippingAddress
>(
	address: T
): T => {
	const addressForm = prepareFormFields(
		ADDRESS_FORM_KEYS,
		defaultFields,
		address.country
	);

	const newAddress = Object.assign( {}, address );

	addressForm.forEach( ( { key, hidden } ) => {
		if ( hidden === true && isValidAddressKey( key, address ) ) {
			newAddress[ key ] = '';
		}
	} );

	return newAddress;
};

/**
 * Sets fields to an empty string in an address.
 *
 * @param {Object} address The address to empty fields from.
 * @return {Object} The address with all fields values removed.
 */
export const emptyAddressFields = <
	T extends CartResponseBillingAddress | CartResponseShippingAddress
>(
	address: T
): T => {
	const addressForm = prepareFormFields(
		ADDRESS_FORM_KEYS,
		defaultFields,
		address.country
	);
	const newAddress = Object.assign( {}, address );

	addressForm.forEach( ( { key } ) => {
		// Clear address fields except country and state to keep consistency with shortcode Checkout.
		if (
			key !== 'country' &&
			key !== 'state' &&
			isValidAddressKey( key, address )
		) {
			newAddress[ key ] = '';
		}
	} );

	return newAddress;
};
/*
 * Formats a shipping address for display.
 *
 * @param {Object} address The address to format.
 * @return {string | null} The formatted address or null if no address is provided.
 */
export const formatShippingAddress = (
	address: ShippingAddress | BillingAddress
): string | null => {
	// We bail early if we don't have an address.
	if ( Object.values( address ).length === 0 ) {
		return null;
	}
	const formattedCountry = isString( COUNTRIES[ address.country ] )
		? decodeEntities( COUNTRIES[ address.country ] )
		: '';

	const formattedState =
		isObject( STATES[ address.country ] ) &&
		isString( STATES[ address.country ][ address.state ] )
			? decodeEntities( STATES[ address.country ][ address.state ] )
			: address.state;

	const addressParts = [];

	addressParts.push( address.postcode.toUpperCase() );
	addressParts.push( address.city );
	addressParts.push( formattedState );
	addressParts.push( formattedCountry );

	const formattedLocation = addressParts.filter( Boolean ).join( ', ' );

	if ( ! formattedLocation ) {
		return null;
	}

	return formattedLocation;
};

/**
 * Checks that all required fields in an address are completed based on the settings in countryLocale.
 *
 * @param {Object} address     The address to check.
 * @param {Array}  keysToCheck Optional override to include only specific keys for checking.
 *                             If there are other required fields in the address, but not specified in this arg then
 *                             they will be ignored.
 */
export const isAddressComplete = (
	address: CartResponseBillingAddress | CartResponseShippingAddress,
	keysToCheck: ( keyof Partial< AddressForm > )[] = []
): boolean => {
	if ( ! address.country ) {
		return false;
	}
	const addressForm = prepareFormFields(
		ADDRESS_FORM_KEYS,
		defaultFields,
		address.country
	);

	// Filter the address form so only fields from the keysToCheck arg remain, if that arg is empty, then default to the
	// full address form.
	const filteredAddressForm =
		keysToCheck.length > 0
			? addressForm.filter( ( { key } ) => keysToCheck.includes( key ) )
			: addressForm;

	return filteredAddressForm.every( ( { key, hidden, required } ) => {
		if ( hidden === true || required === false ) {
			return true;
		}
		return isValidAddressKey( key, address ) && address[ key ] !== '';
	} );
};
