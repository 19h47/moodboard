# Releasing

WordPress updates the plugin from the latest [GitHub release](https://github.com/19h47/moodboard/releases): the `Update URI` header of `moodboard.php` routes the update check to GitHub, and the "View details" modal shows `README.txt` as it is in the release. The package it installs is `moodboard.zip`, which the Package workflow builds and attaches to each release once it is published: the files of the repository but those listed `export-ignore` in `.gitattributes`, with the dependencies of Composer. A release is offered once its package is there, a minute or so after it is published.

## Steps

1. Branch `release/x.y.z` from an up-to-date `main`.
2. Commit the changes, with a [gitmoji](https://gitmoji.dev).
3. Update the translations, with gettext and the dependencies of Composer, `composer install`, which hold the WP-CLI the files are written with:

   ```sh
   sh bin/update-translations.sh
   ```

   It writes `languages/moodboard.pot` from the code, merges it into `languages/moodboard-fr_FR.po`, then builds the files WordPress loads: the `.mo`, the `.l10n.php` and one JSON file per script with strings. It fails while a string is untranslated or fuzzy: translate it in `languages/moodboard-fr_FR.po`, run it again, and commit every file of `languages/` it changed.
4. Bump the version in a `:bookmark: x.y.z` commit:
   - `Version` in `moodboard.php`;
   - `Stable tag` in `README.txt`, with an entry in its changelog: one line per change, without prefix for a feature, `* Fixed: …` for a fix, `* Changed: …` for a change, `* Breaking: …` for a change that breaks the REST API or the data, with its migration, and `* Code only: …` for a change the reader does not see;
   - the translations, updated again by the script of step 3, which puts the version in `languages/moodboard.pot`.
5. Open a pull request titled `x.y.z`, then merge it once its checks pass: the coding standards (`phpcs`), PHPStan (`phpstan`), the scripts (`scripts`) and the tests (`phpunit`):

   ```sh
   gh pr checks --watch
   ```
6. Publish the release from `main`, with the changelog entry as notes, then check that the Package workflow attached `moodboard.zip` to it:

   ```sh
   gh release create vx.y.z --target main --title x.y.z --notes "…"
   gh run watch "$( gh run list --workflow package.yml --limit 1 --json databaseId --jq '.[0].databaseId' )"
   gh release view vx.y.z --json assets --jq '.assets[].name'
   ```
7. Attach the shortcut of the iPhone, which a Mac signs:

   ```sh
   python3 bin/make-shortcut.py
   gh release upload vx.y.z Moodboard.shortcut
   ```

## Versions

- Patch, `x.y.Z`: a fix, or a change the reader does not see.
- Minor, `x.Y.0`: a new feature.
- Major, `X.0.0`: a breaking change to the REST API, the meta or the data, with its migration.
