/**
 * External dependencies
 */
import {
	CURRENT_USER_IS_ADMIN,
	FormFields,
	KeyedFormField,
	FormType,
} from '@woocommerce/settings';
import { useSchemaParser } from '@woocommerce/base-hooks';
import { useRef } from '@wordpress/element';
import fastDeepEqual from 'fast-deep-equal/es6';

/**
 * Internal dependencies
 */
import prepareFormFields from './prepare-form-fields';
import { hasSchemaRules } from './utils';

/**
 * Combines address fields, including fields from the locale, and sorts them by index.
 */
export const useFormFields = < T extends keyof FormFields >(
	// List of field keys to include in the form.
	fieldKeys: T[],
	// Default fields from settings.
	defaultFields: FormFields,
	// Form type, can be billing, shipping, contact, order, or calculator.
	formType: FormType,
	// Address country.
	addressCountry = ''
): KeyedFormField< T >[] => {
	const currentResults = useRef< KeyedFormField< T >[] >( [] );
	const { parser, data } = useSchemaParser( formType );

	const formFields = prepareFormFields(
		fieldKeys,
		defaultFields,
		addressCountry
	);

	const updatedFields = formFields.map( ( field ) => {
		const defaultConfig = defaultFields[ field.key ] || {};
		if ( defaultConfig.rules && parser ) {
			if ( hasSchemaRules( defaultConfig, 'required' ) ) {
				let schema = {};
				if (
					Object.keys( defaultConfig.rules.required ).some(
						( key ) =>
							key === 'cart' ||
							key === 'checkout' ||
							key === 'customer'
					)
				) {
					schema = {
						type: 'object',
						properties: defaultConfig.rules.required,
					};
				} else {
					schema = defaultConfig.rules.required;
				}

				try {
					const result = parser.validate( schema, data );
					field.required = result;
				} catch ( error ) {
					if ( CURRENT_USER_IS_ADMIN ) {
						// eslint-disable-next-line no-console
						console.error( error );
					}
				}
			}
			if ( hasSchemaRules( defaultConfig, 'hidden' ) ) {
				const schema = {
					type: 'object',
					properties: defaultConfig.rules.hidden,
				};
				try {
					const result = parser.validate( schema, data );
					field.hidden = result;
				} catch ( error ) {
					if ( CURRENT_USER_IS_ADMIN ) {
						// eslint-disable-next-line no-console
						console.error( error );
					}
				}
			}
		}
		return field;
	} );

	if (
		! currentResults.current ||
		! fastDeepEqual( currentResults.current, updatedFields )
	) {
		currentResults.current = updatedFields;
	}

	return currentResults.current;
};
