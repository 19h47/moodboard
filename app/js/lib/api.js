/**
 * The REST API of core, as the app reads it: the channels of the curator, a taxonomy, and their blocks, the media and
 * the texts, each turned into what the bricks show, in plain text. The routes are those of WordPress; only the fields
 * the app reads are asked for.
 */

import {
	addQueryArgs,
	apiFetch,
	channelFields,
	channelsBase,
	mediaFields,
	perPage,
	textFields,
	textsBase,
} from 'moodboard-app/app';

/**
 * A channel.
 *
 * @typedef {Object} Channel
 * @property {number} id          Its term ID.
 * @property {string} name        Its name.
 * @property {string} description Its description.
 * @property {number} parent      The channel it is under, 0 for none.
 * @property {number} count       How many blocks it holds.
 */

/**
 * An image as the app shows it, at the width it takes.
 *
 * @typedef {Object} Image
 * @property {string} url    Its full size.
 * @property {string} srcset Its sizes.
 * @property {number} width  Its width.
 * @property {number} height Its height.
 */

/**
 * A block: a media, an image or another file, or a text.
 *
 * @typedef {Object} Block
 * @property {string}         key         Its kind and its ID, as the lists hold it: media-12, text-7.
 * @property {'media'|'text'} kind        Its kind, the view of its page.
 * @property {number}         id          Its post ID.
 * @property {string}         date        When it was added, as the API gives it.
 * @property {string}         title       Its title.
 * @property {string}         description The description of a media, as written.
 * @property {string}         text        The text of a text, as written.
 * @property {string}         alt         The alternative text of an image.
 * @property {string}         source      The URL it comes from.
 * @property {number[]}       channels    The channels it is in.
 * @property {string}         url         The file of a media.
 * @property {string}         mime        The type of the file of a media.
 * @property {Image|null}     image       The image of a media that is one.
 */

/**
 * A channel, as the API gives it.
 *
 * @typedef {Object} ApiChannel
 * @property {number} id          Its term ID.
 * @property {string} name        Its name, its entities encoded.
 * @property {string} description Its description.
 * @property {number} parent      The channel it is under.
 * @property {number} count       How many blocks it holds.
 */

/**
 * A field of a post as written, in the context of its edition.
 *
 * @typedef {{raw: string}} Raw
 */

/**
 * The fields of a block the API gives both kinds: its channels are under the REST base of their taxonomy.
 *
 * @typedef {Object} ApiBlock
 * @property {number}                      id    Its post ID.
 * @property {string}                      date  When it was added.
 * @property {Raw}                         title Its title.
 * @property {{moodboard_source?: string}} meta  Its source.
 */

/**
 * A media, as the API gives it.
 *
 * @typedef {ApiBlock & {description: Raw, alt_text: string, media_type: string, mime_type: string, source_url: string, media_details: {width?: number, height?: number, sizes?: Object<string, {source_url: string, width: number, height: number}>}}} ApiMedia
 */

/**
 * A text, as the API gives it.
 *
 * @typedef {ApiBlock & {content: Raw}} ApiText
 */

/**
 * Every item of a route, page after page.
 *
 * @template T
 * @param {string}                  path   The route, such as /wp/v2/media.
 * @param {Object<string, unknown>} query  Its arguments.
 * @param {AbortSignal}             signal Stops it.
 * @return {Promise<T[]>} The items.
 */
async function fetchAll( path, query, signal ) {
	const items = [];

	for ( let page = 1, pages = 1; page <= pages; page++ ) {
		const response = await apiFetch( {
			path: addQueryArgs( path, { ...query, per_page: perPage, page } ),
			parse: false,
			signal,
		} );

		items.push( ...( await response.json() ) );
		pages = Number( response.headers.get( 'X-WP-TotalPages' ) ) || 1;
	}

	return items;
}

/**
 * The text of HTML, such as a description as the API renders it.
 *
 * @param {string} html The HTML.
 * @return {string} Its text.
 */
function text( html ) {
	return new DOMParser().parseFromString( html, 'text/html' ).body
		.textContent;
}

/**
 * A channel, from the API.
 *
 * @param {ApiChannel} item The term.
 * @return {Channel} The channel.
 */
function toChannel( item ) {
	return {
		id: item.id,
		name: text( item.name ),
		description: item.description,
		parent: item.parent,
		count: item.count,
	};
}

/**
 * The image of a media, its sizes from its own up, none for another file.
 *
 * @param {ApiMedia} item The media.
 * @return {Image|null} Its image.
 */
function toImage( item ) {
	const { width, height, sizes = {} } = item.media_details ?? {};

	if ( 'image' !== item.media_type || ! width ) {
		return null;
	}

	// The sizes of the shape of the image only, as WordPress gives them in a srcset: a thumbnail is cut square.
	const widths = new Map(
		[
			...Object.values( sizes ).filter(
				( size ) =>
					Math.abs( size.width / size.height - width / height ) < 0.01
			),
			{ source_url: item.source_url, width },
		].map( ( size ) => [ size.width, size.source_url ] )
	);

	return {
		url: item.source_url,
		srcset: [ ...widths ]
			.map( ( [ size, url ] ) => `${ url } ${ size }w` )
			.join( ', ' ),
		width,
		height,
	};
}

/**
 * A block of a media.
 *
 * @param {ApiMedia} item The media, in the context of its edition.
 * @return {Block} The block.
 */
export function toMedia( item ) {
	return {
		key: `media-${ item.id }`,
		kind: 'media',
		id: item.id,
		date: item.date,
		title: item.title.raw,
		description: item.description.raw,
		text: '',
		alt: item.alt_text,
		source: item.meta?.moodboard_source ?? '',
		channels: item[ channelsBase ] ?? [],
		url: item.source_url,
		mime: item.mime_type,
		image: toImage( item ),
	};
}

/**
 * A block of a text.
 *
 * @param {ApiText} item The text, in the context of its edition.
 * @return {Block} The block.
 */
export function toText( item ) {
	return {
		key: `text-${ item.id }`,
		kind: 'text',
		id: item.id,
		date: item.date,
		title: item.title.raw,
		description: '',
		text: item.content.raw,
		alt: '',
		source: item.meta?.moodboard_source ?? '',
		channels: item[ channelsBase ] ?? [],
		url: '',
		mime: '',
		image: null,
	};
}

/**
 * The route of the blocks of a kind.
 *
 * @param {'media'|'text'} kind The kind.
 * @return {string} Its route.
 */
function routeOf( kind ) {
	return 'media' === kind ? '/wp/v2/media' : `/wp/v2/${ textsBase }`;
}

/**
 * Every channel of the curator, by name.
 *
 * @param {AbortSignal} signal Stops it.
 * @return {Promise<Channel[]>} The channels.
 */
export async function fetchChannels( signal ) {
	const items = await fetchAll(
		`/wp/v2/${ channelsBase }`,
		{ _fields: channelFields },
		signal
	);

	return items.map( toChannel );
}

/**
 * The blocks of channels, or those a search finds among them, the latest first.
 *
 * @param {number[]}    channelIds The channels.
 * @param {string}      search     The search, empty for every block.
 * @param {AbortSignal} signal     Stops it.
 * @return {Promise<Block[]>} The blocks.
 */
export async function fetchBlocks( channelIds, search, signal ) {
	if ( ! channelIds.length ) {
		return [];
	}

	const query = {
		context: 'edit',
		[ channelsBase ]: [ ...channelIds ]
			.sort( ( a, b ) => a - b )
			.join( ',' ),
		...( search ? { search } : {} ),
	};
	const [ media, texts ] = await Promise.all( [
		fetchAll(
			routeOf( 'media' ),
			{ _fields: mediaFields, ...query },
			signal
		),
		fetchAll(
			routeOf( 'text' ),
			{ _fields: textFields, ...query },
			signal
		),
	] );

	return [ ...media.map( toMedia ), ...texts.map( toText ) ].sort( ( a, b ) =>
		b.date.localeCompare( a.date )
	);
}

/**
 * A block, by its kind and its ID.
 *
 * @param {'media'|'text'} kind   Its kind.
 * @param {number}         id     Its ID.
 * @param {AbortSignal}    signal Stops it.
 * @return {Promise<Block>} The block.
 */
export async function fetchBlock( kind, id, signal ) {
	const item = await apiFetch( {
		path: addQueryArgs( `${ routeOf( kind ) }/${ id }`, {
			_fields: 'media' === kind ? mediaFields : textFields,
			context: 'edit',
		} ),
		signal,
	} );

	return 'media' === kind ? toMedia( item ) : toText( item );
}

/**
 * Adds a channel, under another or none.
 *
 * @param {{name: string, description: string, parent: number}} fields Its name, its description and its parent.
 * @return {Promise<Channel>} The channel.
 */
export async function createChannel( fields ) {
	return toChannel(
		await apiFetch( {
			path: `/wp/v2/${ channelsBase }`,
			method: 'POST',
			data: fields,
		} )
	);
}

/**
 * Changes a channel.
 *
 * @param {number}                                                       id     The channel.
 * @param {Partial<{name: string, description: string, parent: number}>} fields What changes.
 * @return {Promise<Channel>} The channel.
 */
export async function updateChannel( id, fields ) {
	return toChannel(
		await apiFetch( {
			path: `/wp/v2/${ channelsBase }/${ id }`,
			method: 'POST',
			data: fields,
		} )
	);
}

/**
 * Deletes a channel: core gives its sub-channels to its parent, the plugin the blocks in no other channel.
 *
 * @param {number} id The channel.
 */
export async function deleteChannel( id ) {
	await apiFetch( {
		path: `/wp/v2/${ channelsBase }/${ id }?force=true`,
		method: 'DELETE',
	} );
}

/**
 * Uploads a file into a channel.
 *
 * @param {File}   file      The file.
 * @param {number} channelId The channel.
 * @return {Promise<Block>} Its block.
 */
export async function uploadFile( file, channelId ) {
	const body = new FormData();

	body.append( 'file', file );
	body.append( `${ channelsBase }[]`, channelId.toString() );

	return toMedia(
		await apiFetch( {
			path: addQueryArgs( routeOf( 'media' ), { context: 'edit' } ),
			method: 'POST',
			body,
		} )
	);
}

/**
 * Imports an image from its URL into a channel: core downloads it, the plugin keeps the URL as its source.
 *
 * @param {string} url       The URL of the image.
 * @param {number} channelId The channel.
 * @return {Promise<Block>} Its block.
 */
export async function importUrl( url, channelId ) {
	return toMedia(
		await apiFetch( {
			path: addQueryArgs( routeOf( 'media' ), { context: 'edit' } ),
			method: 'POST',
			data: { url, [ channelsBase ]: [ channelId ] },
		} )
	);
}

/**
 * Writes a text into a channel.
 *
 * @param {string} content   The text.
 * @param {number} channelId The channel.
 * @return {Promise<Block>} Its block.
 */
export async function createText( content, channelId ) {
	return toText(
		await apiFetch( {
			path: addQueryArgs( routeOf( 'text' ), { context: 'edit' } ),
			method: 'POST',
			data: {
				content,
				status: 'private',
				[ channelsBase ]: [ channelId ],
			},
		} )
	);
}

/**
 * Changes a block: its fields, as the API names them, such as title or meta, or its channels.
 *
 * @param {Block}                   block  The block.
 * @param {Object<string, unknown>} fields What changes.
 * @return {Promise<Block>} The block.
 */
export async function updateBlock( block, fields ) {
	const item = await apiFetch( {
		path: addQueryArgs( `${ routeOf( block.kind ) }/${ block.id }`, {
			context: 'edit',
		} ),
		method: 'POST',
		data: fields,
	} );

	return 'media' === block.kind ? toMedia( item ) : toText( item );
}

/**
 * Gives a block its channels, all of them.
 *
 * @param {Block}    block      The block.
 * @param {number[]} channelIds Its channels.
 * @return {Promise<Block>} The block.
 */
export function setChannels( block, channelIds ) {
	return updateBlock( block, { [ channelsBase ]: channelIds } );
}

/**
 * Deletes a block, its file with a media.
 *
 * @param {Block} block The block.
 */
export async function deleteBlock( block ) {
	await apiFetch( {
		path: `${ routeOf( block.kind ) }/${ block.id }?force=true`,
		method: 'DELETE',
	} );
}

/**
 * What an error of the API says, or what went wrong without one, such as no network.
 *
 * @param {unknown} error    The error, such as one of the API, with its message.
 * @param {string}  fallback What to say without a message.
 * @return {string} The message.
 */
export function errorMessage( error, fallback ) {
	const message =
		error instanceof Object && 'message' in error ? error.message : '';

	return 'string' === typeof message && message ? text( message ) : fallback;
}
