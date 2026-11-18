<?php
/**
 * Tests of the channels: a block in several channels, a channel under another, a channel deleted.
 *
 * @package Moodboard
 */

namespace Moodboard\Tests;

/**
 * The channels are terms over the media and the texts, which the REST API of core lists, gives and takes.
 */
class Test_Channels extends TestCase {

	/**
	 * A media goes in two channels, and each lists it.
	 *
	 * @return void
	 */
	public function test_a_media_lives_in_several_channels(): void {
		$places   = $this->add_channel( 'Lieux' );
		$light    = $this->add_channel( 'Lumière' );
		$media_id = $this->add_media();

		$response = $this->request( 'POST', "/wp/v2/media/$media_id", array( 'moodboard-channels' => array( $places, $light ) ) );

		$this->assertSame( 200, $response->get_status() );
		$this->assertContains( $media_id, $this->list_media( array( 'moodboard-channels' => $places ) ) );
		$this->assertContains( $media_id, $this->list_media( array( 'moodboard-channels' => $light ) ) );
	}

	/**
	 * A channel lists the media of its sub-channels when asked to.
	 *
	 * @return void
	 */
	public function test_a_channel_includes_its_sub_channels(): void {
		$places   = $this->add_channel( 'Lieux' );
		$house    = $this->add_channel( 'La maison', $places );
		$media_id = $this->add_media( array( $house ) );

		$this->assertNotContains( $media_id, $this->list_media( array( 'moodboard-channels' => $places ) ) );
		$this->assertContains(
			$media_id,
			$this->list_media(
				array(
					'moodboard-channels' => array(
						'terms'            => array( $places ),
						'include_children' => true,
					),
				)
			)
		);
	}

	/**
	 * A channel deleted gives its parent its sub-channels and the blocks in no other channel.
	 *
	 * @return void
	 */
	public function test_a_deleted_channel_gives_its_parent_its_blocks(): void {
		$places = $this->add_channel( 'Lieux' );
		$house  = $this->add_channel( 'La maison', $places );
		$attic  = $this->add_channel( 'Le grenier', $house );
		$light  = $this->add_channel( 'Lumière' );
		$alone  = $this->add_media( array( $house ) );
		$shared = $this->add_media( array( $house, $light ) );

		$response = $this->request( 'DELETE', "/wp/v2/moodboard-channels/$house", array( 'force' => true ) );

		$this->assertSame( 200, $response->get_status() );
		$this->assertSame( array( $places ), wp_get_object_terms( $alone, 'moodboard_channel', array( 'fields' => 'ids' ) ) );
		$this->assertSame( array( $light ), wp_get_object_terms( $shared, 'moodboard_channel', array( 'fields' => 'ids' ) ) );
		$this->assertSame( $places, get_term( $attic )->parent );
	}

	/**
	 * A channel gives its card its latest images, those of its sub-channels too, four at most, and none of its texts.
	 *
	 * @return void
	 */
	public function test_a_channel_has_its_latest_images_as_covers(): void {
		$places = $this->add_channel( 'Lieux' );
		$house  = $this->add_channel( 'La maison', $places );
		$empty  = $this->add_channel( 'Vide' );
		$images = array();

		foreach ( range( 1, 5 ) as $day ) {
			$image_id = self::factory()->attachment->create_upload_object( DIR_TESTDATA . '/images/33772.jpg' );

			wp_update_post(
				array(
					'ID'        => $image_id,
					'post_date' => "2026-11-0$day 12:00:00",
				)
			);
			wp_set_object_terms( $image_id, array( 1 === $day ? $places : $house ), 'moodboard_channel' );
			$images[ $day ] = wp_get_attachment_image_src( $image_id, 'medium_large' )[0];
		}

		$channels = array_column( $this->request( 'GET', '/wp/v2/moodboard-channels' )->get_data(), 'moodboard_covers', 'id' );

		$this->assertSame( array( $images[5], $images[4], $images[3], $images[2] ), array_column( $channels[ $places ], 'url' ) );
		$this->assertSame( array(), $channels[ $empty ] );
	}

	/**
	 * A channel keeps the order its curator gives its blocks, each ID once, as integers.
	 *
	 * @return void
	 */
	public function test_a_channel_keeps_the_order_of_its_blocks(): void {
		$places = $this->add_channel( 'Lieux' );
		$first  = $this->add_media( array( $places ) );
		$second = $this->add_media( array( $places ) );

		$response = $this->request( 'POST', "/wp/v2/moodboard-channels/$places", array( 'meta' => array( 'moodboard_order' => array( $second, (string) $first, $second ) ) ) );

		$this->assertSame( 200, $response->get_status(), (string) wp_json_encode( $response->get_data() ) );
		$this->assertSame( array( $second, $first ), $response->get_data()['meta']['moodboard_order'] );

		$channel = $this->request( 'GET', "/wp/v2/moodboard-channels/$places", array( '_fields' => 'id,meta' ) )->get_data();

		$this->assertSame( array( $second, $first ), $channel['meta']['moodboard_order'] );
	}

	/**
	 * A curator orders their own channels only.
	 *
	 * @return void
	 */
	public function test_a_curator_orders_their_own_channels_only(): void {
		$places   = $this->add_channel( 'Lieux' );
		$media_id = $this->add_media( array( $places ) );

		$this->as_user( 'moodboard_curator' );

		$response = $this->request( 'POST', "/wp/v2/moodboard-channels/$places", array( 'meta' => array( 'moodboard_order' => array( $media_id ) ) ) );

		$this->assertContains( $response->get_status(), array( 401, 403 ) );
		$this->assertSame( array(), get_term_meta( $places, 'moodboard_order', true ) );
	}

	/**
	 * A text is private, whatever status it is sent with, and in its channels.
	 *
	 * @return void
	 */
	public function test_a_text_is_private(): void {
		$voices = $this->add_channel( 'Voix' );

		$response = $this->request(
			'POST',
			'/wp/v2/moodboard-texts',
			array(
				'title'              => 'La mer',
				'content'            => 'Elle revenait chaque soir.',
				'status'             => 'publish',
				'moodboard-channels' => array( $voices ),
			)
		);

		$this->assertSame( 201, $response->get_status() );
		$this->assertSame( 'private', $response->get_data()['status'] );

		$texts = $this->request( 'GET', '/wp/v2/moodboard-texts', array( 'moodboard-channels' => $voices ) )->get_data();

		$this->assertSame( array( $response->get_data()['id'] ), array_column( $texts, 'id' ) );
	}
}
