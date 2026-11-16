<?php
/**
 * The control that closes a dialog, at its corner, by the command of the platform.
 *
 * @package Moodboard
 *
 * @var array{dialog:string} $args ID of the dialog.
 */

use Moodboard\Markup;

?>
<p class="app-toolbar">
	<button class="app-control" type="button" commandfor="<?php echo esc_attr( $args['dialog'] ); ?>" command="close" aria-label="<?php esc_attr_e( 'Close', 'moodboard' ); ?>" title="<?php esc_attr_e( 'Close', 'moodboard' ); ?>"><?php Markup::render_icon( 'close' ); ?></button>
</p>
