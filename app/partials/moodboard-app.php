<?php
/**
 * The page of the app: the index, a channel, the page of a block, the dialogs of a channel, of a block and of its
 * channels, and the templates of the cards.
 *
 * The bricks (custom elements) fill the markup from the store; the templates hold the translated labels. The view asked
 * for in the URL shows from the first paint; the router then switches views without reloading.
 *
 * @link       https://github.com/19h47/moodboard
 * @since      1.0.0
 *
 * @package    Moodboard
 * @subpackage Moodboard/app/partials
 *
 * @var string $manifest_url URL of the web app manifest.
 * @var string $favicon_url  URL of the icon.
 * @var string $view         View shown.
 */

use Moodboard\App\Page;
use Moodboard\Markup;

$moodboard_tabs = array(
	'all'      => __( 'All', 'moodboard' ),
	'channels' => __( 'Channels', 'moodboard' ),
	'blocks'   => __( 'Blocks', 'moodboard' ),
);

?>
<!doctype html>
<html <?php language_attributes(); ?>>
	<head>
		<meta charset="<?php bloginfo( 'charset' ); ?>">
		<meta name="viewport" content="width=device-width, initial-scale=1">
		<meta name="color-scheme" content="light dark">
		<title><?php esc_html_e( 'Moodboard', 'moodboard' ); ?></title>
		<link rel="manifest" href="<?php echo esc_url( $manifest_url ); ?>" crossorigin="use-credentials">
		<link rel="icon" type="image/svg+xml" href="<?php echo esc_url( $favicon_url ); ?>">
		<?php wp_print_styles( 'moodboard-app-sheets' ); ?>
		<?php wp_print_scripts( 'moodboard-app-config' ); ?>
		<?php
		// The bricks are script modules, run once the page is read: their translations and the import map first, then the modules and their preloads.
		wp_script_modules()->print_script_module_translations();
		wp_script_modules()->print_import_map();
		wp_script_modules()->print_enqueued_script_modules();
		wp_script_modules()->print_script_module_preloads();
		?>
	</head>
	<body>
		<main class="app-page moodboard-page" id="top">
			<div class="app-content">
				<header class="app-header">
					<h1><a href="<?php echo esc_url( Page::get_url() ); ?>"><?php esc_html_e( 'Moodboard', 'moodboard' ); ?></a></h1>
				</header>

				<moodboard-view name="index" <?php echo 'index' === $view ? '' : 'hidden'; ?>>
					<h2 class="sr-only" tabindex="-1"><?php esc_html_e( 'Index', 'moodboard' ); ?></h2>
					<div class="app-controls">
						<moodboard-search class="app-search">
							<?php Markup::render_component( 'search', array( 'id' => 'moodboard-search' ) ); ?>
						</moodboard-search>
						<moodboard-tabs>
							<nav aria-label="<?php esc_attr_e( 'What the index shows', 'moodboard' ); ?>">
								<ul class="moodboard-pills">
									<?php foreach ( $moodboard_tabs as $moodboard_tab => $moodboard_label ) : ?>
										<li><a class="app-pill" href="" data-tab="<?php echo esc_attr( $moodboard_tab ); ?>"><?php echo esc_html( $moodboard_label ); ?></a></li>
									<?php endforeach; ?>
								</ul>
							</nav>
						</moodboard-tabs>
						<button class="app-pill" type="button" commandfor="moodboard-new-channel" command="show-modal">
							<?php Markup::render_icon( 'add' ); ?>
							<?php esc_html_e( 'Channel', 'moodboard' ); ?>
						</button>
					</div>
					<moodboard-grid list="index">
						<p class="app-status" data-field="status" role="status"></p>
						<ul class="moodboard-grid" data-list="items"></ul>
					</moodboard-grid>
				</moodboard-view>

				<moodboard-view name="channel" <?php echo 'channel' === $view ? '' : 'hidden'; ?>>
					<moodboard-channel-header class="moodboard-channel-header">
						<nav aria-label="<?php esc_attr_e( 'Channels it is under', 'moodboard' ); ?>">
							<ol class="moodboard-path app-text-s app-font-ui" data-list="path"></ol>
						</nav>
						<h2 class="moodboard-channel-header__name" data-field="name" tabindex="-1"></h2>
						<p class="moodboard-channel-header__description" data-field="description"></p>
						<p class="app-text-s app-text-muted app-font-ui app-uppercase" data-field="count"></p>
						<p class="moodboard-pills">
							<button class="app-pill" type="button" commandfor="moodboard-new-channel" command="show-modal" data-parent="current">
								<?php Markup::render_icon( 'add' ); ?>
								<?php esc_html_e( 'Sub-channel', 'moodboard' ); ?>
							</button>
							<button class="app-pill" type="button" commandfor="moodboard-edit-channel" command="show-modal"><?php esc_html_e( 'Edit', 'moodboard' ); ?></button>
						</p>
					</moodboard-channel-header>
					<moodboard-grid list="channel">
						<p class="app-status" data-field="status" role="status"></p>
						<ul class="moodboard-grid" data-list="items">
							<li data-id="add">
								<moodboard-add>
									<?php Markup::render_component( 'add-block', array( 'id' => 'moodboard-add-text' ) ); ?>
								</moodboard-add>
							</li>
						</ul>
					</moodboard-grid>
				</moodboard-view>

				<moodboard-view name="media text" <?php echo in_array( $view, array( 'media', 'text' ), true ) ? '' : 'hidden'; ?>>
					<moodboard-block class="moodboard-block">
						<nav class="moodboard-pills" aria-label="<?php esc_attr_e( 'Blocks of the channel', 'moodboard' ); ?>">
							<a class="app-pill" href="" data-part="channel" hidden><?php Markup::render_icon( 'arrow_back' ); ?> <span data-field="channel"></span></a>
							<a class="app-pill" href="" data-part="previous" rel="prev" hidden><?php Markup::render_icon( 'arrow_back' ); ?> <?php esc_html_e( 'Previous', 'moodboard' ); ?></a>
							<a class="app-pill" href="" data-part="next" rel="next" hidden><?php esc_html_e( 'Next', 'moodboard' ); ?> <?php Markup::render_icon( 'arrow_forward' ); ?></a>
						</nav>
						<div class="moodboard-block__media" data-part="media">
							<img class="moodboard-block__image" data-field="image" alt="" hidden>
							<video class="moodboard-block__image" data-field="video" controls preload="metadata" hidden></video>
							<a class="app-pill" data-field="file" href="" hidden><?php esc_html_e( 'Open the file', 'moodboard' ); ?> <span data-field="kind"></span></a>
							<p class="moodboard-block__text" data-field="text"></p>
						</div>
						<div class="moodboard-block__info">
							<h2 class="moodboard-block__title" data-field="title" tabindex="-1"></h2>
							<p class="moodboard-block__description" data-field="description"></p>
							<dl class="moodboard-block__meta app-text-s app-font-ui">
								<div data-row>
									<dt class="app-text-muted app-uppercase"><?php esc_html_e( 'Source', 'moodboard' ); ?></dt>
									<dd><a data-field="source" href="" rel="noreferrer" target="_blank"></a></dd>
								</div>
								<div data-row>
									<dt class="app-text-muted app-uppercase"><?php esc_html_e( 'Added', 'moodboard' ); ?></dt>
									<dd data-field="date"></dd>
								</div>
							</dl>
							<section class="moodboard-block__channels">
								<h3 class="app-text-s app-text-muted app-font-ui app-uppercase app-font-normal"><?php esc_html_e( 'Channels', 'moodboard' ); ?></h3>
								<ul class="moodboard-pills" data-list="channels"></ul>
							</section>
							<p class="moodboard-pills">
								<button class="app-pill" type="button" commandfor="moodboard-connect" command="show-modal"><?php esc_html_e( 'Connect', 'moodboard' ); ?></button>
								<button class="app-pill" type="button" commandfor="moodboard-edit-block" command="show-modal"><?php esc_html_e( 'Edit', 'moodboard' ); ?></button>
								<button class="app-pill" type="button" data-action="disconnect" hidden></button>
								<button class="app-pill" type="button" data-action="delete"><?php esc_html_e( 'Delete', 'moodboard' ); ?></button>
							</p>
						</div>
					</moodboard-block>
				</moodboard-view>
			</div>
		</main>

		<moodboard-notice class="moodboard-notice" hidden>
			<p class="app-status" data-field="notice" role="status"></p>
		</moodboard-notice>

		<dialog class="moodboard-dialog" id="moodboard-new-channel" aria-labelledby="moodboard-new-channel-title" closedby="any">
			<?php Markup::render_component( 'dialog-close', array( 'dialog' => 'moodboard-new-channel' ) ); ?>
			<h2 id="moodboard-new-channel-title"><?php esc_html_e( 'New channel', 'moodboard' ); ?></h2>
			<moodboard-channel-form mode="new">
				<?php
				Markup::render_component(
					'channel-form',
					array(
						'id'   => 'moodboard-new-channel',
						'mode' => 'new',
					)
				);
				?>
			</moodboard-channel-form>
		</dialog>

		<dialog class="moodboard-dialog" id="moodboard-edit-channel" aria-labelledby="moodboard-edit-channel-title" closedby="any">
			<?php Markup::render_component( 'dialog-close', array( 'dialog' => 'moodboard-edit-channel' ) ); ?>
			<h2 id="moodboard-edit-channel-title"><?php esc_html_e( 'Edit the channel', 'moodboard' ); ?></h2>
			<moodboard-channel-form mode="edit">
				<?php
				Markup::render_component(
					'channel-form',
					array(
						'id'   => 'moodboard-edit-channel',
						'mode' => 'edit',
					)
				);
				?>
			</moodboard-channel-form>
		</dialog>

		<dialog class="moodboard-dialog" id="moodboard-edit-block" aria-labelledby="moodboard-edit-block-title" closedby="any">
			<?php Markup::render_component( 'dialog-close', array( 'dialog' => 'moodboard-edit-block' ) ); ?>
			<h2 id="moodboard-edit-block-title"><?php esc_html_e( 'Edit the block', 'moodboard' ); ?></h2>
			<moodboard-block-form>
				<?php Markup::render_component( 'block-form' ); ?>
			</moodboard-block-form>
		</dialog>

		<dialog class="moodboard-dialog" id="moodboard-connect" aria-labelledby="moodboard-connect-title" closedby="any">
			<?php Markup::render_component( 'dialog-close', array( 'dialog' => 'moodboard-connect' ) ); ?>
			<h2 id="moodboard-connect-title"><?php esc_html_e( 'Connect to channels', 'moodboard' ); ?></h2>
			<moodboard-connect>
				<?php Markup::render_component( 'connect' ); ?>
			</moodboard-connect>
		</dialog>

		<template id="moodboard-channel-card">
			<li><?php Markup::render_component( 'channel-card' ); ?></li>
		</template>
		<template id="moodboard-media-card">
			<li><?php Markup::render_component( 'media-card' ); ?></li>
		</template>
		<template id="moodboard-text-card">
			<li><?php Markup::render_component( 'text-card' ); ?></li>
		</template>
		<template id="moodboard-path-item">
			<li><a href=""></a></li>
		</template>
		<template id="moodboard-channel-pill">
			<li><a class="app-pill" href=""></a></li>
		</template>
		<template id="moodboard-connect-option">
			<li><label class="moodboard-connect__option"><input type="checkbox"> <span data-field="name"></span></label></li>
		</template>
	</body>
</html>
