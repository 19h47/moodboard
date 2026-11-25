<?php
/**
 * The card of a link, in the grid: the image of its page in a square, whole, else the name of its site, then its
 * title, as a link to its page.
 *
 * @package Moodboard
 */

?>
<a class="moodboard-card" data-part="link" href="">
	<span class="moodboard-card__frame moodboard-link-card">
		<img class="moodboard-card__image" alt="" loading="lazy" decoding="async" hidden>
		<span class="moodboard-link-card__host app-text-s app-text-muted app-font-ui app-uppercase" data-field="host"></span>
	</span>
	<span class="moodboard-card__title" data-field="title"></span>
</a>
