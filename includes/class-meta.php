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
 * Registers the source of a block, the URL it comes from, on the media, the texts and the links, and the mark of a media that is a
 * block of a moodboard, `moodboard_block`: a text is one by its post type, a media of the library is not, such as an image
 * of a post, unless the app added it. Their title, caption, description and alternative text are those of WordPress.
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
	 * Meta of a media marking it as a block of the moodboard of its author, in the index with or without a channel.
	 *
	 * @var string
	 */
	public const string BLOCK = 'moodboard_block';

	/**
	 * Register hooks.
	 *
	 * @return void
	 */
	public function hooks(): void {
		add_action( 'init', array( $this, 'register_meta' ) );
	}

	/**
	 * Register the source of the media and of the texts, and the mark of a media that is a block, in the REST API, where
	 * the app writes them.
	 *
	 * @return void
	 */
	public function register_meta(): void {
		foreach ( array( 'attachment', Posts::TEXT, Posts::LINK ) as $post_type ) {
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

		register_post_meta(
			'attachment',
			self::BLOCK,
			array(
				'type'         => 'boolean',
				'description'  => __( 'Whether the media is a block of the moodboard of its author.', 'moodboard' ),
				'single'       => true,
				'default'      => false,
				'show_in_rest' => true,
			)
		);
	}
}
