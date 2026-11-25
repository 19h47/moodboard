import { __, _n, sprintf } from 'moodboard-app/app';
import { store } from 'moodboard-app/store';
import { Brick } from 'moodboard-app/brick';
import { fill } from 'moodboard-app/dom';
import { endOnEscape } from 'moodboard-app/behaviors';

/**
 * The bar of the blocks selected, at the bottom of the screen while they are: how many, and what changes them all, put
 * in channels, first or last in the channel shown, taken out of it, or deleted. Escape ends the selection.
 */
class MoodboardSelectionElement extends Brick {
	connect( signal ) {
		/** @type {HTMLButtonElement} */
		const $disconnect = this.querySelector( '[data-action="disconnect"]' );
		const $moves = this.querySelectorAll(
			'[data-action="first"], [data-action="last"]'
		);

		this.addEventListener(
			'click',
			( event ) => {
				/** @type {HTMLElement|null} */
				const $action = /** @type {HTMLElement} */ (
					event.target
				).closest( '[data-action]' );

				this.#act( $action?.dataset.action ?? '' );
			},
			{ signal }
		);

		endOnEscape(
			() => store.get().selecting,
			() => store.setSelecting( false ),
			signal
		);

		return [
			store.watch(
				[ 'selecting', 'selection', 'view', 'id', 'query', 'channels' ],
				( { selecting, selection, view, id, query, channels } ) => {
					const channel =
						'channel' === view
							? channels.items.find( ( item ) => item.id === id )
							: null;

					this.hidden = ! selecting;
					fill( this, {
						count: selection.length
							? sprintf(
									/* translators: %d: number of blocks selected. */
									_n(
										'%d block selected',
										'%d blocks selected',
										selection.length,
										'moodboard'
									),
									selection.length
							  )
							: __( 'Select blocks', 'moodboard' ),
					} );
					this.querySelectorAll(
						'[data-action="connect"], [data-action="delete"]'
					).forEach( ( /** @type {HTMLButtonElement} */ $button ) => {
						$button.disabled = ! selection.length;
					} );
					$moves.forEach(
						( /** @type {HTMLButtonElement} */ $move ) => {
							// The order is the one of every block of the channel, not of those a search found.
							$move.hidden = ! channel || !! query;
							$move.disabled = ! selection.length;
						}
					);
					$disconnect.hidden = ! channel;
					$disconnect.disabled = ! selection.length;
					$disconnect.textContent = channel
						? sprintf(
								/* translators: %s: name of a channel. */
								__( 'Remove from %s', 'moodboard' ),
								channel.name
						  )
						: '';
				}
			),
		];
	}

	/**
	 * Does what a button of the bar says.
	 *
	 * @param {string} action The action: first, last, disconnect, delete or done; connect opens its dialog by itself.
	 */
	async #act( action ) {
		const { id } = store.get();

		try {
			if ( 'first' === action || 'last' === action ) {
				await store.moveSelection( action );
			}

			if ( 'disconnect' === action ) {
				await store.disconnectSelection( id );
			}

			// Undo brings them back a moment.
			if ( 'delete' === action ) {
				store.deleteSelection();
			}

			if ( 'done' === action ) {
				store.setSelecting( false );
			}
		} catch ( error ) {
			store.notifyError(
				error,
				__( 'The blocks could not be changed.', 'moodboard' )
			);
		}
	}
}
customElements.define( 'moodboard-selection', MoodboardSelectionElement );
