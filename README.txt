=== Moodboard ===

Contributors: 19h47
Donate link: https://www.19h47.fr
Tags: moodboard, media, collections, images, curation
Requires at least: 7.1
Tested up to: 7.1
Stable tag: 0.4.0
Requires PHP: 8.5
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Collect images, files and texts in channels, as a moodboard, from a private app.

== Description ==

Moodboard gathers images, files, texts and links in channels, in a clean grid, on your own site: each curator has a moodboard of their own, in a private app.

= Features =

* **Blocks** – An image or another file of the media library, a text, or a link, a page or a video of the web, with its title, its description, who made it, such as an artist or a photographer, and its source, the URL it comes from. Who made an image is the credit its file holds, who made a link the author its provider gives, until written otherwise. A video plays in its page.
* **Notes** – Notes on a block, for oneself, the notes of WordPress, which only its curator reads.
* **Presenting** – The blocks of a channel one at a time, over the whole screen, on black: by the arrows, a swipe, or on their own.
* **Channels** – The collections of a moodboard. A block is in as many channels as one likes, or in none, in the index, and a channel under another, as deep as one likes. A channel added while connecting a block opens its form, to choose where it goes.
* **Order** – The blocks of a channel in the order one gives them: its cards dragged to their place, or moved with the keys, a handle picking one up, the arrow keys moving it, Space putting it down; or the blocks selected put first or last. A block added since comes first. A block in several channels has a place in each; the index keeps the latest first.
* **The app** – Under **Media > Moodboard**, full screen, the images first: the index, every channel and every block, a page for each channel, its sub-channels and its blocks, and a page for each block: its image as large as the screen, beside it what it is, what changes it, its channels and its notes, its neighbours a key or a swipe away. An image shows its title once written, never the name of its file. A channel shows its latest images. The cards come in four sizes, the largest two a row, kept on the device. It installs on the home screen of a phone.
* **Adding** – Files dropped anywhere on the page or pasted, such as a screenshot, or a link dragged from another page, into the channel shown or the index, each showing at once as it uploads; with +, files picked, a text written, or a URL: an image WordPress downloads, or a link, its title and its image those of its page.
* **Searching** – The index or a channel, by the words of their blocks and the names of their channels, a word typed wrong taken for the closest one; / unfolds the search.
* **Sharing** – From the share sheet of a phone: on Android, or in Chrome, once the app is installed, and on an iPhone with a shortcut. Shared from an iPhone, an image, a link or a text is added at once, without opening the app; shared from Android or Chrome, it opens the + of the app, written in it, to add with a tap.
* **Selecting** – Several blocks at once, to connect them to channels, put them first or last in the channel shown, take them out of it, or delete them: Shift ticks the blocks between two, Control or Command and A every one.
* **Deleting** – A block deleted, or the blocks selected, leave at once: Undo, or Control or Command and Z, brings them back a moment before they are deleted.
* **Curators** – The role **Curator** gives a moodboard of one's own: a curator sees and changes their own channels and blocks only, and writes as a contributor of WordPress does. The administrators curate their own too.
* **Translatable** – French translation included.

= Technical =

* A block is a media, `attachment`, marked by the meta `moodboard_block`, a text, the `moodboard_text` post type, or a link, the `moodboard_link` post type, both always private. A link has its URL as its source, the image of its page as its featured image, `moodboard_image` with its sizes, and its player, `moodboard_embed`, the one core embeds. A link added by its URL alone, `POST wp/v2/moodboard-links` with its source and no title, takes its title and its image from what core gives of its URL: its oEmbed, and the preview of its page for what its oEmbed leaves out, such as the image of a post of Tumblr, at its largest size; a URL of an image is its own image. The notes are the comments of the type note of core. A channel is a term of the hierarchical `moodboard_channel` taxonomy over both, its curator in the term meta `moodboard_author`. The source of a block is the meta `moodboard_source`, who made it the meta `moodboard_by`, which a search of the REST API finds too, as the alternative text of an image: each word of a search in any of them. A word in no block of the curator is taken for the closest word of their blocks, which the header `X-Moodboard-Search` of the response says.
* `GET wp/v2/media?moodboard_block=1` lists the media of the current user that are blocks, in a channel or none.
* A channel of the REST API has `moodboard_covers`, its latest images and those of its sub-channels, four at most, computed, and in its `meta` the order of its blocks, `moodboard_order`, their post IDs, which its curator writes: a block not in it comes first, the latest first.
* The app reads and writes through the REST API of WordPress: `wp/v2/media`, `wp/v2/moodboard-texts` and `wp/v2/moodboard-channels`. An image comes from its URL through `POST wp/v2/media` with `url`, as core sideloads it; the plugin gives it the channels and the source of the request.
* The manifest of the app declares a share target, `upload.php` with `moodboard-title`, `moodboard-text` and `moodboard-url`, which the plugin sends on to the app: a browser opens the target without the arguments of its URL. The app shows what is shared in its +, then takes it out of its URL: a link alone adds nothing.
* Each curator's moodboard is their own in the app and the REST API; the files of the media library stay reachable by their URL, as any media of WordPress.

== Installation ==

1. Download `moodboard.zip` from the latest release on GitHub.
2. In **Plugins > Add New > Upload Plugin**, upload it, then activate it.
3. Give the role **Curator** to the people who curate a moodboard, or curate as an administrator.
4. Open **Media > Moodboard**, and add a channel.

== Frequently Asked Questions ==

= Which URLs does an image come from? =

The URL of an image file, whose path ends with its extension, such as `.jpg`: WordPress downloads it, refusing a local address. Any other URL is a link, a page or a video, its title and its image those of its page; for an image without an extension in its URL, download it, then drop it in the channel.

= How do I share to my moodboard from an iPhone? =

iOS lets no web app into its share sheet: a shortcut takes its place, `Moodboard.shortcut`, attached to each release. The site must be served over HTTPS.

1. In **Users > Profile > Application Passwords**, add one, named after the iPhone, and copy it.
2. Open `Moodboard.shortcut` on the iPhone, or on a Mac whose shortcuts go to it, and add it: it asks for the address of the site, your login and the application password.
3. In the share sheet of Photos, Safari or another app, choose **Moodboard**. What is shared is added to the index without opening the app, as a notification says: an image, else a link, which WordPress names and illustrates, else a text. An image shared with the link of its post, as Tumblr shares one, is added alone. If WordPress refuses it, an alert says why.

The application password stays in the shortcut once added, never in its file: revoke it from the profile if the iPhone is lost.

= What happens to the blocks of a deleted channel? =

Its sub-channels go to its parent, as do the blocks in no other channel. Without a parent, they stay in the index, as every block.

== Changelog ==

= 0.4.0 =

* A search finds each of its words in the alternative text of an image too, in any order, a word in the title and another in the alternative text; a word excluded, -tramway, leaves out the images whose alternative text says it.
* A word typed wrong, in no block, is taken for the closest word of one's blocks, a letter or two apart: betno searches béton, which the notice says. A word a block has, even in part or without its accents, and a word of fewer than four letters stay as typed; the words of the blocks of another curator are never one.

= 0.3.1 =

* Fixed: the image of a link is whole in its card, as the one of a media, rather than cut to its square: the images of Tumblr, most of them higher than wide, lost their top and their bottom.

= 0.3.0 =

* A presentation ended on another block leaves it under it: opened from the page of a block, the page of the block it ended on, in place, so that Back goes to the channel; opened from a grid, its card, brought into view.
* The place and the name of the block presented come in scrambled, their letters settling from the first to the last, as assistive technologies read them as they are; nothing moves for whom asks for less motion.
* Changed: the bar of the presentation is in the monospace of the app.

= 0.2.2 =

* Fixed: a link to Instagram, whose page shows the server its login, takes nothing of it: neither the title "Instagram" nor its logo, whose many sizes timed the host out before WordPress answered.
* Fixed: the shortcut of the iPhone says what the server answered when it is no answer of WordPress, such as an error of the host, rather than failing to read it.

= 0.2.1 =

* Changed: the banner of the plugin, in its details, takes the dark of its icon, #1a1a1a, rather than black.

= 0.2.0 =

* The blocks of a channel in the order one gives them: with the control of the order, its cards are dragged to their place, or moved with the keys, their handle picking one up, the arrow keys moving it, Space putting it down, Escape putting it back; the blocks selected go first or last. A block added since comes first.

= 0.1.9 =

* Changed: the description of the plugin says what it gathers, images, files, texts and links, for any use.

= 0.1.8 =

* Fixed: Moodboard is installed beside Library, as another app of the same admin: its scope is the Media page, where it is, rather than the whole admin, which took the page of Library for its own.

= 0.1.7 =

* Fixed: channels ticked one after the other in Connect are all kept, each change waiting for the one before, which only the last one was.
* Changed: a channel added from Connect opens its form, its name typed, to choose the channel it goes under and write its description; the block, or the blocks selected, go in it.

= 0.1.6 =

* Fixed: a link to a post of Tumblr takes its title and its image, at its original size, which its oEmbed does not give; a link to an image, as Pinterest shares one, takes it as its image.

= 0.1.5 =

* Changed: the header stays at the top of the screen, its tools at hand, as the grid scrolls under it; the image of a block stays under it, and what the keyboard reaches never goes under it.

= 0.1.4 =

* Who made a block, such as an artist, a photographer or an account, beside its page and in its form: an image takes the credit its file holds, a link the author its provider gives, until written otherwise; the search finds a block by it.

= 0.1.3 =

* Changed: blocks added take their place first in the grid at once, without loading it again: the cards shown stay as they are.
* Changed: after a change, such as a block deleted, the grid shows what it holds while it loads again, a card changing only if its block does.

= 0.1.2 =

* Changed: the page of a block, as Are.na has it: its image as large as the screen, never larger than it is, and beside it, on a wide screen, its details, Connect, a menu of its actions, and its channels and its notes, a tab each.
* Fixed: the image of a block shows at its size, rather than at the one of a thumbnail.
* Changed: files dropped or pasted say they are being added at once, until they are, in a notice that shows over any image.

= 0.1.1 =

* Fixed: the shortcut of the iPhone sends the image shared, and an image file only, never a page or a text drawn as one; it shows in the share sheet of any app, such as Tumblr, and says when WordPress refuses what it sends.
* Changed: the shortcut adds a link or a text itself, without opening the app.
* Changed: WordPress describes a link added by its URL alone, its title and its image from its oEmbed or its page, for the app and the shortcut alike; an image whose URL has no extension is taken too.
* Fixed: deleting a block from its page no longer says its ID is invalid.
* Fixed: deleting a link asks to delete a link, not a text.

= 0.1.0 =

* The index, the channels and their sub-channels, the blocks: media and texts, in several channels.
* The app, under Media > Moodboard: the grid, the page of a block, adding files, a text or the URL of an image, connecting a block to channels.
* Files dropped anywhere on the page or pasted go into the channel shown, or the index, where a block lives without a channel.
* Links and videos, notes on a block, and the blocks presented over the whole screen.
* Sharing to the app: the share target of its manifest, and a shortcut for the iPhone, attached to the release.
* The icons of the app, the bookmark of Material Symbols, as those of the other apps of the author: grey on white or on dark, as the theme, and dark on the home screen.
* A light or dark theme chosen over the system one, kept on the device.
* The images first: a header on one line, the titles written only, the image of a block as large as the screen, the latest images of a channel on its card, four sizes of cards, and the blocks selected together.
* The role Curator.
