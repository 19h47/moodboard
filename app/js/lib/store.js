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
 * @property {string[]} keys   The keys of its blocks, the latest first.
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
	 * The channels of blocks being changed, one change after the other, the lists reloaded with it: each starts from the
	 * channels the one before left, as boxes ticked quickly would otherwise each send the channels of before, the last
	 * one undoing the others.
	 *
	 * @type {Promise<unknown>}
	 */
	#connecting = Promise.resolve();

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
		// A selection is of the cards of a view: another view ends it.
		this.set( ( state ) => ( {
			...state,
			...route,
			moved: 'traverse' === navigation ? 'back' : 'forward',
			selecting: false,
			selection: [],
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
				channels: { loaded: true, error: '', items },
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

	/** Loads what the view shows: its list of blocks, or its block. */
	#loadView() {
		const { view, id, from } = this.get();

		if ( [ 'media', 'text', 'link' ].includes( view ) ) {
			this.#loadBlock( /** @type {Block['kind']} */ ( view ), id );
			this.loadList(
				listKey( { view: 'channel', id: from, query: '' } )
			);
		} else {
			this.loadList( listKey( this.get() ) );
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
			const blocks = await api.fetchBlocks(
				channelId,
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
	 * Loads again what a change touches: the channels, whose counts and covers change, and the lists the view shows,
	 * which show what they hold until they have loaded again, a card changing only if its block does; the other lists
	 * go, to load again as they show.
	 */
	async #refresh() {
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
	 * into. A search goes, which may not find them.
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
		const connected = this.#connecting.then( async () => {
			const { channels } = this.get().blocks[ block.key ] ?? block;
			const channelIds = isConnected
				? [ ...new Set( [ ...channels, channelId ] ) ]
				: channels.filter( ( id ) => id !== channelId );

			this.#setBlock( await api.setChannels( block, channelIds ) );
			await this.#refresh();
		} );

		// A change that fails leaves the next to start from what is saved.
		this.#connecting = connected.catch( () => {} );
		await connected;
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
	 * Starts selecting the cards of the blocks, or ends it, the selection with it.
	 *
	 * @param {boolean} selecting Whether the cards are being selected.
	 */
	setSelecting( selecting ) {
		this.set( ( state ) => ( { ...state, selecting, selection: [] } ) );
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
	 * Changes the channels of each block selected, one after the other, then ends the selection.
	 *
	 * @param {( block: Block ) => number[]} channelsOf The channels of a block after the change.
	 * @param {string}                       done       What is said once done.
	 */
	async #changeSelection( channelsOf, done ) {
		for ( const block of this.#selected() ) {
			this.#setBlock(
				await api.setChannels( block, channelsOf( block ) )
			);
		}

		this.setSelecting( false );
		this.notify( done );
		await this.#refresh();
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

	/** Deletes the blocks selected. */
	async deleteSelection() {
		for ( const block of this.#selected() ) {
			await api.deleteBlock( block );
		}

		this.setSelecting( false );
		this.notify( __( 'Blocks deleted.', 'moodboard' ) );
		await this.#refresh();
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
