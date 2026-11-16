/**
 * The checks of the scripts of the plugin, with the rules of WordPress: the app.
 */

import globals from 'globals';
import wordpress from '@wordpress/eslint-plugin';

export default [
	{
		ignores: [ 'vendor/**', 'node_modules/**', 'languages/**' ],
	},
	...wordpress.configs.recommended,
	{
		// No React here: the rules of WordPress bring its plugin, which would look for it.
		settings: { react: { version: '19.0' } },
	},
	{
		files: [ 'app/js/**' ],
		languageOptions: {
			globals: { ...globals.browser, wp: 'readonly' },
		},
		settings: {
			// The modules of the app by the names of the import map of the page.
			'import/core-modules': [
				'moodboard-app/app',
				'moodboard-app/api',
				'moodboard-app/behaviors',
				'moodboard-app/brick',
				'moodboard-app/component',
				'moodboard-app/dom',
				'moodboard-app/render',
				'moodboard-app/router',
				'moodboard-app/state',
				'moodboard-app/store',
			],
		},
	},
	{
		// A component is plugged in and out as a package, through its API alone: it reads no state of the app.
		files: [ 'app/js/components/**' ],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					paths: [
						'moodboard-app/store',
						'moodboard-app/state',
						'moodboard-app/router',
						'moodboard-app/api',
						'moodboard-app/brick',
						'moodboard-app/behaviors',
						'moodboard-app/render',
					].map( ( name ) => ( {
						name,
						message:
							'A component reads no state of the app: its place sets its API, its attributes and its properties.',
					} ) ),
				},
			],
		},
	},
	{
		// A script reaches an element by a data attribute or by what it is, never by a class of its styles.
		files: [ 'app/js/**' ],
		rules: {
			'no-restricted-syntax': [
				'error',
				...[
					'Literal[value',
					'TemplateLiteral > TemplateElement[value.raw',
				].map( ( node ) => ( {
					selector: `CallExpression[callee.property.name=/^(querySelector|querySelectorAll|closest|matches)$/] > ${ node }=/(^|[\\s>+~,(])\\.[A-Za-z_-]/]`,
					message:
						'Reach an element by a data attribute, such as data-part, or by what it is, never by a class of its styles.',
				} ) ),
			],
		},
	},
];
