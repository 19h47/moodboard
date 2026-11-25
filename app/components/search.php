<?php
/**
 * The search of the index or of the channel shown: its channels by name, its blocks by their title, their description
 * or their text, who made them or the alternative text of an image. It searches as it is typed, or sent with Enter: its
 * control is the one of the header that unfolds it, or /.
 *
 * @package Moodboard
 *
 * @var array{id:string} $args ID of its field.
 */

?>
<form role="search">
	<label class="sr-only" for="<?php echo esc_attr( $args['id'] ); ?>"><?php esc_html_e( 'Search the moodboard', 'moodboard' ); ?></label>
	<input
		id="<?php echo esc_attr( $args['id'] ); ?>"
		type="search"
		placeholder="<?php esc_attr_e( 'Search channels and blocks…', 'moodboard' ); ?>"
		autocomplete="off"
		enterkeyhint="search"
	>
</form>
