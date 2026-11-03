# VP_NOTE_BOT

A private Telegram notebook bot on Telegram Serverless (`tgcloud`). Notes with categories, editing, a trash, pins, hashtags, search, attachments, export and inline mode. It works only for the Telegram user IDs listed in the code, and needs no API key or paid service.

## Features

```text
📝 New note     📂 Categories
🔍 Search       📌 Pinned
🗑 Trash        ⚙️ Settings
```

- **Quick save:** anything you send becomes a note at once: text, photo, voice, audio, video, video note, GIF or file. It goes to **📥 Uncategorized**, with buttons to choose a category, view it, or undo.
- **Categories:** create (optionally with an emoji, e.g. `💡 Ideas`), rename, change the emoji, delete. When you delete a category, you choose whether its notes move to Uncategorized or to the trash. Names are unique per user (`ي`/`ی`, `ك`/`ک`, half-spaces and letter case are treated as the same).
- **Note screen:**
  - **Edit:** the current text is sent as a tap-to-copy block, and you send back the new text. Long notes can come back as a `.txt` / `.md` file.
  - **Move**, **Pin**, **Delete** (to the trash).
  - **Attachment:** re-sends the photo, voice or file.
  - **Full text:** shown for long notes.
- **Edit in Telegram:** editing the message a note came from updates the note.
- **Trash:** deleted notes stay **30 days**, then they're removed the next time you open the trash. From the trash you can restore a note, delete it forever, or empty the trash. Every delete offers an **↩️ Undo**.
- **📌 Pinned** notes stay at the top of every list, and have their own list.
- **#Hashtags** in the text become tags. Browse them with `/tags` or Settings → Tags.
- **Search** in note text:
  - All words must match.
  - `ي`/`ی`, `ك`/`ک`, half-spaces, diacritics and Persian digits don't matter.
  - `%` and `_` are searched literally.
- **Inline mode:** in any chat, type `@your_bot word` to pick a note and send it there. Photos, voice, audio, video, GIFs and files are sent as the original media.
- **Export:** `/export` sends every note (except the trash) as one Markdown file, grouped by category.
- **Dates** are shown in the Persian calendar, Tehran time.

## Access

```js
// tgcloud/lib/config.js
export const ALLOWED_USER_IDS = [370137656, 5385238175];
```

- Only these users get answers. Anyone else gets **no reply at all**: messages, buttons and inline queries.
- Each allowed user has a **separate** notebook. Every database query is limited to the user's own rows, so even a forged button can't reach another user's notes.
- Private chats only; groups are ignored.
- If the list is empty, the bot replies to anyone with their numeric ID, so you can add yours.

## Setup

Prerequisites: Node.js 18+ and a Telegram bot.

1. **Create the bot and enable Serverless:** in `@BotFather`, create a bot (`/newbot`), open it, and turn on **Serverless**.
2. **Enable inline mode:** in BotFather, `/setinline` → pick the bot → send a placeholder such as `جست‌وجو در یادداشت‌ها…` ("search notes…").
3. **Get the CLI token:** BotFather → your bot → **Serverless** → **CLI Access** → **Access token**. It looks like `app12345:xxxx`.
4. **Link the project:**

   ```bash
   npm install
   ```

   ```bash
   npx tgcloud login
   ```

5. **Set your ID:** put your Telegram ID in `ALLOWED_USER_IDS` in `tgcloud/lib/config.js`.
6. **Deploy the code and create the tables:**

   ```bash
   npx tgcloud push
   ```

   ```bash
   npx tgcloud migrate
   ```

7. In Telegram, send `/start`.

**Later updates:** `npx tgcloud push`. Run `npx tgcloud migrate` too only when `tgcloud/schema.js` changed.

## Commands

| Command | Button | What it does |
|---|---|---|
| `/start` | — | Keyboard and Telegram's command menu |
| `/new` · `/new text` | 📝 New note | New note, then choose its category |
| `/cats` | 📂 Categories | Categories with note counts, all notes, Uncategorized, tags |
| `/search word` | 🔍 Search | Search |
| `/pinned` | 📌 Pinned | Pinned notes |
| `/trash` | 🗑 Trash | Deleted notes |
| `/tags` | — | Hashtags |
| `/settings` | ⚙️ Settings | Counts, export, tags, help |
| `/export` | — | Everything as a Markdown file |
| `/help` | — | Help |

Any keyboard button or command cancels what the bot was waiting for (a new name, an edit…).

## Configuration

`tgcloud/lib/config.js`, then `npx tgcloud push`:

| Setting | Default | Meaning |
|---|---|---|
| `ALLOWED_USER_IDS` | `[370137656, 5385238175]` | Who may use the bot |
| `PAGE_SIZE` | `8` | Notes per page in lists |
| `INLINE_PAGE_SIZE` | `20` | Results per batch in inline mode |
| `TITLE_MAX` | `60` | Title length (the first line of the note) |
| `NOTE_MAX_CHARS` | `20000` | Longest note (Telegram messages are ≤ 4096; longer text via a `.md` file) |
| `VIEW_MAX_CHARS` | `3300` | Text shown on the note screen before "Full text" |
| `TRASH_DAYS` | `30` | Days in the trash before deletion |
| `CATEGORY_NAME_MAX` | `40` | Longest category name |

## Project structure

```text
tgcloud/
  schema.js                 tables: categories, notes, user_state
  handlers/
    message.js              commands, keyboard, waiting-for input, quick save
    edited_message.js       editing your message updates its note
    callback_query.js       inline buttons
    inline_query.js         @bot search in any chat
  lib/
    config.js               settings
    access.js               allowed users
    store.js                all SQL (always filtered by user_id)
    views.js                screens; the button-data format is described at its top
    actions.js              shared steps: note from a message, lists, category names, export
    keyboard.js             keyboard and command menu
    text.js                 Persian normalization, titles, hashtags, Persian-calendar dates
    tg.js                   Telegram helpers (send/edit, long text, attachments, UTF-8)
```

### Data

| Table | Columns |
|---|---|
| `categories` | `id`, `user_id`, `name`, `emoji`, `created_at` |
| `notes` | `id`, `user_id`, `category_id` (null = Uncategorized), `title`, `body`, `search_text` (normalized), `tags` (` #a #b `), `pinned`, `kind`, `file_id`, `source_msg_id`, `created_at`, `updated_at`, `deleted_at` (set = in trash) |
| `user_state` | `user_id`, `pending` (what the next message is for), `context` (JSON: last list, search, tag) |

Attachments aren't copied: the bot keeps Telegram's `file_id` and re-sends by it.

## Limits

- **No reminders:** the platform has no cron or timers, so nothing can fire at a set time.
- **Albums:** each photo in an album becomes its own note (Telegram sends them as separate messages).
- **Backups:** the data lives only in the platform's database. Use `/export` now and then.
- **Video notes in inline mode:** Telegram can't send a stored video note inline, so its text is sent instead.

## Testing

There is no local runtime. The bot was tested by running its handlers in Node with a fake `sdk`: a recording Bot API, and the same SQL running on Node's built-in SQLite (`node:sqlite`). 82 checks cover:

- access and per-user isolation
- quick save, the new-note flow and attachments
- categories (duplicates, rename, emoji, both delete modes)
- paging, pins and "back" navigation
- editing (button, `.md` file, Telegram edit)
- search normalization and literal `%`
- hashtags, trash and undo, 30-day purge
- export and inline mode with paging

It hasn't been run on the real platform yet.
