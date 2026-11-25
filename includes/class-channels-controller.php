<?php
/**
 * The REST API of the channels: a channel is read by its curator only.
 *
 * @link       https://github.com/19h47/moodboard
 * @since      1.0.0
 *
 * @package    Moodboard
 * @subpackage Moodboard/includes
 */

namespace Moodboard;

use WP_Error;
use WP_REST_Request;
use WP_REST_Terms_Controller;

/**
 * The controller of core for the terms, its channel read by its ID by its curator only: core lets anyone read a term of
 * a taxonomy of the REST API, which Channels::list_own() keeps out of the list only.
 *
 * @since      1.0.0
 * @package    Moodboard
 * @subpackage Moodboard/includes
 * @author     Jérémy Levron <jeremylevron@19h47.fr>
 */
class Channels_Controller extends WP_REST_Terms_Controller {

	/**
	 * A channel is read by its curator only, as core reads it otherwise.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return true|WP_Error
	 */
	#[\Override]
	public function get_item_permissions_check( $request ) {
		$allowed = parent::get_item_permissions_check( $request );

		if ( true !== $allowed ) {
			return $allowed;
		}

		$author_id = (int) get_term_meta( (int) $request['id'], Channels::AUTHOR, true );

		if ( get_current_user_id() !== $author_id ) {
			return new WP_Error(
				'rest_forbidden',
				__( 'A channel is read by its curator only.', 'moodboard' ),
				array( 'status' => rest_authorization_required_code() )
			);
		}

		return true;
	}
}
