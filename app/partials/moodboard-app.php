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
 * @var string $manifest_url   URL of the web app manifest.
 * @var string $favicon_url    URL of the icon.
 * @var string $touch_icon_url URL of the home screen icon of an iPhone, which takes no SVG.
 * @var string $view           View shown.
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
		<meta name="theme-color" content="#ffffff">
		<title><?php esc_html_e( 'Moodboard', 'moodboard' ); ?></title>
		<link rel="manifest" href="<?php echo esc_url( $manifest_url ); ?>" crossorigin="use-credentials">
		<link rel="icon" type="image/svg+xml" href="<?php echo esc_url( $favicon_url ); ?>">
		<link rel="apple-touch-icon" href="<?php echo esc_url( $touch_icon_url ); ?>">
		<?php wp_print_styles( 'moodboard-app-sheets' ); ?>
		<?php wp_print_scripts( 'moodboard-app-theme' ); ?>
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
				<moodboard-header class="app-header moodboard-header">
					<h1 class="moodboard-header__title"><a href="<?php echo esc_url( Page::get_url() ); ?>"><?php esc_html_e( 'Moodboard', 'moodboard' ); ?></a></h1>
					<moodboard-tabs class="moodboard-header__tabs" data-only="index">
						<nav aria-label="<?php esc_attr_e( 'What the index shows', 'moodboard' ); ?>">
							<ul class="moodboard-tabs">
								<?php foreach ( $moodboard_tabs as $moodboard_tab => $moodboard_label ) : ?>
									<li><a class="moodboard-tab" href="" data-tab="<?php echo esc_attr( $moodboard_tab ); ?>"><?php echo esc_html( $moodboard_label ); ?></a></li>
								<?php endforeach; ?>
							</ul>
						</nav>
					</moodboard-tabs>
					<div class="app-toolbar moodboard-header__tools">
						<moodboard-density class="moodboard-density" data-only="grid">
							<label class="sr-only" for="moodboard-density"><?php esc_html_e( 'Size of the cards', 'moodboard' ); ?></label>
							<input class="moodboard-density__range" id="moodboard-density" type="range" min="-1" max="2" step="1" value="0">
						</moodboard-density>
						<button class="app-control" type="button" commandfor="moodboard-search" command="--toggle" aria-controls="moodboard-search" aria-expanded="false" aria-label="<?php echo esc_attr_x( 'Search', 'verb', 'moodboard' ); ?>" title="<?php echo esc_attr_x( 'Search', 'verb', 'moodboard' ); ?>" data-only="index"><?php Markup::render_icon( 'search' ); ?></button>
						<button class="app-control" type="button" commandfor="moodboard-present" command="show-modal" aria-label="<?php esc_attr_e( 'Present', 'moodboard' ); ?>" title="<?php esc_attr_e( 'Present', 'moodboard' ); ?>" data-only="grid"><?php Markup::render_icon( 'play_arrow' ); ?></button>
						<moodboard-select-toggle data-only="grid">
							<button class="app-control" type="button" aria-pressed="false" aria-label="<?php esc_attr_e( 'Select blocks', 'moodboard' ); ?>" title="<?php esc_attr_e( 'Select blocks', 'moodboard' ); ?>"><?php Markup::render_icon( 'select' ); ?></button>
						</moodboard-select-toggle>
						<moodboard-arrange-toggle data-only="channel">
							<button class="app-control" type="button" aria-pressed="false" aria-label="<?php esc_attr_e( 'Put the blocks in order', 'moodboard' ); ?>" title="<?php esc_attr_e( 'Put the blocks in order', 'moodboard' ); ?>"><?php Markup::render_icon( 'drag_pan' ); ?></button>
						</moodboard-arrange-toggle>
						<moodboard-theme-toggle>
							<button class="app-control" type="button" aria-label="<?php esc_attr_e( 'Dark theme', 'moodboard' ); ?>" title="<?php esc_attr_e( 'Light or dark theme', 'moodboard' ); ?>">
								<?php
								Markup::render_icon( 'dark_mode' );
								Markup::render_icon( 'light_mode' );
								?>
							</button>
						</moodboard-theme-toggle>
						<button class="app-control" type="button" commandfor="moodboard-menu" command="toggle-popover" aria-label="<?php esc_attr_e( 'Add', 'moodboard' ); ?>" title="<?php esc_attr_e( 'Add', 'moodboard' ); ?>"><?php Markup::render_icon( 'add' ); ?></button>
					</div>
				</moodboard-header>

				<moodboard-view name="index" <?php echo 'index' === $view ? '' : 'hidden'; ?>>
					<h2 class="sr-only" tabindex="-1"><?php esc_html_e( 'Index', 'moodboard' ); ?></h2>
					<moodboard-search class="app-search" id="moodboard-search" hidden>
						<?php Markup::render_component( 'search', array( 'id' => 'moodboard-search-field' ) ); ?>
					</moodboard-search>
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
						<div class="moodboard-channel-header__line">
							<h2 class="moodboard-channel-header__name" data-field="name" tabindex="-1"></h2>
							<span class="app-text-s app-text-muted app-font-ui app-uppercase" data-field="count"></span>
							<button class="moodboard-link app-text-s app-text-muted app-font-ui app-uppercase" type="button" commandfor="moodboard-edit-channel" command="show-modal"><?php esc_html_e( 'Edit', 'moodboard' ); ?></button>
						</div>
						<p class="moodboard-channel-header__description" data-field="description"></p>
					</moodboard-channel-header>
					<moodboard-grid list="channel">
						<p class="app-status" data-field="status" role="status"></p>
						<p class="sr-only" id="moodboard-move-help"><?php esc_html_e( 'Space or Enter picks the block up, the arrow keys move it, Space or Enter put it down, Escape puts it back.', 'moodboard' ); ?></p>
						<p class="sr-only" data-field="moved" aria-live="assertive"></p>
						<ul class="moodboard-grid" data-list="items"></ul>
					</moodboard-grid>
				</moodboard-view>

				<moodboard-view name="media text link" <?php echo in_array( $view, array( 'media', 'text', 'link' ), true ) ? '' : 'hidden'; ?>>
					<moodboard-block class="moodboard-block">
						<nav class="moodboard-block__nav app-toolbar" aria-label="<?php esc_attr_e( 'Blocks of the channel', 'moodboard' ); ?>">
							<button class="app-control" type="button" commandfor="moodboard-present" command="show-modal" aria-label="<?php esc_attr_e( 'Present', 'moodboard' ); ?>" title="<?php esc_attr_e( 'Present', 'moodboard' ); ?>"><?php Markup::render_icon( 'play_arrow' ); ?></button>
							<a class="app-control" href="" data-part="previous" rel="prev" aria-label="<?php esc_attr_e( 'Previous', 'moodboard' ); ?>" title="<?php esc_attr_e( 'Previous', 'moodboard' ); ?>" hidden><?php Markup::render_icon( 'arrow_back' ); ?></a>
							<a class="app-control" href="" data-part="next" rel="next" aria-label="<?php esc_attr_e( 'Next', 'moodboard' ); ?>" title="<?php esc_attr_e( 'Next', 'moodboard' ); ?>" hidden><?php Markup::render_icon( 'arrow_forward' ); ?></a>
							<a class="app-control" href="" data-part="channel"><?php Markup::render_icon( 'close' ); ?></a>
						</nav>
						<div class="moodboard-block__media" data-part="media">
							<img class="moodboard-block__image" data-field="image" alt="" loading="lazy" hidden>
							<video class="moodboard-block__image" data-field="video" controls preload="metadata" hidden></video>
							<div class="moodboard-block__embed" data-field="embed" hidden></div>
							<a class="app-pill" data-field="file" href="" hidden><?php esc_html_e( 'Open the file', 'moodboard' ); ?> <span data-field="kind"></span></a>
							<a class="app-pill" data-field="open" href="" rel="noreferrer" target="_blank" hidden><?php esc_html_e( 'Open the page', 'moodboard' ); ?></a>
							<p class="moodboard-block__text" data-field="text"></p>
						</div>
						<div class="moodboard-block__info">
							<h2 class="moodboard-block__title" data-field="title" tabindex="-1"></h2>
							<p class="moodboard-block__description" data-field="description"></p>
							<dl class="moodboard-block__meta app-text-s app-font-ui">
								<div data-row>
									<dt class="app-text-muted"><?php esc_html_e( 'Added', 'moodboard' ); ?></dt>
									<dd data-field="date"></dd>
								</div>
								<div data-row="dimensions">
									<dt class="app-text-muted"><?php esc_html_e( 'Dimensions', 'moodboard' ); ?></dt>
									<dd data-field="dimensions"></dd>
								</div>
								<div data-row="by">
									<dt class="app-text-muted"><?php esc_html_e( 'By', 'moodboard' ); ?></dt>
									<dd data-field="by"></dd>
								</div>
								<div data-row="source">
									<dt class="app-text-muted"><?php esc_html_e( 'Source', 'moodboard' ); ?></dt>
									<dd><a data-field="source" href="" rel="noreferrer" target="_blank"></a></dd>
								</div>
							</dl>
							<p class="moodboard-block__actions">
								<button class="app-pill" type="button" commandfor="moodboard-connect" command="show-modal"><?php esc_html_e( 'Connect', 'moodboard' ); ?> <?php Markup::render_icon( 'arrow_forward' ); ?></button>
								<button class="app-pill moodboard-block__more" type="button" commandfor="moodboard-block-actions" command="toggle-popover"><?php esc_html_e( 'Actions', 'moodboard' ); ?> <?php Markup::render_icon( 'expand_more' ); ?></button>
							</p>
							<div class="moodboard-menu moodboard-menu--block" id="moodboard-block-actions" popover>
								<button class="moodboard-menu__item" type="button" commandfor="moodboard-edit-block" command="show-modal"><?php esc_html_e( 'Edit', 'moodboard' ); ?></button>
								<button class="moodboard-menu__item" type="button" data-action="disconnect" hidden></button>
								<button class="moodboard-menu__item" type="button" data-action="delete"><?php esc_html_e( 'Delete', 'moodboard' ); ?></button>
							</div>
							<tab-set class="moodboard-tab-set">
								<div role="tablist" aria-label="<?php esc_attr_e( 'About the block', 'moodboard' ); ?>">
									<button type="button" role="tab" id="moodboard-block-tab-channels" aria-controls="moodboard-block-channels" aria-selected="true"><?php esc_html_e( 'Channels', 'moodboard' ); ?> <span class="moodboard-tab-set__count" data-field="channels-count"></span></button>
									<button type="button" role="tab" id="moodboard-block-tab-notes" aria-controls="moodboard-block-notes" aria-selected="false" tabindex="-1"><?php esc_html_e( 'Notes', 'moodboard' ); ?> <span class="moodboard-tab-set__count" data-field="notes-count"></span></button>
								</div>
								<div role="tabpanel" id="moodboard-block-channels" aria-labelledby="moodboard-block-tab-channels">
									<ul class="moodboard-block__channels" data-list="channels"></ul>
									<p class="app-text-s app-text-muted" data-field="no-channel"><?php esc_html_e( 'In the index only.', 'moodboard' ); ?></p>
								</div>
								<div role="tabpanel" id="moodboard-block-notes" aria-labelledby="moodboard-block-tab-notes" hidden>
									<moodboard-notes>
										<?php Markup::render_component( 'notes' ); ?>
									</moodboard-notes>
								</div>
							</tab-set>
						</div>
					</moodboard-block>
				</moodboard-view>
			</div>
		</main>

		<div class="moodboard-menu" id="moodboard-menu" popover>
			<button class="moodboard-menu__item" type="button" commandfor="moodboard-add" command="show-modal"><?php esc_html_e( 'Add blocks', 'moodboard' ); ?></button>
			<button class="moodboard-menu__item" type="button" commandfor="moodboard-new-channel" command="show-modal" data-parent="current"><?php esc_html_e( 'New channel', 'moodboard' ); ?></button>
		</div>

		<moodboard-selection class="moodboard-selection" hidden>
			<p class="app-text-s app-font-ui app-uppercase" data-field="count" role="status"></p>
			<p class="moodboard-pills">
				<button class="app-pill app-pill--small" type="button" commandfor="moodboard-bulk" command="show-modal" data-action="connect"><?php esc_html_e( 'Connect', 'moodboard' ); ?></button>
				<button class="app-pill app-pill--small" type="button" data-action="first" hidden><?php esc_html_e( 'Move first', 'moodboard' ); ?></button>
				<button class="app-pill app-pill--small" type="button" data-action="last" hidden><?php esc_html_e( 'Move last', 'moodboard' ); ?></button>
				<button class="app-pill app-pill--small" type="button" data-action="disconnect" hidden></button>
				<button class="app-pill app-pill--small" type="button" data-action="delete"><?php esc_html_e( 'Delete', 'moodboard' ); ?></button>
				<button class="app-pill app-pill--small" type="button" data-action="done"><?php esc_html_e( 'Done', 'moodboard' ); ?></button>
			</p>
		</moodboard-selection>

		<moodboard-drop class="moodboard-drop" hidden>
			<p class="moodboard-drop__target" data-field="target"></p>
		</moodboard-drop>

		<moodboard-notice class="moodboard-notice" hidden>
			<p class="app-status" data-field="notice" role="status"></p>
		</moodboard-notice>

		<dialog class="moodboard-dialog" id="moodboard-add" aria-labelledby="moodboard-add-title" closedby="any">
			<?php Markup::render_component( 'dialog-close', array( 'dialog' => 'moodboard-add' ) ); ?>
			<moodboard-add class="moodboard-form">
				<h2 id="moodboard-add-title" data-field="title"></h2>
				<?php Markup::render_component( 'add-block', array( 'id' => 'moodboard-add-text' ) ); ?>
			</moodboard-add>
		</dialog>

		<dialog class="moodboard-present" id="moodboard-present" aria-label="<?php esc_attr_e( 'Presentation', 'moodboard' ); ?>">
			<moodboard-present class="moodboard-present__frame">
				<div class="moodboard-present__stage" data-part="stage">
					<img class="moodboard-present__image" data-field="image" alt="" loading="lazy" hidden>
					<video class="moodboard-present__image" data-field="video" controls hidden></video>
					<p class="moodboard-present__text" data-field="text"></p>
				</div>
				<div class="moodboard-present__bar">
					<p class="app-text-s" aria-live="polite">
						<span class="app-uppercase" data-field="position"></span>
						<span data-field="name"></span>
					</p>
					<p class="app-toolbar">
						<button class="app-control" type="button" data-action="previous" aria-label="<?php esc_attr_e( 'Previous', 'moodboard' ); ?>" title="<?php esc_attr_e( 'Previous', 'moodboard' ); ?>"><?php Markup::render_icon( 'arrow_back' ); ?></button>
						<button class="app-control" type="button" data-action="play" aria-pressed="false" autofocus aria-label="<?php esc_attr_e( 'Play on their own', 'moodboard' ); ?>" title="<?php esc_attr_e( 'Play on their own', 'moodboard' ); ?>">
							<?php
							Markup::render_icon( 'play_arrow' );
							Markup::render_icon( 'pause' );
							?>
						</button>
						<button class="app-control" type="button" data-action="next" aria-label="<?php esc_attr_e( 'Next', 'moodboard' ); ?>" title="<?php esc_attr_e( 'Next', 'moodboard' ); ?>"><?php Markup::render_icon( 'arrow_forward' ); ?></button>
						<button class="app-control" type="button" commandfor="moodboard-present" command="close" aria-label="<?php esc_attr_e( 'Close', 'moodboard' ); ?>" title="<?php esc_attr_e( 'Close', 'moodboard' ); ?>"><?php Markup::render_icon( 'close' ); ?></button>
					</p>
				</div>
			</moodboard-present>
		</dialog>

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
				<?php Markup::render_component( 'connect', array( 'id' => 'moodboard-connect' ) ); ?>
			</moodboard-connect>
		</dialog>

		<dialog class="moodboard-dialog" id="moodboard-bulk" aria-labelledby="moodboard-bulk-title" closedby="any">
			<?php Markup::render_component( 'dialog-close', array( 'dialog' => 'moodboard-bulk' ) ); ?>
			<h2 id="moodboard-bulk-title"><?php esc_html_e( 'Connect the blocks selected', 'moodboard' ); ?></h2>
			<moodboard-bulk>
				<?php
				Markup::render_component(
					'connect',
					array(
						'id'     => 'moodboard-bulk',
						'submit' => __( 'Connect', 'moodboard' ),
					)
				);
				?>
			</moodboard-bulk>
		</dialog>

		<template id="moodboard-channel-card">
			<li><?php Markup::render_component( 'channel-card' ); ?></li>
		</template>
		<template id="moodboard-media-card">
			<li><?php Markup::render_component( 'media-card' ); ?><?php Markup::render_component( 'select' ); ?><?php Markup::render_component( 'move' ); ?></li>
		</template>
		<template id="moodboard-text-card">
			<li><?php Markup::render_component( 'text-card' ); ?><?php Markup::render_component( 'select' ); ?><?php Markup::render_component( 'move' ); ?></li>
		</template>
		<template id="moodboard-link-card">
			<li><?php Markup::render_component( 'link-card' ); ?><?php Markup::render_component( 'select' ); ?><?php Markup::render_component( 'move' ); ?></li>
		</template>
		<template id="moodboard-note">
			<li><?php Markup::render_component( 'note' ); ?></li>
		</template>
		<template id="moodboard-path-item">
			<li><a href=""></a></li>
		</template>
		<template id="moodboard-block-channel">
			<li><a class="moodboard-block__channel" href=""><span data-field="name"></span> <span class="app-text-muted" data-field="count"></span></a></li>
		</template>
		<template id="moodboard-connect-option">
			<li><label class="moodboard-connect__option"><input type="checkbox"> <span data-field="name"></span></label></li>
		</template>
	</body>
</html>
