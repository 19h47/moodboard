/**
 * The router of the app: the URL says what shows, the index, a channel, or a media or a text with the channel it was
 * opened from, and the tab and the search of the index, and, once only, what another app shared to it. The links of
 * the app are links: the Navigation API turns a navigation within the app into a change of view, without reloading,
 * puts a view gone back to where it was, and leaves a link opened in a new tab or window to the browser. A view gives
 * way to the next one in a view transition, in which the image of a block opened goes from its card to its page, and
 * back.
 */

import { appUrl, shareParams } from 'moodboard-app/app';
import { store } from 'moodboard-app/store';

/**
 * What a URL of the app shows.
 *
 * @typedef {Object} Route
 * @property {string} view  Its view: index, channel, media, text or link.
 * @property {number} id    The channel, the media or the text of its page, 0 for the index.
 * @property {number} from  The channel a media or a text was opened from, 0 for none.
 * @property {string} tab   What the index shows: all, channels or blocks.
 * @property {string} query The search of the index.
 */

// The pages, with their ID in the argument of the same name: ?view=channel&channel=12.
const PAGE_VIEWS = [ 'channel', 'media', 'text', 'link' ];
const TABS = [ 'all', 'channels', 'blocks' ];
// The name the image of a block takes in a view transition, on its card, then on its page, or the other way.
const IMAGE_TRANSITION = 'moodboard-image';

const app = new URL( appUrl );
/**
 * Where each entry of the history was left, by its key, to put a view gone back to there.
 *
 * @type {Map<string, number>}
 */
const places = new Map();
// Whether the router writes the URL itself, as the search typed: the navigation it makes shows nothing new.
let isWritingUrl = false;

/**
 * Whether `url` is in the app: its page, whatever it shows.
 *
 * @param {string} url A URL.
 * @return {boolean} Whether it is in the app.
 */
function isApp( url ) {
	const { origin, pathname, searchParams } = new URL( url );

	return (
		origin === app.origin &&
		pathname === app.pathname &&
		[ ...app.searchParams ].every(
			( [ key, value ] ) => value === searchParams.get( key )
		)
	);
}

/**
 * A positive integer of the arguments of a URL, 0 without.
 *
 * @param {URLSearchParams} searchParams The arguments.
 * @param {string|null}     name         The argument.
 * @return {number} The integer.
 */
function idOf( searchParams, name ) {
	const id = Number( searchParams.get( name ) );

	return Number.isInteger( id ) && id > 0 ? id : 0;
}

/**
 * What `url` shows: a page with its ID, else the index with its tab and its search.
 *
 * @param {string} url A URL of the app.
 * @return {Route} What it shows.
 */
export function routeOf( url ) {
	const { searchParams } = new URL( url );
	const name = searchParams.get( 'view' );
	const id = PAGE_VIEWS.includes( name ) ? idOf( searchParams, name ) : 0;
	const view = id ? name : 'index';
	const tab = searchParams.get( 'tab' );

	return {
		view,
		id,
		from: 'channel' === view ? 0 : idOf( searchParams, 'channel' ),
		tab: 'index' === view && TABS.includes( tab ) ? tab : 'all',
		query: 'index' === view ? searchParams.get( 'q' ) ?? '' : '',
	};
}

/**
 * The URL of what shows, as routeOf() reads it.
 *
 * @param {Partial<Route>} route What shows: the index unless another view.
 * @return {string} The URL.
 */
export function urlOf( {
	view = 'index',
	id = 0,
	from = 0,
	tab = 'all',
	query = '',
} ) {
	const url = new URL( appUrl );

	if ( 'index' !== view ) {
		url.searchParams.set( 'view', view );
		url.searchParams.set( view, id.toString() );
	}

	if ( from && 'channel' !== view ) {
		url.searchParams.set( 'channel', from.toString() );
	}

	if ( 'index' === view && 'all' !== tab ) {
		url.searchParams.set( 'tab', tab );
	}

	if ( 'index' === view && query ) {
		url.searchParams.set( 'q', query );
	}

	return url.href;
}

/**
 * The image of a media on the view shown: the one of its page, else the one of its card, the first.
 *
 * @param {Route}  route The view shown.
 * @param {number} id    The media.
 * @return {HTMLImageElement|null} The image.
 */
function imageOf( route, id ) {
	if ( 'media' === route.view ) {
		return document.querySelector(
			'moodboard-view:not([hidden]) [data-part="media"] img:not([hidden])'
		);
	}

	return document.querySelector(
		`moodboard-view:not([hidden]) li[data-id="media-${ id }"] img`
	);
}

/**
 * Shows the destination of `event`, in a view transition when the browser does not show one of its own, as when a
 * page is swiped back on a phone, and no modal dialog is open over it: the image of the media opened or left goes from
 * its card to its page, or back, under the name it takes for the transition only.
 *
 * @param {NavigateEvent}       event The navigation.
 * @param {Route}               from  The view left.
 * @param {() => Promise<void>} show  Shows the destination, once it is shown.
 * @return {Promise<void>} Once the destination is shown.
 */
async function transition( event, from, show ) {
	if (
		event.hasUAVisualTransition ||
		document.querySelector( 'dialog:modal' ) ||
		! document.startViewTransition
	) {
		return show();
	}

	const to = routeOf( event.destination.url );
	const id = [ to, from ].find( ( route ) => 'media' === route.view )?.id;
	/** @type {HTMLImageElement[]} */
	const images = [];
	/** @param {HTMLImageElement|null} $image An image, or none. */
	const name = ( $image ) => {
		if ( $image ) {
			$image.style.viewTransitionName = IMAGE_TRANSITION;
			images.push( $image );
		}
	};
	const unname = () =>
		images
			.splice( 0 )
			.forEach( ( $image ) => ( $image.style.viewTransitionName = '' ) );

	name( id ? imageOf( from, id ) : null );

	const viewTransition = document.startViewTransition( async () => {
		unname();
		await show();
		name( id ? imageOf( to, id ) : null );
	} );

	viewTransition.finished.finally( unname );

	return viewTransition.updateCallbackDone;
}

navigation.addEventListener( 'navigate', ( event ) => {
	// A reload loads the page again; a download, a form sent or a page out of the app are the browser's.
	if (
		isWritingUrl ||
		! event.canIntercept ||
		event.hashChange ||
		event.downloadRequest ||
		event.formData ||
		'reload' === event.navigationType ||
		! isApp( event.destination.url )
	) {
		return;
	}

	places.set( navigation.currentEntry.key, scrollY );

	const from = routeOf( location.href );

	event.intercept( {
		// The view gives the focus itself: to its title opened, to what had it gone back to.
		focusReset: 'manual',
		scroll: 'manual',
		handler: () =>
			transition( event, from, async () => {
				store.show(
					routeOf( event.destination.url ),
					event.navigationType
				);
				// Once the bricks have drawn the view, as the store tells them after the task.
				await new Promise( ( resolve ) => setTimeout( resolve ) );

				const top =
					'traverse' === event.navigationType
						? places.get( navigation.currentEntry.key ) ?? 0
						: 0;

				scrollTo( { top, behavior: 'instant' } );
			} ),
	} );
} );

/**
 * Writes `url` in place of the URL of the app, as it shows already.
 *
 * @param {string} url A URL of the app.
 */
function replaceUrl( url ) {
	isWritingUrl = true;
	history.replaceState( history.state, '', url );
	isWritingUrl = false;
}

/**
 * What another app shared in `url`: its URL, else the first one of its text, as an app puts the URL of a page after its
 * title, else its text, else its title.
 *
 * @param {string} url A URL of the app.
 * @return {string} What it shared, empty for nothing.
 */
function sharedOf( url ) {
	const { searchParams } = new URL( url );
	const [ title, text, link ] = [
		shareParams.title,
		shareParams.text,
		shareParams.url,
	].map( ( name ) => searchParams.get( name )?.trim() ?? '' );

	return link || text.match( /https?:\/\/\S+/ )?.[ 0 ] || text || title;
}

/**
 * Goes back to where the view shown was opened from, in the app as it is open; a view opened first, as from a link or
 * once reloaded, goes to `url`.
 *
 * @param {string} url Where to go without a view before.
 */
export function back( url ) {
	const previous = navigation.entries()[ navigation.currentEntry.index - 1 ];

	if ( previous?.sameDocument ) {
		navigation.back();
	} else {
		navigation.navigate( url );
	}
}

store.show( routeOf( location.href ) );

// What is shared shows once: its URL goes, so that a reload or the history opens it no more.
const shared = sharedOf( location.href );

if ( shared ) {
	replaceUrl( urlOf( routeOf( location.href ) ) );
	store.setShared( shared );
}

// The search typed goes to the URL of the index, in place, as a link to what it finds has it.
store.select(
	( state ) => state.query.trim(),
	( query ) => {
		const route = routeOf( location.href );
		const url = urlOf( { ...route, query } );

		if ( 'index' === route.view && url !== location.href ) {
			replaceUrl( url );
		}
	}
);
