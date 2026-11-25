import { __ } from 'moodboard-app/app';
import { store } from 'moodboard-app/store';
import { Brick } from 'moodboard-app/brick';
import { showBusy } from 'moodboard-app/behaviors';
import { fillChannelPicker } from 'moodboard-app/render';

/** @import { Channel } from 'moodboard-app/api' */

/**
 * The channels the blocks selected go in, in its dialog: every channel of the curator, a box each, none ticked; a
 * filter of their names, and a new channel of the name typed, its form opened to choose where it goes, ticked. Sent, it puts each block in the channels ticked,
 * besides its own.
 */
class MoodboardBulkElement extends Brick {
	connect( signal ) {
		const $dialog = this.closest( 'dialog' );
		/** @type {HTMLFormElement} */
		const $form = this.querySelector( 'form' );
		/** @type {HTMLInputElement} */
		const $filter = this.querySelector( 'input[type="search"]' );
		/** @type {HTMLElement} */
		const $list = this.querySelector( '[data-list="channels"]' );
		/** @type {HTMLButtonElement} */
		const $create = this.querySelector( '[data-action="create"]' );
		// The channels ticked, kept as the filter hides some of them.
		const checked = new Set();
		const fill = () =>
			fillChannelPicker( this, store.get().channels.items, [
				...checked,
			] );

		$dialog.addEventListener(
			'command',
			( /** @type {CommandEvent} */ event ) => {
				if ( 'show-modal' === event.command ) {
					checked.clear();
					$filter.value = '';
					fill();
				}
			},
			{ signal }
		);

		$filter.addEventListener( 'input', fill, { signal } );

		$list.addEventListener(
			'change',
			( event ) => {
				const $box = /** @type {HTMLInputElement} */ ( event.target );

				if ( $box.checked ) {
					checked.add( Number( $box.value ) );
				} else {
					checked.delete( Number( $box.value ) );
				}
			},
			{ signal }
		);

		$create.addEventListener(
			'added',
			( /** @type {CustomEvent<Channel>} */ event ) => {
				event.preventDefault();
				checked.add( event.detail.id );
				$filter.value = '';
				fill();
				$filter.focus();
			},
			{ signal }
		);

		$form.addEventListener(
			'submit',
			async ( event ) => {
				event.preventDefault();

				if ( ! checked.size ) {
					$dialog.close();
					return;
				}

				showBusy( $form, true );

				try {
					await store.connectSelection( [ ...checked ] );
					$dialog.close();
				} catch ( error ) {
					store.notifyError(
						error,
						__( 'The blocks could not be connected.', 'moodboard' )
					);
				} finally {
					showBusy( $form, false );
				}
			},
			{ signal }
		);

		return [];
	}
}
customElements.define( 'moodboard-bulk', MoodboardBulkElement );
