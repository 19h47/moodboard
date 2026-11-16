import { __, sprintf } from 'moodboard-app/app';
import { store } from 'moodboard-app/store';
import { Brick } from 'moodboard-app/brick';
import { isNewName, renderChannelOptions } from 'moodboard-app/render';

/** @import { Block } from 'moodboard-app/api' */

/**
 * The channels of the block shown, in its dialog: every channel of the curator, a box each, ticked for those it is in,
 * which puts it in or takes it out at once; a filter of their names, and a new channel of the name typed.
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
		const fill = () => {
			const { items } = store.get().channels;

			$list.replaceChildren(
				...renderChannelOptions(
					items,
					$filter.value,
					this.#block()?.channels ?? []
				)
			);
			$create.hidden = ! isNewName( items, $filter.value );
			$create.textContent = sprintf(
				/* translators: %s: name of a channel. */
				__( 'Add the channel “%s”', 'moodboard' ),
				$filter.value.trim()
			);
		};

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
					store.notify( error?.message ?? '' );
				} finally {
					$box.disabled = false;
				}
			},
			{ signal }
		);

		$create.addEventListener(
			'click',
			async () => {
				$create.disabled = true;

				try {
					const channel = await store.createChannel( {
						name: $filter.value.trim(),
						description: '',
						parent: 0,
					} );

					await store.connect( this.#block(), channel.id, true );
					$filter.value = '';
					fill();
				} catch ( error ) {
					store.notify( error?.message ?? '' );
				} finally {
					$create.disabled = false;
				}
			},
			{ signal }
		);

		return [];
	}

	/**
	 * The block shown.
	 *
	 * @return {Block|undefined} The block.
	 */
	#block() {
		const { view, id, blocks } = store.get();

		return blocks[ `${ view }-${ id }` ];
	}
}
customElements.define( 'moodboard-connect', MoodboardConnectElement );
