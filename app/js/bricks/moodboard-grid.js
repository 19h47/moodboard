import { __, sprintf } from 'moodboard-app/app';
import { listKey, store } from 'moodboard-app/store';
import { Brick } from 'moodboard-app/brick';
import { renderKeyed, showBusy } from 'moodboard-app/behaviors';
import { nameOf, renderBlock, renderChannel } from 'moodboard-app/render';

/** @import { Block, Channel } from 'moodboard-app/api' */

/**
 * The grid of what shows: on the index, its channels without parent then every block of the curator, in a channel or
 * none, or the ones of its tab or of its search; on the page of a channel, its sub-channels then its blocks. A card stays
 * while its channel or its block does not change, its focus too. While the blocks are selected, a box over each card
 * selects it rather than opening it, and the cards of the channels wait.
 *
 * While the blocks of a channel are put in order, its cards wait as well: a card is dragged to its place, or its handle
 * picks it up, with Space or Enter, the arrow keys move it, a row up or down, Home and End first or last, Space or
 * Enter put it down and Escape puts it back. The order is kept once the card is down; what happens is said to assistive
 * technologies as it does.
 */
class MoodboardGridElement extends Brick {
	/**
	 * What each card shows, by its key, to draw again a card whose channel or block changed.
	 *
	 * @type {Map<string, Channel|Block>}
	 */
	#drawn = new Map();

	/**
	 * The block picked up by its handle, its channel and the place it had, until it is put down.
	 *
	 * @type {{key: string, channelId: number, from: number}|null}
	 */
	#grabbed = null;

	/**
	 * The block dragged, its channel and the place it had, until it is dropped.
	 *
	 * @type {{key: string, channelId: number, from: number}|null}
	 */
	#dragged = null;

	/** @type {HTMLElement} */
	#items;

	/**
	 * What is said to assistive technologies as a block is moved: none on the index, which has no order.
	 *
	 * @type {HTMLElement|null}
	 */
	#moved;

	connect( signal ) {
		/** @type {HTMLElement} */
		const $items = this.querySelector( '[data-list="items"]' );
		/** @type {HTMLElement} */
		const $status = this.querySelector( '[data-field="status"]' );
		const isIndex = 'index' === this.getAttribute( 'list' );

		this.#items = $items;
		this.#moved = this.querySelector( '[data-field="moved"]' );
		this.#listenToMoves( signal );

		// The block ticked last, from which Shift ticks the blocks up to another; and whether Shift was down as a box was
		// clicked, or its label, which clicks its box again, without Shift where the browser leaves it out.
		let anchor = '';
		let isRange = false;

		$items.addEventListener(
			'click',
			( event ) => {
				if (
					/** @type {HTMLElement} */ ( event.target ).closest(
						'[data-part="select"]'
					)
				) {
					isRange ||= event.shiftKey;
				}
			},
			{ signal }
		);

		$items.addEventListener(
			'change',
			( event ) => {
				const $box = /** @type {HTMLInputElement} */ ( event.target );
				/** @type {HTMLElement} */
				const $item = $box.closest( '[data-id]' );
				const key = $item.dataset.id;
				const keys =
					isRange && anchor ? this.#range( anchor, key ) : [];

				store.setSelected( keys.length ? keys : [ key ], $box.checked );
				anchor = key;
				isRange = false;
			},
			{ signal }
		);

		return [
			store.watch(
				[
					'view',
					'id',
					'tab',
					'query',
					'channels',
					'lists',
					'blocks',
					'selecting',
					'selection',
					'arranging',
					'uploads',
				],
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

					// A card no longer drawn is forgotten.
					[ ...this.#drawn.keys() ]
						.filter( ( key ) => ! items.has( key ) )
						.forEach( ( key ) => this.#drawn.delete( key ) );

					if ( ! state.arranging && this.#grabbed ) {
						this.#drop();
					}

					this.#select( $items, state );
					this.#arrange( state );

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
	 * wait meanwhile, out of reach, as the cards of the channels, faded, and while the blocks are put in order.
	 *
	 * @param {HTMLElement}                         $items The list of the cards.
	 * @param {import('moodboard-app/store').State} state  The state.
	 */
	#select( $items, { selecting, selection, arranging } ) {
		$items.toggleAttribute( 'data-selecting', selecting );
		[ ...$items.children ].forEach(
			( /** @type {HTMLElement} */ $item ) => {
				/** @type {HTMLElement|null} */
				const $select = $item.querySelector( '[data-part="select"]' );
				/** @type {HTMLElement} */
				const $link = $item.querySelector( '[data-part="link"]' );

				$link.inert = selecting || arranging;

				if ( $select ) {
					$select.hidden = ! selecting;
					$select.querySelector( 'input' ).checked =
						selection.includes( $item.dataset.id );
				}
			}
		);
	}

	/**
	 * The keys of the blocks between two cards, both of them with them, in the order of the grid; none when one is no
	 * longer in it.
	 *
	 * @param {string} from The key of a block.
	 * @param {string} to   The key of another.
	 * @return {string[]} The keys.
	 */
	#range( from, to ) {
		const keys = [ ...this.#items.children ]
			.filter( ( $item ) =>
				$item.querySelector( '[data-part="select"]' )
			)
			.map(
				( $item ) => /** @type {HTMLElement} */ ( $item ).dataset.id
			);
		const start = keys.indexOf( from );
		const end = keys.indexOf( to );

		if ( -1 === start || -1 === end ) {
			return [];
		}

		return keys.slice( Math.min( start, end ), Math.max( start, end ) + 1 );
	}

	/**
	 * Shows the handles of the cards of the blocks while they are put in order, pressed for the one picked up, and lets
	 * the cards be dragged.
	 *
	 * @param {import('moodboard-app/store').State} state The state.
	 */
	#arrange( { arranging } ) {
		this.#items.toggleAttribute( 'data-arranging', arranging );
		[ ...this.#items.children ].forEach(
			( /** @type {HTMLElement} */ $item ) => {
				/** @type {HTMLElement|null} */
				const $move = $item.querySelector( '[data-part="move"]' );

				if ( ! $move ) {
					return;
				}

				const isGrabbed = this.#grabbed?.key === $item.dataset.id;

				$item.draggable = arranging;
				$move.hidden = ! arranging;
				$move.setAttribute( 'aria-pressed', isGrabbed.toString() );
			}
		);
	}

	/**
	 * Listens to the handles, the keys and the drags that move the blocks.
	 *
	 * @param {AbortSignal} signal Stops it.
	 */
	#listenToMoves( signal ) {
		const $items = this.#items;

		$items.addEventListener(
			'click',
			( event ) => {
				/** @type {HTMLElement|null} */
				const $move = /** @type {HTMLElement} */ (
					event.target
				).closest( '[data-part="move"]' );

				if ( ! $move ) {
					return;
				}

				/** @type {HTMLElement} */
				const $item = $move.closest( '[data-id]' );
				const isGrabbed = this.#grabbed?.key === $item.dataset.id;

				if ( this.#grabbed ) {
					this.#drop();
				}

				if ( ! isGrabbed ) {
					this.#grab( $item.dataset.id );
				}
			},
			{ signal }
		);

		$items.addEventListener(
			'keydown',
			( event ) => {
				if (
					! this.#grabbed ||
					! (
						/** @type {HTMLElement} */ ( event.target ).closest(
							'[data-part="move"]'
						)
					)
				) {
					return;
				}

				if ( 'Escape' === event.key ) {
					// The Escape of a block picked up puts it back only: the blocks are still put in order.
					event.preventDefault();
					this.#putBack();
					return;
				}

				const place = this.#placeTo( event.key );

				if ( undefined !== place ) {
					event.preventDefault();
					this.#move( place );
				}
			},
			{ signal }
		);

		// A card moved without moveBefore() loses its focus for a moment, which it gets back: a handle left for good puts its block down.
		$items.addEventListener(
			'focusout',
			() => {
				setTimeout( () => {
					if (
						this.#grabbed &&
						! this.#handleOf( this.#grabbed.key )?.matches(
							':focus'
						)
					) {
						this.#drop();
					}
				} );
			},
			{ signal }
		);

		$items.addEventListener(
			'dragstart',
			( event ) => {
				/** @type {HTMLElement|null} */
				const $item = /** @type {HTMLElement} */ (
					event.target
				).closest?.( '[data-id]' );

				if ( ! store.get().arranging || ! $item?.draggable ) {
					return;
				}

				const key = $item.dataset.id;

				this.#dragged = {
					key,
					channelId: store.get().id,
					from: this.#keysOf( store.get().id ).indexOf( key ),
				};
				event.dataTransfer.effectAllowed = 'move';
				// Some browsers drag nothing without data: the name of the block, should it be dropped out of the page.
				event.dataTransfer.setData(
					'text/plain',
					nameOf( store.get().blocks[ key ] )
				);
				$item.toggleAttribute( 'data-dragging', true );
			},
			{ signal }
		);

		// Over another card, the card dragged takes its place, before it or after it as it came from.
		$items.addEventListener(
			'dragover',
			( event ) => {
				if ( ! this.#dragged ) {
					return;
				}

				event.preventDefault();
				event.dataTransfer.dropEffect = 'move';

				/** @type {HTMLElement|null} */
				const $over = /** @type {HTMLElement} */ (
					event.target
				).closest?.( '[data-id]' );
				const { key, channelId } = this.#dragged;

				if ( $over?.draggable && $over.dataset.id !== key ) {
					store.moveBlock(
						channelId,
						key,
						this.#keysOf( channelId ).indexOf( $over.dataset.id )
					);
				}
			},
			{ signal }
		);

		$items.addEventListener(
			'drop',
			( event ) => {
				if ( this.#dragged ) {
					event.preventDefault();
				}
			},
			{ signal }
		);

		// Dropped, the order is kept; dropped out of the grid, or the drag cancelled, the card goes back.
		$items.addEventListener(
			'dragend',
			( event ) => {
				if ( ! this.#dragged ) {
					return;
				}

				const { key, channelId, from } = this.#dragged;

				this.#dragged = null;
				$items
					.querySelector( '[data-dragging]' )
					?.removeAttribute( 'data-dragging' );

				if ( 'none' === event.dataTransfer.dropEffect ) {
					store.moveBlock( channelId, key, from );
				} else if (
					this.#keysOf( channelId ).indexOf( key ) !== from
				) {
					store.saveOrder( channelId );
				}
			},
			{ signal }
		);
	}

	/**
	 * The keys of the blocks of a channel, in its order.
	 *
	 * @param {number} channelId The channel.
	 * @return {string[]} The keys.
	 */
	#keysOf( channelId ) {
		return store.get().lists[ `channel-${ channelId }` ]?.keys ?? [];
	}

	/**
	 * The handle of the card of a block.
	 *
	 * @param {string} key The key of the block.
	 * @return {HTMLElement|null} Its handle.
	 */
	#handleOf( key ) {
		return this.#items.querySelector(
			`[data-id="${ key }"] [data-part="move"]`
		);
	}

	/**
	 * Says something to assistive technologies.
	 *
	 * @param {string} message What to say.
	 */
	#say( message ) {
		if ( this.#moved ) {
			this.#moved.textContent = message;
		}
	}

	/**
	 * Where a block picked up is, as assistive technologies read it: its name, then its place among the blocks.
	 *
	 * @param {string} key The key of the block.
	 * @return {{name: string, place: number, count: number}} Its name, its place from 1, and how many blocks there are.
	 */
	#where( key ) {
		const keys = this.#keysOf( this.#grabbed?.channelId ?? 0 );

		return {
			name: nameOf( store.get().blocks[ key ] ),
			place: keys.indexOf( key ) + 1,
			count: keys.length,
		};
	}

	/**
	 * The place a key moves the block picked up to: a card before or after it, a row up or down, as many cards as the
	 * grid has columns, first or last; none for another key.
	 *
	 * @param {string} key The key pressed.
	 * @return {number|undefined} The place, from 0.
	 */
	#placeTo( key ) {
		const keys = this.#keysOf( this.#grabbed.channelId );
		const place = keys.indexOf( this.#grabbed.key );
		const columns = getComputedStyle(
			this.#items
		).gridTemplateColumns.split( ' ' ).length;
		const places = {
			ArrowLeft: place - 1,
			ArrowRight: place + 1,
			ArrowUp: place - columns,
			ArrowDown: place + columns,
			Home: 0,
			End: keys.length - 1,
		};

		return key in places
			? Math.max( 0, Math.min( places[ key ], keys.length - 1 ) )
			: undefined;
	}

	/**
	 * Picks up a block by its handle.
	 *
	 * @param {string} key The key of the block.
	 */
	#grab( key ) {
		const channelId = store.get().id;

		this.#grabbed = {
			key,
			channelId,
			from: this.#keysOf( channelId ).indexOf( key ),
		};
		this.#arrange( store.get() );

		const { name, place, count } = this.#where( key );

		this.#say(
			sprintf(
				/* translators: 1: name of a block, 2: its place, 3: number of blocks. */
				__( '%1$s picked up, %2$d of %3$d.', 'moodboard' ),
				name,
				place,
				count
			)
		);
	}

	/**
	 * Moves the block picked up to a place.
	 *
	 * @param {number} place The place, from 0.
	 */
	#move( place ) {
		const { key, channelId } = this.#grabbed;

		store.moveBlock( channelId, key, place );
		this.#say(
			sprintf(
				/* translators: 1: place of a block, 2: number of blocks. */
				__( '%1$d of %2$d.', 'moodboard' ),
				place + 1,
				this.#keysOf( channelId ).length
			)
		);
	}

	/** Puts the block picked up down where it is, and keeps the order if it moved. */
	#drop() {
		const { key, channelId, from } = this.#grabbed;
		const { name, place, count } = this.#where( key );

		this.#grabbed = null;
		this.#arrange( store.get() );
		this.#say(
			sprintf(
				/* translators: 1: name of a block, 2: its place, 3: number of blocks. */
				__( '%1$s put down, %2$d of %3$d.', 'moodboard' ),
				name,
				place,
				count
			)
		);

		if ( place - 1 !== from ) {
			store.saveOrder( channelId );
		}
	}

	/** Puts the block picked up back where it was. */
	#putBack() {
		const { key, channelId, from } = this.#grabbed;

		store.moveBlock( channelId, key, from );
		this.#grabbed = null;
		this.#arrange( store.get() );
		this.#say(
			sprintf(
				/* translators: %s: name of a block. */
				__( '%s put back.', 'moodboard' ),
				nameOf( store.get().blocks[ key ] )
			)
		);
	}

	/**
	 * The channels the grid shows: on the index, those without parent, or every one in its tab, or those whose name has
	 * the search; on a channel, its sub-channels, those whose name has the search.
	 *
	 * @param {import('moodboard-app/store').State} state The state.
	 * @return {Channel[]} The channels, by name.
	 */
	#channels( { view, id, tab, query, channels } ) {
		const search = query.trim().toLocaleLowerCase();
		const shown = channels.items.filter( ( channel ) => {
			const isFound =
				! search || channel.name.toLocaleLowerCase().includes( search );

			if ( 'channel' === view ) {
				return channel.parent === id && isFound;
			}

			if ( search ) {
				return isFound;
			}

			return 'channels' === tab || ( 'all' === tab && ! channel.parent );
		} );

		return 'index' === view && 'blocks' === tab
			? []
			: shown.toSorted( ( a, b ) => a.name.localeCompare( b.name ) );
	}

	/**
	 * The blocks the grid shows, the files being added first, then those of its list loaded, but in the tab of the channels.
	 *
	 * @param {import('moodboard-app/store').State} state The state.
	 * @param {string[]}                            keys  The keys of the list.
	 * @return {Block[]} The blocks.
	 */
	#blocks( { view, id, tab, query, blocks, uploads }, keys ) {
		if ( 'index' === view && 'channels' === tab ) {
			return [];
		}

		// The files being added, first: every one on the index, those going into it on a channel; none in a search, which
		// may not find them.
		const uploading = query
			? []
			: uploads.filter(
					( upload ) =>
						'index' === view || upload.channels.includes( id )
			  );

		return [
			...uploading,
			...keys.map( ( key ) => blocks[ key ] ).filter( Boolean ),
		];
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
