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
	 * Paths of the icons of the app, by name, from Material Symbols, by Google, under the Apache License 2.0, but the box:
	 * https://github.com/google/material-design-icons
	 *
	 * @var array<string,string>
	 */
	public const array ICONS = array(
		'add'            => 'M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z',
		'arrow_back'     => 'm313-440 224 224-57 56-320-320 320-320 57 56-224 224h487v80H313Z',
		'arrow_forward'  => 'M647-440H160v-80h487L423-744l57-56 320 320-320 320-57-56 224-224Z',
		'close'          => 'm256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z',
		'drag_indicator' => 'M360-160q-33 0-56.5-23.5T280-240q0-33 23.5-56.5T360-320q33 0 56.5 23.5T440-240q0 33-23.5 56.5T360-160Zm240 0q-33 0-56.5-23.5T520-240q0-33 23.5-56.5T600-320q33 0 56.5 23.5T680-240q0 33-23.5 56.5T600-160ZM360-400q-33 0-56.5-23.5T280-480q0-33 23.5-56.5T360-560q33 0 56.5 23.5T440-480q0 33-23.5 56.5T360-400Zm240 0q-33 0-56.5-23.5T520-480q0-33 23.5-56.5T600-560q33 0 56.5 23.5T680-480q0 33-23.5 56.5T600-400ZM360-640q-33 0-56.5-23.5T280-720q0-33 23.5-56.5T360-800q33 0 56.5 23.5T440-720q0 33-23.5 56.5T360-640Zm240 0q-33 0-56.5-23.5T520-720q0-33 23.5-56.5T600-800q33 0 56.5 23.5T680-720q0 33-23.5 56.5T600-640Z',
		'drag_pan'       => 'M480-80 310-250l57-57 73 73v-206H235l73 72-58 58L80-480l169-169 57 57-72 72h206v-206l-73 73-57-57 170-170 170 170-57 57-73-73v206h205l-73-72 58-58 170 170-170 170-57-57 73-73H520v205l72-73 58 58L480-80Z',
		'expand_more'    => 'M480-345 240-585l56-56 184 184 184-184 56 56-240 240Z',
		'dark_mode'      => 'M480-120q-150 0-255-105T120-480q0-150 105-255t255-105q14 0 27.5 1t26.5 3q-41 29-65.5 75.5T444-660q0 90 63 153t153 63q55 0 101-24.5t75-65.5q2 13 3 26.5t1 27.5q0 150-105 255T480-120Zm0-80q88 0 158-48.5T740-375q-20 5-40 8t-40 3q-123 0-209.5-86.5T364-660q0-20 3-40t8-40q-78 32-126.5 102T200-480q0 116 82 198t198 82Zm-10-270Z',
		'light_mode'     => 'M480-360q50 0 85-35t35-85q0-50-35-85t-85-35q-50 0-85 35t-35 85q0 50 35 85t85 35Zm0 80q-83 0-141.5-58.5T280-480q0-83 58.5-141.5T480-680q83 0 141.5 58.5T680-480q0 83-58.5 141.5T480-280ZM200-440H40v-80h160v80Zm720 0H760v-80h160v80ZM440-760v-160h80v160h-80Zm0 720v-160h80v160h-80ZM256-650l-101-97 57-59 96 100-52 56Zm492 496-97-101 53-55 101 97-57 59Zm-98-550 97-101 59 57-100 96-56-52ZM154-212l101-97 55 53-97 101-59-57Zm326-268Z',
		// Drawn for the app, as a box of Material Symbols with its tick: a square, the square inside it, the tick in it.
		'select'         => 'M200-200V-760H760V-200ZM280-280H680V-680H280ZM290-430L340-480L440-380L620-560L670-510L440-280Z',
		'pause'          => 'M520-200v-560h240v560H520Zm-320 0v-560h240v560H200Z',
		'play_arrow'     => 'M320-200v-560l440 280-440 280Z',
		'search'         => 'M784-120 532-372q-30 24-69 38t-83 14q-109 0-184.5-75.5T120-580q0-109 75.5-184.5T380-840q109 0 184.5 75.5T640-580q0 44-14 83t-38 69l252 252-56 56ZM380-400q75 0 127.5-52.5T560-580q0-75-52.5-127.5T380-760q-75 0-127.5 52.5T200-580q0 75 52.5 127.5T380-400Z',
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
