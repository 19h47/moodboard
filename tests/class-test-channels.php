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
