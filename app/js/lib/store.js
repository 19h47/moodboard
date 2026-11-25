/**
 * The store of the app: what shows, the channels of the curator, the lists of blocks loaded, the blocks by key, and
 * the actions that change them through the REST API. The bricks read it with select() and change it through its
 * actions only.
 */

import { __, _n, icons, sprintf, storageKey } from 'moodboard-app/app';
import { Store } from 'moodboard-app/state';
import * as api from 'moodboard-app/api';

/** @import { Block, Channel, Note } from 'moodboard-app/api' */

/**
 * A list of blocks, by key: the index, a channel or a search.
 *
 * @typedef {Object} List
 * @property {boolean}  loaded Whether it has loaded.
 * @property {string}   error  Why it could not load, empty otherwise.
 * @property {string[]} keys   The keys of its blocks: of a channel, in its order; else the latest first.
 */

/**
 * @typedef {Object} State
 * @property {string}                                                          view        The view shown: index, channel, media or text; empty until the router reads the URL.
 * @property {number}                                                          id          The channel, the media or the text of its page, 0 for none.
 * @property {number}                                                          from        The channel a block was opened from, 0 for none.
 * @property {string}                                                          tab         What the index shows: all, channels or blocks.
 * @property {string}                                                          query       The search of the index.
 * @property {string}                                                          moved       How the view was reached: forward, back, or empty at first.
 * @property {{loaded: boolean, error: string, items: Channel[]}}              channels    The channels of the curator.
 * @property {Object<string, List>}                                            lists       The lists of blocks loaded, by key.
 * @property {Object<string, Block>}                                           blocks      The blocks loaded, by key.
 * @property {boolean}                                                         adding      Whether blocks are being added.
 * @property {string}                                                          shared      What another app shared to add, until the dialog that adds shows it.
 * @property {Object<string, {loaded: boolean, error: string, items: Note[]}>} notes       The notes loaded, by the key of their block.
 * @property {boolean}                                                         selecting   Whether the cards of the blocks are selected rather than opened.
 * @property {string[]}                                                        selection   The keys of the blocks selected.
 * @property {boolean}                                                         arranging   Whether the blocks of the channel shown are put in order rather than opened.
 * @property {number}                                                          density     The size of the cards, a step of the scale from the usual one, -1, 0 or 1, or two a row, 2.
 * @property {'light'|'dark'}                                                  theme       The theme shown.
 * @property {boolean}                                                         themeChosen Whether the theme was chosen over the system one.
 * @property {string}                                                          notice      What the app says last, such as an error.
 */

/** @type {List} */
const EMPTY_LIST = { loaded: false, error: '', keys: [] };
// The path of an image file core downloads from its URL, by its extension.
const IMAGE_FILE = /\.(jpe?g|png|gif|webp|avif)$/i;
// The sizes of the cards, as steps of the scale from the usual one, the last two cards a row.
const DENSITIES = [ -1, 0, 1, 2 ];

const $root = document.documentElement;
/** @type {HTMLMetaElement} */
const $themeColor = document.querySelector( 'meta[name="theme-color"]' );
/** @type {HTMLLinkElement} */
const $favicon = document.querySelector( 'link[rel="icon"]' );
const darkQuery = matchMedia( '(prefers-color-scheme: dark)' );

/**
 * What the device keeps, checked: anything else falls back. The theme chosen is the one the theme script read from it
 * before the first paint, on <html data-theme>.
 *
 * @return {Pick<State, 'density'|'theme'|'themeChosen'>} What it keeps.
 */
function load() {
	let saved = null;

	try {
		saved = JSON.parse( localStorage.getItem( storageKey ) );
	} catch {}

	const theme = /** @type {State['theme']|undefined} */ (
		$root.dataset.theme
	);

	return {
		density: DENSITIES.includes( saved?.density ) ? saved.density : 0,
		// The theme shown, and whether it was chosen over the system one.
		theme: theme ?? ( darkQuery.matches ? 'dark' : 'light' ),
		themeChosen: undefined !== theme,
	};
}

/**
 * Keeps on the device what it keeps: the size of the cards, and the theme chosen.
 *
 * @param {State} state The state.
 */
function save( { density, theme, themeChosen } ) {
	try {
		localStorage.setItem(
			storageKey,
			JSON.stringify( { density, theme, themeChosen } )
		);
	} catch {}
}

/**
 * What was loaded before when nothing of it changed, else what loads: a card changes only if its block or its channel
 * does, its image not decoded again and the focus left on it.
 *
 * @template {Block|Channel} T
 * @param {T|undefined} previous What was loaded before, none at first.
 * @param {T}           next     What loads.
 * @return {T} The one kept.
 */
function same( previous, next ) {
	return JSON.stringify( previous ) === JSON.stringify( next )
		? previous
		: next;
}

/**
 * A block loaded, kept as it was when nothing of it changed. A list gives a link without its player: it keeps the one
 * its page loaded, while its URL is the same.
 *
 * @param {Block|undefined} previous The block loaded before, none at first.
 * @param {Block}           next     The block that loads.
 * @return {Block} The one kept.
 */
function sameBlock( previous, next ) {
	const hasPlayer =
		null === next.embed &&
		'string' === typeof previous?.embed &&
		previous.url === next.url;
	const block = hasPlayer ? { ...next, embed: previous.embed } : next;

	return same( previous, block );
}

/**
 * The key of the list of blocks of what shows: a channel, a search, or the index, as a channel 0, where a block opened
 * from the index finds its neighbours.
 *
 * @param {{view: string, id: number, query: string}} route What shows.
 * @return {string} The key.
 */
export function listKey( { view, id, query } ) {
	if ( 'channel' === view && id ) {
		return `channel-${ id }`;
	}

	return query ? `search-${ query }` : 'index';
}

/**
 * Where blocks added go, as files dropped or pasted: into the channel shown, the one a block shown was opened from, or
 * the index, 0.
 *
 * @param {{view: string, id: number, from: number}} route What shows.
 * @return {number} The channel, 0 for the index.
 */
export function targetOf( { view, id, from } ) {
	if ( 'channel' === view ) {
		return id;
	}

	return 'index' === view ? 0 : from;
}

/** @augments {Store<State>} */
class MoodboardStore extends Store {
	/**
	 * A controller per request in flight, by what it loads, aborted by the next one.
	 *
	 * @type {Map<string, AbortController>}
	 */
	#controllers = new Map();

	/**
	 * The channels of blocks being changed, one change after the other: each starts from the channels the one before
	 * left, as boxes ticked quickly would otherwise each send the channels of before, the last one undoing the others.
	 *
	 * @type {Promise<unknown>}
	 */
	#connecting = Promise.resolve();

	/**
	 * The orders of the channels being kept, one after the other: the last one sent is the one kept.
	 *
	 * @type {Promise<unknown>}
	 */
	#ordering = Promise.resolve();

	/**
	 * The load of what changes touch, in flight, and the one that follows it for the changes made meanwhile.
	 *
	 * @type {Promise<void>|null}
	 */
	#refreshing = null;

	/** @type {Promise<void>|null} */
	#nextRefresh = null;

	constructor() {
		super( {
			view: '',
			id: 0,
			from: 0,
			tab: 'all',
			query: '',
			moved: '',
			channels: { loaded: false, error: '', items: [] },
			lists: {},
			blocks: {},
			adding: false,
			shared: '',
			notes: {},
			selecting: false,
			selection: [],
			arranging: false,
			...load(),
			notice: '',
		} );

		// The system theme, until one is chosen.
		darkQuery.addEventListener( 'change', ( { matches } ) => {
			this.set( ( state ) =>
				state.themeChosen
					? state
					: { ...state, theme: matches ? 'dark' : 'light' }
			);
		} );

		// Back to the app, what was added meanwhile shows, such as a block shared from a phone: the lists loaded wait otherwise.
		document.addEventListener( 'visibilitychange', () => {
			const { view, arranging } = this.get();

			// Blocks being put in order keep the order given, until it is kept.
			if (
				'visible' === document.visibilityState &&
				view &&
				! arranging
			) {
				this.#refresh();
			}
		} );

		this.subscribe( ( state, previous ) => {
			if (
				[ 'density', 'theme', 'themeChosen' ].some(
					( key ) => state[ key ] !== previous[ key ]
				)
			) {
				save( state );
			}
		} );
	}

	/**
	 * A signal for `key`, the request before it for the same key aborted.
	 *
	 * @param {string} key What it loads.
	 * @return {AbortSignal} The signal.
	 */
	#signal( key ) {
		this.#controllers.get( key )?.abort();

		const controller = new AbortController();

		this.#controllers.set( key, controller );

		return controller.signal;
	}

	/**
	 * Shows what a URL says, as the router reads it, and loads what it needs.
	 *
	 * @param {{view: string, id: number, from: number, tab: string, query: string}} route        What shows.
	 * @param {string}                                                               [navigation] How it was reached, as the Navigation API says.
	 */
	show( route, navigation = '' ) {
		// A selection, or an order being given, is of the cards of a view: another view ends it.
		this.set( ( state ) => ( {
			...state,
			...route,
			moved: 'traverse' === navigation ? 'back' : 'forward',
			selecting: false,
			selection: [],
			arranging: false,
		} ) );

		if ( ! this.get().channels.loaded ) {
			this.loadChannels();
		} else {
			this.#loadView();
		}
	}

	/** Loads the channels of the curator, then the blocks of the view. */
	async loadChannels() {
		if ( await this.#fetchChannels() ) {
			this.#loadView();
		}
	}

	/**
	 * Loads the channels of the curator, their counts and their covers.
	 *
	 * @return {Promise<boolean>} Whether they loaded.
	 */
	async #fetchChannels() {
		try {
			const items = await api.fetchChannels( this.#signal( 'channels' ) );

			this.set( ( state ) => ( {
				...state,
				channels: {
					loaded: true,
					error: '',
					items: items.map( ( item ) =>
						same(
							state.channels.items.find(
								( channel ) => channel.id === item.id
							),
							item
						)
					),
				},
			} ) );

			return true;
		} catch ( error ) {
			if ( 'AbortError' !== error?.name ) {
				this.set( ( state ) => ( {
					...state,
					channels: {
						...state.channels,
						loaded: true,
						error: api.errorMessage(
							error,
							__( 'The channels could not load.', 'moodboard' )
						),
					},
				} ) );
			}

			return false;
		}
	}

	/**
	 * Loads what the view shows: its block, and its list of blocks, unless loaded. A change loads the lists it touches
	 * again, refresh(): one loaded is as it is on the server.
	 */
	#loadView() {
		const { view, id, from, lists } = this.get();
		const isBlock = [ 'media', 'text', 'link' ].includes( view );
		const key = isBlock
			? listKey( { view: 'channel', id: from, query: '' } )
			: listKey( this.get() );

		if ( isBlock ) {
			this.#loadBlock( /** @type {Block['kind']} */ ( view ), id );
		}

		if ( ! lists[ key ]?.loaded || lists[ key ].error ) {
			this.loadList( key );
		}
	}

	/**
	 * Loads a list of blocks again: the blocks of a channel, of the index, or those a search finds in it.
	 *
	 * @param {string} key The key of the list, as listKey() gives it.
	 */
	async loadList( key ) {
		const { query } = this.get();
		const channelId = Number( key.match( /^channel-(\d+)$/ )?.[ 1 ] ?? 0 );
		const search = key.startsWith( 'search-' ) ? query : '';

		try {
			const { blocks, corrected } = await api.fetchBlocks(
				channelId,
				search,
				this.#signal( key )
			);

			this.set( ( state ) => {
				const channel = state.channels.items.find(
					( item ) => item.id === channelId
				);
				const ordered = channel
					? api.inOrder( blocks, channel.order )
					: blocks;

				return {
					...state,
					blocks: {
						...state.blocks,
						...Object.fromEntries(
							blocks.map( ( block ) => [
								block.key,
								sameBlock( state.blocks[ block.key ], block ),
							] )
						),
					},
					lists: {
						...state.lists,
						[ key ]: {
							loaded: true,
							error: '',
							keys: ordered.map( ( block ) => block.key ),
						},
					},
				};
			} );

			if ( corrected ) {
				this.notify(
					sprintf(
						/* translators: %s: the search, a word typed wrong taken for the closest word of the blocks. */
						__( 'Results for “%s”.', 'moodboard' ),
						corrected
					)
				);
			}
		} catch ( error ) {
			if ( 'AbortError' !== error?.name ) {
				this.#setList( key, {
					loaded: true,
					error: api.errorMessage(
						error,
						__( 'The blocks could not load.', 'moodboard' )
					),
				} );
			}
		}
	}

	/**
	 * Changes a list.
	 *
	 * @param {string}        key   Its key.
	 * @param {Partial<List>} patch What changes.
	 */
	#setList( key, patch ) {
		this.set( ( state ) => ( {
			...state,
			lists: {
				...state.lists,
				[ key ]: { ...( state.lists[ key ] ?? EMPTY_LIST ), ...patch },
			},
		} ) );
	}

	/**
	 * Loads a block shown, unless a list has.
	 *
	 * @param {Block['kind']} kind Its kind.
	 * @param {number}        id   Its ID.
	 */
	async #loadBlock( kind, id ) {
		const block = this.get().blocks[ `${ kind }-${ id }` ];

		// A list gives a link without its player, which its page loads.
		if ( block && ( 'link' !== kind || null !== block.embed ) ) {
			return;
		}

		try {
			this.#setBlock(
				await api.fetchBlock( kind, id, this.#signal( 'block' ) )
			);
		} catch ( error ) {
			if ( 'AbortError' !== error?.name ) {
				this.notify(
					api.errorMessage(
						error,
						__( 'The block could not load.', 'moodboard' )
					)
				);
			}
		}
	}

	/**
	 * Keeps a block loaded or changed.
	 *
	 * @param {Block} block The block.
	 */
	#setBlock( block ) {
		this.set( ( state ) => ( {
			...state,
			blocks: {
				...state.blocks,
				[ block.key ]: sameBlock( state.blocks[ block.key ], block ),
			},
		} ) );
	}

	/**
	 * Searches the index: its blocks and its channels whose name has the search.
	 *
	 * @param {string} query The search.
	 */
	setQuery( query ) {
		this.set( ( state ) => ( { ...state, query } ) );
		this.loadList( listKey( this.get() ) );
	}

	/**
	 * Says something, as a notice that assistive technologies read.
	 *
	 * @param {string} notice What to say.
	 */
	notify( notice ) {
		this.set( ( state ) => ( { ...state, notice } ) );
	}

	/**
	 * Loads again what a change touches, once for the changes made meanwhile: a load in flight started before the last
	 * change, so one more follows it, which every change made meanwhile shares, as boxes of Connect ticked quickly.
	 *
	 * @return {Promise<void>} Once what the change touches has loaded.
	 */
	#refresh() {
		if ( ! this.#refreshing ) {
			this.#refreshing = this.#reload().finally( () => {
				this.#refreshing = null;
			} );

			return this.#refreshing;
		}

		this.#nextRefresh ??= this.#refreshing.then( () => {
			this.#nextRefresh = null;

			return this.#refresh();
		} );

		return this.#nextRefresh;
	}

	/**
	 * Loads again the channels, whose counts and covers change, and the lists the view shows, which show what they hold
	 * until they have loaded again, a card changing only if its block does; the other lists go, to load again as they
	 * show.
	 */
	async #reload() {
		const { view, from } = this.get();
		const shown = [ 'media', 'text', 'link' ].includes( view )
			? listKey( { view: 'channel', id: from, query: '' } )
			: listKey( this.get() );

		this.set( ( state ) => ( {
			...state,
			lists: state.lists[ shown ]
				? { [ shown ]: state.lists[ shown ] }
				: {},
		} ) );
		await Promise.all( [ this.#fetchChannels(), this.loadList( shown ) ] );
	}

	/**
	 * Puts blocks added first in the lists loaded they belong to, as the latest: the index, and the channel they went
	 * into, whose order they are not in yet. A search goes, which may not find them.
	 *
	 * @param {number}  channelId The channel, 0 for the index.
	 * @param {Block[]} blocks    The blocks added, the latest last.
	 */
	#prepend( channelId, blocks ) {
		const keys = blocks.map( ( block ) => block.key ).reverse();
		const into = [ 'index', `channel-${ channelId }` ];

		this.set( ( state ) => ( {
			...state,
			lists: Object.fromEntries(
				Object.entries( state.lists )
					.filter( ( [ key ] ) => ! key.startsWith( 'search-' ) )
					.map( ( [ key, list ] ) => [
						key,
						into.includes( key )
							? { ...list, keys: [ ...keys, ...list.keys ] }
							: list,
					] )
			),
		} ) );
	}

	/**
	 * Adds blocks, to a channel or the index: the files dropped, pasted or picked, the image of a URL, or a text.
	 *
	 * @param {number}                        channelId The channel, 0 for the index.
	 * @param {{files: File[], text: string}} added     What is added.
	 * @return {Promise<boolean>} Whether everything was added.
	 */
	async add( channelId, { files, text } ) {
		const content = text.trim();
		const isUrl = /^https?:\/\/\S+$/.test( content );
		// The URL of an image file, which core downloads; any other is a link, a page or a video.
		const isImage = isUrl && IMAGE_FILE.test( new URL( content ).pathname );
		/** @type {Array<() => Promise<Block>>} */
		const requests = [
			...files.map( ( file ) => () => api.uploadFile( file, channelId ) ),
		];

		if ( isImage ) {
			requests.push( () => api.importUrl( content, channelId ) );
		} else if ( isUrl ) {
			requests.push( () => api.createLink( content, channelId ) );
		} else if ( content ) {
			requests.push( () => api.createText( content, channelId ) );
		}

		const errors = [];
		/** @type {Block[]} */
		const added = [];

		// Said at once, as a file dropped or pasted takes a moment to upload.
		this.set( ( state ) => ( {
			...state,
			adding: true,
			notice: sprintf(
				/* translators: %d: number of blocks being added. */
				_n(
					'Adding %d block…',
					'Adding %d blocks…',
					requests.length,
					'moodboard'
				),
				requests.length
			),
		} ) );

		// One after the other: a server takes one upload at a time better than many.
		for ( const request of requests ) {
			try {
				const block = await request();

				this.#setBlock( block );
				added.push( block );
			} catch ( error ) {
				errors.push(
					api.errorMessage(
						error,
						__( 'A block could not be added.', 'moodboard' )
					)
				);
			}
		}

		this.set( ( state ) => ( { ...state, adding: false } ) );
		this.notify(
			errors.join( ' ' ) ||
				sprintf(
					/* translators: %d: number of blocks added. */
					_n(
						'%d block added.',
						'%d blocks added.',
						requests.length,
						'moodboard'
					),
					requests.length
				)
		);
		// The grid takes the blocks added as they are, without loading again: the channels only change, their counts.
		this.#prepend( channelId, added );
		await this.#fetchChannels();

		return ! errors.length;
	}

	/**
	 * Adds a channel, under another or none.
	 *
	 * @param {{name: string, description: string, parent: number}} fields Its fields.
	 * @return {Promise<Channel>} The channel.
	 */
	async createChannel( fields ) {
		const channel = await api.createChannel( fields );

		// A channel added is empty: the lists of blocks stay as they are.
		await this.#fetchChannels();

		return channel;
	}

	/**
	 * Changes a channel: its name, its description or its parent, which the lists of blocks leave out, a channel listing
	 * its own blocks, not those of its sub-channels.
	 *
	 * @param {number}                                                       id     The channel.
	 * @param {Partial<{name: string, description: string, parent: number}>} fields What changes.
	 */
	async updateChannel( id, fields ) {
		await api.updateChannel( id, fields );
		await this.#fetchChannels();
	}

	/**
	 * Deletes a channel.
	 *
	 * @param {number} id The channel.
	 */
	async deleteChannel( id ) {
		await api.deleteChannel( id );
		await this.#refresh();
	}

	/**
	 * Changes the fields of a block, as the API names them.
	 *
	 * @param {Block}                   block  The block.
	 * @param {Object<string, unknown>} fields What changes.
	 */
	async updateBlock( block, fields ) {
		this.#setBlock( await api.updateBlock( block, fields ) );
	}

	/**
	 * Puts a block in a channel, or takes it out.
	 *
	 * @param {Block}   block       The block.
	 * @param {number}  channelId   The channel.
	 * @param {boolean} isConnected Whether it goes in.
	 */
	async connect( block, channelId, isConnected ) {
		const connected = this.#connecting.then( async () => {
			const { channels } = this.get().blocks[ block.key ] ?? block;
			const channelIds = isConnected
				? [ ...new Set( [ ...channels, channelId ] ) ]
				: channels.filter( ( id ) => id !== channelId );

			this.#setBlock( await api.setChannels( block, channelIds ) );
		} );

		// A change that fails leaves the next to start from what is saved.
		this.#connecting = connected.catch( () => {} );
		await connected;
		// Out of the line of the changes: the next one waits for this one, not for what it loads.
		await this.#refresh();
	}

	/**
	 * Deletes a block.
	 *
	 * @param {Block} block The block.
	 */
	async deleteBlock( block ) {
		await api.deleteBlock( block );
		this.#forget( block );
		await this.#refresh();
	}

	/**
	 * Forgets a block deleted.
	 *
	 * @param {Block} block The block.
	 */
	#forget( block ) {
		this.set( ( state ) => {
			const blocks = { ...state.blocks };

			delete blocks[ block.key ];

			return { ...state, blocks };
		} );
	}

	/**
	 * Sets the size of the cards, kept on the device.
	 *
	 * @param {number} density A step of the scale from the usual size, -1, 0 or 1, or two cards a row, 2.
	 */
	setDensity( density ) {
		if ( ! DENSITIES.includes( density ) ) {
			return;
		}

		this.set( ( state ) => ( { ...state, density } ) );
	}

	/** Switches between the light and dark themes, chosen over the system one from then on. */
	toggleTheme() {
		this.set( ( state ) => ( {
			...state,
			theme: 'dark' === state.theme ? 'light' : 'dark',
			themeChosen: true,
		} ) );
	}

	/**
	 * Gives what another app shared to the dialog that adds it, or takes it back once shown.
	 *
	 * @param {string} shared A URL or a text, empty once shown.
	 */
	setShared( shared ) {
		this.set( ( state ) => ( { ...state, shared } ) );
	}

	/**
	 * Starts selecting the cards of the blocks, or ends it, the selection with it; the cards are no longer put in order.
	 *
	 * @param {boolean} selecting Whether the cards are being selected.
	 */
	setSelecting( selecting ) {
		this.set( ( state ) => ( {
			...state,
			selecting,
			selection: [],
			arranging: false,
		} ) );
	}

	/**
	 * Starts putting the blocks of the channel shown in order, or ends it; the cards are no longer selected.
	 *
	 * @param {boolean} arranging Whether the blocks are being put in order.
	 */
	setArranging( arranging ) {
		this.set( ( state ) => ( {
			...state,
			arranging,
			selecting: false,
			selection: [],
		} ) );
	}

	/**
	 * Moves a block of a channel to a place of its list, as it is dragged or moved by the keys, without keeping the order
	 * yet: saveOrder() keeps it.
	 *
	 * @param {number} channelId The channel.
	 * @param {string} key       The key of the block.
	 * @param {number} place     Its place among the blocks of the channel, from 0.
	 */
	moveBlock( channelId, key, place ) {
		const list = this.get().lists[ `channel-${ channelId }` ];

		if ( ! list?.keys.includes( key ) ) {
			return;
		}

		const keys = list.keys.filter( ( item ) => item !== key );
		const to = Math.max( 0, Math.min( place, keys.length ) );

		// A card dragged over its own place, or a key that goes nowhere, moves nothing: the grid is not drawn again.
		if ( list.keys.indexOf( key ) === to ) {
			return;
		}

		keys.splice( to, 0, key );
		this.#setList( `channel-${ channelId }`, { keys } );
	}

	/**
	 * Keeps the order of the blocks of a channel, as its list holds it, after the orders sent before it. One that fails
	 * says so, and the channel loads again, in the order kept.
	 *
	 * @param {number} channelId The channel.
	 */
	async saveOrder( channelId ) {
		const { lists, blocks } = this.get();
		const blockIds = ( lists[ `channel-${ channelId }` ]?.keys ?? [] )
			.map( ( key ) => blocks[ key ]?.id )
			.filter( Boolean );
		const saved = this.#ordering.then( async () => {
			const channel = await api.orderChannel( channelId, blockIds );

			this.set( ( state ) => ( {
				...state,
				channels: {
					...state.channels,
					items: state.channels.items.map( ( item ) =>
						item.id === channel.id ? channel : item
					),
				},
			} ) );
		} );

		this.#ordering = saved.catch( () => {} );

		try {
			await saved;
		} catch ( error ) {
			this.notify(
				api.errorMessage(
					error,
					__( 'The order could not be kept.', 'moodboard' )
				)
			);
			await this.#refresh();
		}
	}

	/**
	 * Selects a block, or no longer.
	 *
	 * @param {string}  key        The key of the block.
	 * @param {boolean} isSelected Whether it is selected.
	 */
	setSelected( key, isSelected ) {
		this.set( ( state ) => ( {
			...state,
			selection: isSelected
				? [ ...new Set( [ ...state.selection, key ] ) ]
				: state.selection.filter( ( item ) => item !== key ),
		} ) );
	}

	/**
	 * The blocks selected.
	 *
	 * @return {Block[]} The blocks.
	 */
	#selected() {
		const { selection, blocks } = this.get();

		return selection.map( ( key ) => blocks[ key ] ).filter( Boolean );
	}

	/**
	 * Changes the channels of each block selected, one after the other, then ends the selection. One that fails stops
	 * the others; the grid then shows those changed already.
	 *
	 * @param {( block: Block ) => number[]} channelsOf The channels of a block after the change.
	 * @param {string}                       done       What is said once done.
	 */
	async #changeSelection( channelsOf, done ) {
		try {
			for ( const block of this.#selected() ) {
				this.#setBlock(
					await api.setChannels( block, channelsOf( block ) )
				);
			}

			this.notify( done );
		} finally {
			this.setSelecting( false );
			await this.#refresh();
		}
	}

	/**
	 * Puts the blocks selected in channels, besides the ones they are in.
	 *
	 * @param {number[]} channelIds The channels.
	 */
	connectSelection( channelIds ) {
		return this.#changeSelection(
			( block ) => [ ...new Set( [ ...block.channels, ...channelIds ] ) ],
			__( 'Blocks connected.', 'moodboard' )
		);
	}

	/**
	 * Takes the blocks selected out of a channel.
	 *
	 * @param {number} channelId The channel.
	 */
	disconnectSelection( channelId ) {
		return this.#changeSelection(
			( block ) => block.channels.filter( ( id ) => id !== channelId ),
			__( 'Blocks removed from the channel.', 'moodboard' )
		);
	}

	/**
	 * Puts the blocks selected first or last in the channel shown, in the order they have, then keeps it.
	 *
	 * @param {'first'|'last'} where Where they go.
	 */
	async moveSelection( where ) {
		const { id, lists, selection } = this.get();
		const keys = lists[ `channel-${ id }` ]?.keys ?? [];
		const moved = keys.filter( ( key ) => selection.includes( key ) );
		const others = keys.filter( ( key ) => ! selection.includes( key ) );

		this.#setList( `channel-${ id }`, {
			keys:
				'first' === where
					? [ ...moved, ...others ]
					: [ ...others, ...moved ],
		} );
		this.setSelecting( false );
		this.notify( __( 'Blocks moved.', 'moodboard' ) );
		await this.saveOrder( id );
	}

	/**
	 * Deletes the blocks selected. One that fails stops the others; the grid then shows those left.
	 */
	async deleteSelection() {
		try {
			for ( const block of this.#selected() ) {
				await api.deleteBlock( block );
				this.#forget( block );
			}

			this.notify( __( 'Blocks deleted.', 'moodboard' ) );
		} finally {
			this.setSelecting( false );
			await this.#refresh();
		}
	}

	/**
	 * Loads the notes of a block.
	 *
	 * @param {Block} block The block.
	 */
	async loadNotes( block ) {
		try {
			const items = await api.fetchNotes(
				block,
				this.#signal( `notes-${ block.key }` )
			);

			this.#setNotes( block, { loaded: true, error: '', items } );
		} catch ( error ) {
			if ( 'AbortError' !== error?.name ) {
				this.#setNotes( block, {
					loaded: true,
					error: api.errorMessage(
						error,
						__( 'The notes could not load.', 'moodboard' )
					),
					items: this.get().notes[ block.key ]?.items ?? [],
				} );
			}
		}
	}

	/**
	 * Keeps the notes of a block.
	 *
	 * @param {Block}                                           block The block.
	 * @param {{loaded: boolean, error: string, items: Note[]}} notes Its notes.
	 */
	#setNotes( block, notes ) {
		this.set( ( state ) => ( {
			...state,
			notes: { ...state.notes, [ block.key ]: notes },
		} ) );
	}

	/**
	 * Writes a note on a block, then loads its notes again.
	 *
	 * @param {Block}  block   The block.
	 * @param {string} content What it says.
	 */
	async addNote( block, content ) {
		await api.addNote( block, content );
		await this.loadNotes( block );
	}

	/**
	 * Deletes a note of a block, then loads its notes again.
	 *
	 * @param {Block}  block The block.
	 * @param {number} id    The note.
	 */
	async deleteNote( block, id ) {
		await api.deleteNote( id );
		await this.loadNotes( block );
	}
}

export const store = new MoodboardStore();

// The document follows the store: CSS reads this attribute, the browser its color and its icon.
store.select(
	( state ) => state.theme,
	( theme ) => {
		$root.dataset.theme = theme;
		$themeColor.content = getComputedStyle( $root ).backgroundColor;
		$favicon.href = icons[ theme ];
	}
);
