/**
 * Letters that scramble, then settle from the first to the last, as a text comes in. The text itself stays as it is,
 * for assistive technologies, the search of the page and a selection: its letters scrambled are drawn over it, from
 * its [data-scramble], which they do not read. Nothing moves for whom asks for less motion.
 */

// How long a draw of the letters shows, and how many draws until the last one settles.
const FRAME_MS = 30;
const FRAMES = 10;
// A character scrambles to one of its kind, so that the line keeps its shape.
const KINDS = [
	{ pattern: /\p{Ll}/u, characters: 'abcdefghijklmnopqrstuvwxyz' },
	{ pattern: /\p{Lu}/u, characters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' },
	{ pattern: /\d/, characters: '0123456789' },
];

const reducedMotion = matchMedia( '(prefers-reduced-motion: reduce)' );

/**
 * The frame each element waits for, to stop it when its text comes in again.
 *
 * @type {WeakMap<HTMLElement, number>}
 */
const frames = new WeakMap();

/**
 * A character of the same kind as `character`, at random: a space or a sign stays as it is.
 *
 * @param {string} character A character.
 * @return {string} Its scrambled one.
 */
function scrambleCharacter( character ) {
	const characters = KINDS.find( ( { pattern } ) =>
		pattern.test( character )
	)?.characters;

	return characters
		? characters[ Math.floor( Math.random() * characters.length ) ]
		: character;
}

/**
 * Brings the text of `$element` in, its letters scrambled, then settling from the first to the last.
 *
 * @param {HTMLElement} $element An element of text, as it is written.
 */
export function scramble( $element ) {
	cancelAnimationFrame( frames.get( $element ) );
	delete $element.dataset.scramble;

	const characters = [ ...$element.textContent ];

	if ( reducedMotion.matches || ! characters.length ) {
		return;
	}

	const start = performance.now();
	let drawn = -1;

	const draw = ( /** @type {number} */ now ) => {
		const frame = Math.floor( ( now - start ) / FRAME_MS );
		const settled = Math.ceil( ( characters.length * frame ) / FRAMES );

		if ( settled >= characters.length ) {
			delete $element.dataset.scramble;
			return;
		}

		if ( frame !== drawn ) {
			drawn = frame;
			$element.dataset.scramble = characters
				.map( ( character, index ) =>
					index < settled ? character : scrambleCharacter( character )
				)
				.join( '' );
		}

		frames.set( $element, requestAnimationFrame( draw ) );
	};

	draw( start );
}
