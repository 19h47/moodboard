<?php
/**
 * What deleting the plugin leaves out: its role and the capabilities it gave, never the media, the texts or the channels.
 *
 * @link       https://github.com/19h47/moodboard
 * @since      1.0.0
 *
 * @package    Moodboard
 */

// If this file is not called by WordPress deleting the plugin, abort.
if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

// The capabilities the roles had from the plugin, as it last gave them: see Roles.
$moodboard_roles = get_option( 'moodboard_roles', array() );

foreach ( is_array( $moodboard_roles ) ? $moodboard_roles : array() as $moodboard_role => $moodboard_capabilities ) {
	$moodboard_role = get_role( $moodboard_role );

	if ( ! $moodboard_role ) {
		continue;
	}

	foreach ( $moodboard_capabilities as $moodboard_capability ) {
		$moodboard_role->remove_cap( $moodboard_capability );
	}
}

remove_role( 'moodboard_curator' );
delete_option( 'moodboard_roles' );
delete_site_transient( 'moodboard_github_release' );
