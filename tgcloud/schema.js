import { table, integer, text, index } from 'sdk/db';

// Every row belongs to one Telegram user (user_id); users never see each other's data.
// Times are unix milliseconds.

export const categories = table('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull(),
  name: text('name').notNull(),
  emoji: text('emoji'),
  createdAt: integer('created_at').notNull(),
}, (t) => ({
  byUser: index('idx_categories_user').on(t.userId),
}));

export const notes = table('notes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull(),
  categoryId: integer('category_id'), // null = Uncategorized
  title: text('title').notNull(), // first line of the text, or the attachment type
  body: text('body').notNull(), // full text (the caption for attachments)
  searchText: text('search_text').notNull(), // normalized copy for search
  tags: text('tags').notNull(), // " #tag1 #tag2 " or ""
  pinned: integer('pinned').notNull(), // 0 / 1
  kind: text('kind').notNull(), // text, photo, voice, audio, video, video_note, animation, document
  fileId: text('file_id'), // Telegram file_id of the attachment
  sourceMsgId: integer('source_msg_id'), // your message it came from (editing it updates the note)
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  deletedAt: integer('deleted_at'), // set = in the trash
}, (t) => ({
  byUser: index('idx_notes_user').on(t.userId, t.deletedAt),
  byCategory: index('idx_notes_category').on(t.userId, t.categoryId),
  bySource: index('idx_notes_source').on(t.userId, t.sourceMsgId),
}));

// What the user's next message is for (adding, editing, searching…) and screen context.
export const userState = table('user_state', {
  userId: integer('user_id').primaryKey(),
  pending: text('pending'),
  context: text('context'), // JSON
});
