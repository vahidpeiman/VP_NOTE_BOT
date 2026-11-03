# CLAUDE.md

Guidance for Claude Code and other AI coding assistants working on this project.

- People: [README.md](README.md) (overview, setup, structure), [User Manual.md](User%20Manual.md) (using and running the bot).

## What this is

**VP_NOTE_BOT** is a private Telegram notebook bot that runs on **Telegram Serverless** (`tgcloud`).

- **Users:** only `ALLOWED_USER_IDS` in `tgcloud/lib/config.js` (now `370137656`, `5385238175`). Each allowed user has a **separate** notebook.
- **Features:** notes, categories, a 30-day trash, pins, hashtags, search, attachments (by Telegram `file_id`), Markdown export, inline mode, and editing a note by editing its source message.
- **No external services:** no API keys and no outbound HTTP.
- **Language:** message text is **Persian**. Reply-keyboard and inline-button labels are **English with emoji**. Dates use the Persian calendar, Tehran time (UTC+3:30).
- **Status:** tested locally (82 checks). **Not yet deployed or run on the real platform.**

## Runtime rules (tgcloud)

Code under `tgcloud/` runs in a V8 isolate in Telegram's cloud, not in Node.

- **Imports:** only `sdk` / `sdk/db` and project files. Relative project imports need the `.js` extension (`from '../lib/store.js'`).
- **Not available:** npm packages, filesystem, environment variables.
- **Undocumented in the runtime** (don't rely on them):
  - `TextEncoder` / `TextDecoder`: use `encodeUtf8` / `decodeUtf8` from `lib/tg.js`.
  - `Intl`: Persian dates come from `toJalali()` in `lib/text.js`, which was verified day by day against `Intl` for 1990–2060.
  - `setTimeout`, `atob`, `btoa`.
- **Handlers** live in `tgcloud/handlers/`, one level deep, named after Bot API update types. Each receives the payload (`Message`, `CallbackQuery`, `InlineQuery`), not the whole `Update`.
- **Database:** every call is async; always `await`.
  - Foreign keys are off, and declaring one with `.references()` makes the deploy fail.
  - Drop tables or columns only with `.deprecated('why')`. Deleting a declaration doesn't drop anything.
- **Telegram limits:**
  - message text ≤ 4096 chars
  - caption ≤ 1024
  - `callback_data` ≤ 64 bytes
  - bots download files ≤ 20 MB
  - uploads ≤ 50 MB (photos 10 MB)

## Commands

Run in `D:\VP_NOTE_BOT`. npm scripts: `npm run deploy` / `migrate` / `status`.

```bash
npx tgcloud login                # link to the bot (needs the CLI token from BotFather → Serverless → CLI Access)
npx tgcloud status               # local changes vs the deployed snapshot (offline)
npx tgcloud diff [file]          # line diff vs the deployed snapshot (offline)
npx tgcloud push                 # deploy changed modules
npx tgcloud migrate --dry-run    # show pending schema changes
npx tgcloud migrate              # apply them (needed after schema.js changes; asks before destructive steps)
npx tgcloud webhook              # is Telegram's webhook in sync?
```

**Always ask the user before `push`, `migrate`, `git commit` or `git push`.**
- `push` and `migrate` change the live bot, and dropped data can't be recovered.
- The repo's remote is `github.com/vahidpeiman/VP_NOTE_BOT`.
- `.tgcloud/` holds the CLI login and is git-ignored. Never print or commit it.

## Layout

```text
tgcloud/
  schema.js               categories, notes, user_state (+ indexes)
  handlers/
    message.js            commands, reply keyboard, pending input, quick save
    edited_message.js     editing a note's source message updates the note
    callback_query.js     inline buttons → noteAction / trashAction / categoryAction
    inline_query.js       "@bot query" in any chat; cached media for attachments
  lib/
    config.js             ALLOWED_USER_IDS and limits
    access.js             isAllowed(), setupMode()
    store.js              ALL SQL. Every query filters on user_id.
    views.js              screens { text, reply_markup }; button-data scheme documented at the top
    actions.js            noteFromMessage, category-name parsing/checks, openList/openSearch/openTags, export
    keyboard.js           reply keyboard, button → command map, Telegram menu commands
    text.js               normalize(), titleOf(), tagsOf(), escapeLike(), fa(), faDate(), toJalali()
    tg.js                 sendView / editView, splitText, sendLong, sendCopyable, sendAttachment, UTF-8
```

## Data model

| Table | Columns | Notes |
|---|---|---|
| `categories` | `id`, `user_id`, `name`, `emoji`, `created_at` | Names are unique per user after `normalize()` (checked in code, not by an index). |
| `notes` | `id`, `user_id`, `category_id`, `title`, `body`, `search_text`, `tags`, `pinned`, `kind`, `file_id`, `source_msg_id`, `created_at`, `updated_at`, `deleted_at` | See below. |
| `user_state` | `user_id` (PK), `pending`, `context` (JSON) | `context` keys: `back`, `search`, `tag`, `tagList`. |

`notes` columns:
- **`category_id`:** `null` means Uncategorized.
- **`title`:** the first non-empty line, at most `TITLE_MAX` characters; for an attachment with no text, its type label.
- **`body`:** the full text, or the attachment's caption.
- **`search_text`:** `normalize(body)`.
- **`tags`:** `' #a #b '` (normalized, space-padded for `LIKE '% #a %'`) or `''`.
- **`kind`:** `text | photo | voice | audio | video | video_note | animation | document`.
- **`file_id`:** the Telegram file ID of the attachment.
- **`source_msg_id`:** the message the note came from or was last edited by.
- **`deleted_at`:** set means the note is in the trash.
- **Times:** unix milliseconds.

`title`, `search_text` and `tags` are always recomputed together by `derived()` in `store.js` when the body changes. Never write `body` without them.

## Conventions and invariants

- **SQL** is raw, using the `sql` template from `sdk/db` with `db.run/all/get`. Values are always interpolated as parameters, never concatenated.
  - Dynamic `WHERE` is built by nesting `sql` fragments (`filterSql()`); constant `ORDER BY` uses `sql.raw`.
  - Raw results aren't type-converted (ints, strings, null).
  - Inserts use `RETURNING id`; read it with `insertId()`.
- **Isolation:** every query includes `user_id = ${userId}`. Callbacks re-check that the note or category exists for this user before acting. Don't add a query without it.
- **LIKE** uses `ESCAPE '!'` with `escapeLike()`. A backslash escape could be misread depending on how the `sql` tag reads template strings, so `!` is used instead.
- **Search:** at most 8 words, ANDed, each matched as a substring of `search_text`. The query goes through the same `normalize()` (ي→ی, ك→ک, ۀ/ة→ه, أ/إ/آ→ا, no diacritics or tatweel, ZWNJ→space, Persian/Arabic digits→0-9, lower case).
- **Hashtags:** `#` + 1–40 letters, digits or `_`, not preceded by a letter or digit (so `mail@x.com#y` is ignored).
- **Button data:** `<area>:<action>:<id>[:arg]`, under 64 bytes. Long values (search text, tag) go in `user_state.context`, never in button data. The full scheme is at the top of `lib/views.js`:
  - `h` home
  - `l:<list>:<page>` with `<list>` = `a` all, `u` uncategorized, `c<id>`, `p` pinned, `t` trash, `s` search, `g` tag
  - `n:v|e|m|mc|mn|p|d|dy|f|t|x:<id>[:catId]`
  - `t:v|r|x|xy:<id>`, `t:e`, `t:ey`
  - `c:n`, `c:o|r|e|d|dm|dt:<id>`
  - `g`, `g:<i>`
  - `st`, `ex`, `hp`, `sr`, `x` (cancel), `-` (does nothing)
- **Pending input** (`user_state.pending`): `new`, `search`, `edit:<id>`, `catnew`, `catnew:<noteId>`, `catrename:<id>`, `catemoji:<id>`.
  - A reply-keyboard button or any `/command` clears it before running. So does the ❌ Cancel button.
  - An unknown value is cleared.
- **Navigation:** lists are opened only through `openList()`, which saves `context.back = 'l:<list>:<page>'`. The note screen's « Back uses it.
- **Screens:** callbacks edit the message in place (`editView`, which ignores "not modified" and falls back to sending). Message handlers send new messages (`sendView`).
- **Callbacks:** `callback_query.js` answers each query exactly once, in `finally`. Export answers early and sets `toast = null`.
- **Deleting:**
  - Normal deletes and the "Undo" after a quick save set `deleted_at`.
  - Rows are removed only by `t:xy`, emptying the trash, or `purgeOldTrash()` (older than `TRASH_DAYS`, run whenever the trash list opens).
  - Deleting a category sets `category_id = NULL` on all its notes, trashed ones included, so a restore lands in Uncategorized.
- **Source message:** quick save, the New-note flow and `/new text` store `source_msg_id`. A text edit through ✏️ Edit replaces it with the new message; an edit from a `.txt`/`.md` file keeps the old one. `edited_message` ignores notes in the trash, unchanged text, empty text on text notes, and text over `NOTE_MAX_CHARS`.
- **Ordering:**
  - Lists: pinned first, then `updated_at` (newest first). Moving a note updates `updated_at`; pinning doesn't.
  - Trash: `deleted_at` (newest first).
  - Export: grouped by category name (`COLLATE NOCASE`), Uncategorized last.
- **Text style:** user-facing text is Persian, short and plain; numbers in Persian digits via `fa()`. Messages are sent without `parse_mode`. The only exception is `sendCopyable()`, which uses HTML `<pre>` with `escapeHtml()`.
- **New settings:** add them to `config.js` with a one-line comment, and to the configuration tables in README.md and User Manual.md.

## Testing

There is no local runtime and no test suite in the repo. The harness used during development:

1. Copy `tgcloud/` to a temp folder, add `{"type":"module"}` as `package.json`, and put a fake `sdk.js` next to it.
2. Rewrite `from 'sdk'` / `'sdk/db'` to `'../../sdk.js'` in `lib/` and `handlers/`, and to `'../sdk.js'` in `schema.js`.
3. Set `ALLOWED_USER_IDS = [1, 2]`.
4. The fake `sdk.js` provides:
   - **SQL:** `sql` that flattens to `?` parameters, splices nested `sql` and supports `sql.raw`.
   - **Database:** `db.run/all/get` on `node:sqlite` (`DatabaseSync(':memory:')`). `run` returns `{ rowsAffected, lastInsertRowid, rows }` and returns rows for `RETURNING`.
   - **Schema:** `table/integer/text/index` that record the schema and create the tables.
   - **Bot API:** a recording `api` (`sendMessage`, `editMessageText`, `answerCallbackQuery`, `sendDocument` with `InputFile`, `send{Photo,Voice,Audio,Video,VideoNote,Animation}`, `answerInlineQuery`, `setMyCommands`, `getFileContent`).
5. Drive the default exports of the four handlers with fake updates, and assert on what was sent and on the SQLite rows.

The last run covered 82 checks:
- access and cross-user isolation
- quick save and attachments
- categories: duplicates, rename, emoji, both delete modes
- paging, pins and back navigation
- editing: button, `.md` file, Telegram edit
- search normalization and literal `%`
- hashtags, trash, undo and the 30-day purge
- export, inline mode and paging

Always run `node --check` on changed files.

**Behaviors assumed from the tgcloud SDK docs but not yet seen on the platform:**
- nested `sql` fragments and `sql.raw`
- `ON CONFLICT … DO UPDATE SET … = excluded.…` in raw SQL
- `RETURNING id` in `db.run`
- parameters in `LIMIT`/`OFFSET`

If something fails after the first deploy, check these first.
