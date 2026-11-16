import { store } from 'moodboard-app/store';
import { Brick } from 'moodboard-app/brick';

// The search waits for the typing to pause, rather than asking at each key.
const SEARCH_DELAY_MS = 300;

/**
 * The search of the index: its field follows the search of the URL, and searches as it is typed.
 */
class MoodboardSearchElement extends Brick {
	connect( signal ) {
		/** @type {HTMLInputElement} */
		const $input = this.querySelector( 'input[type="search"]' );
		/** @type {number} */
		let timer;

		this.querySelector( 'form' ).addEventListener(
			'submit',
			( event ) => {
				event.preventDefault();
				clearTimeout( timer );
				store.setQuery( $input.value );
			},
			{ signal }
		);

		$input.addEventListener(
			'input',
			() => {
				clearTimeout( timer );
				timer = setTimeout(
					() => store.setQuery( $input.value ),
					SEARCH_DELAY_MS
				);
			},
			{ signal }
		);

		return [
			store.select(
				( state ) => state.query,
				( query ) => {
					if ( $input.value !== query ) {
						$input.value = query;
					}
				}
			),
		];
	}
}
customElements.define( 'moodboard-search', MoodboardSearchElement );
