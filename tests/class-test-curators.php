<?php
/**
 * Tests of the moodboard of each curator.
 *
 * @package Moodboard
 */

namespace Moodboard\Tests;

/**
 * A curator lists, changes and gives their own channels, blocks and texts only.
 */
class Test_Curators extends TestCase {

	/**
	 * Two curators each name a channel Lieux; one names two channels alike once only.
	 *
	 * @return void
	 */
	public function test_each_curator_names_their_channels(): void {
		$this->add_channel( 'Lieux' );
		$this->as_user( 'moodboard_curator' );
		$this->add_channel( 'Lieux' );

		$response = $this->request( 'POST', '/wp/v2/moodboard-channels', array( 'name' => 'Lieux' ) );

		$this->assertSame( 400, $response->get_status() );
		$this->assertSame( 'term_exists', $response->get_data()['code'] );
	}

	/**
	 * A curator lists their own channels and texts, and the totals count them only.
	 *
	 * @return void
	 */
	public function test_a_curator_lists_their_own(): void {
		$this->add_channel( 'Lieux' );
		$this->request( 'POST', '/wp/v2/moodboard-texts', array( 'content' => 'Une phrase.' ) );
		$this->as_user( 'moodboard_curator' );

		$own = $this->add_channel( 'Visages' );

		$channels = $this->request( 'GET', '/wp/v2/moodboard-channels' );
		$texts    = $this->request( 'GET', '/wp/v2/moodboard-texts' );

		$this->assertSame( array( $own ), array_column( $channels->get_data(), 'id' ) );
		$this->assertSame( 1, $channels->get_headers()['X-WP-Total'] );
		$this->assertSame( array(), $texts->get_data() );
		$this->assertSame( 0, $texts->get_headers()['X-WP-Total'] );
	}

	/**
	 * A curator neither changes, deletes nor gives the channel of another, nor puts a channel under it.
	 *
	 * @return void
	 */
	public function test_a_curator_leaves_the_channels_of_others(): void {
		$other = $this->add_channel( 'Lieux' );

		$this->as_user( 'moodboard_curator' );

		$own      = $this->add_channel( 'Visages' );
		$media_id = $this->add_media();

		$this->assertSame( 403, $this->request( 'POST', "/wp/v2/moodboard-channels/$other", array( 'name' => 'Ailleurs' ) )->get_status() );
		$this->assertSame( 403, $this->request( 'DELETE', "/wp/v2/moodboard-channels/$other", array( 'force' => true ) )->get_status() );
		$this->assertSame( 403, $this->request( 'POST', "/wp/v2/media/$media_id", array( 'moodboard-channels' => array( $other ) ) )->get_status() );
		$this->assertSame(
			403,
			$this->request(
				'POST',
				'/wp/v2/moodboard-channels',
				array(
					'name'   => 'Sous',
					'parent' => $other,
				)
			)->get_status()
		);

		$this->request( 'POST', "/wp/v2/moodboard-channels/$own", array( 'parent' => $other ) );

		$this->assertSame( 0, get_term( $own )->parent );
	}

	/**
	 * A curator reads their own channel, by its ID; neither another curator nor a visitor reads it.
	 *
	 * @return void
	 */
	public function test_a_channel_is_read_by_its_curator_only(): void {
		$channel_id = $this->add_channel( 'Lieux' );

		$this->assertSame( 200, $this->request( 'GET', "/wp/v2/moodboard-channels/$channel_id" )->get_status() );

		$this->as_user( 'moodboard_curator' );

		$this->assertGreaterThanOrEqual( 400, $this->request( 'GET', "/wp/v2/moodboard-channels/$channel_id" )->get_status() );

		wp_set_current_user( 0 );

		$this->assertGreaterThanOrEqual( 400, $this->request( 'GET', "/wp/v2/moodboard-channels/$channel_id" )->get_status() );
		$this->assertSame( array(), $this->request( 'GET', '/wp/v2/moodboard-channels' )->get_data() );
	}

	/**
	 * The blocks of a curator, their media, are theirs in the REST API: neither another curator nor a visitor lists or
	 * reads them, who list the other media of the library still.
	 *
	 * @return void
	 */
	public function test_a_block_is_read_by_its_curator_only(): void {
		$media_id   = $this->add_media();
		$library_id = $this->add_media( array(), false );

		$this->assertContains( $media_id, $this->list_media( array() ) );
		$this->assertSame( 200, $this->request( 'GET', "/wp/v2/media/$media_id" )->get_status() );

		$this->as_user( 'moodboard_curator' );

		$this->assertContains( $library_id, $this->list_media( array() ) );
		$this->assertNotContains( $media_id, $this->list_media( array() ) );
		$this->assertGreaterThanOrEqual( 400, $this->request( 'GET', "/wp/v2/media/$media_id" )->get_status() );

		wp_set_current_user( 0 );

		$this->assertNotContains( $media_id, $this->list_media( array() ) );
		$this->assertGreaterThanOrEqual( 400, $this->request( 'GET', "/wp/v2/media/$media_id" )->get_status() );
	}

	/**
	 * A curator changes their media, never the media of another.
	 *
	 * @return void
	 */
	public function test_a_curator_changes_their_media_only(): void {
		$other = $this->add_media();

		$this->as_user( 'moodboard_curator' );

		$own = $this->add_media();

		$this->assertSame( 200, $this->request( 'POST', "/wp/v2/media/$own", array( 'title' => 'La falaise' ) )->get_status() );
		$this->assertSame( 403, $this->request( 'POST', "/wp/v2/media/$other", array( 'title' => 'La falaise' ) )->get_status() );
		$this->assertSame( 200, $this->request( 'DELETE', "/wp/v2/media/$own", array( 'force' => true ) )->get_status() );
	}
}
