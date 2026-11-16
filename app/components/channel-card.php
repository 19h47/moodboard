<?php
/**
 * The card of a channel, in the grid: a square of its latest images, then its name and its number of blocks, as a link
 * to it.
 *
 * @package Moodboard
 */

?>
<a class="moodboard-card" data-part="link" href="">
	<span class="moodboard-card__frame moodboard-channel-card">
		<span class="moodboard-channel-card__covers" data-list="covers"></span>
	</span>
	<span class="moodboard-channel-card__name" data-field="name"></span>
	<span class="app-text-s app-text-muted app-font-ui app-uppercase" data-field="count"></span>
</a>
