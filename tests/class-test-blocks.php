<?php
/**
 * Tests of the links and of the notes of the blocks.
 *
 * @package Moodboard
 */

namespace Moodboard\Tests;

/**
 * A link is private, its player the one core embeds; a curator takes notes on their blocks, which no one else reads.
 */
class Test_Blocks extends TestCase {

	/**
	 * A link is private, in its channels, its player the one core embeds for its URL.
	 *
	 * @return void
	 */
	public function test_a_link_is_private_and_embeds_its_url(): void {
		$voices = $this->add_channel( 'Voix' );
		$url    = 'https://www.youtube.com/watch?v=moodboard';

		add_filter(
			'pre_oembed_result',
			fn( $result, string $asked ) => $url === $asked ? '<iframe title="La mer" src="https://www.youtube.com/embed/moodboard"></iframe>' : $result,
			10,
			2
		);

		$response = $this->request(
			'POST',
			'/wp/v2/moodboard-links',
			array(
				'title'              => 'La mer',
				'status'             => 'publish',
				'meta'               => array( 'moodboard_source' => $url ),
				'moodboard-channels' => array( $voices ),
			)
		);

		$this->assertSame( 201, $response->get_status(), (string) wp_json_encode( $response->get_data() ) );
		$this->assertSame( 'private', $response->get_data()['status'] );

		$link_id = $response->get_data()['id'];
		$link    = $this->request( 'GET', "/wp/v2/moodboard-links/$link_id", array( 'context' => 'edit' ) )->get_data();

		$this->assertStringContainsString( 'youtube.com/embed/moodboard', $link['moodboard_embed'] );
		$this->assertSame( array( $link_id ), array_column( $this->request( 'GET', '/wp/v2/moodboard-links', array( 'moodboard-channels' => $voices ) )->get_data(), 'id' ) );

		$this->as_user( 'moodboard_curator' );

		$this->assertSame( array(), $this->request( 'GET', '/wp/v2/moodboard-links' )->get_data() );
	}

	/**
	 * A link added by its URL alone takes what its provider gives: its title, and its thumbnail as its featured image, an
	 * image whose URL has no extension.
	 *
	 * @return void
	 */
	public function test_a_link_added_by_its_url_takes_its_title_and_image(): void {
		$url   = 'https://www.youtube.com/watch?v=moodboard';
		$image = 'https://i.ytimg.com/vi/moodboard/thumbnail';
		// A PNG of one pixel.
		$png = base64_decode( 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_decode -- An image of the test.

		add_filter(
			'pre_http_request',
			function ( $response, array $args, string $asked ) use ( $image, $png ) {
				if ( str_starts_with( $asked, 'https://www.youtube.com/oembed' ) ) {
					return array(
						'headers'  => array( 'content-type' => 'application/json' ),
						'body'     => (string) wp_json_encode(
							array(
								'type'          => 'video',
								'version'       => '1.0',
								'title'         => 'La mer &amp; le port',
								'html'          => '<iframe src="https://www.youtube.com/embed/moodboard"></iframe>',
								'thumbnail_url' => $image,
							)
						),
						'response' => array(
							'code'    => 200,
							'message' => 'OK',
						),
						'cookies'  => array(),
						'filename' => null,
					);
				}

				if ( $image === $asked ) {
					file_put_contents( $args['filename'], $png ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents -- The file download_url() streams to.

					return array(
						'headers'  => array( 'content-type' => 'image/png' ),
						'body'     => '',
						'response' => array(
							'code'    => 200,
							'message' => 'OK',
						),
						'cookies'  => array(),
						'filename' => $args['filename'],
					);
				}

				return $response;
			},
			10,
			3
		);

		$response = $this->request(
			'POST',
			'/wp/v2/moodboard-links',
			array(
				'meta' => array( 'moodboard_source' => $url ),
			)
		);

		$this->assertSame( 201, $response->get_status(), (string) wp_json_encode( $response->get_data() ) );

		$link = $response->get_data();

		$this->assertSame( 'La mer & le port', $link['title']['raw'] );
		$this->assertSame( $url, $link['meta']['moodboard_source'] );
		$this->assertSame( 'private', $link['status'] );
		$this->assertNotSame( 0, $link['featured_media'] );
		$this->assertSame( 'image/png', get_post_mime_type( $link['featured_media'] ) );
		$this->assertFalse( (bool) get_post_meta( $link['featured_media'], 'moodboard_block', true ), 'The image of a link is no block of its own.' );
	}

	/**
	 * A curator takes notes on their media and texts, the notes of core, approved at once; another curator neither reads
	 * nor writes them.
	 *
	 * @return void
	 */
	public function test_a_curator_takes_notes_on_their_blocks(): void {
		$media_id = $this->add_media();
		$text     = $this->request( 'POST', '/wp/v2/moodboard-texts', array( 'content' => 'Une phrase.' ) )->get_data();

		foreach ( array( $media_id, $text['id'] ) as $block_id ) {
			$note = $this->request(
				'POST',
				'/wp/v2/comments',
				array(
					'post'    => $block_id,
					'type'    => 'note',
					'content' => 'Pour la scène du port.',
				)
			);

			$this->assertSame( 201, $note->get_status(), (string) wp_json_encode( $note->get_data() ) );
			$this->assertSame( 'approved', $note->get_data()['status'] );
		}

		$notes = $this->request(
			'GET',
			'/wp/v2/comments',
			array(
				'post'    => $media_id,
				'type'    => 'note',
				'context' => 'edit',
			)
		);

		$this->assertSame( 200, $notes->get_status() );
		$this->assertCount( 1, $notes->get_data() );

		$this->as_user( 'moodboard_curator' );

		$theirs = $this->request(
			'GET',
			'/wp/v2/comments',
			array(
				'post'    => $media_id,
				'type'    => 'note',
				'context' => 'edit',
			)
		);
		$taken  = $this->request(
			'POST',
			'/wp/v2/comments',
			array(
				'post'    => $media_id,
				'type'    => 'note',
				'content' => 'À moi.',
			)
		);

		$this->assertContains( $theirs->get_status(), array( 401, 403 ) );
		$this->assertContains( $taken->get_status(), array( 401, 403 ) );
	}
}
