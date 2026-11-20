import { __, sprintf } from 'moodboard-app/app';
import { listKey, store } from 'moodboard-app/store';
import { Brick } from 'moodboard-app/brick';
import { fill, fillImage } from 'moodboard-app/dom';
import { formatKind, nameOf } from 'moodboard-app/render';
import { urlOf } from 'moodboard-app/router';

/** @import { Block } from 'moodboard-app/api' */

// How long a block shows while they go by on their own.
const PLAY_MS = 5000;
// How far a finger goes across a block for a swipe, rather than a tap.
const SWIPE_PX = 60;
// The views of a block, its page.
const BLOCK_VIEWS = [ 'media', 'text', 'link' ];

/**
 * The blocks of what shows, one at a time, over the whole screen: the blocks of the grid shown from its first, or those
 * of the channel a block shown was opened from, from it. ← and → go from one to the next, as a swipe does, the space
 * plays them on their own, Escape ends it, out of the full screen and its dialog together. Ended on another block, the
 * page of a block gives way to the page of that one, a grid shows its card.
 */
class MoodboardPresentElement extends Brick {
	/** @type {Block[]} */
	#blocks = [];
	#index = 0;
	/** @type {number} */
	#timer = 0;

	connect( signal ) {
		const $dialog = this.closest( 'dialog' );
		/** @type {HTMLButtonElement} */
		const $play = this.querySelector( '[data-action="play"]' );
		/** @type {HTMLElement} */
		const $stage = this.querySelector( '[data-part="stage"]' );
		/** @type {PointerEvent|null} */
		let start = null;

		$dialog.addEventListener(
			'command',
			( /** @type {CommandEvent} */ event ) => {
				if ( 'show-modal' !== event.command ) {
					return;
				}

				this.#open();

				if ( ! this.#blocks.length ) {
					event.preventDefault();
					store.notify( __( 'No block to present.', 'moodboard' ) );
					return;
				}

				// Over the whole screen where the browser can, as a phone without it shows the dialog over the page.
				$dialog.requestFullscreen?.().catch( () => {} );
			},
			{ signal }
		);

		// While the dialog still covers it, so that the page changes in place, without a view transition.
		$dialog.addEventListener(
			'beforetoggle',
			( /** @type {ToggleEvent} */ event ) => {
				const state = store.get();
				const block = this.#blocks[ this.#index ];

				if (
					'closed' !== event.newState ||
					! block ||
					! BLOCK_VIEWS.includes( state.view ) ||
					block.key === `${ state.view }-${ state.id }`
				) {
					return;
				}

				const url = urlOf( {
					view: block.kind,
					id: block.id,
					from: state.from,
				} );

				navigation.navigate( url, { history: 'replace' } );
			},
			{ signal }
		);

		$dialog.addEventListener(
			'close',
			() => {
				this.#play( $play, false );

				const left = document.fullscreenElement
					? document.exitFullscreen()
					: Promise.resolve();

				// Once the page has its size back.
				left.catch( () => {} ).then( () => this.#reveal() );
			},
			{ signal }
		);

		// Escape leaves the full screen first: the dialog closes with it.
		document.addEventListener(
			'fullscreenchange',
			() => {
				if ( ! document.fullscreenElement && $dialog.open ) {
					$dialog.close();
				}
			},
			{ signal }
		);

		this.addEventListener(
			'click',
			( event ) => {
				/** @type {HTMLElement|null} */
				const $action = /** @type {HTMLElement} */ (
					event.target
				).closest( '[data-action]' );
				const action = $action?.dataset.action;

				if ( 'previous' === action || 'next' === action ) {
					this.#go( 'next' === action ? 1 : -1 );
				}

				if ( 'play' === action ) {
					this.#play( $play, ! this.#timer );
				}
			},
			{ signal }
		);

		// On the document, as the focus falls to the body when the block it was on, such as a video, gives way to the next.
		document.addEventListener(
			'keydown',
			( event ) => {
				if ( ! $dialog.open ) {
					return;
				}

				const step = { ArrowLeft: -1, ArrowRight: 1 }[ event.key ];

				if ( step ) {
					event.preventDefault();
					this.#go( step );
				}

				if (
					' ' === event.key &&
					! (
						/** @type {HTMLElement} */ ( event.target ).closest(
							'button, video'
						)
					)
				) {
					event.preventDefault();
					this.#play( $play, ! this.#timer );
				}
			},
			{ signal }
		);

		$stage.addEventListener(
			'pointerdown',
			( event ) => {
				start = 'mouse' === event.pointerType ? null : event;
			},
			{ signal }
		);

		$stage.addEventListener(
			'pointerup',
			( event ) => {
				const dx = start ? event.clientX - start.clientX : 0;
				const dy = start ? event.clientY - start.clientY : 0;

				start = null;

				if (
					Math.abs( dx ) > SWIPE_PX &&
					Math.abs( dx ) > 2 * Math.abs( dy )
				) {
					this.#go( dx < 0 ? 1 : -1 );
				}
			},
			{ signal }
		);

		return [];
	}

	/** Takes the blocks of what shows, from the first, or from the block shown. */
	#open() {
		const state = store.get();
		const isBlock = BLOCK_VIEWS.includes( state.view );
		const key = isBlock
			? listKey( { view: 'channel', id: state.from, query: '' } )
			: listKey( state );

		this.#blocks = ( state.lists[ key ]?.keys ?? [] )
			.map( ( item ) => state.blocks[ item ] )
			.filter( Boolean );
		this.#index = isBlock
			? Math.max(
					0,
					this.#blocks.findIndex(
						( block ) =>
							block.key === `${ state.view }-${ state.id }`
					)
			  )
			: 0;
		this.#show();
	}

	/**
	 * Goes from one block to another, from the last to the first and back.
	 *
	 * @param {number} step 1 for the next, -1 for the one before.
	 */
	#go( step ) {
		if ( ! this.#blocks.length ) {
			return;
		}

		this.#index =
			( this.#index + step + this.#blocks.length ) % this.#blocks.length;
		this.#show();
	}

	/** Brings the card of the block shown into the grid, when the blocks went past the first. */
	#reveal() {
		const block = this.#blocks[ this.#index ];

		if ( ! this.#index || BLOCK_VIEWS.includes( store.get().view ) ) {
			return;
		}

		document
			.querySelector(
				`moodboard-view:not([hidden]) li[data-id="${ block.key }"]`
			)
			?.scrollIntoView( { block: 'nearest' } );
	}

	/**
	 * Plays the blocks on their own, or no longer.
	 *
	 * @param {HTMLButtonElement} $play     The control that plays them.
	 * @param {boolean}           isPlaying Whether they play.
	 */
	#play( $play, isPlaying ) {
		clearInterval( this.#timer );
		this.#timer = isPlaying
			? setInterval( () => this.#go( 1 ), PLAY_MS )
			: 0;
		$play.setAttribute( 'aria-pressed', isPlaying.toString() );
	}

	/** Shows the block of its index: an image, a video, a text, or the name of a file or a page. */
	#show() {
		const block = this.#blocks[ this.#index ];
		/** @type {HTMLImageElement} */
		const $image = this.querySelector( '[data-field="image"]' );
		/** @type {HTMLVideoElement} */
		const $video = this.querySelector( '[data-field="video"]' );
		const isVideo = block?.mime.startsWith( 'video/' ) ?? false;
		const hasImage = !! block?.image;

		fillImage( $image, block?.image ?? null );
		$image.alt = block ? block.alt || nameOf( block ) : '';
		$video.hidden = ! isVideo;

		if ( isVideo && $video.src !== block.url ) {
			$video.src = block.url;
		} else if ( ! isVideo ) {
			$video.removeAttribute( 'src' );
		}

		fill( this, {
			text:
				( 'text' === block?.kind && block.text ) ||
				( ! hasImage && ! isVideo && block
					? block.label || formatKind( block.mime )
					: '' ),
			position: block
				? sprintf(
						/* translators: 1: position of the block, 2: number of blocks. */
						__( '%1$d of %2$d', 'moodboard' ),
						this.#index + 1,
						this.#blocks.length
				  )
				: '',
			name: block?.label ?? '',
		} );
	}
}
customElements.define( 'moodboard-present', MoodboardPresentElement );
