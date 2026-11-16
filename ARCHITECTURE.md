# Architecture

How the plugin is built. What it does is in `README.txt`, how it is tested in `TESTING.md`.

The plugin stays as close to WordPress as it can: the blocks are media and posts, the channels a taxonomy, and the app reads the REST API of core. What is its own is the app, built as the reading app of [Library](https://github.com/19h47/library).

## The plugin

`moodboard.php` loads the classes of `includes` and `app` through Composer, in the namespace `Moodboard`; `Moodboard\Plugin` lets each one register its hooks.

- **Blocks**: a media, `attachment`, is a block of an image or another file, its title, caption, description and alternative text those of WordPress. `Texts` registers the `moodboard_text` post type, the blocks of text, always private: `keep_private()` saves them so whatever status they come with, and WordPress shows a private post to its author only. `Meta` registers the source of both, `moodboard_source`.
- **Channels**: `Channels` registers the `moodboard_channel` taxonomy over the media and the texts, hierarchical, so a block is in several channels and a channel under another. A term has no author: `set_author()` keeps the curator of a new channel in the term meta `moodboard_author`, `list_own()` lists their own only in the REST API, and `set_slug()` gives a new channel a slug of its curator, such as `lieux-12`, so that two curators each name a channel alike: core refuses a name at the same level unless its slug is another. Before a channel is deleted, `keep_blocks()` gives its parent the blocks in no other channel; core gives it its sub-channels.
- **Curators**: `Roles` adds the role Curator, `moodboard_curator`, and the capability `curate_moodboard`, which the administrators have too and the capabilities of the texts and the channels map to. `map_own_channel()` refuses `edit_term`, `delete_term` and `assign_term` on the channel of another curator, which the REST API checks term by term; `map_own_media()` lets a curator change and delete the media they uploaded, which core asks `edit_posts` for. No one has the capabilities over the texts of others.
- **Media**: core imports an image from its URL, `POST wp/v2/media` with `url`, but leaves out the terms and the meta of the request, which it checked the curator may give: `Media::file_imported()` gives them.
- **Updates**: `Updater` offers the latest GitHub release as an update, and `Readme` turns `README.txt` into the sections of the "View details" modal, as in Library.

## The app

The app is an admin page, `app/class-page.php`, under **Media**, rendered full screen instead of the admin interface. It reads the REST API of core through `wp.apiFetch`; the page preloads the channels and the blocks of the view asked for. `app/class-login.php` dresses the login of WordPress as the app when it leads to it, and clears what the app kept on the device at the logout, as in Library.

### Scripts

Script modules, without a build, as in Library:

- `app/js/lib`, the modules the others import, registered as `moodboard-app/<name>`: `app`, what the page gives, `api`, the REST API of core turned into channels and blocks, `store`, the state and its actions, on `state`, `router`, the URL and the Navigation API, `render`, the cards, `dom` and `behaviors`, what the bricks share;
- `app/js/components`, the custom elements that behave on their own and read no store: `add-block`, the card that adds blocks, which says what is added with its event `add`;
- `app/js/bricks`, the custom elements that read the store, each enqueued as `moodboard-app/<name>`.

The URL says what shows: `?view=channel&channel=12`, `?view=media&media=5&channel=12` for a media opened from a channel, `?tab=channels&q=…` for the index. A view gives way to the next one in a view transition, in which the image of a media goes from its card to its page. The dialogs open by the invoker commands of the platform, `commandfor` and `command="show-modal"`; their bricks fill them on the event `command`.

### Styles

`app/css/app-style.css` is a copy of the [base shared by the author's small apps](https://gist.github.com/19h47/27df983fac74beb8d3e0a30688654498), with its revision in its header. `app/css/moodboard-app.css` declares the order of the layers of the app and its tokens, then a sheet per component in `app/css/components` and per view in `app/css/views`. The sheets of the components come in the order of their names: a card sets its frame with the class of the frame and its own, `.moodboard-card__frame.moodboard-media-card`, to win over the base of the cards.

The cards share `.moodboard-card`, a square frame and a title; each content is a card of its own, in `app/components`: `channel-card`, `media-card`, `text-card` and `add-block`. A template of an item of a list holds one, `<li>` then a card.

The scripts reach the markup by data attributes, `data-field`, `data-list`, `data-action`, `data-part`, or by what an element is, never by a class: ESLint fails on a script that does. `pnpm lint:css` fails on a length off the scale and on a component with a margin or a width of its own.
