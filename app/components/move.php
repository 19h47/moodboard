<?php
/**
 * The handle that moves a block, over its card while the blocks of a channel are put in order: pressed, it picks the
 * block up, for the arrow keys to move it. Its label, which its place fills, names the block; how it moves is said once,
 * in the page.
 *
 * @package Moodboard
 */

use Moodboard\Markup;

?>
<button class="app-control moodboard-move" type="button" data-part="move" aria-pressed="false" aria-describedby="moodboard-move-help" hidden>
	<?php Markup::render_icon( 'drag_indicator' ); ?>
	<span class="sr-only" data-field="move"></span>
</button>
