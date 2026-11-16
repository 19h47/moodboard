import { store } from 'moodboard-app/store';
import { Brick } from 'moodboard-app/brick';

/**
 * The header of the page, on one line: it says the view shown, `data-view`, for its parts of a view only, such as the
 * tabs and the search of the index, or the size and the selection of the cards of a grid.
 */
class MoodboardHeaderElement extends Brick {
	connect() {
		return [
			store.select(
				( state ) => state.view,
				( view ) => {
					this.dataset.view = view;
				}
			),
		];
	}
}
customElements.define( 'moodboard-header', MoodboardHeaderElement );
