# CLAUDE.md

Guidance for AI coding assistants working on this project. User-facing details are in [README.md](README.md).

## What this is

A private Telegram notebook bot on **Telegram Serverless** (`tgcloud`). Only `ALLOWED_USER_IDS` (`tgcloud/lib/config.js`) get answers; each allowed user has a separate notebook. Message text is **Persian**; keyboard and inline button labels are **English** with emoji.

## Runtime rules (tgcloud)

- Code in `tgcloud/` runs in a V8 isolate, not Node. Import only `sdk` / `sdk/db` and project files (relative paths **with `.js`**). No npm packages, filesystem or env vars.
- `TextEncoder`, `Intl`, `setTimeout` are not documented for the runtime. Use `encodeUtf8` / `decodeUtf8` in `lib/tg.js` and the Persian-calendar code in `lib/text.js`.
- Handlers: `message`, `edited_message`, `callback_query`, `inline_query` (named after Bot API update types). Each gets the payload (e.g. the `Message`), not the whole update.
- No foreign keys (declaring one fails the deploy); enforce integrity in code. Drop tables or columns only with `.deprecated('why')`.
- Telegram limits: messages ≤ 4096 chars, `callback_data` ≤ 64 bytes, captions ≤ 1024, bots download files ≤ 20 MB.

## Commands

```bash
npx tgcloud status               # local changes vs deployed (offline)
npx tgcloud push                 # deploy code
npx tgcloud migrate --dry-run    # pending schema changes
npx tgcloud migrate              # apply them (only after schema.js changed)
```

**Ask the user before `push` or `migrate`.** They change the live bot, and dropped data can't be restored.

## Conventions

- **All SQL lives in `lib/store.js`**, written as raw SQL with the `sql` template from `sdk/db`. Values are always parameters, never string-concatenated.
  - Every query must filter on `user_id`. This is the isolation guarantee.
  - Raw queries return unconverted values (ints, strings, null).
- **LIKE** uses `ESCAPE '!'` with `escapeLike()`, which avoids backslashes in templates.
- **Search fields** (`search_text`, `tags`) are derived in `store.js` (`derived()`) from the body whenever it changes. Search queries go through the same `normalize()`.
- **Screens** in `lib/views.js` return `{ text, reply_markup }`. Callbacks edit the message in place (`editView`); messages send a new one (`sendView`).
- **Button data** is `<area>:<action>:<id>[:arg]`; the full scheme is documented at the top of `lib/views.js`. Keep new data under 64 bytes, and store anything long (search text, tag) in `user_state.context`.
- **Pending input** (`user_state.pending`): `new`, `search`, `edit:<id>`, `catnew[:<noteId>]`, `catrename:<id>`, `catemoji:<id>`. A keyboard button or `/command` always clears it first.
- **Lists** are opened through `openList()`, which saves `context.back` so "« Back" on a note returns to the right list and page.
- **Deleting** puts notes in the trash (`deleted_at`). Only `t:xy` / empty trash / the 30-day purge remove rows.
- New settings go in `config.js` with a one-line comment and a row in the README table.

## Testing

Copy `tgcloud/` to a temp folder, point `from 'sdk'` / `'sdk/db'` at a fake module, set `ALLOWED_USER_IDS = [1, 2]`, then drive the handlers with fake updates. The fake module provides:
- `db.run/all/get` executing the same SQL on `node:sqlite` (`sql` flattened to `?` params, nested `sql` spliced, `sql.raw` literal);
- `table/integer/text/index` producing `CREATE TABLE`;
- a recording `api`.

Run `node --check` on changed files.
