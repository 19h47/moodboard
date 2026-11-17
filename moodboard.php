<?php
/**
 * Plugin bootstrap and text domain loading.
 *
 * @link       https://github.com/19h47/moodboard
 * @since      1.0.0
 *
 * @package    Moodboard
 *
 * @wordpress-plugin
 * Plugin Name:       Moodboard
 * Plugin URI:        https://www.github.com/19h47/moodboard
 * Description:       Collect images, files and texts in channels, as a moodboard, from a private app.
 * Version:           0.1.6
 * Requires at least: 7.1
 * Requires PHP:      8.5
 * Author:            Jérémy Levron
 * Author URI:        https://www.19h47.fr
 * License:           GPL v2 or later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Update URI:        https://github.com/19h47/moodboard
 * Text Domain:       moodboard
 * Domain Path:       /languages
 */

// If this file is called directly, abort.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'MOODBOARD_FILE', __FILE__ );
define( 'MOODBOARD_DIR_PATH', __DIR__ . '/' );

add_action(
	'init',
	function (): void {
		load_plugin_textdomain( 'moodboard', false, dirname( plugin_basename( __FILE__ ) ) . '/languages' );
	},
	0
);

// The classes of the plugin, as Composer maps them: see composer.json.
require_once MOODBOARD_DIR_PATH . 'vendor/autoload.php';

add_action( 'plugins_loaded', array( new Moodboard\Plugin(), 'run' ) );
