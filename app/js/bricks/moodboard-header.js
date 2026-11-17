import { store } from 'moodboard-app/store';
import { Brick } from 'moodboard-app/brick';

/**
 * The header of the page, which stays at the top of the screen: it says the view shown, `data-view`, for its parts of a
 * view only, such as the tabs and the search of the index, or the size and the selection of the cards of a grid. It
 * gives its height to the page, `--moodboard-header-size`, which the stylesheet sets for one line until then: on a
 * phone, its tools take two.
 */
class MoodboardHeaderElement extends Brick {
	connect() {
		const $root = this.ownerDocument.documentElement;
		const observer = new ResizeObserver( ( [ entry ] ) => {
			const [ { blockSize } ] = entry.borderBoxSize;

			$root.style.setProperty(
				'--moodboard-header-size',
				`${ blockSize }px`
			);
		} );

		observer.observe( this );

		return [
			store.select(
				( state ) => state.view,
				( view ) => {
					this.dataset.view = view;
				}
			),
			() => observer.disconnect(),
		];
	}
}
customElements.define( 'moodboard-header', MoodboardHeaderElement );
