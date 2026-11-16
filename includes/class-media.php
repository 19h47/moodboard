<?php
/**
 * The media of a moodboard, imported from their URL.
 *
 * @link       https://github.com/19h47/moodboard
 * @since      1.0.0
 *
 * @package    Moodboard
 * @subpackage Moodboard/includes
 */

namespace Moodboard;

use WP_Post;
use WP_REST_Request;

/**
 * Core imports an image from its URL, `POST /wp/v2/media` with `url`, but leaves out the channels and the meta the request
 * gives, which it checked the curator may give: they are given here, the source being the URL unless the request says
 * another.
 *
 * @since      1.0.0
 * @package    Moodboard
 * @subpackage Moodboard/includes
 * @author     Jérémy Levron <jeremylevron@19h47.fr>
 */
class Media {

	/**
	 * Register hooks.
	 *
	 * @return void
	 */
	public function hooks(): void {
		add_action( 'rest_after_insert_attachment', array( $this, 'file_imported' ), 10, 3 );
	}

	/**
	 * Give a media imported from its URL its channels and its source.
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

		$source = $request['meta'][ Meta::SOURCE ] ?? $request['url'];

		update_post_meta( $attachment->ID, Meta::SOURCE, sanitize_url( (string) $source ) );
	}
}
