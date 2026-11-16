<?php
/**
 * The meta of the blocks.
 *
 * @link       https://github.com/19h47/moodboard
 * @since      1.0.0
 *
 * @package    Moodboard
 * @subpackage Moodboard/includes
 */

namespace Moodboard;

/**
 * Registers the source of a block, the URL it comes from, on the media and the texts; their title, caption, description
 * and alternative text are those of WordPress.
 *
 * @since      1.0.0
 * @package    Moodboard
 * @subpackage Moodboard/includes
 * @author     Jérémy Levron <jeremylevron@19h47.fr>
 */
class Meta {

	/**
	 * Meta of a block holding the URL it comes from.
	 *
	 * @var string
	 */
	public const string SOURCE = 'moodboard_source';

	/**
	 * Register hooks.
	 *
	 * @return void
	 */
	public function hooks(): void {
		add_action( 'init', array( $this, 'register_meta' ) );
	}

	/**
	 * Register the source of the media and of the texts, in the REST API, where the curator of a block writes it.
	 *
	 * @return void
	 */
	public function register_meta(): void {
		foreach ( array( 'attachment', Texts::POST_TYPE ) as $post_type ) {
			register_post_meta(
				$post_type,
				self::SOURCE,
				array(
					'type'              => 'string',
					'description'       => __( 'The URL the block comes from.', 'moodboard' ),
					'single'            => true,
					'show_in_rest'      => array(
						'schema' => array( 'format' => 'uri' ),
					),
					'sanitize_callback' => 'sanitize_url',
				)
			);
		}
	}
}
