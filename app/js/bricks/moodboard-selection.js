import { __, _n, sprintf } from 'moodboard-app/app';
import { store } from 'moodboard-app/store';
import { Brick } from 'moodboard-app/brick';
import { fill } from 'moodboard-app/dom';

/**
 * The bar of the blocks selected, at the bottom of the screen while they are: how many, and what changes them all, put
 * in channels, taken out of the channel shown, or deleted. Escape ends the selection.
 */
class MoodboardSelectionElement extends Brick {
	connect( signal ) {
		/** @type {HTMLButtonElement} */
		const $disconnect = this.querySelector( '[data-action="disconnect"]' );

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

		document.addEventListener(
			'keydown',
			( event ) => {
				if (
					'Escape' === event.key &&
					store.get().selecting &&
					! document.querySelector( 'dialog:modal' )
				) {
					store.setSelecting( false );
				}
			},
			{ signal }
		);

		return [
			store.select(
				( state ) => state,
				( { selecting, selection, view, id, channels } ) => {
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
	 * @param {string} action The action: disconnect, delete or done; connect opens its dialog by itself.
	 */
	async #act( action ) {
		const { selection, id } = store.get();

		try {
			if ( 'disconnect' === action ) {
				await store.disconnectSelection( id );
			}

			if (
				'delete' === action &&
				// eslint-disable-next-line no-alert -- A confirmation the browser gives, accessible as it is.
				confirm(
					sprintf(
						/* translators: %d: number of blocks selected. */
						_n(
							'Delete %d block, and its file?',
							'Delete %d blocks, and their files?',
							selection.length,
							'moodboard'
						),
						selection.length
					)
				)
			) {
				await store.deleteSelection();
			}

			if ( 'done' === action ) {
				store.setSelecting( false );
			}
		} catch ( error ) {
			store.notify( error?.message ?? '' );
		}
	}
}
customElements.define( 'moodboard-selection', MoodboardSelectionElement );
