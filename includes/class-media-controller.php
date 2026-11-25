<?php
/**
 * The REST API of the media: a block is read by its curator only.
 *
 * @link       https://github.com/19h47/moodboard
 * @since      1.0.0
 *
 * @package    Moodboard
 * @subpackage Moodboard/includes
 */

namespace Moodboard;

use WP_Error;
use WP_REST_Attachments_Controller;
use WP_REST_Request;

/**
 * The controller of core for the media, a block read by its ID by its curator only: core lets anyone read a media,
 * which Media::leave_out_blocks_of_others() keeps out of the list only. Any other media is read as core reads it; the
 * file of a block stays reachable by its URL, as any media of WordPress.
 *
 * @since      1.0.0
 * @package    Moodboard
 * @subpackage Moodboard/includes
 * @author     Jérémy Levron <jeremylevron@19h47.fr>
 */
class Media_Controller extends WP_REST_Attachments_Controller {

	/**
	 * A block is read by its curator only, as core reads it otherwise: core refuses a media it may not read with false.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return bool|WP_Error
	 */
	#[\Override]
	public function get_item_permissions_check( $request ) {
		$allowed = parent::get_item_permissions_check( $request );

		if ( true !== $allowed ) {
			return $allowed;
		}

		$media_id  = (int) $request['id'];
		$is_block  = '1' === get_post_meta( $media_id, Meta::BLOCK, true );
		$author_id = (int) get_post_field( 'post_author', $media_id );

		if ( $is_block && get_current_user_id() !== $author_id ) {
			return new WP_Error(
				'rest_forbidden',
				__( 'A block is read by its curator only.', 'moodboard' ),
				array( 'status' => rest_authorization_required_code() )
			);
		}

		return true;
	}
}
