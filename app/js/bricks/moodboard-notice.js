import { store } from 'moodboard-app/store';
import { Brick } from 'moodboard-app/brick';

// How long a notice shows, long enough to read a sentence.
const NOTICE_MS = 6000;

/**
 * What the app says last, such as blocks added or an error, in a live region that assistive technologies read; it
 * hides after a moment, once blocks are no longer being added. Beside blocks deleted, Undo brings them back, as
 * Control or Command and Z do, while they wait to be deleted: as long as the focus is in the notice, they wait.
 */
class MoodboardNoticeElement extends Brick {
	connect( signal ) {
		/** @type {HTMLElement} */
		const $text = this.querySelector( '[data-field="notice"]' );
		/** @type {HTMLButtonElement} */
		const $undo = this.querySelector( '[data-action="undo"]' );
		/** @type {number} */
		let timer;

		$undo.addEventListener( 'click', () => store.undoDelete(), { signal } );

		this.addEventListener( 'focusin', () => store.holdDelete( true ), {
			signal,
		} );

		this.addEventListener(
			'focusout',
			( event ) => {
				if (
					! this.contains(
						/** @type {Node|null} */ ( event.relatedTarget )
					)
				) {
					store.holdDelete( false );
				}
			},
			{ signal }
		);

		// A field undoes its own typing.
		document.addEventListener(
			'keydown',
			( event ) => {
				const isUndo =
					'z' === event.key.toLowerCase() &&
					( event.ctrlKey || event.metaKey ) &&
					! event.shiftKey &&
					! event.altKey;
				const $target = /** @type {HTMLElement} */ ( event.target );

				if (
					isUndo &&
					store.get().undo.length &&
					! $target.closest( 'input, textarea, [contenteditable]' )
				) {
					event.preventDefault();
					store.undoDelete();
				}
			},
			{ signal }
		);

		return [
			store.watch(
				[ 'notice', 'undo', 'adding' ],
				( { notice, undo, adding } ) => {
					clearTimeout( timer );

					// Written again, the same text would be read again.
					if ( $text.textContent !== notice ) {
						$text.textContent = notice;
					}

					$undo.hidden = ! undo.length;
					this.hidden = ! notice;

					// The blocks being added say they are until they are, the blocks deleted while they may come back.
					if ( notice && ! adding && ! undo.length ) {
						timer = setTimeout(
							() => store.notify( '' ),
							NOTICE_MS
						);
					}
				}
			),
		];
	}
}
customElements.define( 'moodboard-notice', MoodboardNoticeElement );
