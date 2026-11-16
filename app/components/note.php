<?php
/**
 * A note on a block: what it says, then its date and the button that deletes it.
 *
 * @package Moodboard
 */

?>
<article class="moodboard-note">
	<p class="moodboard-note__content" data-field="content"></p>
	<p class="app-text-s app-text-muted app-font-ui">
		<span data-field="date"></span>
		<button class="moodboard-link" type="button" data-action="delete-note"><?php esc_html_e( 'Delete', 'moodboard' ); ?></button>
	</p>
</article>
