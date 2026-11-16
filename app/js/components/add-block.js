import { Component } from 'moodboard-app/component';

/**
 * The card that adds blocks: files picked, dropped on it or pasted, or a text written, which may be the URL of an
 * image or a page. It adds nothing itself: it says what is added, the event `add` with `{ files, text }`, and its place
 * adds it. While its place adds, its attribute `busy` holds it.
 *
 * Its API: `text`, the text written, which a place sets to what is shared, to add as it is or once changed.
 */
export class AddBlockElement extends Component {
	static properties = [ 'text' ];

	static get observedAttributes() {
		return [ 'busy' ];
	}

	/** @return {string} The text written. */
	get text() {
		return this.querySelector( 'textarea' ).value;
	}

	/** @param {string} text A text, or the URL of an image or a page. */
	set text( text ) {
		this.querySelector( 'textarea' ).value = text;
	}

	attributeChangedCallback() {
		const isBusy = this.hasAttribute( 'busy' );

		this.querySelectorAll( 'button, input, textarea' ).forEach(
			( /** @type {HTMLButtonElement} */ $control ) => {
				$control.disabled = isBusy;
			}
		);
		this.toggleAttribute( 'aria-busy', isBusy );
	}

	connect( signal ) {
		/** @type {HTMLFormElement} */
		const $form = this.querySelector( 'form' );
		/** @type {HTMLInputElement} */
		const $files = this.querySelector( 'input[type="file"]' );
		/** @type {HTMLTextAreaElement} */
		const $text = this.querySelector( 'textarea' );

		$form.addEventListener(
			'submit',
			( event ) => {
				event.preventDefault();

				if ( $text.value.trim() ) {
					this.#add( [], $text.value );
					$form.reset();
				}
			},
			{ signal }
		);

		$files.addEventListener(
			'change',
			() => {
				this.#add( [ ...$files.files ], '' );
				$files.value = '';
			},
			{ signal }
		);

		// A file pasted in the text, such as a screenshot, is added as a file; a text stays to write.
		$text.addEventListener(
			'paste',
			( event ) => {
				const files = [ ...event.clipboardData.files ];

				if ( files.length ) {
					event.preventDefault();
					this.#add( files, '' );
				}
			},
			{ signal }
		);

		this.addEventListener(
			'dragover',
			( event ) => {
				if ( event.dataTransfer.types.includes( 'Files' ) ) {
					event.preventDefault();
					this.toggleAttribute( 'dragging', true );
				}
			},
			{ signal }
		);

		this.addEventListener(
			'dragleave',
			( event ) => {
				if (
					! this.contains(
						/** @type {Node} */ ( event.relatedTarget )
					)
				) {
					this.removeAttribute( 'dragging' );
				}
			},
			{ signal }
		);

		this.addEventListener(
			'drop',
			( event ) => {
				event.preventDefault();
				this.removeAttribute( 'dragging' );
				this.#add( [ ...event.dataTransfer.files ], '' );
			},
			{ signal }
		);
	}

	/**
	 * Says what is added, when anything is.
	 *
	 * @param {File[]} files The files.
	 * @param {string} text  The text.
	 */
	#add( files, text ) {
		if ( this.hasAttribute( 'busy' ) || ( ! files.length && ! text ) ) {
			return;
		}

		this.dispatchEvent(
			new CustomEvent( 'add', { detail: { files, text } } )
		);
	}
}
customElements.define( 'add-block', AddBlockElement );
