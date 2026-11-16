<?php
/**
 * Tests of the media imported from their URL.
 *
 * @package Moodboard
 */

namespace Moodboard\Tests;

/**
 * Core imports an image from its URL; the plugin gives it the channels and the source of the request.
 */
class Test_Media extends TestCase {

	/**
	 * An image of one pixel, as a PNG.
	 *
	 * @var string
	 */
	private const string PIXEL = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

	/**
	 * The network answers with the image, written where download_url() streams it.
	 *
	 * @return void
	 */
	#[\Override]
	public function set_up(): void {
		parent::set_up();

		add_filter(
			'pre_http_request',
			function ( $response, array $args ) {
				if ( ! empty( $args['filename'] ) ) {
					file_put_contents( $args['filename'], base64_decode( self::PIXEL ) ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents,WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_decode -- The file a download writes.
				}

				return array(
					'headers'  => array( 'content-type' => 'image/png' ),
					'body'     => '',
					'response' => array(
						'code'    => 200,
						'message' => 'OK',
					),
					'cookies'  => array(),
					'filename' => $args['filename'] ?? null,
				);
			},
			10,
			2
		);
	}

	/**
	 * An image imported from its URL is in the channels of the request, its source the URL.
	 *
	 * The URL is on the host of the site, which core requests without resolving it.
	 *
	 * @return void
	 */
	public function test_an_imported_image_has_its_channels_and_source(): void {
		$places = $this->add_channel( 'Lieux' );
		$url    = 'http://example.org/falaise.png';

		$response = $this->request(
			'POST',
			'/wp/v2/media',
			array(
				'url'                => $url,
				'moodboard-channels' => array( $places ),
			)
		);

		$this->assertSame( 201, $response->get_status(), (string) wp_json_encode( $response->get_data() ) );

		$media_id = $response->get_data()['id'];

		$this->assertSame( array( $places ), wp_get_object_terms( $media_id, 'moodboard_channel', array( 'fields' => 'ids' ) ) );
		$this->assertSame( $url, get_post_meta( $media_id, 'moodboard_source', true ) );
	}

	/**
	 * Core refuses a local address, a page and the channel of another curator.
	 *
	 * @return void
	 */
	public function test_an_import_is_refused(): void {
		$other = $this->add_channel( 'Lieux' );

		$this->as_user( 'moodboard_curator' );

		$local = $this->request( 'POST', '/wp/v2/media', array( 'url' => 'http://127.0.0.1/falaise.png' ) );
		$page  = $this->request( 'POST', '/wp/v2/media', array( 'url' => 'http://example.org/falaise' ) );
		$theft = $this->request(
			'POST',
			'/wp/v2/media',
			array(
				'url'                => 'http://example.org/falaise.png',
				'moodboard-channels' => array( $other ),
			)
		);

		$this->assertSame( 400, $local->get_status() );
		$this->assertSame( 400, $page->get_status() );
		$this->assertSame( 403, $theft->get_status() );
	}
}
