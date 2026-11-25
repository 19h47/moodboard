/**
 * What the page of the app gives its scripts: the packages of WordPress as wp, and the config of the app, which
 * get_config() prints; and what the browsers have that TypeScript does not type yet: the Navigation API, which the
 * router goes through, moveBefore(), the focusVisible option of focus() and the command event of the invoker commands,
 * which opens the dialogs.
 */

import type apiFetch from '@wordpress/api-fetch';
import type * as i18n from '@wordpress/i18n';
import type * as url from '@wordpress/url';

declare global {
	interface Window {
		wp: {
			apiFetch: typeof apiFetch;
			i18n: typeof i18n;
			url: typeof url;
		};
		moodboardApp: {
			appUrl: string;
			storageKey: string;
			channelFields: string;
			mediaFields: string;
			textFields: string;
			perPage: number;
			channelsBase: string;
			textsBase: string;
			linkFields: string;
			linksBase: string;
			icons: { light: string; dark: string };
			shareParams: { title: string; text: string; url: string };
		};
	}

	interface Element {
		/** Moves a child before another one, or last, keeping its state, such as its focus; not in every browser yet. */
		moveBefore?: ( node: Node, child: Node | null ) => void;
	}

	interface FocusOptions {
		/** Whether the element focused shows its outline, rather than as the browser guesses. */
		focusVisible?: boolean;
	}

	interface NavigationHistoryEntry {
		readonly key: string;
		readonly index: number;
		readonly sameDocument: boolean;
	}

	interface NavigationDestination {
		readonly url: string;
		// The key of the entry gone to in the history, empty for a new one.
		readonly key: string;
	}

	interface NavigationInterceptOptions {
		handler?: () => Promise< void >;
		focusReset?: 'after-transition' | 'manual';
		scroll?: 'after-transition' | 'manual';
	}

	interface NavigateEvent extends Event {
		readonly navigationType: 'push' | 'replace' | 'reload' | 'traverse';
		readonly destination: NavigationDestination;
		readonly canIntercept: boolean;
		readonly hashChange: boolean;
		readonly downloadRequest: string | null;
		readonly formData: FormData | null;
		readonly hasUAVisualTransition: boolean;
		readonly sourceElement: Element | null;
		intercept: ( options?: NavigationInterceptOptions ) => void;
	}

	interface NavigationResult {
		committed: Promise< NavigationHistoryEntry >;
		finished: Promise< NavigationHistoryEntry >;
	}

	interface Navigation extends EventTarget {
		readonly currentEntry: NavigationHistoryEntry;
		entries: () => NavigationHistoryEntry[];
		navigate: (
			url: string,
			options?: { history?: 'auto' | 'push' | 'replace' }
		) => NavigationResult;
		back: () => NavigationResult;
		addEventListener: ( (
			type: 'navigate',
			listener: ( event: NavigateEvent ) => void,
			options?: boolean | AddEventListenerOptions
		) => void ) &
			( (
				type: 'navigatesuccess',
				listener: ( event: Event ) => void,
				options?: boolean | AddEventListenerOptions
			) => void );
	}

	var navigation: Navigation;

	/** The event a button of an invoker command fires on its target, such as a dialog it opens. */
	interface CommandEvent extends Event {
		readonly command: string;
		readonly source: Element | null;
	}
}

export {};
