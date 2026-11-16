<?php
/**
 * The notes of a block, the oldest first, then the form that writes one. Its place fills them, and names them.
 *
 * @package Moodboard
 */

?>
<div class="moodboard-notes">
	<ol class="moodboard-notes__list" data-list="notes"></ol>
	<p class="app-status" data-field="error" hidden></p>
	<form class="moodboard-form">
		<p class="moodboard-field">
			<label class="sr-only" for="moodboard-note-content"><?php esc_html_e( 'A note', 'moodboard' ); ?></label>
			<textarea class="moodboard-input" id="moodboard-note-content" name="note" rows="2" placeholder="<?php esc_attr_e( 'A note, for yourself…', 'moodboard' ); ?>"></textarea>
		</p>
		<p class="moodboard-form__actions">
			<button class="app-pill app-pill--small" type="submit"><?php esc_html_e( 'Add the note', 'moodboard' ); ?></button>
		</p>
	</form>
</div>
