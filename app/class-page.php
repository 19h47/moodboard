<?php
/**
 * The app: the moodboard of a curator, full screen.
 *
 * @link       https://github.com/19h47/moodboard
 * @since      1.0.0
 *
 * @package    Moodboard
 * @subpackage Moodboard/app
 */

namespace Moodboard\App;

use Moodboard\Channels;
use Moodboard\Plugin;
use Moodboard\Roles;
use Moodboard\Texts;

/**
 * Adds the app page under Media and renders it full screen, instead of the admin interface.
 *
 * The page is an admin page, so core handles the login, the capability and the user language; the app reads the
 * moodboard through the REST API of core, with wp.apiFetch for the root URL and the nonce.
 *
 * @since      1.0.0
 * @package    Moodboard
 * @subpackage Moodboard/app
 * @author     Jérémy Levron <jeremylevron@19h47.fr>
 */
class Page {

	/**
	 * Slug of the app page, in its URL.
	 *
	 * @var string
	 */
	public const string SLUG = 'moodboard';

	/**
	 * Views of a page, with its ID in the argument of the same name: ?view=channel&channel=12. A media or a text opened
	 * from a channel keeps it in `channel`, for its neighbours.
	 *
	 * @var list<string>
	 */
	public const array PAGE_VIEWS = array( 'channel', 'media', 'text' );

	/**
	 * Fields of a channel the app reads.
	 *
	 * @var string
	 */
	public const string CHANNEL_FIELDS = 'id,name,description,parent,count';

	/**
	 * Fields of a media the app reads, in the context of its edition, which gives its title, caption and description as
	 * they are written.
	 *
	 * @var string
	 */
	public const string MEDIA_FIELDS = 'id,date,title,caption,description,alt_text,media_type,mime_type,source_url,media_details,moodboard-channels,meta';

	/**
	 * Fields of a text the app reads, in the context of its edition.
	 *
	 * @var string
	 */
	public const string TEXT_FIELDS = 'id,date,title,content,moodboard-channels,meta';

	/**
	 * Most items a page of the REST API gives: the app asks for them all, page after page.
	 *
	 * @var int
	 */
	public const int PER_PAGE = 100;

	/**
	 * Key of localStorage the app keeps its choices in.
	 *
	 * @var string
	 */
	public const string STORAGE_KEY = 'moodboard-app';

	/**
	 * Register hooks.
	 *
	 * @return void
	 */
	public function hooks(): void {
		add_action( 'admin_menu', array( $this, 'add_page' ) );
	}

	/**
	 * URL of the app, the start URL of the installed app too.
	 *
	 * @return string
	 */
	public static function get_url(): string {
		return admin_url( 'upload.php?page=' . self::SLUG );
	}

	/**
	 * Add the app page under Media; it renders on its load hook, before the admin header.
	 *
	 * @return void
	 */
	public function add_page(): void {
		$hook = add_submenu_page(
			'upload.php',
			__( 'Moodboard', 'moodboard' ),
			__( 'Moodboard', 'moodboard' ),
			Roles::CURATE,
			self::SLUG,
			'__return_null'
		);

		if ( $hook ) {
			add_action( "load-$hook", array( $this, 'render_page' ) );
		}
	}

	/**
	 * Render the app or its manifest, then stop before the admin header.
	 *
	 * @return void
	 */
	public function render_page(): void {
		// phpcs:disable WordPress.Security.NonceVerification.Recommended -- Reads what to show, changes nothing.
		if ( isset( $_GET['manifest'] ) ) {
			$this->render_manifest();
			exit;
		}

		$view = sanitize_key( wp_unslash( $_GET['view'] ?? '' ) );
		$id   = absint( $_GET[ $view ] ?? 0 );
		// phpcs:enable WordPress.Security.NonceVerification.Recommended

		$view = in_array( $view, self::PAGE_VIEWS, true ) && $id ? $view : 'index';

		$this->register_assets();
		$this->preload( $view, $id );

		$manifest_url  = add_query_arg( 'manifest', '1', self::get_url() );
		[$favicon_url] = Plugin::get_asset( 'app/favicon.svg' );

		require MOODBOARD_DIR_PATH . 'app/partials/moodboard-app.php';
		exit;
	}

	/**
	 * Give the app the data it asks for first, in the page itself, as the editor of WordPress does: the channels of the
	 * curator, and the blocks of the view shown, the first page of each. wp.apiFetch answers them from the page, without
	 * network, until it has loaded; their paths are the ones the store asks for, in any order.
	 *
	 * @param string $view View shown.
	 * @param int    $id   ID of the channel, the media or the text shown.
	 * @return void
	 */
	private function preload( string $view, int $id ): void {
		$path        = fn( string $route, array $args ) => "/wp/v2/$route?" . http_build_query( $args, '', '&', PHP_QUERY_RFC3986 );
		$page        = array(
			'per_page' => self::PER_PAGE,
			'page'     => 1,
		);
		$channel_ids = get_terms(
			array(
				'taxonomy'   => Channels::TAXONOMY,
				'hide_empty' => false,
				'fields'     => 'ids',
				'meta_key'   => Channels::AUTHOR, // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key -- The channels of a curator, a few dozen.
				'meta_value' => (string) get_current_user_id(), // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_value -- Idem.
			)
		);
		$channel_ids = is_array( $channel_ids ) ? $channel_ids : array();
		$paths       = array( $path( 'moodboard-channels', array( '_fields' => self::CHANNEL_FIELDS ) + $page ) );
		$blocks      = fn( string $channels ) => array(
			$path(
				'media',
				array(
					'_fields'            => self::MEDIA_FIELDS,
					'context'            => 'edit',
					'moodboard-channels' => $channels,
				) + $page
			),
			$path(
				'moodboard-texts',
				array(
					'_fields'            => self::TEXT_FIELDS,
					'context'            => 'edit',
					'moodboard-channels' => $channels,
				) + $page
			),
		);

		if ( 'index' === $view && $channel_ids ) {
			sort( $channel_ids );
			$paths = array( ...$paths, ...$blocks( implode( ',', $channel_ids ) ) );
		}

		if ( 'channel' === $view ) {
			$paths = array( ...$paths, ...$blocks( (string) $id ) );
		}

		$routes = array(
			'media' => 'media',
			'text'  => 'moodboard-texts',
		);

		if ( isset( $routes[ $view ] ) ) {
			$fields  = 'media' === $view ? self::MEDIA_FIELDS : self::TEXT_FIELDS;
			$paths[] = $path(
				"{$routes[ $view ]}/$id",
				array(
					'_fields' => $fields,
					'context' => 'edit',
				)
			);
		}

		$data = array_reduce( $paths, 'rest_preload_api_request', array() );

		// Only the first requests of the page, until it has loaded: a request after, such as the blocks of a channel added
		// to, goes to the network.
		$script = <<<'JS'
( () => {
	const preloading = wp.apiFetch.createPreloadingMiddleware( %s );
	let isLoading = true;

	addEventListener( 'load', () => {
		isLoading = false;
	} );
	wp.apiFetch.use( ( options, next ) => ( isLoading ? preloading( options, next ) : next( options ) ) );
} )();
JS;

		wp_add_inline_script( 'wp-api-fetch', sprintf( $script, wp_json_encode( $data ) ), 'after' );
	}

	/**
	 * Render the web app manifest, which makes the app installable. The page links it with crossorigin="use-credentials":
	 * it is behind the login, like the app.
	 *
	 * @return void
	 */
	private function render_manifest(): void {
		[ $icon_url ] = Plugin::get_asset( 'app/favicon.svg' );

		$manifest = array(
			'name'             => __( 'Moodboard', 'moodboard' ),
			'short_name'       => __( 'Moodboard', 'moodboard' ),
			'start_url'        => self::get_url(),
			'scope'            => admin_url(),
			'display'          => 'standalone',
			'background_color' => '#ffffff',
			'theme_color'      => '#ffffff',
			'icons'            => array(
				array(
					'src'   => $icon_url,
					'sizes' => 'any',
					'type'  => 'image/svg+xml',
				),
			),
		);

		header( 'Content-Type: application/manifest+json; charset=' . get_option( 'blog_charset' ) );
		echo wp_json_encode( $manifest, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE );
	}

	/**
	 * Register the styles and scripts the page prints, as the app of Library does: app-style.css, the base shared by
	 * 19h47's small apps, then moodboard-app.css, a sheet per component and per view; the modules of app/js/lib, which
	 * the router, the components and the bricks import, each depending on them all, so that the import map gives them.
	 *
	 * @return void
	 */
	private function register_assets(): void {
		self::register_base_styles();

		$sheets = array();

		foreach ( array( 'components', 'views' ) as $folder ) {
			$sheet_files = glob( MOODBOARD_DIR_PATH . "app/css/$folder/*.css" );

			foreach ( $sheet_files ? $sheet_files : array() as $file ) {
				$name              = basename( $file, '.css' );
				$handle            = "moodboard-app-$folder-$name";
				[ $url, $version ] = Plugin::get_asset( "app/css/$folder/$name.css" );
				$sheets[]          = $handle;
				wp_register_style( $handle, $url, array( 'moodboard-app' ), $version );
			}
		}

		// No file of its own: printed, it prints its sheets, the components then the views, as their layers follow one another.
		wp_register_style( 'moodboard-app-sheets', false, $sheets ); // phpcs:ignore WordPress.WP.EnqueuedResourceParameters.MissingVersion -- No URL to version.

		// What the modules take from WordPress, wp.apiFetch, wp.i18n and wp.url, and the config, before them.
		wp_register_script( 'moodboard-app-config', false, array( 'wp-api-fetch', 'wp-i18n', 'wp-url' ), false, false ); // phpcs:ignore WordPress.WP.EnqueuedResourceParameters -- No URL to version.
		wp_localize_script( 'moodboard-app-config', 'moodboardApp', $this->get_config() );

		$shared    = array();
		$lib_files = glob( MOODBOARD_DIR_PATH . 'app/js/lib/*.js' );

		foreach ( $lib_files ? $lib_files : array() as $file ) {
			$name              = basename( $file, '.js' );
			[ $url, $version ] = Plugin::get_asset( "app/js/lib/$name.js" );
			$shared[]          = "moodboard-app/$name";
			wp_register_script_module( "moodboard-app/$name", $url, array(), $version );
			wp_set_script_module_translations( "moodboard-app/$name", 'moodboard', MOODBOARD_DIR_PATH . 'languages' );
		}

		// Before the bricks: it reads the URL, which says what they show.
		wp_enqueue_script_module( 'moodboard-app/router' );

		$element_folders = array(
			'components' => 'moodboard-app/components/',
			'bricks'     => 'moodboard-app/',
		);

		foreach ( $element_folders as $folder => $prefix ) {
			$element_files = glob( MOODBOARD_DIR_PATH . "app/js/$folder/*.js" );

			foreach ( $element_files ? $element_files : array() as $file ) {
				$name              = basename( $file, '.js' );
				[ $url, $version ] = Plugin::get_asset( "app/js/$folder/$name.js" );
				wp_enqueue_script_module( $prefix . $name, $url, $shared, $version );
				wp_set_script_module_translations( $prefix . $name, 'moodboard', MOODBOARD_DIR_PATH . 'languages' );
			}
		}
	}

	/**
	 * Register the styles the app and its login share: app-style.css, then moodboard-app.css, the order of the layers
	 * of the app and its tokens.
	 *
	 * @return void
	 */
	public static function register_base_styles(): void {
		[ $base_url, $base_version ] = Plugin::get_asset( 'app/css/app-style.css' );
		wp_register_style( 'moodboard-app-style', $base_url, array(), $base_version );

		[ $style_url, $style_version ] = Plugin::get_asset( 'app/css/moodboard-app.css' );
		wp_register_style( 'moodboard-app', $style_url, array( 'moodboard-app-style' ), $style_version );
	}

	/**
	 * What the scripts need from the server: the fields they read, the routes of the REST API and the URL of the app.
	 *
	 * @return array<string,mixed>
	 */
	private function get_config(): array {
		return array(
			'appUrl'        => self::get_url(),
			'channelFields' => self::CHANNEL_FIELDS,
			'mediaFields'   => self::MEDIA_FIELDS,
			'textFields'    => self::TEXT_FIELDS,
			'perPage'       => self::PER_PAGE,
			'channelsBase'  => (string) get_taxonomy( Channels::TAXONOMY )->rest_base,
			'textsBase'     => (string) get_post_type_object( Texts::POST_TYPE )?->rest_base,
		);
	}
}
