/**
 * Writing in the page, with nothing of the app: the fields of an element filled as text, an image at the width it
 * takes or loaded before it shows, a video, and the clone of a template of the page. Bricks and components share it: it
 * imports nothing.
 */

/** @import { Image } from 'moodboard-app/api' */

/**
 * Sets the text of the [data-field] elements of `$root`; an empty one is hidden, with its [data-row].
 *
 * @param {Element}                $root  The element of the fields, such as a brick or a card.
 * @param {Object<string, string>} fields The text of each field, by its name.
 */
export function fill( $root, fields ) {
	Object.entries( fields ).forEach( ( [ name, value ] ) => {
		/** @type {HTMLElement} */
		const $field = $root.querySelector( `[data-field="${ name }"]` );

		if ( ! $field ) {
			return;
		}

		/** @type {HTMLElement} */
		const $row = $field.closest( '[data-row]' ) ?? $field;

		$field.textContent = value;
		$row.hidden = ! value;
	} );
}

/**
 * Shows an image at the width it takes, its sizes before its source, for the browser to take the one it shows at
 * once; its width and height make its place known before it loads. The image is lazy, `loading="lazy"`, even on the
 * screen: the browser takes its size once laid out, `sizes="auto"`, which it ignores for an image loaded at once,
 * taking it as wide as the screen. Hidden without one.
 *
 * @param {HTMLImageElement} $image The image.
 * @param {Image|null}       image  What it shows, none without.
 */
export function fillImage( $image, image ) {
	$image.hidden = ! image;

	if ( ! image ) {
		$image.removeAttribute( 'srcset' );
		$image.removeAttribute( 'src' );
		return;
	}

	$image.sizes = 'auto';
	$image.srcset = image.srcset;
	$image.src = image.url;
	$image.width = image.width;
	$image.height = image.height;
}

/**
 * Loads an image before it shows, such as the block after the one shown, at the width it will take: the browser takes
 * the size of its srcset it will take then, which it finds in its cache.
 *
 * @param {Image}  image What it shows.
 * @param {number} width The width it will take, in CSS pixels.
 */
export function preloadImage( image, width ) {
	const $image = new Image();

	$image.sizes = `${ Math.ceil( width ) }px`;
	$image.srcset = image.srcset;
	$image.src = image.url;
}

/**
 * The width of the content of an element, its paddings left out: the place of what it holds.
 *
 * @param {Element} $element The element.
 * @return {number} Its width, in CSS pixels.
 */
export function contentWidth( $element ) {
	const { paddingInlineStart, paddingInlineEnd } =
		getComputedStyle( $element );

	return (
		$element.clientWidth -
		parseFloat( paddingInlineStart ) -
		parseFloat( paddingInlineEnd )
	);
}

/**
 * Shows a video from its URL. Hidden without one, it stops: a source taken out leaves it playing until it loads again.
 *
 * @param {HTMLVideoElement} $video The video.
 * @param {string}           url    What it plays, empty for none.
 */
export function fillVideo( $video, url ) {
	$video.hidden = ! url;

	if ( ! url ) {
		if ( $video.hasAttribute( 'src' ) ) {
			$video.removeAttribute( 'src' );
			$video.load();
		}

		return;
	}

	if ( $video.src !== url ) {
		$video.src = url;
	}
}

/**
 * A clone of the element of the template `id` of the page, which holds the translated labels.
 *
 * @param {string} id The ID of the template.
 * @return {HTMLElement} The clone.
 */
export function clone( id ) {
	return /** @type {HTMLElement} */ (
		/** @type {HTMLTemplateElement} */ (
			document.getElementById( id )
		).content.firstElementChild.cloneNode( true )
	);
}
