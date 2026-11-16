/**
 * The cards of the grid, from the templates of the page: a channel, a media, a text, each a component of its own in an
 * item of the list, and what they say, such as the number of blocks of a channel or the kind of a file.
 */

import { _n, sprintf } from 'moodboard-app/app';
import { urlOf } from 'moodboard-app/router';
import { clone, fill, fillImage } from 'moodboard-app/dom';

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
 * The card of a channel, in its item.
 *
 * @param {Channel} channel The channel.
 * @return {HTMLElement} The item.
 */
export function renderChannel( channel ) {
	const $item = clone( 'moodboard-channel-card' );
	/** @type {HTMLAnchorElement} */
	const $link = $item.querySelector( '[data-part="link"]' );

	$item.dataset.id = `channel-${ channel.id }`;
	$link.href = urlOf( { view: 'channel', id: channel.id } );
	fill( $item, {
		name: channel.name,
		count: formatCount( channel.count ),
	} );

	return $item;
}

/**
 * The card of a block, in its item: a media, its image or the kind of its file, or a text. Its link keeps the channel
 * it is opened from, for its neighbours.
 *
 * @param {Block}  block The block.
 * @param {number} from  The channel shown, 0 for none.
 * @return {HTMLElement} The item.
 */
export function renderBlock( block, from ) {
	const $item = clone(
		'media' === block.kind ? 'moodboard-media-card' : 'moodboard-text-card'
	);
	/** @type {HTMLAnchorElement} */
	const $link = $item.querySelector( '[data-part="link"]' );

	$item.dataset.id = block.key;
	$link.href = urlOf( { view: block.kind, id: block.id, from } );
	fill( $item, {
		title: block.title,
		text: block.text,
		kind: block.image ? '' : formatKind( block.mime ),
	} );

	const $image = $item.querySelector( 'img' );

	if ( $image ) {
		fillImage( $image, block.image );
	}

	return $item;
}
