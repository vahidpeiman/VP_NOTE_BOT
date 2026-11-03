// Editing your own message in Telegram updates the note that came from it.
import { api } from 'sdk';
import { isAllowed } from '../lib/access.js';
import { NOTE_MAX_CHARS } from '../lib/config.js';
import { findNoteBySource, updateNoteBody, getNote } from '../lib/store.js';
import { quietly } from '../lib/tg.js';

export default async function (message) {
  const userId = message.from?.id;
  const chatId = message.chat?.id;
  if (!chatId || !userId || message.chat.type !== 'private' || !isAllowed(userId)) return;

  const note = await findNoteBySource(userId, message.message_id);
  if (!note) return;
  const body = String(message.text ?? message.caption ?? '').trim();
  if (body === note.body || (!body && note.kind === 'text') || body.length > NOTE_MAX_CHARS) return;

  await updateNoteBody(userId, note.id, body, message.message_id);
  const updated = await getNote(userId, note.id);
  await quietly(() => api.sendMessage({
    chat_id: chatId,
    text: `✏️ یادداشت «${updated.title}» به‌روز شد.`,
    reply_to_message_id: message.message_id,
    reply_markup: { inline_keyboard: [[{ text: '👁 View', callback_data: `n:v:${note.id}` }]] },
  }));
}
