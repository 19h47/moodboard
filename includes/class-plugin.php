<?php
/**
 * Core plugin class.
 *
 * @link       https://github.com/19h47/moodboard
 * @since      1.0.0
 *
 * @package    Moodboard
 * @subpackage Moodboard/includes
 */

namespace Moodboard;

use Moodboard\App\Login;
use Moodboard\App\Page;

/**
 * Lets each class of the plugin register its hooks, and gives the URL of its assets.
 *
 * @since      1.0.0
 * @package    Moodboard
 * @subpackage Moodboard/includes
 * @author     Jérémy Levron <jeremylevron@19h47.fr>
 */
class Plugin {

	/**
	 * URL and version of an asset of the plugin.
	 *
	 * The version is the file modification time, so a changed file is never served from cache.
	 *
	 * @param string $path Path relative to the plugin folder, e.g. assets/icon.svg.
	 * @return array{0:non-empty-string,1:string}
	 */
	public static function get_asset( string $path ): array {
		$url     = plugins_url( $path, MOODBOARD_FILE );
		$version = (string) filemtime( MOODBOARD_DIR_PATH . $path );

		return array( $url, $version );
	}

	/**
	 * Register the hooks of the classes, which Composer loads as they are used.
	 *
	 * @since  1.0.0
	 * @return void
	 */
	public function run(): void {
		$plugin_file = plugin_basename( MOODBOARD_FILE );

		new Roles()->hooks();
		new Posts()->hooks();
		new Links()->hooks();
		new Channels()->hooks();
		new Meta()->hooks();
		new Search()->hooks();
		new Media()->hooks();
		new Page()->hooks();
		new Login()->hooks();
		new Updater( $plugin_file )->hooks();
	}
}
