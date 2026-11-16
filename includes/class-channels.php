<?php
/**
 * Channels: the collections of a moodboard, a block in as many as one likes, a channel under another.
 *
 * @link       https://github.com/19h47/moodboard
 * @since      1.0.0
 *
 * @package    Moodboard
 * @subpackage Moodboard/includes
 */

namespace Moodboard;

use stdClass;
use WP_Error;
use WP_REST_Request;
use WP_Term;

/**
 * Registers the moodboard_channel taxonomy, over the media and the texts, the blocks: the many-to-many relation of
 * WordPress, so a block is in several channels, and a channel has a parent. A term has no author: the curator who adds
 * a channel is kept in a meta of the term, `moodboard_author`, and each curator lists their own channels only.
 *
 * @since      1.0.0
 * @package    Moodboard
 * @subpackage Moodboard/includes
 * @author     Jérémy Levron <jeremylevron@19h47.fr>
 */
class Channels {

	/**
	 * Taxonomy of the channels.
	 *
	 * @var string
	 */
	public const string TAXONOMY = 'moodboard_channel';

	/**
	 * Meta of a channel holding the ID of its curator.
	 *
	 * @var string
	 */
	public const string AUTHOR = 'moodboard_author';

	/**
	 * Most images a channel shows on its card.
	 *
	 * @var int
	 */
	public const int COVERS = 4;

	/**
	 * Register hooks.
	 *
	 * @return void
	 */
	public function hooks(): void {
		add_action( 'init', array( $this, 'register_taxonomy' ) );
		add_action( 'created_' . self::TAXONOMY, array( $this, 'set_author' ) );
		add_filter( 'pre_insert_term', array( $this, 'check_new_parent' ), 10, 3 );
		add_filter( 'wp_update_term_parent', array( $this, 'check_parent' ), 10, 3 );
		add_filter( 'rest_pre_insert_' . self::TAXONOMY, array( $this, 'set_slug' ), 10, 2 );
		add_filter( 'rest_' . self::TAXONOMY . '_query', array( $this, 'list_own' ) );
		add_action( 'pre_delete_term', array( $this, 'keep_blocks' ), 10, 2 );
		add_action( 'rest_api_init', array( $this, 'register_covers' ) );
	}

	/**
	 * Give the channels of the REST API their covers, the latest images in them or in their sub-channels, which their
	 * card shows: a field computed, never stored.
	 *
	 * @return void
	 */
	public function register_covers(): void {
		register_rest_field(
			self::TAXONOMY,
			'moodboard_covers',
			array(
				'get_callback' => fn( array $channel ) => self::get_covers( (int) $channel['id'] ),
				'schema'       => array(
					'description' => __( 'The latest images of the channel and of its sub-channels, at the size of a card.', 'moodboard' ),
					'type'        => 'array',
					'context'     => array( 'view', 'edit' ),
					'readonly'    => true,
					'items'       => array(
						'type'       => 'object',
						'properties' => array(
							'url'    => array(
								'type'   => 'string',
								'format' => 'uri',
							),
							'width'  => array( 'type' => 'integer' ),
							'height' => array( 'type' => 'integer' ),
						),
					),
				),
			)
		);
	}

	/**
	 * The latest images of a channel and of its sub-channels, at their medium large size, sharp on a card two a row, up to
	 * COVERS.
	 *
	 * @param int $term_id Term ID of the channel.
	 * @return list<array{url:string,width:int,height:int}>
	 */
	public static function get_covers( int $term_id ): array {
		$image_ids = get_posts(
			array(
				'post_type'      => 'attachment',
				'post_status'    => 'inherit',
				'post_mime_type' => 'image',
				'numberposts'    => self::COVERS,
				'fields'         => 'ids',
				'tax_query'      => array( // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_tax_query -- The images of a channel.
					array(
						'taxonomy' => self::TAXONOMY,
						'terms'    => $term_id,
					),
				),
			)
		);
		$covers    = array();

		foreach ( $image_ids as $image_id ) {
			$image = wp_get_attachment_image_src( (int) $image_id, 'medium_large' );

			if ( $image ) {
				$covers[] = array(
					'url'    => $image[0],
					'width'  => (int) $image[1],
					'height' => (int) $image[2],
				);
			}
		}

		return $covers;
	}

	/**
	 * Register the taxonomy of the channels, which the app edits: no screen of the admin.
	 *
	 * @return void
	 */
	public function register_taxonomy(): void {
		$labels = array(
			'name'          => _x( 'Channels', 'moodboard channels general name', 'moodboard' ),
			'singular_name' => _x( 'Channel', 'moodboard channels singular name', 'moodboard' ),
		);

		register_taxonomy(
			self::TAXONOMY,
			array( 'attachment', Posts::TEXT, Posts::LINK ),
			array(
				'labels'                => $labels,
				'hierarchical'          => true,
				'public'                => false,
				'show_in_rest'          => true,
				'rest_base'             => 'moodboard-channels',
				'capabilities'          => array(
					'manage_terms' => Roles::CURATE,
					'edit_terms'   => Roles::CURATE,
					'delete_terms' => Roles::CURATE,
					'assign_terms' => Roles::CURATE,
				),
				// A media is inherit, a text private: the count of core counts published posts only.
				'update_count_callback' => '_update_generic_term_count',
			)
		);

		register_term_meta(
			self::TAXONOMY,
			self::AUTHOR,
			array(
				'type'              => 'integer',
				'description'       => __( 'The curator of the channel.', 'moodboard' ),
				'single'            => true,
				'sanitize_callback' => 'absint',
			)
		);
	}

	/**
	 * ID of the curator of a channel, 0 for a channel without one.
	 *
	 * @param int $term_id Term ID of the channel.
	 * @return int
	 */
	public static function get_author( int $term_id ): int {
		return (int) get_term_meta( $term_id, self::AUTHOR, true );
	}

	/**
	 * Keep the curator of a new channel.
	 *
	 * @param int $term_id Term ID of the channel.
	 * @return void
	 */
	public function set_author( int $term_id ): void {
		update_term_meta( $term_id, self::AUTHOR, get_current_user_id() );
	}

	/**
	 * Refuse a new channel under a channel of another curator.
	 *
	 * @param string|WP_Error     $term     Name of the term, or the error of an earlier filter.
	 * @param string              $taxonomy Taxonomy slug.
	 * @param array<string,mixed> $args     Arguments of the term, its parent among them.
	 * @return string|WP_Error
	 */
	public function check_new_parent( $term, string $taxonomy, array $args ) {
		$parent = (int) ( $args['parent'] ?? 0 );

		if ( self::TAXONOMY !== $taxonomy || is_wp_error( $term ) || ! $parent || current_user_can( 'edit_term', $parent ) ) {
			return $term;
		}

		return new WP_Error( 'moodboard_parent', __( 'A channel goes under one of your channels only.', 'moodboard' ), array( 'status' => 403 ) );
	}

	/**
	 * Keep the parent of a channel moved under a channel of another curator: core gives no way to refuse it.
	 *
	 * @param int    $parent_id ID of the new parent.
	 * @param int    $term_id   Term ID of the channel.
	 * @param string $taxonomy  Taxonomy slug.
	 * @return int
	 */
	public function check_parent( int $parent_id, int $term_id, string $taxonomy ): int {
		if ( self::TAXONOMY !== $taxonomy || ! $parent_id || current_user_can( 'edit_term', $parent_id ) ) {
			return $parent_id;
		}

		$term = get_term( $term_id, self::TAXONOMY );

		return $term instanceof WP_Term ? $term->parent : 0;
	}

	/**
	 * Give a new channel a slug of its curator, such as lieux-12 for Lieux: core refuses a name a term already has at the
	 * same level unless its slug is another, so each curator may name a channel as another one does, never as one of
	 * their own.
	 *
	 * @param stdClass        $term    Term, as the REST API prepares it.
	 * @param WP_REST_Request $request Request.
	 * @return stdClass
	 */
	public function set_slug( stdClass $term, WP_REST_Request $request ): stdClass {
		if ( isset( $request['id'] ) || ! empty( $term->slug ) || empty( $term->name ) ) {
			return $term;
		}

		$term->slug = sanitize_title( $term->name ) . '-' . get_current_user_id();

		return $term;
	}

	/**
	 * List the channels of the curator only.
	 *
	 * @param array<string,mixed> $args Arguments of get_terms().
	 * @return array<string,mixed>
	 */
	public function list_own( array $args ): array {
		$args['meta_query'] = array( // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query -- The channels of a curator, a few dozen.
			array(
				'key'   => self::AUTHOR,
				'value' => get_current_user_id(),
				'type'  => 'NUMERIC',
			),
		);

		return $args;
	}

	/**
	 * Before a channel is deleted, give its parent the blocks that are in no other channel; core gives it its
	 * sub-channels already. A channel without parent leaves them in the index, as every block of the curator.
	 *
	 * @param int    $term_id  Term ID.
	 * @param string $taxonomy Taxonomy slug.
	 * @return void
	 */
	public function keep_blocks( int $term_id, string $taxonomy ): void {
		$term = get_term( $term_id, self::TAXONOMY );

		if ( self::TAXONOMY !== $taxonomy || ! $term instanceof WP_Term || ! $term->parent ) {
			return;
		}

		$block_ids = get_objects_in_term( $term_id, self::TAXONOMY );

		foreach ( is_array( $block_ids ) ? $block_ids : array() as $block_id ) {
			$channel_ids = wp_get_object_terms( (int) $block_id, self::TAXONOMY, array( 'fields' => 'ids' ) );

			if ( array( $term_id ) === array_map( 'intval', is_array( $channel_ids ) ? $channel_ids : array() ) ) {
				wp_add_object_terms( (int) $block_id, $term->parent, self::TAXONOMY );
			}
		}
	}
}
