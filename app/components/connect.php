<?php
/**
 * Channels to tick: a filter of their names, a box each, and the button that opens the form of a new channel of the
 * name typed, which ticks it once added. The channels of the block shown, each box putting it in or taking it out at
 * once; or, with `submit`, the channels the blocks selected go in, once sent. Its dialog fills it as it opens.
 *
 * @package Moodboard
 *
 * @var array{id:string,submit?:string} $args Prefix of the IDs of its fields, and the label of the button that sends it.
 */

$moodboard_id     = $args['id'];
$moodboard_submit = $args['submit'] ?? '';
$moodboard_tag    = $moodboard_submit ? 'form' : 'div';

?>
<<?php echo esc_html( $moodboard_tag ); ?> class="moodboard-form">
	<p class="moodboard-field">
		<label for="<?php echo esc_attr( "$moodboard_id-filter" ); ?>"><?php esc_html_e( 'Find or add a channel', 'moodboard' ); ?></label>
		<input class="moodboard-input" id="<?php echo esc_attr( "$moodboard_id-filter" ); ?>" type="search" autocomplete="off">
	</p>
	<button class="app-pill" type="button" commandfor="moodboard-new-channel" command="show-modal" data-action="create" hidden></button>
	<fieldset class="moodboard-connect">
		<legend class="sr-only"><?php esc_html_e( 'Channels', 'moodboard' ); ?></legend>
		<ul class="moodboard-connect__list" data-list="channels"></ul>
	</fieldset>
	<?php if ( $moodboard_submit ) : ?>
		<p class="moodboard-form__actions">
			<button class="app-pill" type="submit"><?php echo esc_html( $moodboard_submit ); ?></button>
		</p>
	<?php endif; ?>
</<?php echo esc_html( $moodboard_tag ); ?>>
