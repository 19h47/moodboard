<?php
/**
 * The search of the index: its channels by name, its blocks by their title, their caption, their description or their
 * text.
 *
 * @package Moodboard
 *
 * @var array{id:string} $args ID of its field.
 */

use Moodboard\Markup;

?>
<form class="moodboard-search" role="search">
	<label class="sr-only" for="<?php echo esc_attr( $args['id'] ); ?>"><?php esc_html_e( 'Search the moodboard', 'moodboard' ); ?></label>
	<input
		id="<?php echo esc_attr( $args['id'] ); ?>"
		type="search"
		placeholder="<?php esc_attr_e( 'Search channels and blocks…', 'moodboard' ); ?>"
		autocomplete="off"
		enterkeyhint="search"
	>
	<button class="app-control" type="submit" aria-label="<?php echo esc_attr_x( 'Search', 'verb', 'moodboard' ); ?>" title="<?php echo esc_attr_x( 'Search', 'verb', 'moodboard' ); ?>">
		<?php Markup::render_icon( 'search' ); ?>
	</button>
</form>
