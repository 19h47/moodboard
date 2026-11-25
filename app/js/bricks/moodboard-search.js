import { GRID_VIEWS, store } from 'moodboard-app/store';
import { Brick } from 'moodboard-app/brick';

// The search waits for the typing to pause, rather than asking at each key.
const SEARCH_DELAY_MS = 300;

/**
 * The search of the index or of the channel shown, folded under its control of the header, `command="--toggle"`, or /,
 * which unfold it: it follows the search of the URL, unfolded while it has one, and searches as it is typed. Folded, by
 * its control, or Escape in it empty, it searches no more; another view folds it, unless its URL has a search.
 */
class MoodboardSearchElement extends Brick {
	connect( signal ) {
		/** @type {HTMLInputElement} */
		const $input = this.querySelector( 'input[type="search"]' );
		const $toggles = /** @type {HTMLButtonElement[]} */ ( [
			...document.querySelectorAll( `[commandfor="${ this.id }"]` ),
		] );
		const show = ( /** @type {boolean} */ isShown ) => {
			this.hidden = ! isShown;
			$toggles.forEach( ( $toggle ) =>
				$toggle.setAttribute( 'aria-expanded', isShown.toString() )
			);
		};
		const unfold = () => {
			show( true );
			$input.focus();
		};
		const fold = () => {
			show( false );
			clearTimeout( timer );
			store.setQuery( '' );
		};
		/** @type {number} */
		let timer;
		// The view the search was shown or folded for.
		let route = '';

		this.addEventListener(
			'command',
			( /** @type {CommandEvent} */ event ) => {
				if ( '--toggle' === event.command ) {
					( this.hidden ? unfold : fold )();
				}
			},
			{ signal }
		);

		document.addEventListener(
			'keydown',
			( event ) => {
				const $target = /** @type {HTMLElement} */ ( event.target );

				if (
					'/' !== event.key ||
					event.ctrlKey ||
					event.metaKey ||
					event.altKey ||
					! GRID_VIEWS.includes( store.get().view ) ||
					document.querySelector( 'dialog:modal' ) ||
					$target.closest(
						'input, textarea, select, [contenteditable]'
					)
				) {
					return;
				}

				event.preventDefault();
				unfold();
			},
			{ signal }
		);

		// Escape empties the field first, as the browser does, then folds it, the focus back on its control.
		$input.addEventListener(
			'keydown',
			( event ) => {
				if ( 'Escape' === event.key && ! $input.value ) {
					fold();
					$toggles[ 0 ]?.focus();
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
			store.watch( [ 'view', 'id', 'query' ], ( { view, id, query } ) => {
				const shown = `${ view }-${ id }`;

				if ( $input.value !== query ) {
					$input.value = query;
				}

				if ( shown !== route ) {
					route = shown;
					show( !! query && GRID_VIEWS.includes( view ) );
				} else if ( query ) {
					show( true );
				}
			} ),
		];
	}
}
customElements.define( 'moodboard-search', MoodboardSearchElement );
