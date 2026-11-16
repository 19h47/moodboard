import { store } from 'moodboard-app/store';
import { Brick } from 'moodboard-app/brick';

// How long a notice shows, long enough to read a sentence.
const NOTICE_MS = 6000;

/**
 * What the app says last, such as blocks added or an error, in a live region that assistive technologies read; it
 * hides after a moment.
 */
class MoodboardNoticeElement extends Brick {
	connect() {
		/** @type {HTMLElement} */
		const $text = this.querySelector( '[data-field="notice"]' );
		/** @type {number} */
		let timer;

		return [
			store.select(
				( state ) => state.notice,
				( notice ) => {
					clearTimeout( timer );
					$text.textContent = notice;
					this.hidden = ! notice;

					if ( notice ) {
						timer = setTimeout(
							() => store.notify( '' ),
							NOTICE_MS
						);
					}
				}
			),
		];
	}
}
customElements.define( 'moodboard-notice', MoodboardNoticeElement );
