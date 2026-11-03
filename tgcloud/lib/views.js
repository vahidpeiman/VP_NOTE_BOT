// Screens: each returns { text, reply_markup }.
//
// Button data (Telegram allows 64 bytes):
//   h                  categories (home)          l:<list>:<page>   a list of notes
//     <list> = a (all) | u (uncategorized) | c<id> | p (pinned) | t (trash) | s (search) | g (tag)
//   n:<action>:<id>    a note: v view, e edit, m move, mc move to (n:mc:<id>:<catId|0>), mn move to a new
//                      category, p pin, d delete?, dy delete, f attachment, t full text, x undo a quick save
//   t:<action>[:<id>]  trash: v view, r restore, x delete forever?, xy delete forever, e empty?, ey empty
//   c:<action>[:<id>]  category: n new, o options, r rename, e emoji, d delete?, dm delete (keep notes), dt delete (notes to trash)
//   g / g:<i>          tags / notes with tag number i     st settings · ex export · hp help · sr search · x cancel · - nothing
import { PAGE_SIZE, TRASH_DAYS, VIEW_MAX_CHARS } from './config.js';
import {
  listCategories, getCategory, listNotes, getNote, listTags, stats,
} from './store.js';
import { KIND, fa, faDate, shorten } from './text.js';

const button = (text, data) => ({ text, callback_data: data });
const inline = (rows) => ({ inline_keyboard: rows });
const LINE = '──────────';

export const UNCATEGORIZED = '📥 Uncategorized';
export const categoryLabel = (cat) => (cat ? `${cat.emoji || '📁'} ${cat.name}` : UNCATEGORIZED);

const cancelRow = [button('❌ Cancel', 'x')];
export const cancelMarkup = inline([cancelRow]);
const homeRow = [button('« Categories', 'h')];

// ---------- Categories (home) ----------

export async function homeView(userId, note = '') {
  const cats = await listCategories(userId);
  const s = await stats(userId);
  const rows = [
    [button(`📋 All notes (${fa(s.notes)})`, 'l:a:0')],
    [button(`${UNCATEGORIZED} (${fa(s.uncat)})`, 'l:u:0')],
    ...cats.map((cat) => [button(`${categoryLabel(cat)} (${fa(cat.count)})`, `l:c${cat.id}:0`)]),
    [button('➕ New category', 'c:n'), button('🏷 Tags', 'g')],
  ];
  const text = (note ? `${note}\n\n` : '') +
    `📂 دسته‌ها\n${fa(s.notes)} یادداشت در ${fa(s.categories)} دسته` +
    (s.pinned ? ` · ${fa(s.pinned)} سنجاق‌شده` : '') +
    (s.notes ? '' : '\n\nهنوز یادداشتی نداری. هر متنی بفرستی، یادداشت می‌شود.');
  return { text, reply_markup: inline(rows) };
}

// ---------- Lists ----------

// Turns a list code into a filter and a heading. Search and tag come from the saved context.
async function resolveList(userId, code, context) {
  if (code === 'a') return { filter: { kind: 'all' }, title: '📋 همه‌ی یادداشت‌ها' };
  if (code === 'u') return { filter: { kind: 'uncat' }, title: UNCATEGORIZED };
  if (code === 'p') return { filter: { kind: 'pinned' }, title: '📌 سنجاق‌شده‌ها' };
  if (code === 't') return { filter: { kind: 'trash' }, title: `🗑 سطل زباله (بعد از ${fa(TRASH_DAYS)} روز پاک می‌شود)` };
  if (code === 's') return { filter: { kind: 'search', query: context.search || '' }, title: `🔍 «${shorten(context.search || '', 40)}»` };
  if (code === 'g') return { filter: { kind: 'tag', tag: context.tag || '' }, title: `🏷 ${context.tag || ''}` };
  const id = Number(code.slice(1));
  const cat = code.startsWith('c') ? await getCategory(userId, id) : null;
  return cat ? { filter: { kind: 'cat', id }, title: categoryLabel(cat), cat } : null;
}

export function noteButtonLabel(row) {
  return shorten(`${row.pinned ? '📌 ' : ''}${(KIND[row.kind] || KIND.text).icon}${row.title}`, 48);
}

export async function listView(userId, code, page, context) {
  const list = await resolveList(userId, code, context);
  if (!list) return homeView(userId, '⚠️ این دسته دیگر وجود ندارد.');
  const { rows, total, page: current, pages } = await listNotes(userId, list.filter, page);
  const open = code === 't' ? 't:v' : 'n:v';
  const keyboard = rows.map((row) => [button(noteButtonLabel(row), `${open}:${row.id}`)]);
  if (pages > 1) {
    const nav = [];
    if (current > 0) nav.push(button('‹ قبلی', `l:${code}:${current - 1}`));
    nav.push(button(`${fa(current + 1)} / ${fa(pages)}`, '-'));
    if (current < pages - 1) nav.push(button('بعدی ›', `l:${code}:${current + 1}`));
    keyboard.push(nav);
  }
  if (list.cat) keyboard.push([button('⚙️ Category options', `c:o:${list.cat.id}`)]);
  if (code === 's') keyboard.push([button('🔍 New search', 'sr')]);
  if (code === 'g') keyboard.push([button('« Tags', 'g')]);
  if (code === 't' && total) keyboard.push([button('🧹 Empty trash', 't:e')]);
  keyboard.push(homeRow);

  const empty = {
    s: 'چیزی پیدا نشد.', t: 'سطل زباله خالی است.', p: 'هنوز یادداشتی سنجاق نکرده‌ای.',
  }[code] || 'این‌جا یادداشتی نیست.';
  const text = `${list.title}\n${total ? `${fa(total)} یادداشت` : empty}`;
  return { text, reply_markup: inline(keyboard) };
}

// ---------- One note ----------

function noteText(note, cat, { trash = false } = {}) {
  const kind = KIND[note.kind] || KIND.text;
  const head = [categoryLabel(cat), note.pinned ? '📌' : '', note.kind !== 'text' ? `${kind.icon}${kind.label}` : '']
    .filter(Boolean).join(' · ');
  let body = note.body || `(${kind.label} بدون متن)`;
  const cut = body.length > VIEW_MAX_CHARS;
  if (cut) body = `${body.slice(0, VIEW_MAX_CHARS)}…`;
  const times = `🕓 ${faDate(note.created_at)}` + (note.updated_at - note.created_at > 60000 ? `\n✏️ ${faDate(note.updated_at)}` : '');
  const trashLine = trash ? `\n🗑 در سطل زباله از ${faDate(note.deleted_at)}` : '';
  return { text: `${head}\n${LINE}\n${body}\n${LINE}\n${times}${trashLine}`, cut };
}

export async function noteView(userId, id, back = 'h', note = '') {
  const row = await getNote(userId, id);
  if (!row) return homeView(userId, '⚠️ این یادداشت پیدا نشد (شاید حذف شده).');
  const cat = row.category_id ? await getCategory(userId, row.category_id) : null;
  const { text, cut } = noteText(row, cat);
  const extra = [];
  if (row.file_id) extra.push(button(`${(KIND[row.kind] || KIND.document).icon}Attachment`, `n:f:${row.id}`));
  if (cut) extra.push(button('📄 Full text', `n:t:${row.id}`));
  const rows = [
    [button('✏️ Edit', `n:e:${row.id}`), button('📂 Move', `n:m:${row.id}`), button(row.pinned ? '📍 Unpin' : '📌 Pin', `n:p:${row.id}`)],
    ...(extra.length ? [extra] : []),
    [button('🗑 Delete', `n:d:${row.id}`), button('« Back', back)],
  ];
  return { text: (note ? `${note}\n\n` : '') + text, reply_markup: inline(rows) };
}

export async function moveView(userId, id) {
  const note = await getNote(userId, id);
  if (!note) return homeView(userId, '⚠️ این یادداشت پیدا نشد.');
  const mark = (catId) => (Number(note.category_id || 0) === catId ? ' ✓' : '');
  const cats = await listCategories(userId);
  const rows = [
    [button(`${UNCATEGORIZED}${mark(0)}`, `n:mc:${id}:0`)],
    ...cats.map((cat) => [button(`${categoryLabel(cat)}${mark(cat.id)}`, `n:mc:${id}:${cat.id}`)]),
    [button('➕ New category', `n:mn:${id}`), button('« Back', `n:v:${id}`)],
  ];
  return { text: `📂 «${note.title}» در کدام دسته باشد؟`, reply_markup: inline(rows) };
}

export async function deleteNoteConfirm(userId, id) {
  const note = await getNote(userId, id);
  if (!note) return homeView(userId, '⚠️ این یادداشت پیدا نشد.');
  return {
    text: `🗑 «${note.title}» به سطل زباله برود؟\n(تا ${fa(TRASH_DAYS)} روز قابل برگرداندن است.)`,
    reply_markup: inline([[button('✅ Yes, delete', `n:dy:${id}`), button('❌ No', `n:v:${id}`)]]),
  };
}

// ---------- Trash ----------

export async function trashNoteView(userId, id) {
  const row = await getNote(userId, id, { withDeleted: true });
  if (!row || !row.deleted_at) return listView(userId, 't', 0, {});
  const cat = row.category_id ? await getCategory(userId, row.category_id) : null;
  const rows = [
    [button('♻️ Restore', `t:r:${id}`), button('❌ Delete forever', `t:x:${id}`)],
    ...(row.file_id ? [[button('📎 Attachment', `n:f:${id}`)]] : []),
    [button('« Trash', 'l:t:0')],
  ];
  return { text: noteText(row, cat, { trash: true }).text, reply_markup: inline(rows) };
}

export function deleteForeverConfirm(id) {
  return {
    text: '❌ این یادداشت برای همیشه پاک شود؟ برگشت ندارد.',
    reply_markup: inline([[button('✅ Delete forever', `t:xy:${id}`), button('❌ No', `t:v:${id}`)]]),
  };
}

export async function emptyTrashConfirm(userId) {
  const s = await stats(userId);
  return {
    text: `🧹 ${fa(s.trash)} یادداشت در سطل زباله برای همیشه پاک شود؟ برگشت ندارد.`,
    reply_markup: inline([[button('✅ Empty trash', 't:ey'), button('❌ No', 'l:t:0')]]),
  };
}

// ---------- Category settings ----------

export async function categoryOptionsView(userId, id, note = '') {
  const cat = await getCategory(userId, id);
  if (!cat) return homeView(userId, '⚠️ این دسته دیگر وجود ندارد.');
  const { total } = await listNotes(userId, { kind: 'cat', id }, 0);
  return {
    text: (note ? `${note}\n\n` : '') + `⚙️ ${categoryLabel(cat)}\n${fa(total)} یادداشت`,
    reply_markup: inline([
      [button('✏️ Rename', `c:r:${id}`), button('😀 Emoji', `c:e:${id}`), button('🗑 Delete', `c:d:${id}`)],
      [button('« Back', `l:c${id}:0`)],
    ]),
  };
}

export async function categoryDeleteConfirm(userId, id) {
  const cat = await getCategory(userId, id);
  if (!cat) return homeView(userId, '⚠️ این دسته دیگر وجود ندارد.');
  const { total } = await listNotes(userId, { kind: 'cat', id }, 0);
  if (!total) {
    return {
      text: `🗑 دسته‌ی «${categoryLabel(cat)}» حذف شود؟`,
      reply_markup: inline([[button('✅ Delete', `c:dm:${id}`), button('❌ No', `c:o:${id}`)]]),
    };
  }
  return {
    text: `🗑 دسته‌ی «${categoryLabel(cat)}» ${fa(total)} یادداشت دارد. با یادداشت‌هایش چه کنم؟`,
    reply_markup: inline([
      [button(`Keep notes → ${UNCATEGORIZED}`, `c:dm:${id}`)],
      [button('Move notes to 🗑 Trash too', `c:dt:${id}`)],
      [button('❌ Cancel', `c:o:${id}`)],
    ]),
  };
}

// ---------- Tags, settings, help ----------

// Also returns the tag list, saved so g:<i> can find the tag again.
export async function tagsView(userId) {
  const tags = (await listTags(userId)).slice(0, 60);
  const rows = [];
  for (let i = 0; i < tags.length; i += 2) {
    rows.push(tags.slice(i, i + 2).map((item, j) => button(`${item.tag} (${fa(item.count)})`, `g:${i + j}`)));
  }
  rows.push(homeRow);
  const text = tags.length
    ? '🏷 برچسب‌ها\nهر #کلمه در متن یادداشت یک برچسب است.'
    : '🏷 هنوز برچسبی نداری.\nدر متن یادداشت #کلمه بنویس (مثلاً #ایده) تا برچسب شود.';
  return { view: { text, reply_markup: inline(rows) }, tags: tags.map((item) => item.tag) };
}

export async function settingsView(userId) {
  const s = await stats(userId);
  return {
    text:
      '⚙️ Settings\n\n' +
      `📝 یادداشت‌ها: ${fa(s.notes)}\n📂 دسته‌ها: ${fa(s.categories)}\n📌 سنجاق‌شده: ${fa(s.pinned)}\n🗑 در سطل زباله: ${fa(s.trash)}\n\n` +
      'خروجی، همه‌ی یادداشت‌ها را در یک فایل Markdown می‌فرستد (برای پشتیبان).',
    reply_markup: inline([[button('📤 Export', 'ex'), button('🏷 Tags', 'g')], [button('❓ Help', 'hp')]]),
  };
}

export const HELP_TEXT =
  '📒 دفترچه یادداشت شخصی\n\n' +
  '• هر متن، عکس، پیام صوتی یا فایلی بفرستی فوراً یادداشت می‌شود (در 📥 Uncategorized). بعد با 📂 Category دسته‌اش را انتخاب کن.\n' +
  '• 📝 New note: یادداشت تازه و انتخاب دسته.\n' +
  '• 📂 Categories: دسته‌ها، ساختن، تغییر نام، ایموجی و حذف دسته.\n' +
  '• ویرایش: در صفحه‌ی یادداشت ✏️ Edit را بزن، یا همان پیامی را که فرستاده بودی در تلگرام ویرایش کن.\n' +
  '• حذف: یادداشت به 🗑 Trash می‌رود و تا ' + fa(TRASH_DAYS) + ' روز قابل برگرداندن است.\n' +
  '• 📌 Pin: یادداشت‌های مهم بالای فهرست‌ها می‌مانند.\n' +
  '• #برچسب: هر #کلمه در متن یک برچسب است؛ /tags فهرستشان را نشان می‌دهد.\n' +
  '• 🔍 Search: جست‌وجو در متن یادداشت‌ها (ي/ی و ك/ک و نیم‌فاصله فرقی نمی‌کنند). /search کلمه هم کار می‌کند.\n' +
  '• در هر چتی بنویس @نام_ربات و یک کلمه، تا یادداشتت را همان‌جا بفرستی.\n' +
  '• /export: همه‌ی یادداشت‌ها در یک فایل.\n\n' +
  `هر صفحه ${fa(PAGE_SIZE)} یادداشت نشان می‌دهد.`;

// ---------- Prompts (the bot waits for your next message) ----------

export const prompts = {
  newNote: { text: '📝 متن یادداشت را بفرست (یا عکس، پیام صوتی، فایل…).', reply_markup: cancelMarkup },
  search: { text: '🔍 چه چیزی را جست‌وجو کنم؟ (برای برچسب: #کلمه)', reply_markup: cancelMarkup },
  categoryName: { text: `➕ نام دسته‌ی تازه را بفرست. می‌توانی یک ایموجی هم اولش بگذاری؛ مثلاً: 💡 ایده‌ها`, reply_markup: cancelMarkup },
  rename: (cat) => ({ text: `✏️ نام تازه‌ی «${categoryLabel(cat)}» را بفرست.`, reply_markup: cancelMarkup }),
  emoji: (cat) => ({ text: `😀 یک ایموجی برای «${categoryLabel(cat)}» بفرست، یا - برای حذف ایموجی.`, reply_markup: cancelMarkup }),
  edit: (note) => ({
    text: `✏️ متن فعلی «${note.title}» را در پیام بالا فرستادم. کپی کن، تغییر بده و متن کامل تازه را بفرست.\n(برای متن خیلی بلند، فایل .txt یا .md هم قبول است.)`,
    reply_markup: cancelMarkup,
  }),
};

// After a quick save.
export function savedView(note, cat) {
  return {
    text: `✅ ذخیره شد در ${categoryLabel(cat)}\n«${note.title}»`,
    reply_markup: inline([[
      button('📂 Category', `n:m:${note.id}`), button('👁 View', `n:v:${note.id}`), button('↩️ Undo', `n:x:${note.id}`),
    ]]),
  };
}
