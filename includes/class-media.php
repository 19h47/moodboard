<?php
/**
 * The media of a moodboard: listed as its blocks, and imported from their URL.
 *
 * @link       https://github.com/19h47/moodboard
 * @since      1.0.0
 *
 * @package    Moodboard
 * @subpackage Moodboard/includes
 */

namespace Moodboard;

use WP_Post;
use WP_Query;
use WP_REST_Post_Meta_Fields;
use WP_REST_Request;

/**
 * Lists the media that are the blocks of the curator, `GET /wp/v2/media?moodboard_block=1`, in a channel or none, for the
 * index. Core imports an image from its URL, `POST /wp/v2/media` with `url`, but leaves out the channels and the meta the
 * request gives, which it checked the curator may give: they are given here, the source being the URL unless the
 * request says another.
 *
 * @since      1.0.0
 * @package    Moodboard
 * @subpackage Moodboard/includes
 * @author     Jérémy Levron <jeremylevron@19h47.fr>
 */
class Media {

	/**
	 * Argument of a query of the media, the list of the REST API, that leaves the blocks of others out.
	 *
	 * @var string
	 */
	public const string OTHERS_LEFT_OUT = 'moodboard_others_left_out';

	/**
	 * Register hooks.
	 *
	 * @return void
	 */
	public function hooks(): void {
		add_filter( 'rest_attachment_collection_params', array( $this, 'add_block_param' ) );
		add_filter( 'register_post_type_args', array( $this, 'set_controller' ), 10, 2 );
		add_filter( 'rest_attachment_query', array( $this, 'list_blocks' ), 10, 2 );
		add_filter( 'posts_where', array( $this, 'leave_out_blocks_of_others' ), 10, 2 );
		add_action( 'rest_after_insert_attachment', array( $this, 'file_imported' ), 10, 3 );
	}

	/**
	 * The argument of the list of the media that lists the blocks of the curator.
	 *
	 * @param array<string,array<string,mixed>> $params Query parameters of the collection.
	 * @return array<string,array<string,mixed>>
	 */
	public function add_block_param( array $params ): array {
		$params[ Meta::BLOCK ] = array(
			'description' => __( 'Limit the result to the blocks of the moodboard of the current user.', 'moodboard' ),
			'type'        => 'boolean',
		);

		return $params;
	}

	/**
	 * List the blocks of the curator, when asked: their media marked as blocks.
	 *
	 * @param array<string,mixed> $args    Arguments of WP_Query.
	 * @param WP_REST_Request     $request Request.
	 * @return array<string,mixed>
	 */
	public function list_blocks( array $args, WP_REST_Request $request ): array {
		if ( empty( $request[ Meta::BLOCK ] ) ) {
			$args[ self::OTHERS_LEFT_OUT ] = true;

			return $args;
		}

		$args['author']     = get_current_user_id();
		$args['meta_query'] = array( // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query -- The media of a curator.
			...( is_array( $args['meta_query'] ?? null ) ? $args['meta_query'] : array() ),
			array(
				'key'   => Meta::BLOCK,
				'value' => '1',
			),
		);

		return $args;
	}

	/**
	 * Read a media of the REST API through Media_Controller, which reads a block for its curator only.
	 *
	 * @param array<string,mixed> $args      Arguments of the post type.
	 * @param string              $post_type Post type.
	 * @return array<string,mixed>
	 */
	public function set_controller( array $args, string $post_type ): array {
		if ( 'attachment' === $post_type ) {
			$args['rest_controller_class'] = Media_Controller::class;
		}

		return $args;
	}

	/**
	 * Leave the blocks of others out of a list of the media of the REST API: those of the curator and any other media of
	 * the library stay.
	 *
	 * @param string   $where The WHERE clause.
	 * @param WP_Query $query The query.
	 * @return string
	 */
	public function leave_out_blocks_of_others( string $where, WP_Query $query ): string {
		global $wpdb;

		if ( ! $query->get( self::OTHERS_LEFT_OUT ) ) {
			return $where;
		}

		return $where . $wpdb->prepare(
			" AND ( {$wpdb->posts}.post_author = %d OR NOT EXISTS ( SELECT 1 FROM {$wpdb->postmeta} WHERE {$wpdb->postmeta}.post_id = {$wpdb->posts}.ID AND {$wpdb->postmeta}.meta_key = %s AND {$wpdb->postmeta}.meta_value = '1' ) )",
			get_current_user_id(),
			Meta::BLOCK
		);
	}

	/**
	 * Give a media imported from its URL its channels and its meta, as core gives them to a file uploaded: its source the
	 * URL, unless the request says another.
	 *
	 * @param WP_Post         $attachment Media.
	 * @param WP_REST_Request $request    Request.
	 * @param bool            $creating   Whether the media is new.
	 * @return void
	 */
	public function file_imported( WP_Post $attachment, WP_REST_Request $request, bool $creating ): void {
		if ( ! $creating || empty( $request['url'] ) ) {
			return;
		}

		$rest_base = (string) get_taxonomy( Channels::TAXONOMY )->rest_base;

		if ( isset( $request[ $rest_base ] ) ) {
			wp_set_object_terms( $attachment->ID, array_map( 'intval', (array) $request[ $rest_base ] ), Channels::TAXONOMY );
		}

		$meta = ( is_array( $request['meta'] ) ? $request['meta'] : array() ) + array( Meta::SOURCE => $request['url'] );

		new WP_REST_Post_Meta_Fields( 'attachment' )->update_value( $meta, $attachment->ID );
	}
}
