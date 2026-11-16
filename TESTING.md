# Testing

The tests run on the test suite of WordPress: the core installed by Composer, the plugin loaded as a must-use plugin, and channels and blocks added through the REST API of core, as the app adds them.

## Database

The suite empties its database on each run: give it one of its own, never the database of a site.

```sh
mysql -uroot -proot -e 'CREATE DATABASE IF NOT EXISTS moodboard_tests'
```

`tests/wp-tests-config.php` reads it from the environment, with these defaults:

| Variable | Default |
| --- | --- |
| `WP_TESTS_DB_NAME` | `moodboard_tests` |
| `WP_TESTS_DB_USER` | `root` |
| `WP_TESTS_DB_PASSWORD` | `root` |
| `WP_TESTS_DB_HOST` | `127.0.0.1` |

With Local, the host is the socket of the site's MySQL, under `~/Library/Application Support/Local/run/<id>/mysql/mysqld.sock`, and the PHP of the site is the one of its `.envrc`:

```sh
source ~/Sites/stepper/app/.envrc
export WP_TESTS_DB_HOST="localhost:$HOME/Library/Application Support/Local/run/<id>/mysql/mysqld.sock"
```

## Running

```sh
composer install
composer test
composer analyse
vendor/bin/phpcs
pnpm install
pnpm lint:js
pnpm lint:css
pnpm check:js
```

## Writing a test

A test class, in the namespace `Moodboard\Tests`, extends `TestCase` (`tests/class-testcase.php`), in a file `tests/class-test-*.php`. Each test runs as a curator of their own; `as_user()` logs in another, `add_channel()` adds a channel through `POST wp/v2/moodboard-channels`, `add_media()` a media in channels, and `request()` sends a request of the REST API as the current user.
