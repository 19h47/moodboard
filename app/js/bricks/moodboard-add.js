import { __, sprintf } from 'moodboard-app/app';
import { store, targetChannel, targetOf } from 'moodboard-app/store';
import { Brick } from 'moodboard-app/brick';
import { fill } from 'moodboard-app/dom';

/** @import { AddBlockElement } from '../components/add-block.js' */

/**
 * The dialog that adds blocks where they go: into the channel shown, the one a block shown was opened from, or the
 * index, which its title says as it opens. What its form says is added goes there, the form busy until it has, then
 * the dialog closes. What another app shares opens it, written in its form, to add with a tap: a link alone adds
 * nothing.
 */
class MoodboardAddElement extends Brick {
	connect( signal ) {
		const $dialog = this.closest( 'dialog' );
		/** @type {AddBlockElement} */
		const $add = this.querySelector( 'add-block' );

		$dialog.addEventListener(
			'command',
			( /** @type {CommandEvent} */ event ) => {
				if ( 'show-modal' === event.command ) {
					this.#fillTitle();
				}
			},
			{ signal }
		);

		$add.addEventListener(
			'add',
			async (
				/** @type {CustomEvent<{files: File[], text: string}>} */ event
			) => {
				const isAdded = await store.add(
					targetOf( store.get() ),
					event.detail
				);

				if ( isAdded ) {
					$dialog.close();
				}
			},
			{ signal }
		);

		return [
			store.select(
				( state ) => state.adding,
				( adding ) => $add.toggleAttribute( 'busy', adding )
			),
			store.select(
				( state ) => state.shared,
				( shared ) => {
					if ( ! shared ) {
						return;
					}

					this.#fillTitle();
					$add.text = shared;
					$dialog.showModal();
					store.setShared( '' );
				}
			),
		];
	}

	/** Says where the blocks go: the channel shown, the one a block shown was opened from, or the index. */
	#fillTitle() {
		const channel = targetChannel( store.get() );

		fill( this, {
			title: channel
				? sprintf(
						/* translators: %s: name of a channel. */
						__( 'Add to %s', 'moodboard' ),
						channel.name
				  )
				: __( 'Add to the index', 'moodboard' ),
		} );
	}
}
customElements.define( 'moodboard-add', MoodboardAddElement );
