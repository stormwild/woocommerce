/**
 * Internal dependencies
 */
import { createDeprecatedObjectProxy } from '../../utils';
import { deprecatedAdminProperties } from '../../utils/admin-settings';

if (
	window.wcSettings &&
	deprecatedAdminProperties &&
	Object.keys( deprecatedAdminProperties ).length > 0 &&
	process.env.NODE_ENV === 'development'
) {
	wcSettings = createDeprecatedObjectProxy( wcSettings, {
		admin: deprecatedAdminProperties,
	} );
}
