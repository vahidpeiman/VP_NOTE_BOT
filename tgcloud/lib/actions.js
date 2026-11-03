// Things both handlers do: reading a note from a message, opening lists, categories, export.
import { CATEGORY_NAME_MAX, NOTE_MAX_CHARS } from './config.js';
import {
  setContext, findCategoryByName, listCategories, notesWithBody, purgeOldTrash,
} from './store.js';
import { listView, tagsView, categoryLabel, UNCATEGORIZED } from './views.js';
import { KIND, faDate, jalaliStamp, fa } from './text.js';
import { sendTextFile } from './tg.js';

// { body, kind, fileId } from a message, { error } if it's too long, or null if it can't be a note.
export function noteFromMessage(message) {
  const body = String(message.text ?? message.caption ?? '').trim();
  let kind = 'text';
  let file = null;
  if (message.photo?.length) {
    kind = 'photo';
    file = message.photo[message.photo.length - 1];
  } else {
    for (const key of ['voice', 'audio', 'video', 'video_note', 'animation', 'document']) {
      if (message[key]) {
        kind = key;
        file = message[key];
        break;
      }
    }
  }
  if (kind === 'text' && !body) return null;
  if (body.length > NOTE_MAX_CHARS) return { error: `متن بیشتر از ${fa(NOTE_MAX_CHARS)} نویسه است.` };
  return { body, kind, fileId: file?.file_id || null };
}

const EMOJI_ONLY = /^[^\p{L}\p{N}\s]{1,8}$/u;
export const isEmoji = (text) => EMOJI_ONLY.test(text);

// "💡 Ideas" → { emoji: '💡', name: 'Ideas' }
export function parseCategoryInput(text) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  const match = clean.match(/^([^\p{L}\p{N}\s]{1,8}) (.+)$/u);
  return match ? { emoji: match[1], name: match[2].trim() } : { emoji: null, name: clean };
}

// An error message, or null if the name is fine.
export async function checkCategoryName(userId, name, exceptId = 0) {
  if (!name) return 'نام خالی است.';
  if (name.length > CATEGORY_NAME_MAX) return `نام باید کمتر از ${fa(CATEGORY_NAME_MAX)} نویسه باشد.`;
  if (/^(📥 )?uncategorized$/i.test(name)) return 'این نام رزرو شده است.';
  const same = await findCategoryByName(userId, name, exceptId);
  return same ? `دسته‌ای با نام «${same.name}» از قبل هست.` : null;
}

// Opens a list and remembers it, so "« Back" on a note returns here.
export async function openList(userId, code, page, context) {
  await setContext(userId, { back: `l:${code}:${page}` });
  if (code === 't') await purgeOldTrash(userId);
  return listView(userId, code, page, context);
}

export async function openSearch(userId, query) {
  await setContext(userId, { search: query });
  return openList(userId, 's', 0, { search: query });
}

export async function openTags(userId) {
  const { view, tags } = await tagsView(userId);
  await setContext(userId, { tagList: tags });
  return view;
}

// ---------- Export ----------

export async function sendExport(chatId, userId) {
  const { text, count } = await buildExport(userId);
  await sendTextFile(chatId, text, `notes-${jalaliStamp(Date.now())}.md`, `📤 ${fa(count)} یادداشت`);
}

export async function buildExport(userId) {
  const notes = [];
  for (let offset = 0; ; offset += 500) {
    const batch = await notesWithBody(userId, { kind: 'all' }, { limit: 500, offset });
    notes.push(...batch);
    if (batch.length < 500) break;
  }
  const cats = await listCategories(userId);
  const groups = [...cats.map((cat) => ({ title: categoryLabel(cat), id: cat.id })), { title: UNCATEGORIZED, id: null }];
  let out = `# 📒 یادداشت‌ها — ${jalaliStamp(Date.now())}\n\n${fa(notes.length)} یادداشت\n`;
  for (const group of groups) {
    const items = notes.filter((note) => (note.category_id ?? null) === group.id);
    if (!items.length) continue;
    out += `\n## ${group.title}\n`;
    for (const note of items) {
      const kind = KIND[note.kind] || KIND.text;
      out += `\n### ${note.pinned ? '📌 ' : ''}${note.title}\n\n_${faDate(note.created_at)}_` +
        (note.kind !== 'text' ? ` · ${kind.icon}${kind.label} (در تلگرام)` : '') + '\n\n' +
        (note.body ? `${note.body}\n` : '') + '\n---\n';
    }
  }
  return { text: out, count: notes.length };
}
