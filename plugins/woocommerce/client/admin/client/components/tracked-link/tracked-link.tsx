/**
 * External dependencies
 */
import { Text } from '@woocommerce/experimental';
import interpolateComponents from '@automattic/interpolate-components';
import { Link } from '@woocommerce/components';
import { recordEvent, ExtraProperties } from '@woocommerce/tracks';

interface TextProps {
	/**
	 * HTML element to use for the Text component. Uses `span` by default.
	 */
	as?: string;
	className?: string;
}

interface TrackedLinkProps {
	textProps?: TextProps;
	/**
	 * The complete translatable string that includes {{Link}} and {{/Link}} placeholders
	 * Example: "Visit the {{Link}}Official WooCommerce Marketplace{{/Link}} to find more tax solutions"
	 */
	message: string;
	eventName?: string;
	eventProperties?: ExtraProperties;
	targetUrl: string;
	/**
	 * Optional callback function to be called when the link is clicked
	 * If provided, this will be called instead of the default recordEvent behavior
	 */
	onClickCallback?: () => void;
}

/**
 * A component that renders a link with tracking capabilities.
 */
export const TrackedLink: React.FC< TrackedLinkProps > = ( {
	textProps,
	message,
	eventName = '',
	eventProperties = {},
	targetUrl,
	onClickCallback,
} ) => (
	<Text { ...textProps }>
		{ interpolateComponents( {
			mixedString: message,
			components: {
				Link: (
					<Link
						onClick={ () => {
							if ( onClickCallback ) {
								onClickCallback();
							} else if (
								eventProperties &&
								Object.keys( eventProperties ).length > 0
							) {
								recordEvent( eventName, eventProperties );
							} else {
								recordEvent( eventName );
							}
							window.location.href = targetUrl;
							return false;
						} }
						href={ targetUrl }
						type="wc-admin"
					/>
				),
			},
		} ) }
	</Text>
);
