/**
 * What bricks share: a list drawn by keys, the title of a page opened and an element busy while it loads.
 */

/**
 * Draws in `$list` an element per key of `keys`, in their order, such as a card per block: an element drawn already for
 * a key, its data-id, stays as it is, its focus too, even moved; a new one comes from `render( key )`. An element whose
 * key left goes, its focus to the nearest one that stays, after it, or else before it.
 *
 * @param {Element}                        $list  The list.
 * @param {string[]}                       keys   The keys, such as media-12.
 * @param {( key: string ) => HTMLElement} render The element of a new key.
 */
export function renderKeyed( $list, keys, render ) {
	const $children = /** @type {HTMLElement[]} */ ( [ ...$list.children ] );
	const $drawn = new Map(
		$children.map( ( $item ) => [ $item.dataset.id, $item ] )
	);
	const kept = new Set( keys );
	const $kept = $children.filter( ( $item ) => kept.has( $item.dataset.id ) );
	const $focused = $list.ownerDocument.activeElement;
	const $left = [ ...$drawn.values() ].find(
		( $item ) =>
			! kept.has( $item.dataset.id ) && $item.contains( $focused )
	);

	if ( $left ) {
		const $after = $kept.find(
			( $item ) =>
				// eslint-disable-next-line no-bitwise -- A flag of the position of the element.
				$left.compareDocumentPosition( $item ) &
				Node.DOCUMENT_POSITION_FOLLOWING
		);

		/** @type {HTMLElement} */ (
			( $after ?? $kept.at( -1 ) )?.querySelector( 'button, a' )
		)?.focus();
	}

	$drawn.forEach( ( $item, key ) => {
		if ( ! kept.has( key ) ) {
			$item.remove();
		}
	} );

	const $active = /** @type {HTMLElement} */ (
		$list.ownerDocument.activeElement
	);
	let $next = $list.firstElementChild;

	keys.forEach( ( key ) => {
		const $item = $drawn.get( key ) ?? render( key );

		if ( $item === $next ) {
			$next = $next.nextElementSibling;
		} else if ( $list.moveBefore && $item.isConnected ) {
			// Moved, an element keeps its focus where the browser can.
			$list.moveBefore( $item, $next );
		} else {
			$list.insertBefore( $item, $next );
		}
	} );

	// Moved elsewhere, an element loses its focus: it gets it back.
	if (
		$active !== $list.ownerDocument.activeElement &&
		$list.contains( $active )
	) {
		$active.focus( { preventScroll: true } );
	}
}

/**
 * Gives the focus to the title of a page opened, where assistive technologies read on, without its outline: the title
 * is no control.
 *
 * @param {HTMLElement} $title The title.
 */
export function focusTitle( $title ) {
	$title.focus( { preventScroll: true, focusVisible: false } );
}

/**
 * Marks `$element` as busy while it loads, as assistive technologies read it: aria-busy true, or no attribute.
 *
 * @param {Element} $element The element.
 * @param {boolean} isBusy   Whether it is busy.
 */
export function showBusy( $element, isBusy ) {
	if ( isBusy ) {
		$element.setAttribute( 'aria-busy', 'true' );
	} else {
		$element.removeAttribute( 'aria-busy' );
	}
}
