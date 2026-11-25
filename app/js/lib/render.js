/**
 * The cards of the grid, from the templates of the page: a channel, a media, a text, each a component of its own in an
 * item of the list, and what they say, such as the number of blocks of a channel or the kind of a file.
 */

import { __, _n, sprintf } from 'moodboard-app/app';
import { urlOf } from 'moodboard-app/router';
import { clone, fill, fillImage } from 'moodboard-app/dom';
import { showBusy } from 'moodboard-app/behaviors';

/** @import { Block, Channel } from 'moodboard-app/api' */

/**
 * How many blocks a channel holds.
 *
 * @param {number} count The number of blocks.
 * @return {string} What it says.
 */
export function formatCount( count ) {
	return sprintf(
		/* translators: %d: number of blocks. */
		_n( '%d block', '%d blocks', count, 'moodboard' ),
		count
	);
}

/**
 * The kind of a file, as its card names it: the subtype of its type, such as PDF or MP4.
 *
 * @param {string} mime The type of the file.
 * @return {string} Its kind.
 */
export function formatKind( mime ) {
	return ( mime.split( '/' )[ 1 ] ?? mime ).toUpperCase();
}

/**
 * A date as the app says it, in the language of the page: 16 November 2026.
 *
 * @param {string} date A date of the API.
 * @return {string} The date.
 */
export function formatDate( date ) {
	return new Intl.DateTimeFormat( document.documentElement.lang, {
		dateStyle: 'long',
	} ).format( new Date( date ) );
}

/**
 * The name of the site of a URL, without its www, as the card of a link names it.
 *
 * @param {string} url The URL.
 * @return {string} The name of its site.
 */
export function hostOf( url ) {
	try {
		return new URL( url ).hostname.replace( /^www\./, '' );
	} catch {
		return url;
	}
}

/**
 * The card of a channel, in its item.
 *
 * @param {Channel} channel The channel.
 * @return {HTMLElement} The item.
 */
export function renderChannel( channel ) {
	const $item = clone( 'moodboard-channel-card' );
	/** @type {HTMLAnchorElement} */
	const $link = $item.querySelector( '[data-part="link"]' );

	/** @type {HTMLElement} */
	const $covers = $item.querySelector( '[data-list="covers"]' );

	$item.dataset.id = `channel-${ channel.id }`;
	$link.href = urlOf( { view: 'channel', id: channel.id } );
	fill( $item, {
		name: channel.name,
		count: formatCount( channel.count ),
	} );

	// Its latest images, as a mosaic its number lays out; they name nothing the name of the channel does not.
	$covers.dataset.count = channel.covers.length.toString();
	$covers.replaceChildren(
		...channel.covers.map( ( cover ) => {
			const $cover = new Image( cover.width, cover.height );

			$cover.alt = '';
			$cover.loading = 'lazy';
			$cover.decoding = 'async';
			$cover.src = cover.url;

			return $cover;
		} )
	);

	return $item;
}

/**
 * What names a block, its title written, else its alternative text, the name of its file or its kind.
 *
 * @param {Block} block The block.
 * @return {string} Its name.
 */
export function nameOf( block ) {
	return (
		block.label ||
		block.alt ||
		block.title ||
		block.text.slice( 0, 60 ) ||
		formatKind( block.mime )
	);
}

/**
 * The card of a block, in its item: a media, its image or the kind of its file; a text; or a link, the image of its
 * page or the name of its site. Its link keeps the channel it is opened from, for its neighbours.
 *
 * @param {Block}  block The block.
 * @param {number} from  The channel shown, 0 for none.
 * @return {HTMLElement} The item.
 */
export function renderBlock( block, from ) {
	const $item = clone( `moodboard-${ block.kind }-card` );
	/** @type {HTMLAnchorElement} */
	const $link = $item.querySelector( '[data-part="link"]' );

	$item.dataset.id = block.key;
	$link.href = urlOf( { view: block.kind, id: block.id, from } );
	// Under an image, its title written only: none for one named after its file, which its alternative text names.
	fill( $item, {
		title: block.label,
		text: block.text,
		kind: block.image ? '' : formatKind( block.mime ),
		host: 'link' === block.kind ? hostOf( block.url ) : '',
		select: sprintf(
			/* translators: %s: name of a block. */
			__( 'Select %s', 'moodboard' ),
			nameOf( block )
		),
		move: sprintf(
			/* translators: %s: name of a block. */
			__( 'Move %s', 'moodboard' ),
			nameOf( block )
		),
	} );

	const $image = $item.querySelector( 'img' );

	if ( $image ) {
		fillImage( $image, block.image );
		$image.alt = block.alt || ( block.label ? '' : nameOf( block ) );
	}

	// A file being added: no page yet, a link without its URL, neither selected nor moved, busy until it is added.
	if ( ! block.id ) {
		$link.removeAttribute( 'href' );
		$item.querySelector( '[data-part="select"]' )?.remove();
		$item.querySelector( '[data-part="move"]' )?.remove();
		showBusy( $item, true );
	}

	return $item;
}

/**
 * The boxes of the channels whose name has a filter, by name, ticked for those of `checked`, from the template of an
 * option.
 *
 * @param {Channel[]} channels Every channel.
 * @param {string}    filter   The filter, empty for every channel.
 * @param {number[]}  checked  The channels ticked.
 * @return {HTMLElement[]} The items of the boxes.
 */
function renderChannelOptions( channels, filter, checked ) {
	const search = filter.trim().toLocaleLowerCase();

	return channels
		.filter( ( channel ) =>
			channel.name.toLocaleLowerCase().includes( search )
		)
		.toSorted( ( a, b ) => a.name.localeCompare( b.name ) )
		.map( ( channel ) => {
			const $item = clone( 'moodboard-connect-option' );
			/** @type {HTMLInputElement} */
			const $box = $item.querySelector( 'input' );

			$box.value = channel.id.toString();
			$box.checked = checked.includes( channel.id );
			fill( $item, { name: channel.name } );

			return $item;
		} );
}

/**
 * Whether no channel has the name typed, which a new channel may take.
 *
 * @param {Channel[]} channels Every channel.
 * @param {string}    name     The name typed.
 * @return {boolean} Whether it is a new name.
 */
function isNewName( channels, name ) {
	const search = name.trim().toLocaleLowerCase();

	return (
		!! search &&
		! channels.some(
			( channel ) => channel.name.toLocaleLowerCase() === search
		)
	);
}

/**
 * Fills the channels to tick of the component connect, `$root`: the boxes of the channels whose name has its filter,
 * ticked for those of `checked`, and the button that adds a channel of the name typed, shown while none has it.
 *
 * @param {Element}   $root    The component.
 * @param {Channel[]} channels Every channel.
 * @param {number[]}  checked  The channels ticked.
 */
export function fillChannelPicker( $root, channels, checked ) {
	/** @type {HTMLInputElement} */
	const $filter = $root.querySelector( 'input[type="search"]' );
	/** @type {HTMLButtonElement} */
	const $create = $root.querySelector( '[data-action="create"]' );
	const name = $filter.value.trim();

	$root
		.querySelector( '[data-list="channels"]' )
		.replaceChildren(
			...renderChannelOptions( channels, $filter.value, checked )
		);
	$create.hidden = ! isNewName( channels, $filter.value );
	$create.value = name;
	$create.textContent = sprintf(
		/* translators: %s: name of a channel. */
		__( 'Add the channel “%s”', 'moodboard' ),
		name
	);
}
