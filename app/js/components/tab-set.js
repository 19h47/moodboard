import { Component } from 'moodboard-app/component';

/**
 * Tabs, the root of a list of tabs and of their panels, as the tabs pattern of the APG has them: a tab shows its panel,
 * the others hidden. Clicked, or reached with ← →, Home or End, a tab shows its panel at once; the list of tabs is one
 * stop of the Tab key, its tab selected, the panel the next one.
 */
class TabSetElement extends Component {
	connect( signal ) {
		this.addEventListener(
			'click',
			( event ) => {
				/** @type {HTMLButtonElement|null} */
				const $tab = /** @type {HTMLElement} */ (
					event.target
				).closest( '[role="tab"]' );

				if ( $tab ) {
					this.#select( $tab );
				}
			},
			{ signal }
		);

		this.addEventListener(
			'keydown',
			( event ) => {
				/** @type {HTMLButtonElement|null} */
				const $tab = /** @type {HTMLElement} */ (
					event.target
				).closest( '[role="tab"]' );
				const $tabs = this.#tabs;
				const index = $tabs.indexOf( $tab );
				const to = {
					ArrowLeft: index - 1,
					ArrowRight: index + 1,
					Home: 0,
					End: $tabs.length - 1,
				}[ event.key ];

				if ( ! $tab || undefined === to ) {
					return;
				}

				const $next = $tabs.at( to % $tabs.length );

				event.preventDefault();
				this.#select( $next );
				$next.focus();
			},
			{ signal }
		);
	}

	/** @return {HTMLButtonElement[]} Its tabs, in order. */
	get #tabs() {
		return /** @type {HTMLButtonElement[]} */ ( [
			...this.querySelectorAll( '[role="tab"]' ),
		] );
	}

	/**
	 * Shows the panel of a tab, the others hidden.
	 *
	 * @param {HTMLButtonElement} $tab The tab.
	 */
	#select( $tab ) {
		this.#tabs.forEach( ( $each ) => {
			const isSelected = $each === $tab;
			/** @type {HTMLElement|null} */
			const $panel = this.querySelector(
				`#${ $each.getAttribute( 'aria-controls' ) }`
			);

			$each.setAttribute( 'aria-selected', isSelected.toString() );
			$each.tabIndex = isSelected ? 0 : -1;

			if ( $panel ) {
				$panel.hidden = ! isSelected;
			}
		} );
	}
}
customElements.define( 'tab-set', TabSetElement );
