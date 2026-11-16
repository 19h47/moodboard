import { store } from 'moodboard-app/store';
import { Brick } from 'moodboard-app/brick';

// The search waits for the typing to pause, rather than asking at each key.
const SEARCH_DELAY_MS = 300;

/**
 * The search of the index, folded under its control of the header, `command="--toggle"`, which unfolds it: it follows
 * the search of the URL, unfolded while it has one, and searches as it is typed. Folded, it searches no more.
 */
class MoodboardSearchElement extends Brick {
	connect( signal ) {
		/** @type {HTMLInputElement} */
		const $input = this.querySelector( 'input[type="search"]' );
		const $toggles = [
			...document.querySelectorAll( `[commandfor="${ this.id }"]` ),
		];
		const show = ( /** @type {boolean} */ isShown ) => {
			this.hidden = ! isShown;
			$toggles.forEach( ( $toggle ) =>
				$toggle.setAttribute( 'aria-expanded', isShown.toString() )
			);
		};
		/** @type {number} */
		let timer;

		this.addEventListener(
			'command',
			( /** @type {CommandEvent} */ event ) => {
				if ( '--toggle' !== event.command ) {
					return;
				}

				show( this.hidden );

				if ( this.hidden ) {
					clearTimeout( timer );
					store.setQuery( '' );
				} else {
					$input.focus();
				}
			},
			{ signal }
		);

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

					if ( query ) {
						show( true );
					}
				}
			),
		];
	}
}
customElements.define( 'moodboard-search', MoodboardSearchElement );
