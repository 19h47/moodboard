import { __, sprintf } from 'moodboard-app/app';
import { store, targetOf } from 'moodboard-app/store';
import { Brick } from 'moodboard-app/brick';
import { fill } from 'moodboard-app/dom';

/**
 * Files dropped anywhere on the page, or pasted, such as a screenshot, are added where they go: into the channel shown,
 * the one a block shown was opened from, or the index; as the URL of a link or of an image dragged from another page,
 * or pasted out of a field. While they are dragged over the page, it says where they go. The form that adds blocks takes
 * what is dropped on it or pasted in it itself, a dialog open takes nothing, and nothing the page drags itself, such as
 * a card.
 */
/**
 * The URL a drag or a paste holds, the first of its list, or its text when it is one; empty for none.
 *
 * @param {DataTransfer|null} dataTransfer What is dragged or pasted.
 * @return {string} The URL.
 */
function urlOf( dataTransfer ) {
	const list = dataTransfer?.getData( 'text/uri-list' ) ?? '';
	const url =
		list
			.split( /\r?\n/ )
			.find( ( line ) => line && ! line.startsWith( '#' ) ) ??
		dataTransfer?.getData( 'text/plain' ).trim() ??
		'';

	return /^https?:\/\/\S+$/.test( url ) ? url : '';
}

class MoodboardDropElement extends Brick {
	connect( signal ) {
		// The elements the files are dragged over, entered and not left yet: the page is left once none is.
		let depth = 0;

		// A drag that starts in the page, such as a card, is the page's own.
		document.addEventListener(
			'dragstart',
			() => {
				this.#isOwn = true;
			},
			{ signal }
		);

		document.addEventListener(
			'dragend',
			() => {
				this.#isOwn = false;
			},
			{ signal }
		);

		document.addEventListener(
			'dragenter',
			( event ) => {
				if ( this.#takes( event.dataTransfer ) ) {
					depth++;
					this.#show();
				}
			},
			{ signal }
		);

		document.addEventListener(
			'dragleave',
			( event ) => {
				if ( this.#takes( event.dataTransfer ) ) {
					depth = Math.max( 0, depth - 1 );
					this.hidden = 0 < depth ? this.hidden : true;
				}
			},
			{ signal }
		);

		// The page takes the files dropped only if it says so as they are dragged over it.
		document.addEventListener(
			'dragover',
			( event ) => {
				if ( this.#takes( event.dataTransfer ) ) {
					event.preventDefault();
				}
			},
			{ signal }
		);

		document.addEventListener(
			'drop',
			( event ) => {
				depth = 0;
				this.hidden = true;

				if (
					! event.defaultPrevented &&
					this.#takes( event.dataTransfer )
				) {
					event.preventDefault();
					this.#add(
						[ ...event.dataTransfer.files ],
						urlOf( event.dataTransfer )
					);
				}
			},
			{ signal }
		);

		document.addEventListener(
			'paste',
			( event ) => {
				const files = [ ...( event.clipboardData?.files ?? [] ) ];
				// A URL pasted in a field is its text.
				const url = /** @type {HTMLElement} */ ( event.target ).closest(
					'input, textarea, [contenteditable]'
				)
					? ''
					: urlOf( event.clipboardData );

				if (
					! event.defaultPrevented &&
					( files.length || url ) &&
					this.#isOpen()
				) {
					event.preventDefault();
					this.#add( files, url );
				}
			},
			{ signal }
		);

		return [];
	}

	// Whether what is dragged comes from the page itself.
	#isOwn = false;

	/**
	 * Whether the page takes what is dragged: files, or a URL of another page, while no dialog is open.
	 *
	 * @param {DataTransfer|null} dataTransfer What is dragged.
	 * @return {boolean} Whether it takes it.
	 */
	#takes( dataTransfer ) {
		const types = dataTransfer?.types ?? [];

		return (
			! this.#isOwn &&
			( types.includes( 'Files' ) ||
				types.includes( 'text/uri-list' ) ) &&
			this.#isOpen()
		);
	}

	/**
	 * Whether the page takes files: a view shows, and no dialog over it.
	 *
	 * @return {boolean} Whether it takes them.
	 */
	#isOpen() {
		return (
			!! store.get().view && ! document.querySelector( 'dialog:modal' )
		);
	}

	/** Says where the files go. */
	#show() {
		const state = store.get();
		const target = targetOf( state );
		const channel = state.channels.items.find(
			( item ) => item.id === target
		);

		fill( this, {
			target: channel
				? sprintf(
						/* translators: %s: name of a channel. */
						__( 'Drop into %s', 'moodboard' ),
						channel.name
				  )
				: __( 'Drop into the index', 'moodboard' ),
		} );
		this.hidden = false;
	}

	/**
	 * Adds the files where they go, else the URL, a link or an image.
	 *
	 * @param {File[]} files The files.
	 * @param {string} url   The URL, empty for none.
	 */
	#add( files, url ) {
		if ( files.length || url ) {
			store.add( targetOf( store.get() ), {
				files,
				text: files.length ? '' : url,
			} );
		}
	}
}
customElements.define( 'moodboard-drop', MoodboardDropElement );
