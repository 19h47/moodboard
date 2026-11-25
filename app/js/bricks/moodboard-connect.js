import { __ } from 'moodboard-app/app';
import { shownBlock, store } from 'moodboard-app/store';
import { Brick } from 'moodboard-app/brick';
import { fillChannelPicker } from 'moodboard-app/render';

/** @import { Block, Channel } from 'moodboard-app/api' */

/**
 * The channels of the block shown, in its dialog: every channel of the curator, a box each, ticked for those it is in,
 * which puts it in or takes it out at once; a filter of their names, and a new channel of the name typed, its form
 * opened to choose where it goes, which the block goes in.
 */
class MoodboardConnectElement extends Brick {
	connect( signal ) {
		const $dialog = this.closest( 'dialog' );
		/** @type {HTMLInputElement} */
		const $filter = this.querySelector( 'input[type="search"]' );
		/** @type {HTMLElement} */
		const $list = this.querySelector( '[data-list="channels"]' );
		/** @type {HTMLButtonElement} */
		const $create = this.querySelector( '[data-action="create"]' );
		const fill = () =>
			fillChannelPicker(
				this,
				store.get().channels.items,
				this.#block()?.channels ?? []
			);

		$dialog.addEventListener(
			'command',
			( /** @type {CommandEvent} */ event ) => {
				if ( 'show-modal' === event.command ) {
					$filter.value = '';
					fill();
				}
			},
			{ signal }
		);

		$filter.addEventListener( 'input', fill, { signal } );

		$list.addEventListener(
			'change',
			async ( event ) => {
				const $box = /** @type {HTMLInputElement} */ ( event.target );

				$box.disabled = true;

				try {
					await store.connect(
						this.#block(),
						Number( $box.value ),
						$box.checked
					);
				} catch ( error ) {
					$box.checked = ! $box.checked;
					store.notifyError(
						error,
						__(
							'The channels of the block could not be changed.',
							'moodboard'
						)
					);
				} finally {
					$box.disabled = false;
				}
			},
			{ signal }
		);

		$create.addEventListener(
			'added',
			async ( /** @type {CustomEvent<Channel>} */ event ) => {
				event.preventDefault();
				$filter.value = '';
				fill();
				$filter.focus();

				try {
					await store.connect( this.#block(), event.detail.id, true );
					fill();
				} catch ( error ) {
					store.notifyError(
						error,
						__(
							'The channels of the block could not be changed.',
							'moodboard'
						)
					);
				}
			},
			{ signal }
		);

		return [];
	}

	/**
	 * The block shown.
	 *
	 * @return {Block|null} The block.
	 */
	#block() {
		return shownBlock( store.get() );
	}
}
customElements.define( 'moodboard-connect', MoodboardConnectElement );
