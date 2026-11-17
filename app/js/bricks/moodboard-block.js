import { __, sprintf } from 'moodboard-app/app';
import { listKey, store } from 'moodboard-app/store';
import { back, urlOf } from 'moodboard-app/router';
import { Brick } from 'moodboard-app/brick';
import { clone, fill, fillImage } from 'moodboard-app/dom';
import { formatDate, formatKind, hostOf, nameOf } from 'moodboard-app/render';

/** @import { Block } from 'moodboard-app/api' */

// How far a finger goes across the media for a swipe, rather than a tap.
const SWIPE_PX = 60;

/**
 * The page of a block: a media, its image, its video or a link to its file; a text; or a link, its player, else the image
 * of its page, else a link to it. Beside it, as Are.na has it: its title, its description, its date, its dimensions, who
 * made it and its source, what changes it, and the channels it is in and its notes, a tab each. ← and → open its
 * neighbours in the channel it was opened from, Escape goes back to it.
 */
class MoodboardBlockElement extends Brick {
	/** @type {Block|null} */
	#block = null;

	connect( signal ) {
		return [
			store.select(
				( state ) =>
					[ 'media', 'text', 'link' ].includes( state.view )
						? state.blocks[ `${ state.view }-${ state.id }` ] ??
						  null
						: null,
				( block ) => {
					this.#block = block;
					this.#fill( block );
				}
			),
			store.select(
				( state ) => state.channels.items,
				() => this.#fill( this.#block )
			),
			store.select(
				( state ) => state.lists,
				() => this.#fillNeighbours()
			),
			store.select(
				( state ) =>
					this.#block
						? state.notes[ this.#block.key ]?.items.length ?? 0
						: 0,
				( count ) =>
					fill( this, {
						'notes-count': count ? count.toString() : '',
					} )
			),
			this.#listen( signal ),
		];
	}

	/**
	 * Listens to the actions of the page and to the keys that move between blocks.
	 *
	 * @param {AbortSignal} signal Stops listening.
	 * @return {() => void} Nothing to unsubscribe.
	 */
	#listen( signal ) {
		this.#swipe( signal );
		this.addEventListener(
			'click',
			( event ) => {
				/** @type {HTMLElement|null} */
				const $action = /** @type {HTMLElement} */ (
					event.target
				).closest( '[data-action]' );

				// An action of the menu closes it.
				/** @type {HTMLElement|null} */ (
					$action?.closest( '[popover]' )
				)?.hidePopover();

				if ( 'disconnect' === $action?.dataset.action ) {
					this.#disconnect();
				}

				if ( 'delete' === $action?.dataset.action ) {
					this.#delete();
				}
			},
			{ signal }
		);

		document.addEventListener(
			'keydown',
			( event ) => {
				const $target = /** @type {HTMLElement} */ ( event.target );

				// A key a tab or a menu took is theirs, as Escape for an open menu.
				if (
					event.defaultPrevented ||
					this.querySelector( ':popover-open' ) ||
					this.closest( '[hidden]' ) ||
					event.altKey ||
					event.ctrlKey ||
					event.metaKey ||
					document.querySelector( 'dialog:modal' ) ||
					$target.closest(
						'input, textarea, select, [contenteditable]'
					)
				) {
					return;
				}

				/** @type {HTMLAnchorElement|null} */
				const $link = {
					ArrowLeft: this.querySelector( '[data-part="previous"]' ),
					ArrowRight: this.querySelector( '[data-part="next"]' ),
					Escape: this.querySelector( '[data-part="channel"]' ),
				}[ event.key ];

				if ( $link && ! $link.hidden ) {
					event.preventDefault();
					navigation.navigate( $link.href );
				}
			},
			{ signal }
		);

		return () => {};
	}

	/**
	 * On a screen of touch, a swipe across the media opens the block after it, to the left, or before it, to the right;
	 * a swipe up or down scrolls the page, as the media leaves it to the browser.
	 *
	 * @param {AbortSignal} signal Stops listening.
	 */
	#swipe( signal ) {
		/** @type {HTMLElement} */
		const $media = this.querySelector( '[data-part="media"]' );
		/** @type {PointerEvent|null} */
		let start = null;

		$media.addEventListener(
			'pointerdown',
			( event ) => {
				start = 'mouse' === event.pointerType ? null : event;
			},
			{ signal }
		);

		$media.addEventListener(
			'pointerup',
			( event ) => {
				const dx = start ? event.clientX - start.clientX : 0;
				const dy = start ? event.clientY - start.clientY : 0;
				/** @type {HTMLAnchorElement|null} */
				const $link = this.querySelector(
					`[data-part="${ dx < 0 ? 'next' : 'previous' }"]`
				);

				start = null;

				if (
					Math.abs( dx ) > SWIPE_PX &&
					Math.abs( dx ) > 2 * Math.abs( dy ) &&
					! $link?.hidden
				) {
					navigation.navigate( $link.href );
				}
			},
			{ signal }
		);
	}

	/**
	 * Fills the page with a block, or empties it until it has loaded.
	 *
	 * @param {Block|null} block The block.
	 */
	#fill( block ) {
		const { from, channels } = store.get();
		const fromChannel = channels.items.find(
			( channel ) => channel.id === from
		);
		/** @type {HTMLImageElement} */
		const $image = this.querySelector( '[data-field="image"]' );
		/** @type {HTMLVideoElement} */
		const $video = this.querySelector( '[data-field="video"]' );
		/** @type {HTMLAnchorElement} */
		const $file = this.querySelector( '[data-field="file"]' );
		/** @type {HTMLElement} */
		const $embed = this.querySelector( '[data-field="embed"]' );
		/** @type {HTMLAnchorElement} */
		const $open = this.querySelector( '[data-field="open"]' );
		const embed = 'link' === block?.kind ? block.embed ?? '' : '';
		/** @type {HTMLAnchorElement} */
		const $source = this.querySelector( '[data-field="source"]' );
		/** @type {HTMLAnchorElement} */
		const $channel = this.querySelector( '[data-part="channel"]' );
		/** @type {HTMLElement} */
		const $channels = this.querySelector( '[data-list="channels"]' );
		const inChannels = channels.items.filter( ( channel ) =>
			block?.channels.includes( channel.id )
		);
		const backLabel = fromChannel
			? sprintf(
					/* translators: %s: name of a channel. */
					__( 'Back to %s', 'moodboard' ),
					fromChannel.name
			  )
			: __( 'Back to the index', 'moodboard' );
		// The dimensions of an image of the library, not those of the image of a page.
		const image = 'media' === block?.kind ? block.image : null;
		/** @type {HTMLButtonElement} */
		const $disconnect = this.querySelector( '[data-action="disconnect"]' );
		const isVideo = block?.mime.startsWith( 'video/' ) ?? false;

		// Its title written, else what names it, for assistive technologies only: an image named after its file shows none.
		fill( this, {
			title: block ? nameOf( block ) : '',
			description: block?.description ?? '',
			text: block?.text ?? '',
			source: block?.source ? hostOf( block.source ) : '',
			by: block?.by ?? '',
			date: block ? formatDate( block.date ) : '',
			dimensions: image
				? sprintf(
						/* translators: 1: width of an image, 2: its height, in pixels. */
						__( '%1$d × %2$d', 'moodboard' ),
						image.width,
						image.height
				  )
				: '',
			'channels-count': inChannels.length
				? inChannels.length.toString()
				: '',
		} );

		this.querySelector( '[data-field="title"]' ).toggleAttribute(
			'data-untitled',
			! block?.label
		);
		// A link plays its URL where core embeds it, else shows the image of its page.
		fillImage( $image, embed ? null : block?.image ?? null );
		$image.alt = block?.alt ?? '';

		if ( $embed.dataset.embed !== embed ) {
			// The player of a provider of core, its HTML filtered by core as it embeds it in a post.
			$embed.innerHTML = embed;
			$embed.dataset.embed = embed;
		}

		$embed.hidden = ! embed;
		// A link without a player or an image shows a link to its page; else its source links to it, beside.
		$open.hidden = 'link' !== block?.kind || !! embed || !! block.image;
		$open.href = 'link' === block?.kind ? block.url : '';

		$video.hidden = ! isVideo;

		if ( isVideo && $video.src !== block.url ) {
			$video.src = block.url;
		}

		$file.hidden =
			! block || 'media' !== block.kind || !! block.image || isVideo;
		$file.href = block?.url ?? '';
		fill( $file, { kind: block ? formatKind( block.mime ) : '' } );

		$source.href = block?.source ?? '';
		$source.title = block?.source ?? '';
		/** @type {HTMLElement} */ (
			this.querySelector( '[data-row="source"]' )
		).hidden = ! block?.source;
		/** @type {HTMLElement} */ (
			this.querySelector( '[data-row="dimensions"]' )
		).hidden = ! image;
		/** @type {HTMLElement} */ (
			this.querySelector( '[data-row="by"]' )
		).hidden = ! block?.by;

		$channel.href = from
			? urlOf( { view: 'channel', id: from } )
			: urlOf( {} );
		$channel.ariaLabel = backLabel;
		$channel.title = backLabel;
		$disconnect.hidden =
			! fromChannel || ! block?.channels.includes( from );
		$disconnect.textContent = fromChannel
			? sprintf(
					/* translators: %s: name of a channel. */
					__( 'Remove from %s', 'moodboard' ),
					fromChannel.name
			  )
			: '';

		$channels.replaceChildren(
			...inChannels.map( ( channel ) => {
				const $item = clone( 'moodboard-block-channel' );
				/** @type {HTMLAnchorElement} */
				const $link = $item.querySelector( 'a' );

				$link.href = urlOf( { view: 'channel', id: channel.id } );
				fill( $link, {
					name: channel.name,
					count: channel.count.toString(),
				} );

				return $item;
			} )
		);
		/** @type {HTMLElement} */ (
			this.querySelector( '[data-field="no-channel"]' )
		).hidden = !! inChannels.length;
		this.#fillNeighbours();
	}

	/** Links the blocks before and after the one shown, in the channel it was opened from, or in the index. */
	#fillNeighbours() {
		const state = store.get();
		const keys =
			state.lists[
				listKey( { view: 'channel', id: state.from, query: '' } )
			]?.keys ?? [];
		const index = this.#block ? keys.indexOf( this.#block.key ) : -1;

		[
			[ 'previous', keys[ index - 1 ] ],
			[ 'next', keys[ index + 1 ] ],
		].forEach( ( [ part, key ] ) => {
			/** @type {HTMLAnchorElement} */
			const $link = this.querySelector( `[data-part="${ part }"]` );
			const block = -1 !== index && key ? state.blocks[ key ] : null;

			$link.hidden = ! block;

			if ( block ) {
				$link.href = urlOf( {
					view: block.kind,
					id: block.id,
					from: state.from,
				} );
			}
		} );
	}

	/** Takes the block out of the channel it was opened from, which it leaves for. */
	async #disconnect() {
		const { from } = store.get();

		try {
			await store.connect( this.#block, from, false );
			navigation.navigate( urlOf( { view: 'channel', id: from } ) );
		} catch ( error ) {
			store.notify( error?.message ?? '' );
		}
	}

	/**
	 * Deletes the block, once asked, from where it was opened from: its page left first, so that the view loads no
	 * longer a block that is gone.
	 */
	async #delete() {
		const block = this.#block;

		if (
			! block ||
			// eslint-disable-next-line no-alert -- A confirmation the browser gives, accessible as it is.
			! confirm(
				{
					media: __( 'Delete this media and its file?', 'moodboard' ),
					text: __( 'Delete this text?', 'moodboard' ),
					link: __( 'Delete this link?', 'moodboard' ),
				}[ block.kind ]
			)
		) {
			return;
		}

		const { from } = store.get();

		await back(
			from ? urlOf( { view: 'channel', id: from } ) : urlOf( {} )
		);

		try {
			await store.deleteBlock( block );
			store.notify( __( 'Block deleted.', 'moodboard' ) );
		} catch ( error ) {
			store.notify( error?.message ?? '' );
		}
	}
}
customElements.define( 'moodboard-block', MoodboardBlockElement );
