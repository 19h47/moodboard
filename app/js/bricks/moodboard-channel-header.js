import { __, appUrl } from 'moodboard-app/app';
import { store } from 'moodboard-app/store';
import { urlOf } from 'moodboard-app/router';
import { Brick } from 'moodboard-app/brick';
import { clone, fill } from 'moodboard-app/dom';
import { formatCount } from 'moodboard-app/render';

/** @import { Channel } from 'moodboard-app/api' */

/**
 * The header of a channel: the channels it is under, from the index, its name, its description and its number of blocks.
 */
class MoodboardChannelHeaderElement extends Brick {
	connect() {
		/** @type {HTMLElement} */
		const $path = this.querySelector( '[data-list="path"]' );

		return [
			store.select(
				( state ) =>
					'channel' === state.view
						? state.channels.items.find(
								( channel ) => channel.id === state.id
						  )
						: null,
				( channel ) => {
					fill( this, {
						name: channel?.name ?? '',
						description: channel?.description ?? '',
						count: channel ? formatCount( channel.count ) : '',
					} );
					$path.replaceChildren(
						...( channel ? this.#path( channel ) : [] )
					);
				}
			),
		];
	}

	/**
	 * The items of the path of a channel: the index, then the channels it is under, the widest first.
	 *
	 * @param {Channel} channel The channel.
	 * @return {HTMLElement[]} The items.
	 */
	#path( channel ) {
		const { items } = store.get().channels;
		const ancestors = [];

		for (
			let parent = items.find( ( item ) => item.id === channel.parent );
			parent && ! ancestors.includes( parent );
			parent = items.find( ( item ) => item.id === parent.parent )
		) {
			ancestors.unshift( parent );
		}

		return [
			{ name: __( 'Index', 'moodboard' ), url: appUrl },
			...ancestors.map( ( ancestor ) => ( {
				name: ancestor.name,
				url: urlOf( { view: 'channel', id: ancestor.id } ),
			} ) ),
		].map( ( { name, url } ) => {
			const $item = clone( 'moodboard-path-item' );
			/** @type {HTMLAnchorElement} */
			const $link = $item.querySelector( 'a' );

			$link.href = url;
			$link.textContent = name;

			return $item;
		} );
	}
}
customElements.define(
	'moodboard-channel-header',
	MoodboardChannelHeaderElement
);
