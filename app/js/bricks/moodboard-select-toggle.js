import { store } from 'moodboard-app/store';
import { Brick } from 'moodboard-app/brick';

/**
 * The control that starts selecting the cards of the blocks, or ends it: pressed while they are.
 */
class MoodboardSelectToggleElement extends Brick {
	connect( signal ) {
		const $button = this.querySelector( 'button' );

		$button.addEventListener(
			'click',
			() => store.setSelecting( ! store.get().selecting ),
			{ signal }
		);

		return [
			store.select(
				( state ) => state.selecting,
				( selecting ) =>
					$button.setAttribute( 'aria-pressed', selecting.toString() )
			),
		];
	}
}
customElements.define(
	'moodboard-select-toggle',
	MoodboardSelectToggleElement
);
