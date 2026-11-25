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
use Moodboard\Meta;
use Moodboard\Plugin;
use Moodboard\Roles;
use Moodboard\Posts;

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
	public const array PAGE_VIEWS = array( 'channel', 'media', 'text', 'link' );

	/**
	 * Fields of a channel the app reads.
	 *
	 * @var string
	 */
	public const string CHANNEL_FIELDS = 'id,name,description,parent,count,moodboard_covers,meta';

	/**
	 * Fields of a media the app reads, in the context of its edition, which gives its title and description as they are
	 * written.
	 *
	 * @var string
	 */
	public const string MEDIA_FIELDS = 'id,date,title,description,alt_text,media_type,mime_type,source_url,media_details,moodboard-channels,meta';

	/**
	 * Fields of a text the app reads, in the context of its edition.
	 *
	 * @var string
	 */
	public const string TEXT_FIELDS = 'id,date,title,content,moodboard-channels,meta';

	/**
	 * Fields of a link the app reads, in the context of its edition, with the image of its page, `moodboard_image`. Its
	 * page reads its player besides, `moodboard_embed`, which a list leaves out, as core may ask the provider of each URL.
	 *
	 * @var string
	 */
	public const string LINK_FIELDS = 'id,date,title,content,moodboard-channels,meta,moodboard_image';

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
	 * Arguments of the URL of the app that hold what is shared to it, by what they hold, as the share target of its
	 * manifest names them: the title, the text and the URL of a page shared from another app, or from a shortcut.
	 *
	 * @var array<string,string>
	 */
	public const array SHARE_PARAMS = array(
		'title' => 'moodboard-title',
		'text'  => 'moodboard-text',
		'url'   => 'moodboard-url',
	);

	/**
	 * Register hooks.
	 *
	 * @return void
	 */
	public function hooks(): void {
		add_action( 'admin_menu', array( $this, 'add_page' ) );
		add_action( 'load-upload.php', array( $this, 'redirect_share' ) );
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
	 * Send what is shared to the app, from the Media page: the share target of the manifest opens its action without
	 * the arguments of its URL, the page of the app among them, but with what is shared.
	 *
	 * @return void
	 */
	public function redirect_share(): void {
		// phpcs:disable WordPress.Security.NonceVerification.Recommended -- Changes nothing: the app shows it, to add.
		$shared = array_filter(
			array_map(
				fn( string $param ): string => rawurlencode( sanitize_textarea_field( wp_unslash( $_GET[ $param ] ?? '' ) ) ),
				array_combine( self::SHARE_PARAMS, self::SHARE_PARAMS )
			)
		);
		// phpcs:enable WordPress.Security.NonceVerification.Recommended

		if ( ! $shared ) {
			return;
		}

		wp_safe_redirect( add_query_arg( $shared, self::get_url() ) );
		exit;
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
		$from = absint( $_GET['channel'] ?? 0 );
		// phpcs:enable WordPress.Security.NonceVerification.Recommended

		$view = in_array( $view, self::PAGE_VIEWS, true ) && $id ? $view : 'index';

		$this->register_assets();
		$this->preload( $view, $id, 'channel' === $view ? 0 : $from );

		$manifest_url       = add_query_arg( 'manifest', '1', self::get_url() );
		[ $favicon_url ]    = Plugin::get_asset( 'app/favicon.svg' );
		[ $touch_icon_url ] = Plugin::get_asset( 'app/apple-touch-icon.png' );

		require MOODBOARD_DIR_PATH . 'app/partials/moodboard-app.php';
		exit;
	}

	/**
	 * Give the app the data it asks for first, in the page itself, as the editor of WordPress does: the channels of the
	 * curator, and the blocks of the view shown, the first page of each: those of the index, of the channel shown, or of
	 * the channel a block shown was opened from, its neighbours. wp.apiFetch answers them from the page, without network,
	 * until it has loaded; their paths are the ones the store asks for, in any order.
	 *
	 * @param string $view View shown.
	 * @param int    $id   ID of the channel, the media or the text shown.
	 * @param int    $from ID of the channel a block shown was opened from, 0 for the index.
	 * @return void
	 */
	private function preload( string $view, int $id, int $from ): void {
		$path   = fn( string $route, array $args ) => "/wp/v2/$route?" . http_build_query( $args, '', '&', PHP_QUERY_RFC3986 );
		$page   = array(
			'per_page' => self::PER_PAGE,
			'page'     => 1,
		);
		$paths  = array( $path( 'moodboard-channels', array( '_fields' => self::CHANNEL_FIELDS ) + $page ) );
		$kinds  = array(
			'media' => array(
				'route' => 'media',
				'args'  => array( '_fields' => self::MEDIA_FIELDS ),
			),
			'text'  => array(
				'route' => 'moodboard-texts',
				'args'  => array( '_fields' => self::TEXT_FIELDS ),
			),
			'link'  => array(
				'route' => 'moodboard-links',
				'args'  => array( '_fields' => self::LINK_FIELDS ),
			),
		);
		$blocks = fn( array $args ) => array_map(
			fn( string $kind ) => $path( $kinds[ $kind ]['route'], $kinds[ $kind ]['args'] + array( 'context' => 'edit' ) + ( $args[ $kind ] ?? array() ) + $page ),
			array_keys( $kinds )
		);

		$channel_id = 'channel' === $view ? $id : $from;

		// The index, the blocks of the curator, in a channel or none: their media marked as blocks, their texts and links.
		$paths = array(
			...$paths,
			...( $channel_id
				? $blocks( array_fill_keys( array_keys( $kinds ), array( 'moodboard-channels' => $channel_id ) ) )
				: $blocks( array( 'media' => array( Meta::BLOCK => 1 ) ) ) ),
		);

		// A block shown, its player besides for a link.
		if ( isset( $kinds[ $view ] ) ) {
			$args = $kinds[ $view ]['args'] + array( 'context' => 'edit' );

			if ( 'link' === $view ) {
				$args['_fields'] .= ',moodboard_embed';
			}

			$paths[] = $path( "{$kinds[ $view ]['route']}/$id", $args );
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
	 * it is behind the login, like the app. Its icons are the dark ones: the home screen icon of a web app does not follow
	 * the system theme. Its scope is the Media page, where the app and its share target are: an app of the same admin on
	 * another page, such as Library, is installed beside it rather than taken for it. Its share target, where a browser
	 * has one, puts the app in the share sheet of the system: what is shared opens the Media page, which sends it to the
	 * app.
	 *
	 * @return void
	 */
	private function render_manifest(): void {
		[ $icon_url ]       = Plugin::get_asset( 'app/favicon-dark.svg' );
		[ $touch_icon_url ] = Plugin::get_asset( 'app/apple-touch-icon.png' );

		$manifest = array(
			'name'             => __( 'Moodboard', 'moodboard' ),
			'short_name'       => __( 'Moodboard', 'moodboard' ),
			'start_url'        => self::get_url(),
			'scope'            => admin_url( 'upload.php' ),
			'display'          => 'standalone',
			'background_color' => '#ffffff',
			'theme_color'      => '#ffffff',
			'icons'            => array(
				array(
					'src'   => $icon_url,
					'sizes' => 'any',
					'type'  => 'image/svg+xml',
				),
				array(
					'src'   => $touch_icon_url,
					'sizes' => '180x180',
					'type'  => 'image/png',
				),
			),
			'share_target'     => array(
				'action' => admin_url( 'upload.php' ),
				'method' => 'GET',
				'params' => self::SHARE_PARAMS,
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

		// The theme before the first paint, with what the modules take from WordPress: wp.apiFetch, wp.i18n, wp.url and the config.
		[ $theme_url, $theme_version ] = Plugin::get_asset( 'app/js/moodboard-app-theme.js' );
		wp_register_script( 'moodboard-app-theme', $theme_url, array( 'wp-api-fetch', 'wp-i18n', 'wp-url' ), $theme_version, false );
		wp_localize_script( 'moodboard-app-theme', 'moodboardApp', $this->get_config() );

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
	 * What the scripts need from the server: the fields they read, the routes of the REST API, the URL of the app, its
	 * icons, by theme, and the arguments of its URL that hold what is shared to it.
	 *
	 * @return array<string,mixed>
	 */
	private function get_config(): array {
		[ $favicon_url ]      = Plugin::get_asset( 'app/favicon.svg' );
		[ $favicon_dark_url ] = Plugin::get_asset( 'app/favicon-dark.svg' );

		return array(
			'appUrl'        => self::get_url(),
			'storageKey'    => self::STORAGE_KEY,
			'channelFields' => self::CHANNEL_FIELDS,
			'mediaFields'   => self::MEDIA_FIELDS,
			'textFields'    => self::TEXT_FIELDS,
			'linkFields'    => self::LINK_FIELDS,
			'perPage'       => self::PER_PAGE,
			'channelsBase'  => (string) get_taxonomy( Channels::TAXONOMY )->rest_base,
			'textsBase'     => (string) get_post_type_object( Posts::TEXT )?->rest_base,
			'linksBase'     => (string) get_post_type_object( Posts::LINK )?->rest_base,
			'icons'         => array(
				'light' => $favicon_url,
				'dark'  => $favicon_dark_url,
			),
			'shareParams'   => self::SHARE_PARAMS,
		);
	}
}
