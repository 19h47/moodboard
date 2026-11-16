<?php
/**
 * The channels of a block: a filter of their names, a box each, ticked for those the block is in, and the button that
 * adds a channel of the name typed. Its dialog fills it as it opens.
 *
 * @package Moodboard
 */

?>
<div class="moodboard-form">
	<p class="moodboard-field">
		<label for="moodboard-connect-filter"><?php esc_html_e( 'Find or add a channel', 'moodboard' ); ?></label>
		<input class="moodboard-input" id="moodboard-connect-filter" type="search" autocomplete="off">
	</p>
	<button class="app-pill" type="button" data-action="create" hidden></button>
	<fieldset class="moodboard-connect">
		<legend class="sr-only"><?php esc_html_e( 'Channels of the block', 'moodboard' ); ?></legend>
		<ul class="moodboard-connect__list" data-list="channels"></ul>
	</fieldset>
</div>
