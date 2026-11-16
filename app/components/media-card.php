<?php
/**
 * The card of a media, in the grid: its image in a square, whole, or the kind of its file, then its title, as a link
 * to its page.
 *
 * @package Moodboard
 */

?>
<a class="moodboard-card" data-part="link" href="">
	<span class="moodboard-card__frame moodboard-media-card">
		<img class="moodboard-media-card__image" alt="" loading="lazy" decoding="async" hidden>
		<span class="app-text-s app-text-muted app-font-ui app-uppercase" data-field="kind"></span>
	</span>
	<span class="moodboard-card__title" data-field="title"></span>
</a>
