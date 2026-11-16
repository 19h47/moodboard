<?php
/**
 * The role of the curators, and who may change a block or a channel.
 *
 * @link       https://github.com/19h47/moodboard
 * @since      1.0.0
 *
 * @package    Moodboard
 * @subpackage Moodboard/includes
 */

namespace Moodboard;

use WP_Term;

/**
 * Gives each curator a moodboard of their own: they add blocks and channels, and change and delete their own, never those
 * of another curator. One capability, `curate_moodboard`, which the role Curator and the administrators have, stands for
 * every capability of the texts, the links and the channels a curator has; those over the blocks and channels of others
 * are given to no one. A curator writes as a contributor of core does, `edit_posts` and `delete_posts`, which their media
 * and the notes ask for.
 *
 * @since      1.0.0
 * @package    Moodboard
 * @subpackage Moodboard/includes
 * @author     Jérémy Levron <jeremylevron@19h47.fr>
 */
class Roles {

	/**
	 * Capability of curating a moodboard of one's own.
	 *
	 * @var string
	 */
	public const string CURATE = 'curate_moodboard';

	/**
	 * Option holding the capabilities given to each role, as last given: the ones the roles lose when ROLES changes.
	 *
	 * @var string
	 */
	private const string OPTION = 'moodboard_roles';

	/**
	 * Capabilities of WordPress the role of the plugin has, given as it is added: open the admin, upload a media.
	 *
	 * @var array<string,bool>
	 */
	private const array BASE = array(
		'read'         => true,
		'upload_files' => true,
	);

	/**
	 * Capabilities each role has from the plugin, its own role and those of WordPress, which the plugin gives and takes
	 * back: never one of WordPress, which a role may have of its own.
	 *
	 * @var array<string,list<string>>
	 */
	private const array ROLES = array(
		// A curator writes as a contributor of core does, which their media, their notes and the previews of URLs ask for.
		'moodboard_curator' => array( self::CURATE, 'edit_posts', 'delete_posts' ),
		'administrator'     => array( self::CURATE ),
	);

	/**
	 * Register hooks.
	 *
	 * @return void
	 */
	public function hooks(): void {
		add_action( 'init', array( $this, 'give_capabilities' ) );
		add_filter( 'map_meta_cap', array( $this, 'map_own_channel' ), 10, 4 );
		add_filter( 'gettext_with_context_default', array( $this, 'translate_role_name' ), 10, 3 );
	}

	/**
	 * Give the roles their capabilities, once ROLES changes: WordPress keeps the roles in the database. The capabilities
	 * a role no longer has from the plugin are taken back, its other ones kept.
	 *
	 * @return void
	 */
	public function give_capabilities(): void {
		$given = get_option( self::OPTION, array() );

		if ( self::ROLES === $given ) {
			return;
		}

		$given = is_array( $given ) ? $given : array();

		if ( ! get_role( 'moodboard_curator' ) ) {
			add_role( 'moodboard_curator', 'Curator', self::BASE );
		}

		foreach ( self::ROLES as $role => $capabilities ) {
			$role = get_role( $role );

			if ( ! $role ) {
				continue;
			}

			foreach ( array_diff( $given[ $role->name ] ?? array(), $capabilities ) as $capability ) {
				$role->remove_cap( $capability );
			}

			foreach ( $capabilities as $capability ) {
				$role->add_cap( $capability );
			}
		}

		update_option( self::OPTION, self::ROLES, true );
	}

	/**
	 * A channel is changed, deleted and given to a block by its curator only: core asks for the capabilities of the
	 * channels, which every curator has.
	 *
	 * @param string[] $caps    Primitive capabilities the user needs.
	 * @param string   $cap     Capability checked.
	 * @param int      $user_id User ID.
	 * @param mixed[]  $args    Arguments of the check, the term ID first.
	 * @return string[]
	 */
	public function map_own_channel( array $caps, string $cap, int $user_id, array $args ): array {
		if ( ! in_array( $cap, array( 'edit_term', 'delete_term', 'assign_term' ), true ) ) {
			return $caps;
		}

		$term_id = (int) ( $args[0] ?? 0 );

		if ( ! get_term( $term_id, Channels::TAXONOMY ) instanceof WP_Term ) {
			return $caps;
		}

		return Channels::get_author( $term_id ) === $user_id ? $caps : array( 'do_not_allow' );
	}

	/**
	 * Translate the name of the role of the plugin, which WordPress translates with its own strings, as a user role.
	 *
	 * @param string $translation Translation.
	 * @param string $text        Text to translate.
	 * @param string $context     Context.
	 * @return string
	 */
	public function translate_role_name( string $translation, string $text, string $context ): string {
		if ( 'User role' !== $context || 'Curator' !== $text ) {
			return $translation;
		}

		return _x( 'Curator', 'User role', 'moodboard' );
	}
}
