import { __ } from 'moodboard-app/app';
import { store } from 'moodboard-app/store';
import { urlOf } from 'moodboard-app/router';
import { Brick } from 'moodboard-app/brick';
import { showBusy } from 'moodboard-app/behaviors';

/** @import { Channel } from 'moodboard-app/api' */

/**
 * The form of a channel, in its dialog: a new one, under the channel its button says, or the channel shown, which it
 * changes, moves or deletes. Opened, the dialog fills it: the button that opens it says which, `data-parent` "current"
 * for a channel under the one shown.
 */
class MoodboardChannelFormElement extends Brick {
	connect( signal ) {
		const $dialog = this.closest( 'dialog' );
		/** @type {HTMLFormElement} */
		const $form = this.querySelector( 'form' );
		/** @param {string} name A field. */
		const field = ( name ) =>
			/** @type {HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement} */ (
				$form.elements.namedItem( name )
			);
		const $parent = /** @type {HTMLSelectElement} */ ( field( 'parent' ) );
		const isNew = 'new' === this.getAttribute( 'mode' );

		$dialog.addEventListener(
			'command',
			( /** @type {CommandEvent} */ event ) => {
				if ( 'show-modal' !== event.command ) {
					return;
				}

				const { view, id, channels } = store.get();
				const shown = channels.items.find(
					( channel ) => 'channel' === view && channel.id === id
				);
				const source = /** @type {HTMLElement} */ ( event.source );
				const parent = isNew
					? ( 'current' === source?.dataset.parent && shown?.id ) || 0
					: shown?.parent ?? 0;

				$form.reset();
				this.#fillParents( $parent, isNew ? null : shown, parent );

				if ( ! isNew && shown ) {
					field( 'name' ).value = shown.name;
					field( 'description' ).value = shown.description;
				}
			},
			{ signal }
		);

		$form.addEventListener(
			'submit',
			async ( event ) => {
				event.preventDefault();

				const fields = {
					name: field( 'name' ).value.trim(),
					description: field( 'description' ).value,
					parent: Number( $parent.value ),
				};

				showBusy( $form, true );

				try {
					if ( isNew ) {
						const channel = await store.createChannel( fields );

						$dialog.close();
						navigation.navigate(
							urlOf( { view: 'channel', id: channel.id } )
						);
					} else {
						await store.updateChannel( store.get().id, fields );
						$dialog.close();
					}
				} catch ( error ) {
					store.notify(
						error?.message ??
							__( 'The channel could not be saved.', 'moodboard' )
					);
				} finally {
					showBusy( $form, false );
				}
			},
			{ signal }
		);

		this.querySelector( '[data-action="delete"]' )?.addEventListener(
			'click',
			() => this.#delete( $dialog ),
			{ signal }
		);

		return [];
	}

	/**
	 * Lists the channels a channel may go under: every one but itself and those under it.
	 *
	 * @param {HTMLSelectElement} $parent The field of the parent.
	 * @param {Channel|null}      channel The channel changed, none for a new one.
	 * @param {number}            value   The parent chosen.
	 */
	#fillParents( $parent, channel, value ) {
		const { items } = store.get().channels;
		const excluded = new Set( channel ? [ channel.id ] : [] );

		// Those under the channel, level after level.
		for ( let size = 0; size !== excluded.size;  ) {
			size = excluded.size;
			items
				.filter( ( item ) => excluded.has( item.parent ) )
				.forEach( ( item ) => excluded.add( item.id ) );
		}

		$parent.replaceChildren(
			$parent.options[ 0 ],
			...this.#tree( items, 0, 0 )
				.filter( ( [ item ] ) => ! excluded.has( item.id ) )
				.map( ( [ item, depth ] ) => {
					const $option = new Option(
						`${ '— '.repeat( depth ) }${ item.name }`,
						item.id.toString()
					);

					return $option;
				} )
		);
		$parent.value = value.toString();
	}

	/**
	 * The channels under `parent`, each followed by its own, with its depth.
	 *
	 * @param {Channel[]} items  Every channel.
	 * @param {number}    parent The channel they are under, 0 for none.
	 * @param {number}    depth  Their depth.
	 * @return {Array<[Channel, number]>} The channels and their depth.
	 */
	#tree( items, parent, depth ) {
		return items
			.filter( ( item ) => item.parent === parent )
			.toSorted( ( a, b ) => a.name.localeCompare( b.name ) )
			.flatMap( ( item ) => [
				[ item, depth ],
				...this.#tree( items, item.id, depth + 1 ),
			] );
	}

	/**
	 * Deletes the channel shown, once asked, then shows its parent.
	 *
	 * @param {HTMLDialogElement} $dialog The dialog.
	 */
	async #delete( $dialog ) {
		const { id, channels } = store.get();
		const channel = channels.items.find( ( item ) => item.id === id );

		if (
			! channel ||
			// eslint-disable-next-line no-alert -- A confirmation the browser gives, accessible as it is.
			! confirm(
				channel.parent
					? __(
							'Delete this channel? Its sub-channels and the blocks in no other channel go to its parent.',
							'moodboard'
					  )
					: __(
							'Delete this channel? Its sub-channels go to the index; the blocks in no other channel stay in the media library only.',
							'moodboard'
					  )
			)
		) {
			return;
		}

		try {
			await store.deleteChannel( id );
			$dialog.close();
			store.notify( __( 'Channel deleted.', 'moodboard' ) );
			navigation.navigate(
				channel.parent
					? urlOf( { view: 'channel', id: channel.parent } )
					: urlOf( {} ),
				{ history: 'replace' }
			);
		} catch ( error ) {
			store.notify( error?.message ?? '' );
		}
	}
}
customElements.define( 'moodboard-channel-form', MoodboardChannelFormElement );
