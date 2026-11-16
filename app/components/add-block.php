<?php
/**
 * The form that adds blocks: a text to write, which may be the URL of an image or a page, and files to pick, drop or
 * paste. Its element, add-block, says what is added; its place adds it.
 *
 * @package Moodboard
 *
 * @var array{id:string} $args ID of its text.
 */

?>
<add-block>
	<form class="moodboard-form">
		<p class="moodboard-field">
			<label for="<?php echo esc_attr( $args['id'] ); ?>"><?php esc_html_e( 'A text, or a URL', 'moodboard' ); ?></label>
			<textarea class="moodboard-input" id="<?php echo esc_attr( $args['id'] ); ?>" name="text" rows="4"></textarea>
		</p>
		<p class="moodboard-form__actions">
			<label class="app-pill">
				<input class="sr-only" type="file" name="files" multiple>
				<?php esc_html_e( 'Pick files', 'moodboard' ); ?>
			</label>
			<button class="app-pill" type="submit"><?php esc_html_e( 'Add', 'moodboard' ); ?></button>
		</p>
	</form>
</add-block>
