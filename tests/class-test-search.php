<?php
/**
 * Tests of the search of the blocks.
 *
 * @package Moodboard
 */

namespace Moodboard\Tests;

use WP_REST_Response;

/**
 * A search finds a block by each of its words, in its title, its text, who made it or the alternative text of an image;
 * a word typed wrong is taken for the closest word of the blocks of the curator.
 */
class Test_Search extends TestCase {

	/**
	 * Add an image that is a block, with its file, its title and its alternative text.
	 *
	 * @param string $title Its title.
	 * @param string $alt   Its alternative text.
	 * @return int Its ID.
	 */
	private function add_image( string $title, string $alt ): int {
		$media_id = $this->add_media();

		wp_update_post(
			array(
				'ID'         => $media_id,
				'post_title' => $title,
			)
		);
		// A media has a file, which core searches too: none is no match for a word excluded.
		update_post_meta( $media_id, '_wp_attached_file', "2026/11/image-$media_id.png" );
		update_post_meta( $media_id, '_wp_attachment_image_alt', $alt );

		return $media_id;
	}

	/**
	 * The media that are blocks a search finds.
	 *
	 * @param string $search The search.
	 * @return WP_REST_Response
	 */
	private function search( string $search ): WP_REST_Response {
		return $this->request(
			'GET',
			'/wp/v2/media',
			array(
				'moodboard_block' => true,
				'search'          => $search,
			)
		);
	}

	/**
	 * The IDs of the media that are blocks a search finds.
	 *
	 * @param string $search The search.
	 * @return int[]
	 */
	private function found( string $search ): array {
		return array_column( $this->search( $search )->get_data(), 'id' );
	}

	/**
	 * The search a response says it corrected, null for none.
	 *
	 * @param string $search The search.
	 * @return string|null
	 */
	private function corrected( string $search ): ?string {
		$header = $this->search( $search )->get_headers()['X-Moodboard-Search'] ?? null;

		return null === $header ? null : rawurldecode( $header );
	}

	/**
	 * A search finds an image by its alternative text, which its title, named after its file, does not say: each word
	 * in any of them, in any order, and none of a word excluded.
	 *
	 * @return void
	 */
	public function test_a_search_finds_an_image_by_its_alternative_text(): void {
		$tram  = $this->add_image( 'Toronto, 1975', 'Tramway rouge sous la neige, la nuit.' );
		$train = $this->add_image( 'image', 'Train rouge dans la brume.' );

		$this->assertSame( array( $tram ), $this->found( 'tramway' ) );
		$this->assertSame( array( $tram ), $this->found( 'neige tramway' ) );
		$this->assertSame( array( $tram ), $this->found( 'toronto tramway' ) );
		$this->assertSame( array( $train ), $this->found( 'rouge -tramway' ) );
		$this->assertEqualsCanonicalizing( array( $tram, $train ), $this->found( 'rouge' ) );
	}

	/**
	 * A word typed wrong, in no block, is taken for the closest word of the blocks, as written, which the response says.
	 *
	 * @return void
	 */
	public function test_a_word_typed_wrong_is_taken_for_the_closest(): void {
		$tram  = $this->add_image( 'image', 'Tramway rouge sous la neige, la nuit.' );
		$tower = $this->add_image( 'image', 'Tour de béton dans la brume.' );

		$this->assertSame( array( $tram ), $this->found( 'tramwya' ) );
		$this->assertSame( 'tramway', $this->corrected( 'tramwya' ) );
		$this->assertSame( array( $tower ), $this->found( 'betno' ) );
		$this->assertSame( 'béton', $this->corrected( 'betno' ) );
		$this->assertSame( 'rouge tramway', $this->corrected( 'rouge tramwya' ) );
	}

	/**
	 * A word a block has, even in part or without its accents, a short word and a word too far from any stay as typed.
	 *
	 * @return void
	 */
	public function test_a_word_found_short_or_far_stays(): void {
		$this->add_image( 'image', 'Banquette en métal perforé.' );

		$this->assertNull( $this->corrected( 'metal' ) );
		$this->assertNull( $this->corrected( 'perfo' ) );
		$this->assertNull( $this->corrected( 'mtl' ) );
		$this->assertNull( $this->corrected( 'zeppelin' ) );
		$this->assertSame( array(), $this->found( 'zeppelin' ) );
	}

	/**
	 * A word of the blocks of another curator is never the one a search takes, nor says.
	 *
	 * @return void
	 */
	public function test_a_search_takes_no_word_of_another_curator(): void {
		$this->add_image( 'image', 'Zeppelin au-dessus de la ville.' );

		$this->as_user( 'moodboard_curator' );

		$this->assertNull( $this->corrected( 'zepelin' ) );
	}
}
