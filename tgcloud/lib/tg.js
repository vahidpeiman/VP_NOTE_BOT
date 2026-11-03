// Small helpers around the Telegram Bot API.
import { api, InputFile } from 'sdk';
import { escapeHtml, shorten } from './text.js';

const MESSAGE_MAX = 4000;
const CODE_BLOCK_MAX = 3500;

// A screen is { text, reply_markup }.
export function sendView(chatId, view, extra = {}) {
  return api.sendMessage({ chat_id: chatId, text: view.text, reply_markup: view.reply_markup, ...extra });
}

// Replace a message with a screen; send a new message if that's not possible.
export async function editView(chatId, messageId, view) {
  try {
    await api.editMessageText({ chat_id: chatId, message_id: messageId, text: view.text, reply_markup: view.reply_markup });
  } catch (error) {
    if (/not modified/i.test(error?.message || '')) return;
    await sendView(chatId, view);
  }
}

export async function quietly(task) {
  try {
    return await task();
  } catch (error) {
    console.warn(error?.message || error);
    return null;
  }
}

// Split on line breaks where possible; never cut an emoji in half.
export function splitText(text, max = MESSAGE_MAX) {
  const parts = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + max, text.length);
    if (end < text.length) {
      const newline = text.lastIndexOf('\n', end);
      if (newline > start + max / 2) end = newline + 1;
      else if (/[\ud800-\udbff]/.test(text[end - 1])) end -= 1;
    }
    parts.push(text.slice(start, end));
    start = end;
  }
  return parts;
}

export async function sendLong(chatId, text) {
  for (const part of splitText(text)) await api.sendMessage({ chat_id: chatId, text: part });
}

export function sendTextFile(chatId, text, filename, caption) {
  return api.sendDocument({
    chat_id: chatId,
    document: new InputFile(encodeUtf8(text), filename, { type: 'text/markdown' }),
    ...(caption ? { caption } : {}),
  });
}

// Text you can copy with one tap (a code block), or a file if it's long.
export async function sendCopyable(chatId, text, filename) {
  if (text.length > CODE_BLOCK_MAX) return sendTextFile(chatId, text, filename);
  try {
    return await api.sendMessage({ chat_id: chatId, text: `<pre>${escapeHtml(text)}</pre>`, parse_mode: 'HTML' });
  } catch {
    return sendTextFile(chatId, text, filename);
  }
}

// Sends a note's attachment again, by its Telegram file_id.
export function sendAttachment(chatId, note) {
  const caption = shorten(note.body || note.title, 1000) || undefined;
  const base = { chat_id: chatId };
  switch (note.kind) {
    case 'photo': return api.sendPhoto({ ...base, photo: note.file_id, caption });
    case 'voice': return api.sendVoice({ ...base, voice: note.file_id, caption });
    case 'audio': return api.sendAudio({ ...base, audio: note.file_id, caption });
    case 'video': return api.sendVideo({ ...base, video: note.file_id, caption });
    case 'video_note': return api.sendVideoNote({ ...base, video_note: note.file_id });
    case 'animation': return api.sendAnimation({ ...base, animation: note.file_id, caption });
    default: return api.sendDocument({ ...base, document: note.file_id, caption });
  }
}

// ---------- UTF-8 (TextEncoder/TextDecoder are not documented for the runtime) ----------

export function decodeUtf8(bytes) {
  if (typeof TextDecoder === 'function') return new TextDecoder('utf-8').decode(bytes);
  let out = '';
  let i = 0;
  while (i < bytes.length) {
    const b = bytes[i++];
    if (b < 0x80) out += String.fromCharCode(b);
    else if (b < 0xe0) out += String.fromCharCode(((b & 0x1f) << 6) | (bytes[i++] & 0x3f));
    else if (b < 0xf0) out += String.fromCharCode(((b & 0x0f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f));
    else {
      const cp = ((b & 0x07) << 18) | ((bytes[i++] & 0x3f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f);
      out += String.fromCodePoint(cp);
    }
  }
  return out;
}

export function encodeUtf8(text) {
  if (typeof TextEncoder === 'function') return new TextEncoder().encode(text);
  const bytes = [];
  for (const char of String(text)) {
    const cp = char.codePointAt(0);
    if (cp < 0x80) bytes.push(cp);
    else if (cp < 0x800) bytes.push(0xc0 | (cp >> 6), 0x80 | (cp & 0x3f));
    else if (cp < 0x10000) bytes.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
    else bytes.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3f), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
  }
  return new Uint8Array(bytes);
}
