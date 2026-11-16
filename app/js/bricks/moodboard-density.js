import { __ } from 'moodboard-app/app';
import { store } from 'moodboard-app/store';
import { Brick } from 'moodboard-app/brick';

/**
 * The size of the cards of the grids, a step of the scale smaller or larger than the usual one, or two cards a row, kept
 * on the device: its range sets it, in words for assistive technologies, the root of the page says it, `data-density`,
 * which the grids read.
 */
class MoodboardDensityElement extends Brick {
	connect( signal ) {
		/** @type {HTMLInputElement} */
		const $range = this.querySelector( 'input[type="range"]' );

		$range.addEventListener(
			'input',
			() => store.setDensity( Number( $range.value ) ),
			{ signal }
		);

		return [
			store.select(
				( state ) => state.density,
				( density ) => {
					$range.value = density.toString();
					$range.setAttribute(
						'aria-valuetext',
						{
							'-1': __( 'Small', 'moodboard' ),
							0: __( 'Medium', 'moodboard' ),
							1: __( 'Large', 'moodboard' ),
							2: __( 'Two a row', 'moodboard' ),
						}[ density ]
					);
					document.documentElement.dataset.density =
						density.toString();
				}
			),
		];
	}
}
customElements.define( 'moodboard-density', MoodboardDensityElement );
