// Telegram user IDs that may use the bot. Everyone else is ignored silently.
// While the list is empty, the bot replies to anyone with their ID so you can add yours.
export const ALLOWED_USER_IDS = [370137656, 5385238175];

// Notes per page in lists.
export const PAGE_SIZE = 8;
// Inline mode (@bot query): results per batch.
export const INLINE_PAGE_SIZE = 20;

// Title length shown in lists (characters).
export const TITLE_MAX = 60;
// Longest note text accepted (characters). Telegram messages are up to 4096;
// longer text can be sent as a .txt/.md file when editing.
export const NOTE_MAX_CHARS = 20000;
// Note text shown on the note screen before a "Full text" button is needed.
export const VIEW_MAX_CHARS = 3300;

// Notes in the trash are deleted for good after this many days.
export const TRASH_DAYS = 30;

export const CATEGORY_NAME_MAX = 40;
