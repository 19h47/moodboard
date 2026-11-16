<?php
/**
 * Base of the tests: channels and blocks added as the app adds them, through the REST API of core.
 *
 * @package Moodboard
 */

namespace Moodboard\Tests;

use Moodboard\Meta;
use WP_REST_Request;
use WP_REST_Response;
use WP_UnitTestCase;

/**
 * Logs in curators, adds their channels and their blocks, and sends the requests of the app.
 */
abstract class TestCase extends WP_UnitTestCase {

	/**
	 * Each test runs as a curator of their own.
	 *
	 * @return void
	 */
	#[\Override]
	public function set_up(): void {
		parent::set_up();

		// The suite unregisters every meta key after each test, those the plugin registers once, on init, among them.
		new Meta()->register_meta();

		$this->as_user( 'moodboard_curator' );
	}

	/**
	 * Log in as a new user of a role, such as a curator, moodboard_curator.
	 *
	 * @param string $role Role.
	 * @return int User ID.
	 */
	protected function as_user( string $role ): int {
		$user_id = self::factory()->user->create( array( 'role' => $role ) );

		wp_set_current_user( $user_id );

		return $user_id;
	}

	/**
	 * A request of the REST API, as the current user.
	 *
	 * @param string              $method Method.
	 * @param string              $route  Route, such as /wp/v2/media.
	 * @param array<string,mixed> $params Parameters: the body of a POST, the query of a GET or a DELETE.
	 * @return WP_REST_Response
	 */
	protected function request( string $method, string $route, array $params = array() ): WP_REST_Response {
		$request = new WP_REST_Request( $method, $route );

		if ( 'GET' === $method || 'DELETE' === $method ) {
			$request->set_query_params( $params );
		} elseif ( $params ) {
			$request->set_header( 'Content-Type', 'application/json' );
			$request->set_body( (string) wp_json_encode( $params ) );
		}

		return rest_do_request( $request );
	}

	/**
	 * Add a channel of the current curator, as the app does.
	 *
	 * @param string $name      Name.
	 * @param int    $parent_id ID of the channel it goes under, 0 for none.
	 * @return int Term ID.
	 */
	protected function add_channel( string $name, int $parent_id = 0 ): int {
		$response = $this->request(
			'POST',
			'/wp/v2/moodboard-channels',
			array(
				'name'   => $name,
				'parent' => $parent_id,
			)
		);

		$this->assertSame( 201, $response->get_status(), (string) wp_json_encode( $response->get_data() ) );

		return (int) $response->get_data()['id'];
	}

	/**
	 * Add a media of the current curator, a block of their moodboard unless said otherwise, in channels or none, as the
	 * app uploads it.
	 *
	 * @param int[] $channel_ids Term IDs of its channels.
	 * @param bool  $is_block    Whether it is a block, rather than any media of the library.
	 * @return int Attachment ID.
	 */
	protected function add_media( array $channel_ids = array(), bool $is_block = true ): int {
		$media_id = self::factory()->attachment->create( array( 'post_author' => get_current_user_id() ) );

		wp_set_object_terms( $media_id, $channel_ids, 'moodboard_channel' );
		update_post_meta( $media_id, 'moodboard_block', $is_block );

		return $media_id;
	}

	/**
	 * IDs of the media a request lists.
	 *
	 * @param array<string,mixed> $query Query of /wp/v2/media.
	 * @return int[]
	 */
	protected function list_media( array $query ): array {
		return array_column( $this->request( 'GET', '/wp/v2/media', $query )->get_data(), 'id' );
	}
}
