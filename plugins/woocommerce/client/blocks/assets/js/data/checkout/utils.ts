/**
 * External dependencies
 */
import { __ } from '@wordpress/i18n';
import { decodeEntities } from '@wordpress/html-entities';
import {
	type PaymentResult,
	type CheckoutResponse,
	type ObserverSuccessResponse,
	type ObserverFailResponse,
	type ObserverErrorResponse,
	isString,
	isObject,
	isErrorResponse,
	isFailResponse,
	isSuccessResponse,
} from '@woocommerce/types';
import type { createErrorNotice as originalCreateErrorNotice } from '@wordpress/notices/store/actions';
import {
	type ActionCreatorsOf,
	type ConfigOf,
} from '@wordpress/data/build-types/types';
import { checkoutStore } from '@woocommerce/block-data';
import { select } from '@wordpress/data';
import type {
	ContactForm,
	ContactFormValues,
	OrderForm,
	OrderFormValues,
} from '@woocommerce/settings';

/**
 * Internal dependencies
 */
import { shouldRetry } from '../../base/context/event-emit';
import { store as validationStore } from '../validation';
import {
	CheckoutAndPaymentNotices,
	CheckoutAfterProcessingWithErrorEventData,
} from './types';
import {
	CONTACT_FORM_KEYS,
	ORDER_FORM_KEYS,
} from '../../settings/blocks/constants';

/**
 * Based on the given observers, create Error Notices where necessary
 * and return the error response of the last registered observer
 */
export const handleErrorResponse = ( {
	observerResponses,
	createErrorNotice,
}: {
	observerResponses: unknown[];
	createErrorNotice: typeof originalCreateErrorNotice;
} ) => {
	let errorResponse = null;
	observerResponses.forEach( ( response ) => {
		if ( isErrorResponse( response ) || isFailResponse( response ) ) {
			if ( response.message && isString( response.message ) ) {
				const errorOptions =
					response.messageContext &&
					isString( response.messageContext )
						? {
								context: response.messageContext,
						  }
						: undefined;
				errorResponse = response;
				createErrorNotice( response.message, errorOptions );
			}
		}
	} );
	return errorResponse;
};

/**
 * This functions runs after the CHECKOUT_FAIL event has been triggered and
 * all observers have been processed. It sets any Error Notices and the status of the Checkout
 * based on the observer responses
 */
export const runCheckoutFailObservers = ( {
	observerResponses,
	notices,
	dispatch,
	createErrorNotice,
	data,
}: {
	observerResponses: unknown[];
	notices: CheckoutAndPaymentNotices;
	dispatch: ActionCreatorsOf< ConfigOf< typeof checkoutStore > >;
	data: CheckoutAfterProcessingWithErrorEventData;
	createErrorNotice: typeof originalCreateErrorNotice;
} ) => {
	const errorResponse = handleErrorResponse( {
		observerResponses,
		createErrorNotice,
	} );

	if ( errorResponse !== null ) {
		// irrecoverable error so set complete
		if ( ! shouldRetry( errorResponse ) ) {
			dispatch.__internalSetComplete( errorResponse );
		} else {
			dispatch.__internalSetIdle();
		}
	} else {
		const hasErrorNotices =
			notices.checkoutNotices.some(
				( notice: { status: string } ) => notice.status === 'error'
			) ||
			notices.expressPaymentNotices.some(
				( notice: { status: string } ) => notice.status === 'error'
			) ||
			notices.paymentNotices.some(
				( notice: { status: string } ) => notice.status === 'error'
			);
		if ( ! hasErrorNotices ) {
			// no error handling in place by anything so let's fall
			// back to default
			const message =
				data.processingResponse?.message ||
				__(
					'Something went wrong. Please contact us to get assistance.',
					'woocommerce'
				);
			createErrorNotice( message, {
				id: 'checkout',
				context: 'wc/checkout',
			} );
		}

		dispatch.__internalSetIdle();
	}
};

/**
 * This functions runs after the CHECKOUT_SUCCESS event has been triggered and
 * all observers have been processed. It sets any Error Notices and the status of the Checkout
 * based on the observer responses
 */
export const runCheckoutSuccessObservers = ( {
	observerResponses,
	dispatch,
	createErrorNotice,
}: {
	observerResponses: unknown[];
	dispatch: ActionCreatorsOf< ConfigOf< typeof checkoutStore > >;
	createErrorNotice: typeof originalCreateErrorNotice;
} ) => {
	let successResponse = null as null | ObserverSuccessResponse;
	let errorResponse = null as
		| null
		| ObserverErrorResponse
		| ObserverFailResponse;

	observerResponses.forEach( ( response ) => {
		if ( isSuccessResponse( response ) ) {
			// the last observer response always "wins" for success.
			successResponse = response;
		}

		if ( isErrorResponse( response ) || isFailResponse( response ) ) {
			errorResponse = response;
		}
	} );

	if ( successResponse && ! errorResponse ) {
		dispatch.__internalSetComplete( successResponse );
	} else if ( isObject( errorResponse ) ) {
		if ( errorResponse.message && isString( errorResponse.message ) ) {
			const errorOptions =
				errorResponse.messageContext &&
				isString( errorResponse.messageContext )
					? {
							context: errorResponse.messageContext,
					  }
					: undefined;
			createErrorNotice( errorResponse.message, errorOptions );
		}
		if ( ! shouldRetry( errorResponse ) ) {
			dispatch.__internalSetComplete( errorResponse );
		} else {
			// this will set an error which will end up
			// triggering the onCheckoutFail emitter.
			// and then setting checkout to IDLE state.
			dispatch.__internalSetHasError( true );
		}
	} else {
		// nothing hooked in had any response type so let's just consider successful.
		dispatch.__internalSetComplete();
	}
};

/**
 * Prepares the payment_result data from the server checkout endpoint response.
 */
export const getPaymentResultFromCheckoutResponse = (
	response: CheckoutResponse
): PaymentResult => {
	const paymentResult = {
		message: '',
		paymentStatus: 'not set',
		redirectUrl: '',
		paymentDetails: {},
	} as PaymentResult;

	// payment_result is present in successful responses.
	if ( 'payment_result' in response ) {
		paymentResult.paymentStatus = response.payment_result.payment_status;
		paymentResult.redirectUrl = response.payment_result.redirect_url;

		if (
			response.payment_result.hasOwnProperty( 'payment_details' ) &&
			Array.isArray( response.payment_result.payment_details )
		) {
			response.payment_result.payment_details.forEach(
				( { key, value }: { key: string; value: string } ) => {
					paymentResult.paymentDetails[ key ] =
						decodeEntities( value );
				}
			);
		}
	}

	// message is present in error responses.
	if ( 'message' in response ) {
		paymentResult.message = decodeEntities( response.message );
	}

	// If there was an error code but no message, set a default message.
	if (
		! paymentResult.message &&
		'data' in response &&
		'status' in response.data &&
		response.data.status > 299
	) {
		paymentResult.message = __(
			'Something went wrong. Please contact us to get assistance.',
			'woocommerce'
		);
	}

	return paymentResult;
};

export const hasValidationError = (
	fieldKey: keyof ContactForm | keyof OrderForm
) => {
	let prefix = '';
	if ( CONTACT_FORM_KEYS.includes( fieldKey as keyof ContactForm ) ) {
		prefix = 'contact_';
	} else if ( ORDER_FORM_KEYS.includes( fieldKey as keyof OrderForm ) ) {
		prefix = 'order_';
	} else {
		return false;
	}
	const error = select( validationStore ).getValidationError(
		`${ prefix }${ fieldKey }`
	);
	if ( error ) {
		return true;
	}
	return false;
};

export const validateAdditionalFields = (
	additionalFields: OrderFormValues | ContactFormValues
): boolean => {
	// Early return if no additional fields to validate
	if ( Object.keys( additionalFields ).length === 0 ) {
		return true;
	}

	// Check each additional field for validation errors
	// The validation store adds a prefix depending on the field location
	for ( const fieldKey of Object.keys( additionalFields ) as Array<
		keyof ContactForm | keyof OrderForm
	> ) {
		if ( hasValidationError( fieldKey ) ) {
			return false;
		}
	}

	return true;
};
