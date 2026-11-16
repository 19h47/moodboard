<?php
/**
 * The notes of a block, the oldest first, then the form that writes one. Its place fills them.
 *
 * @package Moodboard
 */

?>
<section class="moodboard-notes" aria-labelledby="moodboard-notes-title">
	<h3 class="app-text-s app-text-muted app-font-ui app-uppercase app-font-normal" id="moodboard-notes-title"><?php esc_html_e( 'Notes', 'moodboard' ); ?></h3>
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
</section>
