<?php
/**
 * The form of a block: its title, its description or its text, the alternative text of an image and its source. Its
 * dialog fills it as it opens, and shows the fields of the block.
 *
 * @package Moodboard
 */

?>
<form class="moodboard-form">
	<p class="moodboard-field">
		<label for="moodboard-block-title"><?php esc_html_e( 'Title', 'moodboard' ); ?></label>
		<input class="moodboard-input" id="moodboard-block-title" name="title" autocomplete="off">
	</p>
	<p class="moodboard-field">
		<label for="moodboard-block-body">
			<span data-kind="media"><?php esc_html_e( 'Description', 'moodboard' ); ?></span>
			<span data-kind="text"><?php esc_html_e( 'Text', 'moodboard' ); ?></span>
		</label>
		<textarea class="moodboard-input" id="moodboard-block-body" name="body" rows="6"></textarea>
	</p>
	<p class="moodboard-field" data-row="alt">
		<label for="moodboard-block-alt"><?php esc_html_e( 'Alternative text', 'moodboard' ); ?></label>
		<input class="moodboard-input" id="moodboard-block-alt" name="alt" aria-describedby="moodboard-block-alt-description" autocomplete="off">
		<span class="app-text-s app-text-muted" id="moodboard-block-alt-description"><?php esc_html_e( 'What the image shows, for those who do not see it.', 'moodboard' ); ?></span>
	</p>
	<p class="moodboard-field">
		<label for="moodboard-block-source"><?php esc_html_e( 'Source', 'moodboard' ); ?></label>
		<input class="moodboard-input" id="moodboard-block-source" name="source" type="url" autocomplete="off">
	</p>
	<p class="moodboard-form__actions">
		<button class="app-pill" type="submit"><?php esc_html_e( 'Save', 'moodboard' ); ?></button>
	</p>
</form>
