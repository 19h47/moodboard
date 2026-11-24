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
 * Registers the source of a block, the URL it comes from, and who made it, `moodboard_by`, such as an artist or a
 * photographer, on the media, the texts and the links, and the mark of a media that is a block of a moodboard,
 * `moodboard_block`: a text is one by its post type, a media of the library is not, such as an image of a post, unless
 * the app added it. Their title, caption, description and alternative text are those of WordPress.
 *
 * Who made an image is the one its file says, as WordPress reads it, its credit, else its copyright.
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
	 * Meta of a block holding who made it, such as an artist, a photographer or an account.
	 *
	 * @var string
	 */
	public const string BY = 'moodboard_by';

	/**
	 * Register hooks.
	 *
	 * @return void
	 */
	public function hooks(): void {
		add_action( 'init', array( $this, 'register_meta' ) );
		add_filter( 'wp_generate_attachment_metadata', array( $this, 'read_by' ), 10, 3 );
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

			register_post_meta(
				$post_type,
				self::BY,
				array(
					'type'              => 'string',
					'description'       => __( 'Who made the block, such as an artist, a photographer or an account.', 'moodboard' ),
					'single'            => true,
					'show_in_rest'      => true,
					'sanitize_callback' => 'sanitize_text_field',
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

	/**
	 * Give a block of an image who made it, as its file says, its credit, else its copyright, as WordPress reads them
	 * once it is added: the REST API answers it after.
	 *
	 * @param array<string,mixed> $metadata      Metadata of the attachment.
	 * @param int                 $attachment_id Attachment ID.
	 * @param string              $context       Whether the attachment is created or updated.
	 * @return array<string,mixed>
	 */
	public function read_by( array $metadata, int $attachment_id, string $context ): array {
		$image  = is_array( $metadata['image_meta'] ?? null ) ? $metadata['image_meta'] : array();
		$credit = trim( (string) ( $image['credit'] ?? '' ) );
		$by     = '' !== $credit ? $credit : trim( (string) ( $image['copyright'] ?? '' ) );

		if (
			'create' === $context &&
			'' !== $by &&
			get_post_meta( $attachment_id, self::BLOCK, true ) &&
			'' === (string) get_post_meta( $attachment_id, self::BY, true )
		) {
			update_post_meta( $attachment_id, self::BY, sanitize_text_field( $by ) );
		}

		return $metadata;
	}
}
