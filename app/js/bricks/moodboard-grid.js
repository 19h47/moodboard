import { __ } from 'moodboard-app/app';
import { listKey, store } from 'moodboard-app/store';
import { Brick } from 'moodboard-app/brick';
import { renderKeyed, showBusy } from 'moodboard-app/behaviors';
import { renderBlock, renderChannel } from 'moodboard-app/render';

/** @import { Block, Channel } from 'moodboard-app/api' */

/**
 * The grid of what shows: on the index, its channels without parent then every block of the curator, in a channel or
 * none, or the ones of its tab or of its search; on the page of a channel, its sub-channels then its blocks. A card stays
 * while its channel or its block does not change, its focus too. While the blocks are selected, a box over each card
 * selects it rather than opening it, and the cards of the channels wait.
 */
class MoodboardGridElement extends Brick {
	/**
	 * What each card shows, by its key, to draw again a card whose channel or block changed.
	 *
	 * @type {Map<string, Channel|Block>}
	 */
	#drawn = new Map();

	connect( signal ) {
		/** @type {HTMLElement} */
		const $items = this.querySelector( '[data-list="items"]' );
		/** @type {HTMLElement} */
		const $status = this.querySelector( '[data-field="status"]' );
		const isIndex = 'index' === this.getAttribute( 'list' );

		$items.addEventListener(
			'change',
			( event ) => {
				const $box = /** @type {HTMLInputElement} */ ( event.target );
				/** @type {HTMLElement} */
				const $item = $box.closest( '[data-id]' );

				store.setSelected( $item.dataset.id, $box.checked );
			},
			{ signal }
		);

		return [
			store.select(
				( state ) => state,
				( state ) => {
					const isShown = isIndex
						? 'index' === state.view
						: 'channel' === state.view;

					if ( ! isShown ) {
						return;
					}

					const list = state.lists[ listKey( state ) ];
					const channels = this.#channels( state );
					const blocks = this.#blocks( state, list?.keys ?? [] );
					/** @type {Map<string, Channel|Block>} */
					const items = new Map();

					channels.forEach( ( channel ) =>
						items.set( `channel-${ channel.id }`, channel )
					);
					blocks.forEach( ( block ) =>
						items.set( block.key, block )
					);

					const from = isIndex ? 0 : state.id;

					// A card whose channel or block changed is drawn again.
					[ ...$items.children ].forEach(
						( /** @type {HTMLElement} */ $item ) => {
							const { id } = $item.dataset;

							if (
								items.has( id ) &&
								this.#drawn.get( id ) !== items.get( id )
							) {
								$item.remove();
							}
						}
					);

					renderKeyed( $items, [ ...items.keys() ], ( key ) => {
						const item = items.get( key );

						this.#drawn.set( key, item );

						return key.startsWith( 'channel-' )
							? renderChannel( /** @type {Channel} */ ( item ) )
							: renderBlock(
									/** @type {Block} */ ( item ),
									from
							  );
					} );

					this.#select( $items, state );

					const error = state.channels.error || list?.error;
					const isLoading = ! list?.loaded && ! error;

					showBusy( $items, isLoading );
					$status.textContent =
						error ||
						( isLoading ? __( 'Loading…', 'moodboard' ) : '' ) ||
						( ! items.size ? this.#empty( state ) : '' );
					$status.hidden = ! $status.textContent;
				}
			),
		];
	}

	/**
	 * Shows the boxes of the cards while the blocks are selected, ticked for those selected; the links of the cards
	 * wait meanwhile, out of reach, as the cards of the channels, faded.
	 *
	 * @param {HTMLElement}                         $items The list of the cards.
	 * @param {import('moodboard-app/store').State} state  The state.
	 */
	#select( $items, { selecting, selection } ) {
		$items.toggleAttribute( 'data-selecting', selecting );
		[ ...$items.children ].forEach(
			( /** @type {HTMLElement} */ $item ) => {
				/** @type {HTMLElement|null} */
				const $select = $item.querySelector( '[data-part="select"]' );
				/** @type {HTMLElement} */
				const $link = $item.querySelector( '[data-part="link"]' );

				$link.inert = selecting;

				if ( $select ) {
					$select.hidden = ! selecting;
					$select.querySelector( 'input' ).checked =
						selection.includes( $item.dataset.id );
				}
			}
		);
	}

	/**
	 * The channels the grid shows: on the index, those without parent, or every one in its tab, or those whose name has
	 * the search; on a channel, its sub-channels.
	 *
	 * @param {import('moodboard-app/store').State} state The state.
	 * @return {Channel[]} The channels, by name.
	 */
	#channels( { view, id, tab, query, channels } ) {
		const search = query.trim().toLocaleLowerCase();
		const shown = channels.items.filter( ( channel ) => {
			if ( 'channel' === view ) {
				return channel.parent === id;
			}

			if ( search ) {
				return channel.name.toLocaleLowerCase().includes( search );
			}

			return 'channels' === tab || ( 'all' === tab && ! channel.parent );
		} );

		return 'index' === view && 'blocks' === tab
			? []
			: shown.toSorted( ( a, b ) => a.name.localeCompare( b.name ) );
	}

	/**
	 * The blocks the grid shows, those of its list loaded, but in the tab of the channels.
	 *
	 * @param {import('moodboard-app/store').State} state The state.
	 * @param {string[]}                            keys  The keys of the list.
	 * @return {Block[]} The blocks.
	 */
	#blocks( { view, tab, blocks }, keys ) {
		if ( 'index' === view && 'channels' === tab ) {
			return [];
		}

		return keys.map( ( key ) => blocks[ key ] ).filter( Boolean );
	}

	/**
	 * What the grid says without a card.
	 *
	 * @param {import('moodboard-app/store').State} state The state.
	 * @return {string} What it says.
	 */
	#empty( { view, query } ) {
		if ( query.trim() ) {
			return __( 'Nothing found.', 'moodboard' );
		}

		return 'channel' === view
			? __(
					'Nothing yet: drop images here, or add some with +.',
					'moodboard'
			  )
			: __(
					'Nothing yet: drop images here, or add a channel with +.',
					'moodboard'
			  );
	}
}
customElements.define( 'moodboard-grid', MoodboardGridElement );
