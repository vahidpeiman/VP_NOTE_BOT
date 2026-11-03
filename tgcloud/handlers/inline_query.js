// Inline mode: type "@bot word" in any chat to send one of your notes there.
// Needs inline mode turned on in BotFather (/setinline).
import { api } from 'sdk';
import { isAllowed } from '../lib/access.js';
import { INLINE_PAGE_SIZE } from '../lib/config.js';
import { notesWithBody } from '../lib/store.js';
import { KIND, shorten } from '../lib/text.js';

function toResult(note) {
  const id = String(note.id);
  const title = shorten(note.title, 60);
  const description = shorten(note.body, 90) || (KIND[note.kind] || KIND.text).label;
  const caption = note.body ? note.body.slice(0, 1024) : undefined;
  const file = note.file_id;
  switch (file ? note.kind : 'text') {
    case 'photo': return { type: 'photo', id, photo_file_id: file, title, description, caption };
    case 'voice': return { type: 'voice', id, voice_file_id: file, title, caption };
    case 'audio': return { type: 'audio', id, audio_file_id: file, caption };
    case 'video': return { type: 'video', id, video_file_id: file, title, description, caption };
    case 'animation': return { type: 'gif', id, gif_file_id: file, title, caption };
    case 'document': return { type: 'document', id, document_file_id: file, title, description, caption };
    default:
      // Text notes, and video notes (which can't be sent inline): send the text.
      return {
        type: 'article', id, title, description,
        input_message_content: { message_text: (note.body || note.title).slice(0, 4096) },
      };
  }
}

export default async function (query) {
  // Other people get no answer at all, so they learn nothing about the bot.
  if (!isAllowed(query.from?.id)) return;
  const userId = query.from.id;
  const text = String(query.query || '').trim();
  const offset = Number(query.offset) || 0;
  const filter = text ? { kind: 'search', query: text } : { kind: 'all' };
  const rows = await notesWithBody(userId, filter, { limit: INLINE_PAGE_SIZE + 1, offset });
  const more = rows.length > INLINE_PAGE_SIZE;
  await api.answerInlineQuery({
    inline_query_id: query.id,
    results: rows.slice(0, INLINE_PAGE_SIZE).map(toResult),
    cache_time: 0,
    is_personal: true,
    next_offset: more ? String(offset + INLINE_PAGE_SIZE) : '',
  });
}
