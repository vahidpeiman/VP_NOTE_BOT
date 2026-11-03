# User Manual: VP_NOTE_BOT

How to use your Telegram notebook day to day, and how to run and maintain it. For an overview and the full setup, see [README.md](README.md).

**Contents**

1. [Quick reference](#1-quick-reference)
2. [Saving notes](#2-saving-notes)
3. [Categories](#3-categories)
4. [The note screen](#4-the-note-screen)
5. [Editing a note](#5-editing-a-note)
6. [Moving and pinning](#6-moving-and-pinning)
7. [Deleting, the trash and undo](#7-deleting-the-trash-and-undo)
8. [Hashtags](#8-hashtags)
9. [Search](#9-search)
10. [Inline mode: sending a note to any chat](#10-inline-mode-sending-a-note-to-any-chat)
11. [Export and backups](#11-export-and-backups)
12. [Settings and help](#12-settings-and-help)
13. [Users and access](#13-users-and-access)
14. [Running the bot](#14-running-the-bot)
15. [Common settings](#15-common-settings)
16. [Limits](#16-limits)
17. [Troubleshooting](#17-troubleshooting)

---

## 1. Quick reference

```text
📝 New note     📂 Categories
🔍 Search       📌 Pinned
🗑 Trash        ⚙️ Settings
```

| You want to… | Do this |
|---|---|
| Save something fast | Just send it: text, photo, voice, file… |
| Save it straight into a category | **📝 New note** → send it → pick the category |
| Find a note | **🔍 Search** → type words, or `/search words` |
| See everything | **📂 Categories** → **📋 All notes** |
| Change a note | Open it → **✏️ Edit**, or edit your original message in Telegram |
| Get a deleted note back | **🗑 Trash** → tap it → **♻️ Restore** |
| Send a note to someone | In their chat, type `@your_bot` and a word, then tap the note |
| Back up everything | `/export` |

**Commands:**
- `/start`, `/new`, `/cats`, `/search`, `/pinned`, `/trash`, `/tags`, `/settings`, `/export`, `/help`.
- The main ones also appear in Telegram's blue **Menu** button after you send `/start`.

**Cancelling:** while the bot is waiting for something from you (a name, a new text…), **❌ Cancel** stops it. Pressing any keyboard button or sending any `/command` stops it too.

---

## 2. Saving notes

### Quick save

Send anything, and it's saved right away in **📥 Uncategorized**. The bot replies to your message:

```text
✅ ذخیره شد در 📥 Uncategorized
«first line of your note»
[📂 Category] [👁 View] [↩️ Undo]
```

(The first line means "Saved in 📥 Uncategorized".)

- **📂 Category:** choose where it belongs.
- **👁 View:** open the note.
- **↩️ Undo:** move it to the trash (recoverable for 30 days).

### New note (choose the category first)

1. Press **📝 New note** (or `/new`).
2. Send the note.
3. Pick a category from the list, or **➕ New category** to create one and put the note in it in one step.

`/new some text` saves "some text" immediately and shows the category list.

### What can be a note

| You send | Saved as | Title |
|---|---|---|
| Text | Text note | Its first line |
| Photo (+ caption) | 🖼 Photo, largest size kept | First line of the caption, or «عکس» ("photo") |
| Voice message | 🎙 Voice | Caption, or «پیام صوتی» ("voice message") |
| Audio file | 🎵 Audio | Caption, or «فایل صوتی» ("audio file") |
| Video | 🎬 Video | Caption, or «ویدیو» ("video") |
| Video note (round video) | ⭕️ Video note | «ویدیومسیج» ("video note") |
| GIF | 🎞 GIF | Caption, or «گیف» ("GIF") |
| Any other file | 📎 File | Caption, or «فایل» ("file") |

- **Not supported:** stickers, locations, contacts and polls. The bot says it can't save them.
- **Forwarded messages:** saved like any other message.
- **Albums:** each photo in an album becomes its own note.
- **Length:** at most 20,000 characters per note. A single Telegram message holds up to 4,096, so longer text only comes in as a file when editing (§5).

---

## 3. Categories

Open **📂 Categories**:

```text
📂 دسته‌ها
23 notes in 4 categories · 3 pinned
[📋 All notes (23)]
[📥 Uncategorized (5)]
[💡 Ideas (8)]
[📚 Books (10)]
[➕ New category] [🏷 Tags]
```

(The first line is the heading, «دسته‌ها» = "Categories". Counts appear in Persian digits.)

Categories are listed alphabetically. Tap one to see its notes, 8 per page; use **‹ قبلی** (previous) and **بعدی ›** (next) to page.

### Create

Press **➕ New category** and send a name. To give it an emoji, put the emoji first, then a space: `💡 Ideas`. Rules:

- At most 40 characters.
- Names must be unique. `ايده` and `ایده`, `كتاب` and `کتاب`, a half-space and a space, and upper/lower case all count as the same name.
- "Uncategorized" is reserved.

### Rename, emoji, delete

Open the category → **⚙️ Category options**:

- **✏️ Rename:** send the new name. `🧠 Thoughts` also changes the emoji.
- **😀 Emoji:** send one emoji, or `-` to remove it. Categories without an emoji show 📁.
- **🗑 Delete:**
  - If it's empty, the bot just confirms.
  - If it has notes, you choose:
    - **Keep notes → 📥 Uncategorized**, or
    - **Move notes to 🗑 Trash too** (recoverable for 30 days; restored notes go to Uncategorized).

---

## 4. The note screen

```text
💡 Ideas · 📌 · 🖼 عکس
──────────
The full text of the note…
──────────
🕓 12 Aban 1405, 10:24
✏️ 13 Aban 1405, 09:10
[✏️ Edit] [📂 Move] [📌 Pin]
[🖼 Attachment] [📄 Full text]
[🗑 Delete] [« Back]
```

(On screen, dates appear in Persian, e.g. «۱۲ آبان ۱۴۰۵، ۱۰:۲۴».)

- **Top line:** the category, 📌 if pinned, and the attachment type.
- **Dates:** 🕓 created. ✏️ last changed: shown only if the note was edited or moved more than a minute after it was made. Dates are in the Persian calendar, Tehran time.
- **Attachment:** sends the photo, voice or file again.
- **📄 Full text:** appears when the text is longer than about 3,300 characters. It sends the whole text, split across messages, or as a `.md` file if it's very long.
- **« Back:** returns to the list and page you opened the note from.

---

## 5. Editing a note

There are three ways.

### A. The ✏️ Edit button

1. Open the note → **✏️ Edit**.
2. The bot sends the current text in a code block. Tap it to copy.
3. Change it and send the **whole** new text back.

For attachments, the text is the caption: you change the caption, not the file.

### B. Send a file (for long text)

After **✏️ Edit**, send a `.txt` or `.md` file (up to 1 MB). Its content replaces the note's text.

### C. Edit your message in Telegram

Long-press the message you saved the note from → **Edit**, change it and save. The bot updates the note and replies «✏️ یادداشت «…» به‌روز شد.» ("note updated") with a **👁 View** button.

This works with:
- the message you quick-saved or sent as a **📝 New note**;
- after an edit with ✏️ Edit, the message you sent the new text in;
- not after an edit made from a file (method B): your earlier message stays linked.

It doesn't work for notes in the trash.

After any edit, the title, hashtags and search data are updated too.

---

## 6. Moving and pinning

- **📂 Move:** pick another category; the current one is marked ✓. **➕ New category** creates one and moves the note into it.
- **📌 Pin / 📍 Unpin:** pinned notes appear first in every list and in **📌 Pinned**.

Lists are sorted: pinned notes first, then the most recently changed. Moving a note counts as a change, so it moves to the top. Pinning doesn't.

---

## 7. Deleting, the trash and undo

- **🗑 Delete** on a note asks **✅ Yes, delete / ❌ No**. Then the note goes to the trash, and an **↩️ Undo** button appears right away.
- **↩️ Undo** after a quick save also puts the note in the trash.
- **🗑 Trash** lists deleted notes, newest first. Tap one to see it:
  - **♻️ Restore** brings it back to its category, or to Uncategorized if that category was deleted.
  - **❌ Delete forever** asks first; it can't be undone.
  - **🧹 Empty trash** deletes everything in the trash for good, after a confirmation.
- **Automatic cleanup:** notes that have been in the trash for more than **30 days** are deleted the next time you open the trash.
- Deleted notes don't show up in lists, search, tags, inline mode or export.

---

## 8. Hashtags

Write `#word` anywhere in a note: `Buy milk #shopping #today`.

- **Allowed:** letters (Persian or English), digits and `_`, up to 40 characters: `#کتاب_خوب`, `#idea2`.
- **Same tag:** spelling variants are merged, so `#كتاب` = `#کتاب` and `#Idea` = `#idea`.
- **Not a tag:** a `#` right after a letter or digit, e.g. `mail@x.com#y`.

To browse them, use `/tags` or **📂 Categories → 🏷 Tags**. Tags are listed by how often they're used (up to 60); tap one to see its notes.

You can also search for a tag: `/search #shopping`.

---

## 9. Search

Press **🔍 Search** and type, or use `/search words`.

- **Every word must appear** in the note: `/search milk bread` finds notes containing both. Up to 8 words are used.
- **Parts of words match:** `کتاب` also finds `کتاب‌ها`.
- **These are treated as the same:**
  - ي/ی, ك/ک, ۀ/ة/ه, أ/إ/آ/ا
  - a half-space and a space
  - diacritics and «ـ» (tatweel)
  - Persian, Arabic and English digits (`۱۲` = `12`)
  - upper and lower case
- **Special characters are literal:** `100%` searches for "100%".
- **Scope:** the text and captions of notes not in the trash.

Results are 8 per page; **🔍 New search** starts again.

---

## 10. Inline mode: sending a note to any chat

In **any** chat (a friend, a group, Saved Messages), type `@your_bot_name`, a space, and a word.

- A list of your matching notes appears; tap one to send it. Leave the word empty to see your most recent notes, pinned first.
- **Text notes** are sent as text. **Photos, voice messages, audio, videos, GIFs and files** are sent as the original media with the text as caption. Video notes are sent as their text.
- **Who can use it:** only allowed users, each seeing only their own notes. For anyone else, the bot shows nothing.
- **Requirement:** inline mode must be turned on in BotFather (`/setinline`); see §14.

---

## 11. Export and backups

`/export`, or **⚙️ Settings → 📤 Export**, sends a Markdown file named like `notes-1405-08-12.md`:

```markdown
# 📒 یادداشت‌ها — 1405-08-12
23 notes

## 💡 Ideas

### 📌 Title of a pinned note

_12 Aban 1405, 10:24_ · 🖼 Photo (in Telegram)

Full text…

---
```

(The heading «یادداشت‌ها» means "Notes". In the file, dates and labels are in Persian.)

- **Order:** categories alphabetically, then Uncategorized.
- **Trash:** not included.
- **Attachments:** listed by type only. The files themselves stay in Telegram, and the export doesn't contain them.
- **Backups:** the notes live only in the bot's database on the platform, and there's no import yet. Export now and then and keep the file somewhere safe.

---

## 12. Settings and help

**⚙️ Settings** shows your counts (notes, categories, pinned, in trash) and these buttons:
- **📤 Export**
- **🏷 Tags**
- **❓ Help:** a summary of everything in this manual.

`/help` shows the same help with the keyboard.

---

## 13. Users and access

The bot answers only the Telegram user IDs in `tgcloud/lib/config.js`:

```js
export const ALLOWED_USER_IDS = [370137656, 5385238175];
```

- **Separate notebooks:** each allowed user has their own notes, categories, tags and trash, and can't see anyone else's.
- **Everyone else:** gets no reply to messages, buttons or inline searches, so they learn nothing about the bot.
- **Private chats only:** messages in groups are ignored.

**To add a user:**
1. Add their ID to the list.
2. Run `npx tgcloud push`.

To find an ID, ask the person to message `@userinfobot`, or empty the list (`[]`) and deploy: the bot then replies to anyone with their ID. Put the IDs back right after.

**To remove a user:** delete their ID from the list and run `push`. Their notes stay in the database but can't be reached; adding the ID back restores access.

---

## 14. Running the bot

All commands run in `D:\VP_NOTE_BOT`.

### First time

1. **Create the bot:** in `@BotFather`, send `/newbot`.
2. **Turn on Serverless:** your bot → **Serverless** → enable.
3. **Turn on inline mode:** `/setinline` → your bot → send a placeholder text, e.g. `جست‌وجو در یادداشت‌ها…` ("search notes…").
4. **Get the CLI token:** your bot → **Serverless** → **CLI Access** → **Access token**.
5. Install and log in, pasting the token when asked:

   ```bash
   npm install
   ```

   ```bash
   npx tgcloud login
   ```

6. Deploy the code, then create the database tables:

   ```bash
   npx tgcloud push
   ```

   ```bash
   npx tgcloud migrate
   ```

7. Send `/start` to the bot.

### Day-to-day commands

| Command | When |
|---|---|
| `npx tgcloud status` | See which files changed since the last deploy |
| `npx tgcloud diff` | See the changes line by line |
| `npx tgcloud push` | Deploy code changes (takes seconds; the live bot updates immediately) |
| `npx tgcloud migrate --dry-run` | See pending database changes |
| `npx tgcloud migrate` | Apply database changes; only needed when `tgcloud/schema.js` changed. It asks before deleting anything. |
| `npx tgcloud webhook` | Check that Telegram is delivering updates to the bot |

Shortcuts: `npm run deploy`, `npm run migrate`, `npm run status`.

### Keep private

- **The CLI token** (saved in `.tgcloud/`, which isn't committed to git): if it leaks, get a new one from BotFather.
- **Your exports:** they contain all your notes.

---

## 15. Common settings

In `tgcloud/lib/config.js`; run `npx tgcloud push` after any change.

| You want | Setting | Now |
|---|---|---|
| Allow or remove users | `ALLOWED_USER_IDS` | `[370137656, 5385238175]` |
| More or fewer notes per page | `PAGE_SIZE` | `8` |
| More inline results at once | `INLINE_PAGE_SIZE` | `20` |
| Longer titles in lists | `TITLE_MAX` | `60` |
| Allow longer notes | `NOTE_MAX_CHARS` | `20000` |
| Show more text before "Full text" | `VIEW_MAX_CHARS` | `3300` (keep it under ~3,800, a Telegram limit) |
| Keep the trash longer or shorter | `TRASH_DAYS` | `30` |
| Longer category names | `CATEGORY_NAME_MAX` | `40` |

Changing these doesn't touch the database, so no `migrate` is needed.

---

## 16. Limits

- **No reminders:** the platform has no scheduler, so the bot can't message you at a set time.
- **No import yet:** an export can't be loaded back automatically.
- **File size:** when sending a `.txt`/`.md` file to edit a note, at most 1 MB. Notes themselves can be any Telegram file, since the bot stores the file ID, not the file.
- **Attachment IDs** belong to this bot. If the bot is replaced by a new one, old attachments can't be re-sent.
- **Albums** are saved as one note per item.

---

## 17. Troubleshooting

| Problem | What to check |
|---|---|
| The bot doesn't answer at all | Your ID must be in `ALLOWED_USER_IDS` (and pushed). Write in a private chat, not a group. Run `npx tgcloud webhook`. |
| "no such table" or database errors after deploying | Run `npx tgcloud migrate`. |
| Old or missing keyboard buttons | Send `/start`. |
| «این نوع پیام را نمی‌توانم یادداشت کنم» ("I can't save this kind of message") | Stickers, locations, contacts and polls can't be notes. |
| A category name is refused | It's a duplicate (letter variants and case count as the same), longer than 40 characters, or "Uncategorized". |
| «فقط یک ایموجی بفرست» ("send just one emoji") when setting an emoji | Send just the emoji, with no letters, or `-` to remove it. |
| Editing my message in Telegram doesn't update the note | Only the note's linked message works (§5C). Notes in the trash aren't updated. Text over 20,000 characters is ignored. |
| A button says «پیدا نشد» ("not found") or shows the categories screen | The note or category was deleted or moved to the trash, often from an older message. Open it again from a list. |
| Search finds nothing | Every word must appear in the note; try fewer words. Notes in the trash aren't searched. |
| `@bot` in another chat shows nothing | Turn on inline mode in BotFather (`/setinline`). Type the bot's username followed by a space. Only allowed users see results. |
| A note disappeared | Look in **🗑 Trash**; notes stay there 30 days. |
| A button shows «⚠️ خطا؛ دوباره امتحان کن.» ("error, try again") | Try again. If it keeps happening, it's a bug: note what you pressed. |
