<?php
/**
 * The links of a moodboard, described as they are added by their URL.
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
 * A link added by its URL alone, `POST /wp/v2/moodboard-links` with its source and no title, takes what core gives of
 * it: its provider, through `oembed/1.0/proxy`, such as the title, the author and the thumbnail of a video, else its
 * page, through `wp-block-editor/v1/url-details`, its title, its description and its image. The image is copied to the library as the
 * featured image of the link. The app and the shortcut of an iPhone add a link alike.
 *
 * @since      1.0.0
 * @package    Moodboard
 * @subpackage Moodboard/includes
 * @author     Jérémy Levron <jeremylevron@19h47.fr>
 */
class Links {

	/**
	 * Extensions of the images a link takes, by their type.
	 *
	 * @var array<string,string>
	 */
	private const array IMAGE_EXTENSIONS = array(
		'image/jpeg' => 'jpg',
		'image/png'  => 'png',
		'image/gif'  => 'gif',
		'image/webp' => 'webp',
		'image/avif' => 'avif',
	);

	/**
	 * Register hooks.
	 *
	 * @return void
	 */
	public function hooks(): void {
		add_action( 'rest_after_insert_' . Posts::LINK, array( $this, 'describe' ), 10, 3 );
	}

	/**
	 * Describe a link added by its URL alone: its title, its description and its image, before the REST API answers it.
	 *
	 * @param WP_Post         $link     Link.
	 * @param WP_REST_Request $request  Request.
	 * @param bool            $creating Whether the link is added.
	 * @return void
	 */
	public function describe( WP_Post $link, WP_REST_Request $request, bool $creating ): void {
		$url = (string) get_post_meta( $link->ID, Meta::SOURCE, true );

		if ( ! $creating || '' === $url || '' !== (string) $request['title'] ) {
			return;
		}

		$details = self::get_details( $url );
		$title   = '' !== $details['title'] ? $details['title'] : $url;

		wp_update_post(
			array(
				'ID'           => $link->ID,
				'post_title'   => $title,
				'post_content' => $details['description'],
			)
		);

		// The REST API answers the link it loaded before this hook.
		$link->post_title   = $title;
		$link->post_content = $details['description'];

		if ( '' !== $details['by'] && '' === (string) get_post_meta( $link->ID, Meta::BY, true ) ) {
			update_post_meta( $link->ID, Meta::BY, $details['by'] );
		}

		$image_id = '' !== $details['image'] ? self::copy_image( $details['image'], $link->ID, $details['title'] ) : 0;

		if ( $image_id ) {
			set_post_thumbnail( $link->ID, $image_id );
		}
	}

	/**
	 * What core gives of a URL, as the editor asks for it: its provider, else its page.
	 *
	 * @param string $url URL.
	 * @return array{title:string,description:string,image:string,by:string}
	 */
	private static function get_details( string $url ): array {
		$embed = self::get( '/oembed/1.0/proxy', $url );

		if ( $embed ) {
			return array(
				'title'       => self::to_text( $embed['title'] ?? '' ),
				'description' => '',
				'image'       => (string) ( $embed['thumbnail_url'] ?? '' ),
				'by'          => self::to_text( $embed['author_name'] ?? '' ),
			);
		}

		$page = self::get( '/wp-block-editor/v1/url-details', $url );

		return array(
			'title'       => self::to_text( $page['title'] ?? '' ),
			'description' => self::to_text( $page['description'] ?? '' ),
			'image'       => (string) ( $page['image'] ?? '' ),
			'by'          => '',
		);
	}

	/**
	 * The answer of a route of core about a URL, empty when it has none.
	 *
	 * @param string $route Route.
	 * @param string $url   URL.
	 * @return array<string,mixed>
	 */
	private static function get( string $route, string $url ): array {
		$request = new WP_REST_Request( 'GET', $route );

		$request->set_param( 'url', $url );

		$response = rest_do_request( $request );

		if ( $response->is_error() ) {
			return array();
		}

		$data = $response->get_data();

		// The oEmbed proxy answers an object.
		return is_array( $data ) || is_object( $data ) ? (array) $data : array();
	}

	/**
	 * Copy an image to the library, attached to the link it is the image of: its type read from its content, as the URL
	 * of an image often has no extension, which the import of core asks for.
	 *
	 * @param string $url     URL of the image.
	 * @param int    $link_id Post ID of the link.
	 * @param string $title   Title of the link, the name of its image.
	 * @return int Attachment ID, 0 when it could not be copied.
	 */
	private static function copy_image( string $url, int $link_id, string $title ): int {
		require_once ABSPATH . 'wp-admin/includes/file.php';
		require_once ABSPATH . 'wp-admin/includes/media.php';
		require_once ABSPATH . 'wp-admin/includes/image.php';

		$file = download_url( $url );

		if ( is_wp_error( $file ) ) {
			return 0;
		}

		$extension = self::IMAGE_EXTENSIONS[ (string) wp_get_image_mime( $file ) ] ?? '';

		if ( '' === $extension ) {
			wp_delete_file( $file );

			return 0;
		}

		$name     = sanitize_file_name( '' !== $title ? $title : 'image' );
		$image_id = media_handle_sideload(
			array(
				'name'     => "$name.$extension",
				'tmp_name' => $file,
			),
			$link_id,
			'' !== $title ? $title : null
		);

		if ( is_wp_error( $image_id ) ) {
			wp_delete_file( $file );

			return 0;
		}

		return $image_id;
	}

	/**
	 * A text of a page or of a provider, without its markup and its entities.
	 *
	 * @param mixed $html Text, which may hold markup.
	 * @return string
	 */
	private static function to_text( mixed $html ): string {
		return trim( html_entity_decode( wp_strip_all_tags( (string) $html ), ENT_QUOTES | ENT_HTML5, 'UTF-8' ) );
	}
}
