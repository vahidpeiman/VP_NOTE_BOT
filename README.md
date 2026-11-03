# VP_NOTE_BOT

A private Telegram notebook bot that runs on **Telegram Serverless** (`tgcloud`). You send it anything: text, a photo, a voice message or a file. It keeps it as a note you can sort into categories, edit, pin, tag, search, export, and send into any chat.

- **Private:** only the Telegram user IDs listed in the code get answers. Everyone else gets no reply at all.
- **Separate notebooks:** each allowed user sees only their own notes.
- **No server, no API keys, no costs:** it runs in Telegram's cloud and calls no outside service.
- **Persian interface:** messages are in Persian, with Persian-calendar dates (Tehran time). Buttons are English with emoji.

| Document | For |
|---|---|
| **README.md** (this file) | What it does, setup, configuration, how it's built |
| [User Manual.md](User%20Manual.md) | Using the bot step by step, running and maintaining it, troubleshooting |
| [CLAUDE.md](CLAUDE.md) | Notes for AI coding assistants working on the code |

> **Status:** tested locally with 82 automated checks. Not yet deployed to the real platform.

## Features

**Keyboard:**

```text
📝 New note     📂 Categories
🔍 Search       📌 Pinned
🗑 Trash        ⚙️ Settings
```

| Feature | How it works |
|---|---|
| **Quick save** | Anything you send becomes a note in **📥 Uncategorized** at once. The reply has **📂 Category**, **👁 View** and **↩️ Undo** buttons. |
| **Attachments** | Photos, voice messages, audio, videos, video notes, GIFs and files. The caption becomes the note's text. The bot stores Telegram's `file_id`, not the file. |
| **Categories** | Create (optionally with an emoji: `💡 Ideas`), rename, change or remove the emoji, delete. On delete, its notes move to Uncategorized or to the trash, your choice. |
| **Editing** | **✏️ Edit** sends the current text as a tap-to-copy block; you send back the new text (or a `.txt`/`.md` file for long text). Or **edit your original message** in Telegram and the note follows. |
| **Trash** | Deleting moves a note to the trash for **30 days**, with an **↩️ Undo** right away. From the trash: restore, delete forever, or empty it. |
| **Pins** | 📌 Pinned notes stay at the top of every list and have their own list. |
| **Hashtags** | Every `#word` in a note is a tag. `/tags` lists them with counts; tap one to see its notes. |
| **Search** | Every word must appear. Arabic/Persian letter variants (ي/ی, ك/ک), half-spaces, diacritics and Persian digits don't matter. |
| **Inline mode** | In any chat, type `@your_bot word` and pick a note to send it there; attachments go as the original media. |
| **Export** | `/export` sends all notes (except the trash) as one Markdown file, grouped by category. |

Lists show 8 notes per page with ‹ / › paging. **« Back** on a note returns to the list and page you came from.

## Setup

Prerequisites: Node.js 18+ and a Telegram account.

1. **Create the bot:** in `@BotFather`, send `/newbot` and follow the steps.
2. **Turn on Serverless:** BotFather → your bot → **Serverless** → enable.
3. **Turn on inline mode:** BotFather → `/setinline` → your bot → send a placeholder such as `جست‌وجو در یادداشت‌ها…` ("search notes…").
4. **Get the CLI token:** BotFather → your bot → **Serverless** → **CLI Access** → **Access token**. It looks like `app12345:xxxx`; keep it private.
5. **Install and log in**, from `D:\VP_NOTE_BOT`:

   ```bash
   npm install
   ```

   ```bash
   npx tgcloud login
   ```

6. **Allow users:** set `ALLOWED_USER_IDS` in `tgcloud/lib/config.js`. If you don't know your ID, temporarily empty the list (`[]`), deploy, and message the bot; it replies with your ID.
7. **Deploy the code, then create the database tables:**

   ```bash
   npx tgcloud push
   ```

   ```bash
   npx tgcloud migrate
   ```

8. **Start:** in Telegram, open the bot and send `/start`.

**Updating later:**
- After code changes, run `npx tgcloud push`.
- Run `npx tgcloud migrate` as well only when `tgcloud/schema.js` changed.
- `npm run deploy`, `npm run migrate` and `npm run status` are shortcuts.

## Commands

| Command | Button | What it does |
|---|---|---|
| `/start` | — | Shows the keyboard and sets Telegram's command menu |
| `/new` | 📝 New note | Waits for a note, then asks for its category |
| `/new some text` | — | Saves "some text" right away, then asks for its category |
| `/cats` (`/categories`) | 📂 Categories | Categories with note counts, All notes, Uncategorized, Tags |
| `/search words` | 🔍 Search | Search (the button asks for the words) |
| `/pinned` | 📌 Pinned | Pinned notes |
| `/trash` | 🗑 Trash | Deleted notes |
| `/tags` | — | Hashtags with counts |
| `/settings` | ⚙️ Settings | Counts, Export, Tags, Help |
| `/export` | — | All notes as a Markdown file |
| `/help` | — | Help text |

## Configuration

Edit `tgcloud/lib/config.js`, then run `npx tgcloud push`.

| Setting | Current value | Meaning |
|---|---|---|
| `ALLOWED_USER_IDS` | `[370137656, 5385238175]` | Telegram user IDs that may use the bot. Empty list = setup mode (the bot tells anyone their ID). |
| `PAGE_SIZE` | `8` | Notes per page in lists |
| `INLINE_PAGE_SIZE` | `20` | Results per batch in inline mode (more load as you scroll) |
| `TITLE_MAX` | `60` | Characters of the first line used as the title |
| `NOTE_MAX_CHARS` | `20000` | Longest note text accepted |
| `VIEW_MAX_CHARS` | `3300` | Text shown on the note screen before a **📄 Full text** button appears |
| `TRASH_DAYS` | `30` | Days a note stays in the trash before it's deleted for good |
| `CATEGORY_NAME_MAX` | `40` | Longest category name |

## How it's built

```text
Telegram ─▶ handlers/message.js         commands, keyboard, pending input, quick save
         ─▶ handlers/edited_message.js  source message edited → note updated
         ─▶ handlers/callback_query.js  inline buttons
         ─▶ handlers/inline_query.js    "@bot query" in any chat
                     │
                     ▼
          lib/views.js (screens) · lib/actions.js (shared steps) · lib/store.js (SQL) ─▶ SQLite (platform DB)
```

```text
VP_NOTE_BOT/
├── tgcloud/
│   ├── schema.js               tables and indexes
│   ├── handlers/
│   │   ├── message.js
│   │   ├── edited_message.js
│   │   ├── callback_query.js
│   │   └── inline_query.js
│   └── lib/
│       ├── config.js           settings
│       ├── access.js           allowed users
│       ├── store.js            all database queries (always filtered by user)
│       ├── views.js            screens and the button-data format
│       ├── actions.js          note-from-message, category names, lists, export
│       ├── keyboard.js         keyboard and command menu
│       ├── text.js             Persian normalization, titles, hashtags, Persian-calendar dates
│       └── tg.js               Telegram helpers (send/edit, long text, attachments, UTF-8)
├── CLAUDE.md
├── README.md
├── User Manual.md
├── package.json                devDependency: @tgcloud/cli
└── tgcloud.jsonc
```

### Database

| Table | What it holds |
|---|---|
| `categories` | `id`, `user_id`, `name`, `emoji`, `created_at` |
| `notes` | `id`, `user_id`, `category_id` (empty = Uncategorized), `title`, `body`, `search_text` (normalized for search), `tags`, `pinned`, `kind` (text/photo/voice/…), `file_id`, `source_msg_id`, `created_at`, `updated_at`, `deleted_at` (set = in the trash) |
| `user_state` | `user_id`, `pending` (what the next message is for), `context` (last list, search, tag) |

Every row has a `user_id`, and every query filters on it. That is what keeps notebooks separate.

### Privacy and security

- **No answers to outsiders:** people not on the list get no reply to messages, buttons or inline queries, so they can't tell what the bot does.
- **What's stored:** note text and Telegram `file_id`s, in the platform's database for this bot. Files themselves stay on Telegram's servers.
- **Credentials:** the CLI login is stored in `.tgcloud/`, which is git-ignored. Never commit or share it.
- **Backups:** there are none automatically; use `/export`.

## Limits

- **No reminders:** the platform has no scheduler, so the bot can't message you at a set time.
- **Albums:** each photo in an album is saved as its own note (Telegram sends them separately).
- **Video notes in inline mode:** Telegram can't send a stored video note inline, so its text is sent instead.
- **File IDs:** they belong to this bot. If you ever replace the bot with a new one, old attachments can't be re-sent.

## Testing

There's no local runtime. The handlers were run in Node against a fake `sdk`: a recording Bot API, and the same SQL running on Node's built-in SQLite. 82 checks pass:

- access and isolation between users
- quick save and attachments
- categories: duplicates, rename, emoji, both delete modes
- paging, pins and back navigation
- editing: button, `.md` file, Telegram edit
- search normalization and literal `%`
- hashtags, trash, undo and the 30-day purge
- export, inline mode and paging

[CLAUDE.md](CLAUDE.md) describes the harness.
