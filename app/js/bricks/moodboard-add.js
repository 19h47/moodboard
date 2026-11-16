import { store } from 'moodboard-app/store';
import { Brick } from 'moodboard-app/brick';

/**
 * Ties the card that adds blocks to the channel shown: what it says is added goes into the channel, the card busy
 * until it has.
 */
class MoodboardAddElement extends Brick {
	connect( signal ) {
		const $add = this.querySelector( 'add-block' );

		$add.addEventListener(
			'add',
			(
				/** @type {CustomEvent<{files: File[], text: string}>} */ event
			) => store.add( store.get().id, event.detail ),
			{ signal }
		);

		return [
			store.select(
				( state ) => state.adding,
				( adding ) => $add.toggleAttribute( 'busy', adding )
			),
		];
	}
}
customElements.define( 'moodboard-add', MoodboardAddElement );
