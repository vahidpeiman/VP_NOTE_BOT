// All database access. Every query is limited to one user's rows (user_id).
import { db } from 'sdk';
import { sql } from 'sdk/db';
import { PAGE_SIZE, TRASH_DAYS } from './config.js';
import { normalize, titleOf, tagsOf, escapeLike } from './text.js';

const now = () => Date.now();
const DAY = 24 * 3600 * 1000;

async function insertId(query) {
  const result = await db.run(query);
  return Number(result?.rows?.[0]?.id ?? result?.lastInsertRowid);
}

// ---------- User state (pending input + screen context) ----------

export async function getState(userId) {
  const row = await db.get(sql`SELECT pending, context FROM user_state WHERE user_id = ${userId}`);
  let context = {};
  try {
    context = JSON.parse(row?.context || '{}') || {};
  } catch {
    context = {};
  }
  return { pending: row?.pending || null, context };
}

async function saveState(userId, pending, context) {
  await db.run(sql`INSERT INTO user_state (user_id, pending, context) VALUES (${userId}, ${pending}, ${JSON.stringify(context)})
    ON CONFLICT (user_id) DO UPDATE SET pending = excluded.pending, context = excluded.context`);
}

export async function setPending(userId, pending) {
  const { context } = await getState(userId);
  await saveState(userId, pending, context);
}

export const clearPending = (userId) => setPending(userId, null);

// Merges keys into the context (for example the list to go "back" to).
export async function setContext(userId, patch) {
  const { pending, context } = await getState(userId);
  await saveState(userId, pending, { ...context, ...patch });
}

// ---------- Categories ----------

export async function listCategories(userId) {
  return db.all(sql`SELECT c.id, c.name, c.emoji,
      (SELECT count(*) FROM notes n WHERE n.user_id = c.user_id AND n.category_id = c.id AND n.deleted_at IS NULL) AS count
    FROM categories c WHERE c.user_id = ${userId} ORDER BY c.name COLLATE NOCASE`);
}

export async function getCategory(userId, id) {
  return db.get(sql`SELECT id, name, emoji FROM categories WHERE user_id = ${userId} AND id = ${id}`);
}

// A category with the same name (ignoring letter case, ي/ی, half-spaces…).
export async function findCategoryByName(userId, name, exceptId = 0) {
  const wanted = normalize(name);
  const rows = await db.all(sql`SELECT id, name FROM categories WHERE user_id = ${userId}`);
  return rows.find((row) => row.id !== exceptId && normalize(row.name) === wanted) || null;
}

export async function createCategory(userId, name, emoji = null) {
  return insertId(sql`INSERT INTO categories (user_id, name, emoji, created_at)
    VALUES (${userId}, ${name}, ${emoji}, ${now()}) RETURNING id`);
}

export async function renameCategory(userId, id, name) {
  await db.run(sql`UPDATE categories SET name = ${name} WHERE user_id = ${userId} AND id = ${id}`);
}

export async function setCategoryEmoji(userId, id, emoji) {
  await db.run(sql`UPDATE categories SET emoji = ${emoji} WHERE user_id = ${userId} AND id = ${id}`);
}

// mode 'move': notes go to Uncategorized. mode 'trash': notes go to the trash.
export async function deleteCategory(userId, id, mode) {
  if (mode === 'trash') {
    await db.run(sql`UPDATE notes SET deleted_at = ${now()}
      WHERE user_id = ${userId} AND category_id = ${id} AND deleted_at IS NULL`);
  }
  // Restored notes of a deleted category land in Uncategorized.
  await db.run(sql`UPDATE notes SET category_id = NULL WHERE user_id = ${userId} AND category_id = ${id}`);
  await db.run(sql`DELETE FROM categories WHERE user_id = ${userId} AND id = ${id}`);
}

// ---------- Notes ----------

// Which notes a list shows. kind: all | uncat | cat | pinned | tag | search | trash
function filterSql(userId, filter) {
  const base = filter.kind === 'trash'
    ? sql`user_id = ${userId} AND deleted_at IS NOT NULL`
    : sql`user_id = ${userId} AND deleted_at IS NULL`;
  switch (filter.kind) {
    case 'uncat': return sql`${base} AND category_id IS NULL`;
    case 'cat': return sql`${base} AND category_id = ${filter.id}`;
    case 'pinned': return sql`${base} AND pinned = 1`;
    case 'tag': return sql`${base} AND tags LIKE ${`% ${escapeLike(filter.tag)} %`} ESCAPE '!'`;
    case 'search': {
      let where = base;
      for (const word of normalize(filter.query).split(' ').filter(Boolean).slice(0, 8)) {
        where = sql`${where} AND search_text LIKE ${`%${escapeLike(word)}%`} ESCAPE '!'`;
      }
      return where;
    }
    default: return base;
  }
}

const orderSql = (filter) => (filter.kind === 'trash'
  ? sql.raw('deleted_at DESC, id DESC')
  : sql.raw('pinned DESC, updated_at DESC, id DESC'));

// One page of a list: { rows, total, page, pages }.
export async function listNotes(userId, filter, page = 0) {
  const where = filterSql(userId, filter);
  const total = Number((await db.get(sql`SELECT count(*) AS c FROM notes WHERE ${where}`))?.c || 0);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const current = Math.min(Math.max(0, page), pages - 1);
  const rows = await db.all(sql`SELECT id, title, kind, pinned, category_id FROM notes
    WHERE ${where} ORDER BY ${orderSql(filter)} LIMIT ${PAGE_SIZE} OFFSET ${current * PAGE_SIZE}`);
  return { rows, total, page: current, pages };
}

// Notes with their text, for inline mode and export.
export async function notesWithBody(userId, filter, { limit = 50, offset = 0 } = {}) {
  return db.all(sql`SELECT id, title, body, kind, file_id, pinned, category_id, created_at, updated_at FROM notes
    WHERE ${filterSql(userId, filter)} ORDER BY ${orderSql(filter)} LIMIT ${limit} OFFSET ${offset}`);
}

export async function getNote(userId, id, { withDeleted = false } = {}) {
  const row = await db.get(sql`SELECT * FROM notes WHERE user_id = ${userId} AND id = ${id}`);
  if (!row || (row.deleted_at && !withDeleted)) return null;
  return row;
}

export async function findNoteBySource(userId, messageId) {
  return db.get(sql`SELECT * FROM notes WHERE user_id = ${userId} AND source_msg_id = ${messageId} AND deleted_at IS NULL`);
}

const derived = (body, kind) => ({
  title: titleOf(body, kind),
  search: normalize(body) || normalize(titleOf(body, kind)),
  tags: tagsOf(body),
});

export async function createNote(userId, { body = '', kind = 'text', fileId = null, categoryId = null, sourceMsgId = null }) {
  const d = derived(body, kind);
  const time = now();
  return insertId(sql`INSERT INTO notes
    (user_id, category_id, title, body, search_text, tags, pinned, kind, file_id, source_msg_id, created_at, updated_at, deleted_at)
    VALUES (${userId}, ${categoryId}, ${d.title}, ${body}, ${d.search}, ${d.tags}, 0, ${kind}, ${fileId}, ${sourceMsgId}, ${time}, ${time}, NULL)
    RETURNING id`);
}

// New text for a note. sourceMsgId: the message it now comes from (so editing that message updates it).
export async function updateNoteBody(userId, id, body, sourceMsgId) {
  const note = await getNote(userId, id);
  if (!note) return false;
  const d = derived(body, note.kind);
  await db.run(sql`UPDATE notes SET body = ${body}, title = ${d.title}, search_text = ${d.search}, tags = ${d.tags},
      updated_at = ${now()}, source_msg_id = ${sourceMsgId ?? note.source_msg_id}
    WHERE user_id = ${userId} AND id = ${id}`);
  return true;
}

export async function moveNote(userId, id, categoryId) {
  await db.run(sql`UPDATE notes SET category_id = ${categoryId || null}, updated_at = ${now()}
    WHERE user_id = ${userId} AND id = ${id}`);
}

export async function togglePin(userId, id) {
  await db.run(sql`UPDATE notes SET pinned = 1 - pinned WHERE user_id = ${userId} AND id = ${id}`);
}

export async function trashNote(userId, id) {
  await db.run(sql`UPDATE notes SET deleted_at = ${now()} WHERE user_id = ${userId} AND id = ${id} AND deleted_at IS NULL`);
}

export async function restoreNote(userId, id) {
  await db.run(sql`UPDATE notes SET deleted_at = NULL WHERE user_id = ${userId} AND id = ${id}`);
}

export async function deleteNoteForever(userId, id) {
  await db.run(sql`DELETE FROM notes WHERE user_id = ${userId} AND id = ${id} AND deleted_at IS NOT NULL`);
}

export async function emptyTrash(userId) {
  const result = await db.run(sql`DELETE FROM notes WHERE user_id = ${userId} AND deleted_at IS NOT NULL`);
  return Number(result?.rowsAffected || 0);
}

// Deletes notes that have been in the trash longer than TRASH_DAYS.
export async function purgeOldTrash(userId) {
  await db.run(sql`DELETE FROM notes WHERE user_id = ${userId} AND deleted_at IS NOT NULL AND deleted_at < ${now() - TRASH_DAYS * DAY}`);
}

// ---------- Tags and numbers ----------

// [{ tag: '#idea', count: 3 }], most used first.
export async function listTags(userId) {
  const rows = await db.all(sql`SELECT tags FROM notes WHERE user_id = ${userId} AND deleted_at IS NULL AND tags != ''`);
  const counts = new Map();
  for (const row of rows) {
    for (const tag of row.tags.trim().split(' ').filter(Boolean)) counts.set(tag, (counts.get(tag) || 0) + 1);
  }
  return [...counts].map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

export async function stats(userId) {
  return db.get(sql`SELECT
      (SELECT count(*) FROM notes WHERE user_id = ${userId} AND deleted_at IS NULL) AS notes,
      (SELECT count(*) FROM notes WHERE user_id = ${userId} AND deleted_at IS NULL AND category_id IS NULL) AS uncat,
      (SELECT count(*) FROM notes WHERE user_id = ${userId} AND deleted_at IS NULL AND pinned = 1) AS pinned,
      (SELECT count(*) FROM notes WHERE user_id = ${userId} AND deleted_at IS NOT NULL) AS trash,
      (SELECT count(*) FROM categories WHERE user_id = ${userId}) AS categories`);
}
