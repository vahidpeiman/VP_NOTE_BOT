// The keyboard under the message box, and Telegram's command menu.

export const BUTTONS = {
  newNote: '📝 New note',
  categories: '📂 Categories',
  search: '🔍 Search',
  pinned: '📌 Pinned',
  trash: '🗑 Trash',
  settings: '⚙️ Settings',
};

// Button text → command it runs.
export const BUTTON_COMMANDS = {
  [BUTTONS.newNote]: 'new',
  [BUTTONS.categories]: 'cats',
  [BUTTONS.search]: 'search',
  [BUTTONS.pinned]: 'pinned',
  [BUTTONS.trash]: 'trash',
  [BUTTONS.settings]: 'settings',
};

export function mainKeyboard() {
  return {
    keyboard: [
      [{ text: BUTTONS.newNote }, { text: BUTTONS.categories }],
      [{ text: BUTTONS.search }, { text: BUTTONS.pinned }],
      [{ text: BUTTONS.trash }, { text: BUTTONS.settings }],
    ],
    resize_keyboard: true,
    is_persistent: true,
    input_field_placeholder: 'یادداشتت را بنویس…',
  };
}

export const MENU_COMMANDS = [
  { command: 'start', description: 'شروع و دکمه‌ها' },
  { command: 'new', description: 'یادداشت تازه' },
  { command: 'cats', description: 'دسته‌ها' },
  { command: 'search', description: 'جست‌وجو' },
  { command: 'pinned', description: 'سنجاق‌شده‌ها' },
  { command: 'tags', description: 'برچسب‌ها (#)' },
  { command: 'trash', description: 'سطل زباله' },
  { command: 'export', description: 'خروجی همه‌ی یادداشت‌ها' },
  { command: 'help', description: 'راهنما' },
];
