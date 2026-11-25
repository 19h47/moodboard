/**
 * The REST API of core, as the app reads it: the channels of the curator, a taxonomy, and their blocks, the media, the
 * texts and the links, each turned into what the bricks show, in plain text, and the notes of a block. The routes are
 * those of WordPress; only the fields the app reads are asked for.
 */

import {
	addQueryArgs,
	apiFetch,
	channelFields,
	channelsBase,
	linkEmbed,
	linkFields,
	linksBase,
	mediaFields,
	perPage,
	textFields,
	textsBase,
} from 'moodboard-app/app';

/**
 * A channel.
 *
 * @typedef {Object} Channel
 * @property {number}   id          Its term ID.
 * @property {string}   name        Its name.
 * @property {string}   description Its description.
 * @property {number}   parent      The channel it is under, 0 for none.
 * @property {number}   count       How many blocks it holds.
 * @property {Cover[]}  covers      Its latest images, and those of its sub-channels, for its card.
 * @property {number[]} order       Its blocks, in the order its curator gave them, by post ID.
 */

/**
 * An image of the card of a channel, at a size of its own.
 *
 * @typedef {Object} Cover
 * @property {string} url    Its URL.
 * @property {number} width  Its width.
 * @property {number} height Its height.
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
 * A block: a media, an image or another file, a text, or a link.
 *
 * @typedef {Object} Block
 * @property {string}                key         Its kind and its ID, as the lists hold it: media-12, text-7, link-3.
 * @property {'media'|'text'|'link'} kind        Its kind, the view of its page.
 * @property {number}                id          Its post ID.
 * @property {string}                date        When it was added, as the API gives it.
 * @property {string}                title       Its title, as WordPress has it: the name of its file unless written.
 * @property {string}                label       Its title written, as the app shows it: none for a media named after its file.
 * @property {string}                description The description of a media or of a link, as written.
 * @property {string}                text        The text of a text, as written.
 * @property {string}                alt         The alternative text of an image.
 * @property {string}                source      The URL it comes from.
 * @property {string}                by          Who made it, such as an artist, a photographer or an account.
 * @property {number[]}              channels    The channels it is in.
 * @property {string}                url         The file of a media.
 * @property {string}                mime        The type of the file of a media.
 * @property {Image|null}            image       The image of a media that is one, or the one of the page of a link.
 * @property {string|null}           embed       The player of a link, as core embeds its URL, empty for none; null until its page loads it.
 */

/**
 * A note on a block, as written.
 *
 * @typedef {Object} Note
 * @property {number} id      Its comment ID.
 * @property {string} date    When it was written, as the API gives it.
 * @property {string} content What it says.
 */

/**
 * A channel, as the API gives it.
 *
 * @typedef {Object} ApiChannel
 * @property {number}                       id               Its term ID.
 * @property {string}                       name             Its name, its entities encoded.
 * @property {string}                       description      Its description.
 * @property {number}                       parent           The channel it is under.
 * @property {number}                       count            How many blocks it holds.
 * @property {Cover[]}                      moodboard_covers Its latest images.
 * @property {{moodboard_order?: number[]}} meta             The order of its blocks.
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
 * @property {number}                                             id    Its post ID.
 * @property {string}                                             date  When it was added.
 * @property {Raw}                                                title Its title.
 * @property {{moodboard_source?: string, moodboard_by?: string}} meta  Its source, and who made it.
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
 * A link, as the API gives it, the image of its page embedded, and its player for its page.
 *
 * @typedef {ApiBlock & {content: Raw, moodboard_embed?: string, _embedded?: {'wp:featuredmedia'?: Array<ApiMedia & {code?: string}>}}} ApiLink
 */

/**
 * Every item of a route, and the headers of its first page: the first page says how many there are, the others are
 * asked for together, their items in their order.
 *
 * @template T
 * @param {string}                  path   The route, such as /wp/v2/media.
 * @param {Object<string, unknown>} query  Its arguments.
 * @param {AbortSignal}             signal Stops it.
 * @return {Promise<{items: T[], headers: Headers}>} The items, and the headers.
 */
async function fetchAll( path, query, signal ) {
	/** @param {number} page A page, from 1. */
	const fetchPage = async ( page ) => {
		const response = await apiFetch( {
			path: addQueryArgs( path, { ...query, per_page: perPage, page } ),
			parse: false,
			signal,
		} );

		return { response, items: await response.json() };
	};
	const first = await fetchPage( 1 );
	const { headers } = first.response;
	const pages = Number( headers.get( 'X-WP-TotalPages' ) ) || 1;
	const others = await Promise.all(
		Array.from( { length: pages - 1 }, ( _, index ) =>
			fetchPage( index + 2 )
		)
	);

	return {
		items: [ first, ...others ].flatMap( ( page ) => page.items ),
		headers,
	};
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
		covers: item.moodboard_covers ?? [],
		order: item.meta?.moodboard_order ?? [],
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
 * A name to compare, its separators alike, in lower case.
 *
 * @param {string} name A title, or the name of a file.
 * @return {string} The name to compare.
 */
function nameKey( name ) {
	return name.toLocaleLowerCase().replace( /[\s_.-]+/g, '-' );
}

/**
 * The title of a media written, empty when WordPress named it after its file, as it does a media uploaded: the name of
 * its file without its extension, and without the suffixes WordPress may have added, of a large image, `-scaled`, or of
 * a name taken, such as `-2`; the title keeps its own, such as the volume of `t-1`.
 *
 * @param {ApiMedia} item The media.
 * @return {string} Its title written.
 */
function labelOf( item ) {
	const file = decodeURIComponent( item.source_url.split( '/' ).pop() ?? '' );
	const names = [ file.replace( /\.[a-z0-9]+$/i, '' ) ];

	for ( let i = 0; i < 2; i++ ) {
		names.push( names.at( -1 ).replace( /-(scaled|\d+)$/, '' ) );
	}

	return names.map( nameKey ).includes( nameKey( item.title.raw ) )
		? ''
		: item.title.raw;
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
		label: labelOf( item ),
		description: item.description.raw,
		text: '',
		alt: item.alt_text,
		source: item.meta?.moodboard_source ?? '',
		by: item.meta?.moodboard_by ?? '',
		channels: item[ channelsBase ] ?? [],
		url: item.source_url,
		mime: item.mime_type,
		image: toImage( item ),
		embed: '',
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
		label: item.title.raw,
		description: '',
		text: item.content.raw,
		alt: '',
		source: item.meta?.moodboard_source ?? '',
		by: item.meta?.moodboard_by ?? '',
		channels: item[ channelsBase ] ?? [],
		url: '',
		mime: '',
		image: null,
		embed: '',
	};
}

/**
 * A block of a link: its title and its description those of its page, unless written, its image the one of its page.
 *
 * @param {ApiLink} item The link, in the context of its edition.
 * @return {Block} The block.
 */
export function toLink( item ) {
	const image = item._embedded?.[ 'wp:featuredmedia' ]?.[ 0 ];

	return {
		key: `link-${ item.id }`,
		kind: 'link',
		id: item.id,
		date: item.date,
		title: item.title.raw,
		// A page that gives no title is named after its URL: no title written.
		label:
			item.title.raw === item.meta?.moodboard_source
				? ''
				: item.title.raw,
		description: item.content.raw,
		text: '',
		alt: '',
		source: item.meta?.moodboard_source ?? '',
		by: item.meta?.moodboard_by ?? '',
		channels: item[ channelsBase ] ?? [],
		url: item.meta?.moodboard_source ?? '',
		mime: '',
		image: image && ! image.code ? toImage( image ) : null,
		embed: item.moodboard_embed ?? null,
	};
}

/**
 * The kinds of the blocks: their route, the fields the app reads, what they embed, and what turns them into blocks.
 *
 * @type {Record<Block['kind'], {route: string, fields: string, embed: string, to: ( item: ApiMedia & ApiText & ApiLink ) => Block}>}
 */
const KINDS = {
	media: {
		route: '/wp/v2/media',
		fields: mediaFields,
		embed: '',
		to: toMedia,
	},
	text: {
		route: `/wp/v2/${ textsBase }`,
		fields: textFields,
		embed: '',
		to: toText,
	},
	link: {
		route: `/wp/v2/${ linksBase }`,
		fields: linkFields,
		embed: linkEmbed,
		to: toLink,
	},
};

/**
 * The route of the blocks of a kind.
 *
 * @param {Block['kind']} kind The kind.
 * @return {string} Its route.
 */
function routeOf( kind ) {
	return KINDS[ kind ].route;
}

/**
 * The arguments every request of the blocks of a kind gives: their fields, what they embed, in the context of their
 * edition.
 *
 * @param {Block['kind']} kind The kind.
 * @return {Object<string, string>} The arguments.
 */
function argsOf( kind ) {
	const { fields, embed } = KINDS[ kind ];

	return {
		_fields: fields,
		...( embed ? { _embed: embed } : {} ),
		context: 'edit',
	};
}

/**
 * The arguments of a block for its page: a link with its player, which a list leaves out.
 *
 * @param {Block['kind']} kind The kind.
 * @return {Object<string, string>} The arguments.
 */
function pageArgsOf( kind ) {
	const args = argsOf( kind );

	if ( 'link' === kind ) {
		args._fields += ',moodboard_embed';
	}

	return args;
}

/**
 * Every channel of the curator, by name.
 *
 * @param {AbortSignal} signal Stops it.
 * @return {Promise<Channel[]>} The channels.
 */
export async function fetchChannels( signal ) {
	const { items } = await fetchAll(
		`/wp/v2/${ channelsBase }`,
		{ _fields: channelFields },
		signal
	);

	return items.map( toChannel );
}

/**
 * The blocks of a channel, or of the index, every block of the curator, in a channel or none; or those a search finds
 * among them; the latest first. A search with a word typed wrong searches the closest word of the blocks instead, which
 * the server says, encoded as a component of a URL.
 *
 * @param {number}      channelId The channel, 0 for the index.
 * @param {string}      search    The search, empty for every block.
 * @param {AbortSignal} signal    Stops it.
 * @return {Promise<{blocks: Block[], corrected: string}>} The blocks, and the search as corrected, empty if it was not.
 */
export async function fetchBlocks( channelId, search, signal ) {
	const query = {
		...( channelId ? { [ channelsBase ]: channelId } : {} ),
		...( search ? { search } : {} ),
	};
	const kinds = /** @type {Block['kind'][]} */ ( Object.keys( KINDS ) );
	const lists = await Promise.all(
		kinds.map( async ( kind ) => {
			const { items, headers } = await fetchAll(
				routeOf( kind ),
				{
					...argsOf( kind ),
					...query,
					// The media of the library that are blocks: a text or a link is one by its post type.
					...( 'media' === kind && ! channelId
						? { moodboard_block: 1 }
						: {} ),
				},
				signal
			);

			return {
				blocks: items.map( KINDS[ kind ].to ),
				corrected: headers.get( 'X-Moodboard-Search' ) ?? '',
			};
		} )
	);
	const blocks = lists
		.flatMap( ( list ) => list.blocks )
		.sort( ( a, b ) => b.date.localeCompare( a.date ) );
	const corrected = lists.find( ( list ) => list.corrected )?.corrected;

	return {
		blocks,
		corrected: corrected ? decodeURIComponent( corrected ) : '',
	};
}

/**
 * A block, by its kind and its ID, for its page: a link with its player.
 *
 * @param {Block['kind']} kind   Its kind.
 * @param {number}        id     Its ID.
 * @param {AbortSignal}   signal Stops it.
 * @return {Promise<Block>} The block.
 */
export async function fetchBlock( kind, id, signal ) {
	const item = await apiFetch( {
		path: addQueryArgs(
			`${ routeOf( kind ) }/${ id }`,
			pageArgsOf( kind )
		),
		signal,
	} );

	return KINDS[ kind ].to( item );
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
 * Keeps the order of the blocks of a channel, as its curator gave it.
 *
 * @param {number}   id       The channel.
 * @param {number[]} blockIds Its blocks, in their order, by post ID.
 * @return {Promise<Channel>} The channel.
 */
export async function orderChannel( id, blockIds ) {
	return toChannel(
		await apiFetch( {
			path: addQueryArgs( `/wp/v2/${ channelsBase }/${ id }`, {
				_fields: channelFields,
			} ),
			method: 'POST',
			data: { meta: { moodboard_order: blockIds } },
		} )
	);
}

/**
 * The blocks of a channel in its order: those it has not ordered, added since, first, as they come, the latest first;
 * then the others, in its order.
 *
 * @param {Block[]}  blocks The blocks of the channel, the latest first.
 * @param {number[]} order  Its order, by post ID.
 * @return {Block[]} The blocks, in its order.
 */
export function inOrder( blocks, order ) {
	const places = new Map( order.map( ( id, place ) => [ id, place ] ) );

	return blocks.toSorted(
		( a, b ) => ( places.get( a.id ) ?? -1 ) - ( places.get( b.id ) ?? -1 )
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
 * The channels of a block added to a channel, none added to the index.
 *
 * @param {number} channelId The channel, 0 for the index.
 * @return {number[]} Its channels.
 */
function channelsOf( channelId ) {
	return channelId ? [ channelId ] : [];
}

/**
 * Uploads a file as a block, into a channel or the index.
 *
 * @param {File}   file      The file.
 * @param {number} channelId The channel, 0 for the index.
 * @return {Promise<Block>} Its block.
 */
export async function uploadFile( file, channelId ) {
	const body = new FormData();

	body.append( 'file', file );
	body.append( 'meta[moodboard_block]', 'true' );
	channelsOf( channelId ).forEach( ( id ) =>
		body.append( `${ channelsBase }[]`, id.toString() )
	);

	return toMedia(
		await apiFetch( {
			path: addQueryArgs( routeOf( 'media' ), { context: 'edit' } ),
			method: 'POST',
			body,
		} )
	);
}

/**
 * Imports an image from its URL as a block, into a channel or the index: core downloads it, the plugin keeps the URL as
 * its source.
 *
 * @param {string} url       The URL of the image.
 * @param {number} channelId The channel, 0 for the index.
 * @return {Promise<Block>} Its block.
 */
export async function importUrl( url, channelId ) {
	return toMedia(
		await apiFetch( {
			path: addQueryArgs( routeOf( 'media' ), { context: 'edit' } ),
			method: 'POST',
			data: {
				url,
				meta: { moodboard_block: true },
				[ channelsBase ]: channelsOf( channelId ),
			},
		} )
	);
}

/**
 * Writes a text, into a channel or the index.
 *
 * @param {string} content   The text.
 * @param {number} channelId The channel, 0 for the index.
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
				[ channelsBase ]: channelsOf( channelId ),
			},
		} )
	);
}

/**
 * Adds a link, into a channel or the index, by its URL alone: WordPress gives it its title and its image, those of its
 * provider, such as the title and the thumbnail of a video, else those of its page, the image copied to the library as
 * a media that is no block. A page WordPress cannot read is added all the same, named after its URL.
 *
 * @param {string} url       The URL of the page.
 * @param {number} channelId The channel, 0 for the index.
 * @return {Promise<Block>} Its block.
 */
export async function createLink( url, channelId ) {
	return toLink(
		await apiFetch( {
			path: addQueryArgs( routeOf( 'link' ), argsOf( 'link' ) ),
			method: 'POST',
			data: {
				status: 'private',
				meta: { moodboard_source: url },
				[ channelsBase ]: channelsOf( channelId ),
			},
		} )
	);
}

/**
 * The notes of a block, the oldest first: the notes of core, which only those who may edit it read.
 *
 * @param {Block}       block  The block.
 * @param {AbortSignal} signal Stops it.
 * @return {Promise<Note[]>} Its notes.
 */
export async function fetchNotes( block, signal ) {
	const { items } = await fetchAll(
		'/wp/v2/comments',
		{
			post: block.id,
			type: 'note',
			context: 'edit',
			orderby: 'date',
			order: 'asc',
			_fields: 'id,date,content',
		},
		signal
	);

	return items.map( ( item ) => ( {
		id: item.id,
		date: item.date,
		content: item.content.raw,
	} ) );
}

/**
 * Writes a note on a block.
 *
 * @param {Block}  block   The block.
 * @param {string} content What it says.
 */
export async function addNote( block, content ) {
	await apiFetch( {
		path: '/wp/v2/comments',
		method: 'POST',
		data: { post: block.id, type: 'note', content },
	} );
}

/**
 * Deletes a note.
 *
 * @param {number} id Its comment ID.
 */
export async function deleteNote( id ) {
	await apiFetch( {
		path: `/wp/v2/comments/${ id }?force=true`,
		method: 'DELETE',
	} );
}

/**
 * Changes a block: its fields, as the API names them, such as title or meta, or its channels. A link keeps its player,
 * its URL changed or not.
 *
 * @param {Block}                   block  The block.
 * @param {Object<string, unknown>} fields What changes.
 * @return {Promise<Block>} The block.
 */
export async function updateBlock( block, fields ) {
	const item = await apiFetch( {
		path: addQueryArgs(
			`${ routeOf( block.kind ) }/${ block.id }`,
			pageArgsOf( block.kind )
		),
		method: 'POST',
		data: fields,
	} );

	return KINDS[ block.kind ].to( item );
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
