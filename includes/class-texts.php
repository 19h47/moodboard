<?php
/**
 * Text blocks: a quote, a note, a passage of the novel.
 *
 * @link       https://github.com/19h47/moodboard
 * @since      1.0.0
 *
 * @package    Moodboard
 * @subpackage Moodboard/includes
 */

namespace Moodboard;

/**
 * Registers the moodboard_text post type, the blocks of text, as a media is a block of an image or a file. A text is
 * private, always: WordPress shows a private post to its author only, so each curator reads their own.
 *
 * @since      1.0.0
 * @package    Moodboard
 * @subpackage Moodboard/includes
 * @author     Jérémy Levron <jeremylevron@19h47.fr>
 */
class Texts {

	/**
	 * Post type of the texts.
	 *
	 * @var string
	 */
	public const string POST_TYPE = 'moodboard_text';

	/**
	 * Register hooks.
	 *
	 * @return void
	 */
	public function hooks(): void {
		add_action( 'init', array( $this, 'register_post_type' ) );
		add_filter( 'wp_insert_post_data', array( $this, 'keep_private' ) );
		add_filter( 'rest_' . self::POST_TYPE . '_collection_params', array( $this, 'list_private' ) );
		add_filter( 'rest_' . self::POST_TYPE . '_query', array( $this, 'list_readable' ) );
	}

	/**
	 * Register the post type of the texts, which the app edits: no screen of the admin.
	 *
	 * @return void
	 */
	public function register_post_type(): void {
		$labels = array(
			'name'          => _x( 'Texts', 'moodboard texts general name', 'moodboard' ),
			'singular_name' => _x( 'Text', 'moodboard texts singular name', 'moodboard' ),
		);

		register_post_type(
			self::POST_TYPE,
			array(
				'labels'          => $labels,
				'public'          => false,
				'show_in_rest'    => true,
				'rest_base'       => 'moodboard-texts',
				'supports'        => array( 'title', 'editor', 'author', 'custom-fields' ),
				'capability_type' => array( 'moodboard_text', 'moodboard_texts' ),
				'map_meta_cap'    => true,
				// A curator writes, changes and deletes their texts; those of others need capabilities no one has.
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

	/**
	 * A text is private, whatever status it is saved with, such as the draft the REST API gives a new post: it goes to the
	 * trash, then out of it, private again.
	 *
	 * @param array<string,mixed> $data Post data, slashed.
	 * @return array<string,mixed>
	 */
	public function keep_private( array $data ): array {
		if ( self::POST_TYPE === $data['post_type'] && in_array( $data['post_status'], array( 'publish', 'future', 'draft', 'pending' ), true ) ) {
			$data['post_status'] = 'private';
		}

		return $data;
	}

	/**
	 * The texts are listed private unless a request asks for another status, as they all are.
	 *
	 * @param array<string,array<string,mixed>> $params Query parameters of the collection.
	 * @return array<string,array<string,mixed>>
	 */
	public function list_private( array $params ): array {
		$params['status']['default'] = 'private';

		return $params;
	}

	/**
	 * List the texts a curator may read, their own, so that the totals of a page count them only: the REST API leaves
	 * out the private posts of others one by one, after the query has counted them.
	 *
	 * @param array<string,mixed> $args Arguments of WP_Query.
	 * @return array<string,mixed>
	 */
	public function list_readable( array $args ): array {
		$args['perm'] = 'readable';

		return $args;
	}
}
