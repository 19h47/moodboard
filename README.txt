=== Moodboard ===

Contributors: 19h47
Donate link: https://www.19h47.fr
Tags: moodboard, media, collections, images, curation
Requires at least: 7.1
Tested up to: 7.1
Stable tag: 0.1.0
Requires PHP: 8.5
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Collect images, files and texts in channels, as a moodboard, from a private app.

== Description ==

Moodboard gathers the visual research of a project, such as a novel, in a clean grid, as Are.na does, on your own site: each curator has a moodboard of their own, in a private app.

= Features =

* **Blocks** – An image or another file of the media library, or a text, with its title, its description and its source, the URL it comes from.
* **Channels** – The collections of a moodboard. A block is in as many channels as one likes, and a channel under another, as deep as one likes.
* **The app** – Under **Media > Moodboard**, full screen: the index, every channel and every block, a page for each channel, its sub-channels and its blocks, and a page for each block, its neighbours a key away. It installs on the home screen of a phone.
* **Adding** – Files picked, dropped or pasted, a text written, or the URL of an image, which WordPress downloads.
* **Curators** – The role **Curator** gives a moodboard of one's own: a curator sees and changes their own channels and blocks only. The administrators curate their own too.
* **Translatable** – French translation included.

= Technical =

* A block is a media, `attachment`, or a text, the `moodboard_text` post type, always private. A channel is a term of the hierarchical `moodboard_channel` taxonomy over both, its curator in the term meta `moodboard_author`. The source of a block is the meta `moodboard_source`.
* The app reads and writes through the REST API of WordPress: `wp/v2/media`, `wp/v2/moodboard-texts` and `wp/v2/moodboard-channels`. An image comes from its URL through `POST wp/v2/media` with `url`, as core sideloads it; the plugin gives it the channels and the source of the request.
* Each curator's moodboard is their own in the app and the REST API; the files of the media library stay reachable by their URL, as any media of WordPress.

== Installation ==

1. Download `moodboard.zip` from the latest release on GitHub.
2. In **Plugins > Add New > Upload Plugin**, upload it, then activate it.
3. Give the role **Curator** to the people who curate a moodboard, or curate as an administrator.
4. Open **Media > Moodboard**, and add a channel.

== Frequently Asked Questions ==

= Which URLs does an image come from? =

The URL of an image file, whose path ends with its extension, such as `.jpg`: WordPress downloads it, refusing a local address. A page, or an image without an extension in its URL, is refused; download it, then drop it in the channel.

= What happens to the blocks of a deleted channel? =

Its sub-channels go to its parent, as do the blocks in no other channel. Without a parent, they go to the index, and the blocks in no other channel stay in the media library only.

== Changelog ==

= 0.1.0 =

* The index, the channels and their sub-channels, the blocks: media and texts, in several channels.
* The app, under Media > Moodboard: the grid, the page of a block, adding files, a text or the URL of an image, connecting a block to channels.
* The role Curator.
