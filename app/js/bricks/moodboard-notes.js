import { __ } from 'moodboard-app/app';
import { shownBlock, store } from 'moodboard-app/store';
import { Brick } from 'moodboard-app/brick';
import { clone, fill } from 'moodboard-app/dom';
import { showBusy } from 'moodboard-app/behaviors';
import { formatDate } from 'moodboard-app/render';

/** @import { Block } from 'moodboard-app/api' */

/**
 * The notes of the block shown, the oldest first, each with its date and the button that deletes it, then the form that
 * writes one: the notes of core, which only the curator of the block reads.
 */
class MoodboardNotesElement extends Brick {
	/** @type {Block|null} */
	#block = null;

	connect( signal ) {
		/** @type {HTMLElement} */
		const $list = this.querySelector( '[data-list="notes"]' );
		/** @type {HTMLFormElement} */
		const $form = this.querySelector( 'form' );
		/** @type {HTMLTextAreaElement} */
		const $content = this.querySelector( 'textarea' );

		$form.addEventListener(
			'submit',
			async ( event ) => {
				event.preventDefault();

				if ( ! this.#block || ! $content.value.trim() ) {
					return;
				}

				showBusy( $form, true );

				try {
					await store.addNote( this.#block, $content.value.trim() );
					$form.reset();
				} catch ( error ) {
					store.notifyError(
						error,
						__( 'The note could not be saved.', 'moodboard' )
					);
				} finally {
					showBusy( $form, false );
				}
			},
			{ signal }
		);

		$list.addEventListener(
			'click',
			async ( event ) => {
				/** @type {HTMLElement|null} */
				const $delete = /** @type {HTMLElement} */ (
					event.target
				).closest( '[data-action="delete-note"]' );

				if ( ! $delete || ! this.#block ) {
					return;
				}

				try {
					await store.deleteNote(
						this.#block,
						Number( $delete.dataset.id )
					);
				} catch ( error ) {
					store.notifyError(
						error,
						__( 'The note could not be deleted.', 'moodboard' )
					);
				}
			},
			{ signal }
		);

		return [
			store.select( shownBlock, ( block ) => {
				// Another block shown: its notes load, once; those of a block shown before are there still, as they change here only.
				if (
					block &&
					block.key !== this.#block?.key &&
					! store.get().notes[ block.key ]
				) {
					store.loadNotes( block );
				}

				this.#block = block;
				this.#render( $list );
			} ),
			store.select(
				( state ) => state.notes,
				() => this.#render( $list )
			),
		];
	}

	/**
	 * Lists the notes of the block shown, as loaded, or none.
	 *
	 * @param {HTMLElement} $list The list of the notes.
	 */
	#render( $list ) {
		const notes = this.#block
			? store.get().notes[ this.#block.key ]
			: undefined;

		$list.replaceChildren(
			...( notes?.items ?? [] ).map( ( note ) => {
				const $item = clone( 'moodboard-note' );
				/** @type {HTMLElement} */
				const $delete = $item.querySelector(
					'[data-action="delete-note"]'
				);

				fill( $item, {
					content: note.content,
					date: formatDate( note.date ),
				} );
				$delete.dataset.id = note.id.toString();

				return $item;
			} )
		);
		fill( this, { error: notes?.error ?? '' } );
	}
}
customElements.define( 'moodboard-notes', MoodboardNotesElement );
