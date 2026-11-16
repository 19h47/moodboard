/**
 * The theme of the app before the first paint: the one chosen over the system one, which the store keeps under the key
 * of the config, as <html data-theme>; else the styles follow the system. The store, a module run once the page is read,
 * takes it over from there. The login of the app reads it too, without the store.
 */
( () => {
	try {
		const { theme, themeChosen } =
			JSON.parse(
				localStorage.getItem( window.moodboardApp.storageKey )
			) ?? {};

		if ( true === themeChosen && [ 'light', 'dark' ].includes( theme ) ) {
			document.documentElement.dataset.theme = theme;
		}
	} catch {}
} )();
