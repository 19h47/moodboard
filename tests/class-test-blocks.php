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

		add_filter(
			'pre_http_request',
			function ( $response, array $args, string $asked ) use ( $image ) {
				if ( str_starts_with( $asked, 'https://www.youtube.com/oembed' ) ) {
					return self::answer(
						'application/json',
						(string) wp_json_encode(
							array(
								'type'          => 'video',
								'version'       => '1.0',
								'title'         => 'La mer &amp; le port',
								'author_name'   => 'Robert Smithson',
								'html'          => '<iframe src="https://www.youtube.com/embed/moodboard"></iframe>',
								'thumbnail_url' => $image,
							)
						)
					);
				}

				return $image === $asked ? self::answer_image( $args['filename'] ) : $response;
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
		$this->assertSame( 'Robert Smithson', $link['meta']['moodboard_by'] );
		$this->assertSame( $url, $link['meta']['moodboard_source'] );
		$this->assertSame( 'private', $link['status'] );
		$this->assertNotSame( 0, $link['featured_media'] );
		$this->assertSame( 'image/png', get_post_mime_type( $link['featured_media'] ) );
		$this->assertFalse( (bool) get_post_meta( $link['featured_media'], 'moodboard_block', true ), 'The image of a link is no block of its own.' );
	}

	/**
	 * A link to a post of Tumblr, whose provider embeds it and gives no image, takes the title and the image of its page,
	 * at the largest size the page holds; what the page says of the post, its notes counted, is left out.
	 *
	 * @return void
	 */
	public function test_a_link_whose_provider_gives_no_image_takes_the_one_of_its_page(): void {
		$url   = 'https://www.tumblr.com/moodboard/1/matte-painting';
		$small = 'https://64.media.tumblr.com/moodboard/e6/s640x960/small.pnj';
		$image = 'https://64.media.tumblr.com/moodboard/e6/s1280x1920/large.pnj';

		add_filter(
			'pre_http_request',
			function ( $response, array $args, string $asked ) use ( $url, $small, $image ) {
				if ( str_starts_with( $asked, 'https://www.tumblr.com/oembed' ) ) {
					return self::answer(
						'application/json',
						(string) wp_json_encode(
							array(
								'type'        => 'rich',
								'version'     => '1.0',
								'author_name' => 'DXNT-TRIP',
								'html'        => '<div class="tumblr-post"></div>',
							)
						)
					);
				}

				if ( $url === $asked ) {
					return self::answer(
						'text/html',
						'<title>Matte painting by Matthew Yuricich – @moodboard on Tumblr</title>' .
						'<meta content="💬 0 · Matte painting" property="og:description">' .
						'<meta content="' . $small . '" property="og:image">' .
						'<img srcset="' . $small . ' 640w, ' . $image . ' 1280w">'
					);
				}

				return $image === $asked ? self::answer_image( $args['filename'] ) : $response;
			},
			10,
			3
		);

		$link = $this->request( 'POST', '/wp/v2/moodboard-links', array( 'meta' => array( 'moodboard_source' => $url ) ) )->get_data();

		$this->assertSame( 'Matte painting by Matthew Yuricich – @moodboard on Tumblr', $link['title']['raw'] );
		$this->assertSame( '', $link['content']['raw'] );
		$this->assertSame( 'DXNT-TRIP', $link['meta']['moodboard_by'] );
		$this->assertSame( 'image/png', get_post_mime_type( $link['featured_media'] ) );
	}

	/**
	 * A link to an image, as Pinterest shares one, takes it as its image.
	 *
	 * @return void
	 */
	public function test_a_link_to_an_image_takes_it(): void {
		$url = 'https://i.pinimg.com/736x/moodboard.jpg';

		add_filter(
			'pre_http_request',
			function ( $response, array $args, string $asked ) use ( $url ) {
				if ( $url !== $asked ) {
					return $response;
				}

				// Read as a page first, then downloaded.
				return empty( $args['filename'] ) ? self::answer( 'image/png', '' ) : self::answer_image( $args['filename'] );
			},
			10,
			3
		);

		$link = $this->request( 'POST', '/wp/v2/moodboard-links', array( 'meta' => array( 'moodboard_source' => $url ) ) )->get_data();

		$this->assertSame( 'image/png', get_post_mime_type( $link['featured_media'] ) );
	}

	/**
	 * An answer of a server, as `pre_http_request` gives it.
	 *
	 * @param string      $type     Its type.
	 * @param string      $body     Its body.
	 * @param string|null $filename The file it is streamed to.
	 * @return array<string,mixed>
	 */
	private static function answer( string $type, string $body, ?string $filename = null ): array {
		return array(
			'headers'  => array( 'content-type' => $type ),
			'body'     => $body,
			'response' => array(
				'code'    => 200,
				'message' => 'OK',
			),
			'cookies'  => array(),
			'filename' => $filename,
		);
	}

	/**
	 * An image of one pixel, as a server streams it to the file `download_url()` asks for.
	 *
	 * @param string $filename The file.
	 * @return array<string,mixed>
	 */
	private static function answer_image( string $filename ): array {
		$png = base64_decode( 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_decode -- An image of the test.

		file_put_contents( $filename, $png ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents -- The file download_url() streams to.

		return self::answer( 'image/png', '', $filename );
	}

	/**
	 * A block of an image takes who made it from its file, its credit, else its copyright, as WordPress reads it once
	 * it is added; a media of the library, which is no block, takes nothing, nor a block whose author is written.
	 *
	 * @return void
	 */
	public function test_an_image_takes_who_made_it_from_its_file(): void {
		$credited  = $this->add_media();
		$copyright = $this->add_media();
		$written   = $this->add_media();
		$library   = $this->add_media( array(), false );

		update_post_meta( $written, 'moodboard_by', 'Natalia Guerrero' );

		foreach ( array( $credited, $written, $library ) as $media_id ) {
			apply_filters( 'wp_generate_attachment_metadata', array( 'image_meta' => array( 'credit' => 'Robert Smithson' ) ), $media_id, 'create' );
		}

		apply_filters( 'wp_generate_attachment_metadata', array( 'image_meta' => array( 'copyright' => '© Lina Ptushkina' ) ), $copyright, 'create' );

		$this->assertSame( 'Robert Smithson', get_post_meta( $credited, 'moodboard_by', true ) );
		$this->assertSame( '© Lina Ptushkina', get_post_meta( $copyright, 'moodboard_by', true ) );
		$this->assertSame( 'Natalia Guerrero', get_post_meta( $written, 'moodboard_by', true ) );
		$this->assertSame( '', get_post_meta( $library, 'moodboard_by', true ) );
	}

	/**
	 * A search finds a block by who made it, as by its title or its text.
	 *
	 * @return void
	 */
	public function test_a_search_finds_a_block_by_who_made_it(): void {
		$text = $this->request(
			'POST',
			'/wp/v2/moodboard-texts',
			array(
				'content' => 'Un tas de terre entre des miroirs.',
				'meta'    => array( 'moodboard_by' => 'Robert Smithson' ),
			)
		)->get_data();
		$this->request( 'POST', '/wp/v2/moodboard-texts', array( 'content' => 'Une autre phrase.' ) );

		$found = $this->request(
			'GET',
			'/wp/v2/moodboard-texts',
			array(
				'search'  => 'Smithson',
				'context' => 'edit',
			)
		)->get_data();

		$this->assertSame( array( $text['id'] ), array_column( $found, 'id' ) );
		$this->assertCount( 1, $this->request( 'GET', '/wp/v2/moodboard-texts', array( 'search' => 'miroirs' ) )->get_data() );
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
