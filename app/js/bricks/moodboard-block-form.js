import { __ } from 'moodboard-app/app';
import { store } from 'moodboard-app/store';
import { Brick } from 'moodboard-app/brick';
import { showBusy } from 'moodboard-app/behaviors';

/**
 * The form of the block shown, in its dialog: its title, its description or its text, the alternative text of an
 * image and its source. Opened, the dialog fills it from the block.
 */
class MoodboardBlockFormElement extends Brick {
	connect( signal ) {
		const $dialog = this.closest( 'dialog' );
		/** @type {HTMLFormElement} */
		const $form = this.querySelector( 'form' );
		/** @param {string} name A field. */
		const field = ( name ) =>
			/** @type {HTMLInputElement} */ (
				$form.elements.namedItem( name )
			);
		const block = () => {
			const { view, id, blocks } = store.get();

			return blocks[ `${ view }-${ id }` ] ?? null;
		};

		$dialog.addEventListener(
			'command',
			( /** @type {CommandEvent} */ event ) => {
				const shown = block();

				if ( 'show-modal' !== event.command || ! shown ) {
					return;
				}

				$form.reset();
				field( 'title' ).value = shown.title;
				field( 'body' ).value =
					'text' === shown.kind ? shown.text : shown.description;
				field( 'alt' ).value = shown.alt;
				field( 'source' ).value = shown.source;
				// The label of the body, and the alternative text, as the block is.
				this.querySelectorAll( '[data-kind]' ).forEach(
					( /** @type {HTMLElement} */ $part ) => {
						$part.hidden = ! $part.dataset.kind
							.split( ' ' )
							.includes( shown.kind );
					}
				);
				this.querySelector( '[data-row="alt"]' ).toggleAttribute(
					'hidden',
					! shown.image
				);
			},
			{ signal }
		);

		$form.addEventListener(
			'submit',
			async ( event ) => {
				event.preventDefault();

				const shown = block();
				const body = field( 'body' ).value;

				showBusy( $form, true );

				try {
					await store.updateBlock( shown, {
						title: field( 'title' ).value,
						...( 'media' === shown.kind
							? {
									description: body,
									alt_text: field( 'alt' ).value,
							  }
							: { content: body } ),
						meta: { moodboard_source: field( 'source' ).value },
					} );
					$dialog.close();
				} catch ( error ) {
					store.notify(
						error?.message ??
							__( 'The block could not be saved.', 'moodboard' )
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
customElements.define( 'moodboard-block-form', MoodboardBlockFormElement );
