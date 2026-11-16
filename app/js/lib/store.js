/**
 * The store of the app: what shows, the channels of the curator, the lists of blocks loaded, the blocks by key, and
 * the actions that change them through the REST API. The bricks read it with select() and change it through its
 * actions only.
 */

import { __, _n, sprintf } from 'moodboard-app/app';
import { Store } from 'moodboard-app/state';
import * as api from 'moodboard-app/api';

/** @import { Block, Channel } from 'moodboard-app/api' */

/**
 * A list of blocks, by key: the index, a channel or a search.
 *
 * @typedef {Object} List
 * @property {boolean}  loaded Whether it has loaded.
 * @property {string}   error  Why it could not load, empty otherwise.
 * @property {string[]} keys   The keys of its blocks, the latest first.
 */

/**
 * @typedef {Object} State
 * @property {string}                                             view     The view shown: index, channel, media or text; empty until the router reads the URL.
 * @property {number}                                             id       The channel, the media or the text of its page, 0 for none.
 * @property {number}                                             from     The channel a block was opened from, 0 for none.
 * @property {string}                                             tab      What the index shows: all, channels or blocks.
 * @property {string}                                             query    The search of the index.
 * @property {string}                                             moved    How the view was reached: forward, back, or empty at first.
 * @property {{loaded: boolean, error: string, items: Channel[]}} channels The channels of the curator.
 * @property {Object<string, List>}                               lists    The lists of blocks loaded, by key.
 * @property {Object<string, Block>}                              blocks   The blocks loaded, by key.
 * @property {boolean}                                            adding   Whether blocks are being added.
 * @property {string}                                             notice   What the app says last, such as an error.
 */

/** @type {List} */
const EMPTY_LIST = { loaded: false, error: '', keys: [] };

/**
 * The key of the list of blocks of what shows: a channel, a search, or the index.
 *
 * @param {{view: string, id: number, query: string}} route What shows.
 * @return {string} The key.
 */
export function listKey( { view, id, query } ) {
	if ( 'channel' === view ) {
		return `channel-${ id }`;
	}

	return query ? `search-${ query }` : 'index';
}

/** @augments {Store<State>} */
class MoodboardStore extends Store {
	/**
	 * A controller per request in flight, by what it loads, aborted by the next one.
	 *
	 * @type {Map<string, AbortController>}
	 */
	#controllers = new Map();

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
			notice: '',
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
		this.set( ( state ) => ( {
			...state,
			...route,
			moved: 'traverse' === navigation ? 'back' : 'forward',
		} ) );

		if ( ! this.get().channels.loaded ) {
			this.loadChannels();
		} else {
			this.#loadView();
		}
	}

	/** Loads the channels of the curator, then the blocks of the view. */
	async loadChannels() {
		try {
			const items = await api.fetchChannels( this.#signal( 'channels' ) );

			this.set( ( state ) => ( {
				...state,
				channels: { loaded: true, error: '', items },
			} ) );
			this.#loadView();
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
		}
	}

	/** Loads what the view shows: its list of blocks, or its block. */
	#loadView() {
		const { view, id, from } = this.get();

		if ( 'media' === view || 'text' === view ) {
			this.#loadBlock( view, id );
			this.loadList(
				listKey( { view: 'channel', id: from, query: '' } )
			);
		} else {
			this.loadList( listKey( this.get() ) );
		}
	}

	/**
	 * Loads a list of blocks again: the blocks of a channel, of every channel of the curator, or those a search finds.
	 *
	 * @param {string} key The key of the list, as listKey() gives it.
	 */
	async loadList( key ) {
		const { channels, query } = this.get();
		const channelId = Number( key.match( /^channel-(\d+)$/ )?.[ 1 ] ?? 0 );
		const ids = channelId
			? [ channelId ]
			: channels.items.map( ( channel ) => channel.id );
		const search = key.startsWith( 'search-' ) ? query : '';

		try {
			const blocks = await api.fetchBlocks(
				ids,
				search,
				this.#signal( key )
			);

			this.set( ( state ) => ( {
				...state,
				blocks: {
					...state.blocks,
					...Object.fromEntries(
						blocks.map( ( block ) => [ block.key, block ] )
					),
				},
				lists: {
					...state.lists,
					[ key ]: {
						loaded: true,
						error: '',
						keys: blocks.map( ( block ) => block.key ),
					},
				},
			} ) );
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
	 * @param {'media'|'text'} kind Its kind.
	 * @param {number}         id   Its ID.
	 */
	async #loadBlock( kind, id ) {
		if ( this.get().blocks[ `${ kind }-${ id }` ] ) {
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
			blocks: { ...state.blocks, [ block.key ]: block },
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
	 * Loads again what a change touches: the channels, whose counts change, and the lists loaded, which drop the others,
	 * to load again as they show.
	 */
	async #refresh() {
		this.set( ( state ) => ( { ...state, lists: {} } ) );
		await this.loadChannels();
	}

	/**
	 * Adds blocks to a channel: the files dropped or picked, the image of a URL, or a text.
	 *
	 * @param {number}                        channelId The channel.
	 * @param {{files: File[], text: string}} added     What is added.
	 * @return {Promise<boolean>} Whether everything was added.
	 */
	async add( channelId, { files, text } ) {
		const content = text.trim();
		const isUrl = /^https?:\/\/\S+$/.test( content );
		const requests = [
			...files.map( ( file ) => () => api.uploadFile( file, channelId ) ),
			...( content && isUrl
				? [ () => api.importUrl( content, channelId ) ]
				: [] ),
			...( content && ! isUrl
				? [ () => api.createText( content, channelId ) ]
				: [] ),
		];
		const errors = [];

		this.set( ( state ) => ( { ...state, adding: true } ) );

		// One after the other: a server takes one upload at a time better than many.
		for ( const request of requests ) {
			try {
				this.#setBlock( await request() );
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
		await this.#refresh();

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

		await this.#refresh();

		return channel;
	}

	/**
	 * Changes a channel.
	 *
	 * @param {number}                                                       id     The channel.
	 * @param {Partial<{name: string, description: string, parent: number}>} fields What changes.
	 */
	async updateChannel( id, fields ) {
		await api.updateChannel( id, fields );
		await this.#refresh();
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
		const channelIds = isConnected
			? [ ...new Set( [ ...block.channels, channelId ] ) ]
			: block.channels.filter( ( id ) => id !== channelId );

		this.#setBlock( await api.setChannels( block, channelIds ) );
		await this.#refresh();
	}

	/**
	 * Deletes a block.
	 *
	 * @param {Block} block The block.
	 */
	async deleteBlock( block ) {
		await api.deleteBlock( block );
		this.set( ( state ) => {
			const blocks = { ...state.blocks };

			delete blocks[ block.key ];

			return { ...state, blocks };
		} );
		await this.#refresh();
	}
}

export const store = new MoodboardStore();
