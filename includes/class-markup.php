<?php
/**
 * The markup of the app: its icons and its components.
 *
 * @link       https://github.com/19h47/moodboard
 * @since      1.0.0
 *
 * @package    Moodboard
 * @subpackage Moodboard/includes
 */

namespace Moodboard;

/**
 * Prints the icons of the app and the components of app/components.
 *
 * @since      1.0.0
 * @package    Moodboard
 * @subpackage Moodboard/includes
 * @author     Jérémy Levron <jeremylevron@19h47.fr>
 */
class Markup {

	/**
	 * Paths of the icons of the app, by name, from Material Symbols, by Google, under the Apache License 2.0:
	 * https://github.com/google/material-design-icons
	 *
	 * @var array<string,string>
	 */
	public const array ICONS = array(
		'add'           => 'M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z',
		'arrow_back'    => 'm313-440 224 224-57 56-320-320 320-320 57 56-224 224h487v80H313Z',
		'arrow_forward' => 'M647-440H160v-80h487L423-744l57-56 320 320-320 320-57-56 224-224Z',
		'close'         => 'm256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z',
		'search'        => 'M784-120 532-372q-30 24-69 38t-83 14q-109 0-184.5-75.5T120-580q0-109 75.5-184.5T380-840q109 0 184.5 75.5T640-580q0 44-14 83t-38 69l252 252-56 56ZM380-400q75 0 127.5-52.5T560-580q0-75-52.5-127.5T380-760q-75 0-127.5 52.5T200-580q0 75 52.5 127.5T380-400Z',
	);

	/**
	 * Print an icon of ICONS, hidden from assistive technologies: the control that holds it names it.
	 *
	 * @param string $name Name of the icon.
	 * @return void
	 */
	public static function render_icon( string $name ): void {
		printf(
			'<svg class="moodboard-icon" data-icon="%1$s" viewBox="0 -960 960 960" aria-hidden="true" focusable="false"><path d="%2$s"/></svg>',
			esc_attr( $name ),
			esc_attr( self::ICONS[ $name ] )
		);
	}

	/**
	 * Print a component of app/components, which reads its arguments from `$args`.
	 *
	 * @param string              $name Name of the component, its file.
	 * @param array<string,mixed> $args Arguments of the component.
	 * @return void
	 */
	public static function render_component( string $name, array $args = array() ): void { // phpcs:ignore Generic.CodeAnalysis.UnusedFunctionParameter.FoundAfterLastUsed -- Read by the component it includes.
		require MOODBOARD_DIR_PATH . "app/components/$name.php";
	}
}
