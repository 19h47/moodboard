import { store } from 'moodboard-app/store';
import { urlOf } from 'moodboard-app/router';
import { Brick } from 'moodboard-app/brick';

/**
 * What the index shows, its links to all, the channels or the blocks: the current one marked, each keeping the search.
 */
class MoodboardTabsElement extends Brick {
	connect() {
		return [
			store.select(
				( state ) => `${ state.tab } ${ state.query }`,
				() => {
					const { tab, query } = store.get();

					this.querySelectorAll( 'a[data-tab]' ).forEach(
						( /** @type {HTMLAnchorElement} */ $link ) => {
							$link.href = urlOf( {
								tab: $link.dataset.tab,
								query,
							} );

							if ( $link.dataset.tab === tab ) {
								$link.setAttribute( 'aria-current', 'page' );
							} else {
								$link.removeAttribute( 'aria-current' );
							}
						}
					);
				}
			),
		];
	}
}
customElements.define( 'moodboard-tabs', MoodboardTabsElement );
