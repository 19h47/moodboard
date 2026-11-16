import { __, sprintf } from 'moodboard-app/app';
import { store } from 'moodboard-app/store';
import { Brick } from 'moodboard-app/brick';
import { clone, fill } from 'moodboard-app/dom';

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

		$dialog.addEventListener(
			'command',
			( /** @type {CommandEvent} */ event ) => {
				if ( 'show-modal' === event.command ) {
					$filter.value = '';
					this.#fill( $list, $create, '' );
				}
			},
			{ signal }
		);

		$filter.addEventListener(
			'input',
			() => this.#fill( $list, $create, $filter.value ),
			{ signal }
		);

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
					this.#fill( $list, $create, '' );
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
	 * @return {Block} The block.
	 */
	#block() {
		const { view, id, blocks } = store.get();

		return blocks[ `${ view }-${ id }` ];
	}

	/**
	 * Lists the channels whose name has the filter, ticked for those of the block, and offers a new channel of the name
	 * typed when none has it.
	 *
	 * @param {HTMLElement}       $list   The list.
	 * @param {HTMLButtonElement} $create The button that adds a channel.
	 * @param {string}            filter  The filter.
	 */
	#fill( $list, $create, filter ) {
		const name = filter.trim();
		const search = name.toLocaleLowerCase();
		const block = this.#block();
		const channels = store
			.get()
			.channels.items.filter( ( channel ) =>
				channel.name.toLocaleLowerCase().includes( search )
			)
			.toSorted( ( a, b ) => a.name.localeCompare( b.name ) );

		$list.replaceChildren(
			...channels.map( ( channel ) => {
				const $item = clone( 'moodboard-connect-option' );
				/** @type {HTMLInputElement} */
				const $box = $item.querySelector( 'input' );

				$box.value = channel.id.toString();
				$box.checked = block?.channels.includes( channel.id ) ?? false;
				fill( $item, { name: channel.name } );

				return $item;
			} )
		);

		$create.hidden =
			! name ||
			channels.some(
				( channel ) => channel.name.toLocaleLowerCase() === search
			);
		$create.textContent = sprintf(
			/* translators: %s: name of a channel. */
			__( 'Add the channel “%s”', 'moodboard' ),
			name
		);
	}
}
customElements.define( 'moodboard-connect', MoodboardConnectElement );
