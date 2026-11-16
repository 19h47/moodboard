<?php
/**
 * The blocks that are posts: a text, a quote or a passage of the novel, and a link, a page or a video of the web.
 *
 * @link       https://github.com/19h47/moodboard
 * @since      1.0.0
 *
 * @package    Moodboard
 * @subpackage Moodboard/includes
 */

namespace Moodboard;

/**
 * Registers the moodboard_text and moodboard_link post types, the blocks of text and of a link, as a media is a block of
 * an image or a file. They are private, always: WordPress shows a private post to its author only, so each curator
 * reads their own. Every block takes the notes of core, a comment of the type note, which only those who may edit a
 * block read: the media through the REST API only, where the app writes them, so that their screen keeps its own.
 *
 * @since      1.0.0
 * @package    Moodboard
 * @subpackage Moodboard/includes
 * @author     Jérémy Levron <jeremylevron@19h47.fr>
 */
class Posts {

	/**
	 * Post type of the texts.
	 *
	 * @var string
	 */
	public const string TEXT = 'moodboard_text';

	/**
	 * Post type of the links, their URL their source, their image the one of the page, their description the one it gives.
	 *
	 * @var string
	 */
	public const string LINK = 'moodboard_link';

	/**
	 * Post types of the blocks that are posts, by their REST base.
	 *
	 * @var array<string,string>
	 */
	private const array REST_BASES = array(
		self::TEXT => 'moodboard-texts',
		self::LINK => 'moodboard-links',
	);

	/**
	 * Register hooks.
	 *
	 * @return void
	 */
	public function hooks(): void {
		add_action( 'init', array( $this, 'register_post_types' ) );
		add_action( 'rest_api_init', array( $this, 'take_notes_on_media' ) );
		add_action( 'rest_api_init', array( $this, 'register_embed' ) );
		add_filter( 'wp_insert_post_data', array( $this, 'keep_private' ) );

		foreach ( array_keys( self::REST_BASES ) as $post_type ) {
			add_filter( "rest_{$post_type}_collection_params", array( $this, 'list_private' ) );
			add_filter( "rest_{$post_type}_query", array( $this, 'list_readable' ) );
		}
	}

	/**
	 * Register the post types of the texts and of the links, which the app edits: no screen of the admin.
	 *
	 * @return void
	 */
	public function register_post_types(): void {
		$labels = array(
			self::TEXT => array(
				'name'          => _x( 'Texts', 'moodboard texts general name', 'moodboard' ),
				'singular_name' => _x( 'Text', 'moodboard texts singular name', 'moodboard' ),
			),
			self::LINK => array(
				'name'          => _x( 'Links', 'moodboard links general name', 'moodboard' ),
				'singular_name' => _x( 'Link', 'moodboard links singular name', 'moodboard' ),
			),
		);

		foreach ( self::REST_BASES as $post_type => $rest_base ) {
			register_post_type(
				$post_type,
				array(
					'labels'          => $labels[ $post_type ],
					'public'          => false,
					'show_in_rest'    => true,
					'rest_base'       => $rest_base,
					'supports'        => array(
						'title',
						'editor' => array( 'notes' => true ),
						'author',
						'thumbnail',
						'custom-fields',
					),
					'capability_type' => array( $post_type, "{$post_type}s" ),
					'map_meta_cap'    => true,
					// A curator writes, changes and deletes their blocks; those of others need capabilities no one has.
					'capabilities'    => array(
						'create_posts'           => Roles::CURATE,
						'edit_posts'             => Roles::CURATE,
						'publish_posts'          => Roles::CURATE,
						'delete_posts'           => Roles::CURATE,
						'edit_published_posts'   => Roles::CURATE,
						'delete_published_posts' => Roles::CURATE,
					),
				)
			);
		}
	}

	/**
	 * The media take the notes of core in the REST API, where the app writes them: core reads them from the editor of a
	 * post type, which the screen of a media would show besides its own.
	 *
	 * @return void
	 */
	public function take_notes_on_media(): void {
		add_post_type_support( 'attachment', 'editor', array( 'notes' => true ) );
	}

	/**
	 * Give the links of the REST API the player of their URL, a video or another page core embeds, empty for none: core
	 * keeps it in a meta of the link, as it does for the embeds of a post.
	 *
	 * @return void
	 */
	public function register_embed(): void {
		register_rest_field(
			self::LINK,
			'moodboard_embed',
			array(
				'get_callback' => fn( array $link ) => self::get_embed( (int) $link['id'] ),
				'schema'       => array(
					'description' => __( 'The player of the URL of the link, as core embeds it, empty for none.', 'moodboard' ),
					'type'        => 'string',
					'context'     => array( 'edit' ),
					'readonly'    => true,
				),
			)
		);
	}

	/**
	 * The player of the URL of a link, as core embeds it in a post, empty for a page it does not embed.
	 *
	 * @param int $link_id Post ID of the link.
	 * @return string
	 */
	public static function get_embed( int $link_id ): string {
		global $post, $wp_embed;

		$url = (string) get_post_meta( $link_id, Meta::SOURCE, true );

		if ( '' === $url ) {
			return '';
		}

		// Core caches the embed of a URL in a meta of the post shown, the link, rather than asking its provider each time.
		$shown = $post;
		$post  = get_post( $link_id ); // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited -- The post core caches the embed in, given back below.

		$wp_embed->return_false_on_fail = true;
		$embed                          = $wp_embed->shortcode( array(), $url );

		$post = $shown; // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited -- Given back.

		return is_string( $embed ) ? $embed : '';
	}

	/**
	 * A text or a link is private, whatever status it is saved with, such as the draft the REST API gives a new post: it
	 * goes to the trash, then out of it, private again.
	 *
	 * @param array<string,mixed> $data Post data, slashed.
	 * @return array<string,mixed>
	 */
	public function keep_private( array $data ): array {
		if ( isset( self::REST_BASES[ $data['post_type'] ] ) && in_array( $data['post_status'], array( 'publish', 'future', 'draft', 'pending' ), true ) ) {
			$data['post_status'] = 'private';
		}

		return $data;
	}

	/**
	 * The texts and the links are listed private unless a request asks for another status, as they all are.
	 *
	 * @param array<string,array<string,mixed>> $params Query parameters of the collection.
	 * @return array<string,array<string,mixed>>
	 */
	public function list_private( array $params ): array {
		$params['status']['default'] = 'private';

		return $params;
	}

	/**
	 * List the texts and the links a curator may read, their own, so that the totals of a page count them only: the REST
	 * API leaves out the private posts of others one by one, after the query has counted them.
	 *
	 * @param array<string,mixed> $args Arguments of WP_Query.
	 * @return array<string,mixed>
	 */
	public function list_readable( array $args ): array {
		$args['perm'] = 'readable';

		return $args;
	}
}
