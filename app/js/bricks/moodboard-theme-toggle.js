import { store } from 'moodboard-app/store';
import { Brick } from 'moodboard-app/brick';

/** The button that switches between the light and dark themes: pressed in dark, its icons following it. */
class MoodboardThemeToggleElement extends Brick {
	connect( signal ) {
		const $button = this.querySelector( 'button' );

		$button.addEventListener( 'click', () => store.toggleTheme(), {
			signal,
		} );

		return [
			store.select(
				( state ) => state.theme,
				( theme ) => {
					$button.setAttribute(
						'aria-pressed',
						( 'dark' === theme ).toString()
					);
				}
			),
		];
	}
}
customElements.define( 'moodboard-theme-toggle', MoodboardThemeToggleElement );
