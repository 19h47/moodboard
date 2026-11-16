<?php
/**
 * The card that adds blocks, first in the grid of a channel: a text to write, which may be the URL of an image, and
 * files to pick, drop or paste. Its element, add-block, says what is added; its place adds it.
 *
 * @package Moodboard
 *
 * @var array{id:string} $args ID of its text.
 */

?>
<add-block class="moodboard-card">
	<form class="moodboard-card__frame moodboard-add-block">
		<label class="sr-only" for="<?php echo esc_attr( $args['id'] ); ?>"><?php esc_html_e( 'A text, or the URL of an image', 'moodboard' ); ?></label>
		<textarea
			class="moodboard-add-block__text"
			id="<?php echo esc_attr( $args['id'] ); ?>"
			name="text"
			placeholder="<?php esc_attr_e( 'A text, the URL of an image, or files dropped here', 'moodboard' ); ?>"
		></textarea>
		<span class="moodboard-add-block__actions">
			<label class="app-pill app-pill--small">
				<input class="sr-only" type="file" name="files" multiple>
				<?php esc_html_e( 'Files', 'moodboard' ); ?>
			</label>
			<button class="app-pill app-pill--small" type="submit"><?php esc_html_e( 'Add', 'moodboard' ); ?></button>
		</span>
	</form>
</add-block>
