/**
 * External dependencies
 */
import { __ } from '@wordpress/i18n';
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import { getAdminLink } from '@woocommerce/settings';
import { blocksConfig } from '@woocommerce/block-settings';
import BlockTitle from '@woocommerce/editor-components/block-title';
import { Icon, currencyDollar, external } from '@wordpress/icons';
import type { BlockEditProps } from '@wordpress/blocks';
import {
	Placeholder,
	Disabled,
	PanelBody,
	ToggleControl,
	Button,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToggleGroupControl as ToggleGroupControl,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToggleGroupControlOption as ToggleGroupControlOption,
} from '@wordpress/components';

/**
 * Internal dependencies
 */
import Block from './block';
import './editor.scss';
import type { Attributes } from './types';
import { UpgradeNotice } from '../filter-wrapper/upgrade';

export default function ( {
	attributes,
	setAttributes,
	clientId,
}: BlockEditProps< Attributes > ) {
	const {
		heading,
		headingLevel,
		showInputFields,
		inlineInput,
		showFilterButton,
	} = attributes;

	const blockProps = useBlockProps();

	const getInspectorControls = () => {
		return (
			<InspectorControls key="inspector">
				<PanelBody>
					<UpgradeNotice clientId={ clientId } />
				</PanelBody>
				<PanelBody title={ __( 'Settings', 'woocommerce' ) }>
					<ToggleGroupControl
						label={ __( 'Price Range Selector', 'woocommerce' ) }
						isBlock
						value={ showInputFields ? 'editable' : 'text' }
						onChange={ ( value: string ) =>
							setAttributes( {
								showInputFields: value === 'editable',
							} )
						}
						className="wc-block-price-filter__price-range-toggle"
					>
						<ToggleGroupControlOption
							value="editable"
							label={ __( 'Editable', 'woocommerce' ) }
						/>
						<ToggleGroupControlOption
							value="text"
							label={ __( 'Text', 'woocommerce' ) }
						/>
					</ToggleGroupControl>
					{ showInputFields && (
						<ToggleControl
							label={ __( 'Inline input fields', 'woocommerce' ) }
							checked={ inlineInput }
							onChange={ () =>
								setAttributes( {
									inlineInput: ! inlineInput,
								} )
							}
							help={ __(
								'Show input fields inline with the slider.',
								'woocommerce'
							) }
						/>
					) }
					<ToggleControl
						label={ __(
							"Show 'Apply filters' button",
							'woocommerce'
						) }
						help={ __(
							'Products will update when the button is clicked.',
							'woocommerce'
						) }
						checked={ showFilterButton }
						onChange={ () =>
							setAttributes( {
								showFilterButton: ! showFilterButton,
							} )
						}
					/>
				</PanelBody>
			</InspectorControls>
		);
	};

	const noProductsPlaceholder = () => (
		<Placeholder
			className="wc-block-price-slider"
			icon={ <Icon icon={ currencyDollar } /> }
			label={ __( 'Filter by Price', 'woocommerce' ) }
			instructions={ __(
				'Display a slider to filter products in your store by price.',
				'woocommerce'
			) }
		>
			<p>
				{ __(
					'To filter your products by price you first need to assign prices to your products.',
					'woocommerce'
				) }
			</p>
			<Button
				className="wc-block-price-slider__add-product-button"
				variant="secondary"
				href={ getAdminLink( 'post-new.php?post_type=product' ) }
				target="_top"
			>
				{ __( 'Add new product', 'woocommerce' ) + ' ' }
				<Icon icon={ external } />
			</Button>
			<Button
				className="wc-block-price-slider__read_more_button"
				variant="tertiary"
				href="https://woocommerce.com/document/managing-products/"
				target="_blank"
			>
				{ __( 'Learn more', 'woocommerce' ) }
			</Button>
		</Placeholder>
	);

	return (
		<div { ...blockProps }>
			{ blocksConfig.productCount === 0 ? (
				noProductsPlaceholder()
			) : (
				<>
					{ getInspectorControls() }
					{ heading && (
						<BlockTitle
							className="wc-block-price-filter__title"
							headingLevel={ headingLevel }
							heading={ heading }
							onChange={ ( value: string ) =>
								setAttributes( { heading: value } )
							}
						/>
					) }
					<Disabled>
						<Block attributes={ attributes } isEditor={ true } />
					</Disabled>
				</>
			) }
		</div>
	);
}
