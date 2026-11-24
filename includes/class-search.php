<?php
/**
 * The search of the blocks.
 *
 * @link       https://github.com/19h47/moodboard
 * @since      1.0.0
 *
 * @package    Moodboard
 * @subpackage Moodboard/includes
 */

namespace Moodboard;

use WP_Error;
use WP_HTTP_Response;
use WP_Query;
use WP_REST_Request;

/**
 * Finds the blocks of the REST API by each word of a search: in their title, their text or their description, who made
 * them, or the alternative text of an image. A word typed wrong, found in no block of the curator, is taken for the
 * closest word of their blocks, which the header X-Moodboard-Search says: the words of the blocks of another curator
 * are never one.
 *
 * @since      1.0.0
 * @package    Moodboard
 * @subpackage Moodboard/includes
 * @author     Jérémy Levron <jeremylevron@19h47.fr>
 */
class Search {

	/**
	 * Header of a response saying the search as it was corrected, encoded as a component of a URL.
	 *
	 * @var string
	 */
	public const string HEADER = 'X-Moodboard-Search';

	/**
	 * Argument of WP_Query asking a search to find a block by its meta too.
	 *
	 * @var string
	 */
	private const string META = 'moodboard_search_meta';

	/**
	 * Meta of an image holding its alternative text, as core keeps it.
	 *
	 * @var string
	 */
	private const string ALT = '_wp_attachment_image_alt';

	/**
	 * Meta of a media holding the path of its file, which core searches too.
	 *
	 * @var string
	 */
	private const string FILE = '_wp_attached_file';

	/**
	 * Fewest letters of a word a search corrects: a shorter one is too close to too many.
	 *
	 * @var int
	 */
	private const int SHORTEST = 4;

	/**
	 * The search of the request, as it was corrected, for its response; null when it was not.
	 *
	 * @var string|null
	 */
	private ?string $corrected = null;

	/**
	 * Register hooks.
	 *
	 * @return void
	 */
	public function hooks(): void {
		foreach ( array( 'attachment', Posts::TEXT, Posts::LINK ) as $post_type ) {
			add_filter( "rest_{$post_type}_query", array( $this, 'ask' ), 10, 2 );
		}

		add_filter( 'posts_search', array( $this, 'search_meta' ), 10, 2 );
		add_filter( 'rest_request_after_callbacks', array( $this, 'say_corrected' ) );
	}

	/**
	 * Ask a search of the blocks of the REST API to find a block by its meta too, its words corrected.
	 *
	 * @param array<string,mixed> $args    Arguments of WP_Query.
	 * @param WP_REST_Request     $request Request.
	 * @return array<string,mixed>
	 */
	public function ask( array $args, WP_REST_Request $request ): array {
		$search          = (string) $request['search'];
		$this->corrected = null;

		if ( '' === $search ) {
			return $args;
		}

		$corrected          = $this->correct( $search );
		$args['s']          = $corrected;
		$args[ self::META ] = true;

		if ( $corrected !== $search ) {
			$this->corrected = $corrected;
		}

		return $args;
	}

	/**
	 * Say the search as it was corrected, in the header of the response.
	 *
	 * @param WP_HTTP_Response|WP_Error|mixed $response Response, or its error.
	 * @return WP_HTTP_Response|WP_Error|mixed
	 */
	public function say_corrected( mixed $response ): mixed {
		if ( null !== $this->corrected && $response instanceof WP_HTTP_Response ) {
			$response->header( self::HEADER, rawurlencode( $this->corrected ) );
			$this->corrected = null;
		}

		return $response;
	}

	/**
	 * Find a block by its meta too, as asked: each word of the search is in its title, its text or its description, who
	 * made it, or the alternative text of an image. Core searches each word apart, in a clause of its own, which the
	 * clause of its title begins: the meta join it, with the same pattern, LIKE or NOT LIKE for a word excluded.
	 *
	 * @param string   $search SQL of the search, which starts with AND.
	 * @param WP_Query $query  Query.
	 * @return string
	 */
	public function search_meta( string $search, WP_Query $query ): string {
		global $wpdb;

		if ( '' === $search || ! $query->get( self::META ) ) {
			return $search;
		}

		$meta  = $wpdb->prepare(
			"EXISTS ( SELECT 1 FROM {$wpdb->postmeta} WHERE {$wpdb->postmeta}.post_id = {$wpdb->posts}.ID AND {$wpdb->postmeta}.meta_key IN ( %s, %s ) AND {$wpdb->postmeta}.meta_value LIKE",
			Meta::BY,
			self::ALT
		);
		$title = '/\(' . preg_quote( "{$wpdb->posts}.post_title", '/' ) . " (NOT LIKE|LIKE) ('(?:[^'\\\\]|\\\\.)*')\\)/";

		return (string) preg_replace_callback(
			$title,
			static function ( array $matches ) use ( $meta ): string {
				[ $clause, $operator, $pattern ] = $matches;

				return 'LIKE' === $operator
					? "($meta $pattern )) OR $clause"
					: "(NOT $meta $pattern )) AND $clause";
			},
			$search
		);
	}

	/**
	 * A search, each word that is in no block of the curator taken for the closest word of their blocks, if one is close
	 * enough: a letter apart for a word of four, two for a longer one. A word excluded, quoted or shorter stays.
	 *
	 * @param string $search The search.
	 * @return string The search, corrected.
	 */
	private function correct( string $search ): string {
		$words = null;
		$parts = (array) preg_split( '/(\s+)/u', $search, -1, PREG_SPLIT_DELIM_CAPTURE );

		foreach ( $parts as $index => $part ) {
			$part = (string) $part;

			if ( ! preg_match( '/^[\p{L}\p{N}]+$/u', $part ) || mb_strlen( $part ) < self::SHORTEST ) {
				continue;
			}

			$words         ??= $this->words();
			$parts[ $index ] = $this->closest( $part, $words );
		}

		return implode( '', $parts );
	}

	/**
	 * The word of the blocks closest to a word typed, the word itself if a block has it or none is close enough; the
	 * word written the most among the closest.
	 *
	 * @param string                                     $typed The word typed.
	 * @param array<string,array{word:string,count:int}> $words The words of the blocks, by their letters without accents.
	 * @return string
	 */
	private function closest( string $typed, array $words ): string {
		$letters = remove_accents( mb_strtolower( $typed ) );

		foreach ( array_keys( $words ) as $known ) {
			if ( str_contains( (string) $known, $letters ) ) {
				return $typed;
			}
		}

		$farthest = mb_strlen( $letters ) > self::SHORTEST ? 2 : 1;
		$closest  = null;

		foreach ( $words as $known => $word ) {
			$distance = levenshtein( $letters, (string) $known );

			if (
				$distance <= $farthest &&
				( null === $closest || $distance < $closest['distance'] || ( $distance === $closest['distance'] && $word['count'] > $closest['count'] ) )
			) {
				$closest = array( 'distance' => $distance ) + $word;
			}
		}

		return $closest['word'] ?? $typed;
	}

	/**
	 * The words of the blocks of the current curator, by their letters without accents, as written the first time, with
	 * how many times they are: their title, their caption, their text or their description, who made them, the
	 * alternative text and the file of an image.
	 *
	 * @return array<string,array{word:string,count:int}>
	 */
	private function words(): array {
		global $wpdb;

		$texts = $wpdb->get_col( // phpcs:ignore WordPress.DB.DirectDatabaseQuery
			$wpdb->prepare(
				"SELECT CONCAT_WS( ' ', p.post_title, p.post_excerpt, p.post_content, ( SELECT GROUP_CONCAT( m.meta_value SEPARATOR ' ' ) FROM {$wpdb->postmeta} m WHERE m.post_id = p.ID AND m.meta_key IN ( %s, %s, %s ) ) )
				FROM {$wpdb->posts} p
				WHERE p.post_author = %d
				AND p.post_status NOT IN ( 'trash', 'auto-draft' )
				AND ( p.post_type IN ( %s, %s ) OR ( p.post_type = 'attachment' AND EXISTS ( SELECT 1 FROM {$wpdb->postmeta} b WHERE b.post_id = p.ID AND b.meta_key = %s AND b.meta_value = '1' ) ) )",
				Meta::BY,
				self::ALT,
				self::FILE,
				get_current_user_id(),
				Posts::TEXT,
				Posts::LINK,
				Meta::BLOCK
			)
		);
		$words = array();

		foreach ( $texts as $text ) {
			$found = (array) preg_split( '/[^\p{L}\p{N}]+/u', mb_strtolower( wp_strip_all_tags( (string) $text ) ), -1, PREG_SPLIT_NO_EMPTY );

			foreach ( $found as $word ) {
				$known = remove_accents( (string) $word );

				$words[ $known ] ??= array(
					'word'  => (string) $word,
					'count' => 0,
				);
				++$words[ $known ]['count'];
			}
		}

		return $words;
	}
}
