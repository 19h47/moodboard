import { store } from 'moodboard-app/store';
import { Brick } from 'moodboard-app/brick';
import { endOnEscape } from 'moodboard-app/behaviors';

/**
 * The control that starts putting the blocks of the channel shown in order, or ends it: pressed while they are. Escape
 * ends it too, but for a block picked up, which it puts back.
 */
class MoodboardArrangeToggleElement extends Brick {
	connect( signal ) {
		const $button = this.querySelector( 'button' );

		$button.addEventListener(
			'click',
			() => store.setArranging( ! store.get().arranging ),
			{ signal }
		);

		endOnEscape(
			() => store.get().arranging,
			() => store.setArranging( false ),
			signal
		);

		return [
			store.select(
				( state ) => state.arranging,
				( arranging ) =>
					$button.setAttribute( 'aria-pressed', arranging.toString() )
			),
		];
	}
}
customElements.define(
	'moodboard-arrange-toggle',
	MoodboardArrangeToggleElement
);
