<?php
/**
 * The form of a channel: its name, its description and the channel it is under; changing one, the button that
 * deletes it. Its dialog fills it as it opens.
 *
 * @package Moodboard
 *
 * @var array{id:string,mode:string} $args Prefix of the IDs of its fields, and its mode: new or edit.
 */

$moodboard_id = $args['id'];

?>
<form class="moodboard-form">
	<p class="moodboard-field">
		<label for="<?php echo esc_attr( "$moodboard_id-name" ); ?>"><?php esc_html_e( 'Name', 'moodboard' ); ?></label>
		<input class="moodboard-input" id="<?php echo esc_attr( "$moodboard_id-name" ); ?>" name="name" required autocomplete="off">
	</p>
	<p class="moodboard-field">
		<label for="<?php echo esc_attr( "$moodboard_id-description" ); ?>"><?php esc_html_e( 'Description', 'moodboard' ); ?></label>
		<textarea class="moodboard-input" id="<?php echo esc_attr( "$moodboard_id-description" ); ?>" name="description" rows="3"></textarea>
	</p>
	<p class="moodboard-field">
		<label for="<?php echo esc_attr( "$moodboard_id-parent" ); ?>"><?php esc_html_e( 'Under', 'moodboard' ); ?></label>
		<select class="moodboard-input" id="<?php echo esc_attr( "$moodboard_id-parent" ); ?>" name="parent">
			<option value="0"><?php esc_html_e( 'The index', 'moodboard' ); ?></option>
		</select>
	</p>
	<p class="moodboard-form__actions">
		<button class="app-pill" type="submit">
			<?php 'new' === $args['mode'] ? esc_html_e( 'Add the channel', 'moodboard' ) : esc_html_e( 'Save', 'moodboard' ); ?>
		</button>
		<?php if ( 'edit' === $args['mode'] ) : ?>
			<button class="app-pill" type="button" data-action="delete"><?php esc_html_e( 'Delete the channel', 'moodboard' ); ?></button>
		<?php endif; ?>
	</p>
</form>
