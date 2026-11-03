// Messages: commands, keyboard buttons, input the bot is waiting for, and quick saving.
import { api } from 'sdk';
import { isAllowed, setupMode } from '../lib/access.js';
import { NOTE_MAX_CHARS } from '../lib/config.js';
import {
  getState, setPending, clearPending, createNote, getNote, updateNoteBody, getCategory,
  createCategory, renameCategory, setCategoryEmoji, moveNote,
} from '../lib/store.js';
import { BUTTON_COMMANDS, mainKeyboard, MENU_COMMANDS } from '../lib/keyboard.js';
import {
  homeView, noteView, moveView, settingsView, savedView, categoryOptionsView, prompts, HELP_TEXT, categoryLabel,
} from '../lib/views.js';
import {
  noteFromMessage, parseCategoryInput, checkCategoryName, isEmoji, openList, openSearch, openTags, sendExport,
} from '../lib/actions.js';
import { sendView, decodeUtf8, quietly } from '../lib/tg.js';
import { fa } from '../lib/text.js';

// "/search@MyBot hello" → { name: 'search', args: 'hello' }
function parseCommand(text) {
  const match = text.match(/^\/([A-Za-z0-9_]+)(?:@\w+)?(?:\s+([\s\S]*))?$/);
  return match ? { name: match[1].toLowerCase(), args: (match[2] || '').trim() } : null;
}

export default async function (message) {
  const chatId = message.chat?.id;
  const userId = message.from?.id;
  if (!chatId || !userId || message.chat.type !== 'private') return;

  if (setupMode()) {
    await api.sendMessage({ chat_id: chatId, text: `شناسه‌ی تلگرام شما: ${userId}\nآن را در ALLOWED_USER_IDS (tgcloud/lib/config.js) بگذارید و npx tgcloud push کنید.` });
    return;
  }
  // Only the listed users; everyone else gets no reply at all.
  if (!isAllowed(userId)) return;

  const say = (text, extra = {}) => api.sendMessage({ chat_id: chatId, text, ...extra });
  const show = (view, extra) => sendView(chatId, view, extra);
  const text = (message.text || '').trim();

  // A keyboard button or a /command always wins over anything the bot was waiting for.
  const command = BUTTON_COMMANDS[text] ? { name: BUTTON_COMMANDS[text], args: '' } : (text.startsWith('/') ? parseCommand(text) : null);
  if (command) {
    await clearPending(userId);
    await runCommand(command, { message, chatId, userId, say, show });
    return;
  }

  const { pending, context } = await getState(userId);
  if (pending) {
    await handlePending(pending, { message, chatId, userId, say, show, context, text });
    return;
  }

  // Quick save: anything you send becomes a note.
  const input = noteFromMessage(message);
  if (!input) {
    await say('این نوع پیام را نمی‌توانم یادداشت کنم. متن، عکس، صدا، ویدیو یا فایل بفرست.');
    return;
  }
  if (input.error) {
    await say(`❌ ${input.error}`);
    return;
  }
  const id = await createNote(userId, { ...input, sourceMsgId: message.message_id });
  await show(savedView(await getNote(userId, id), null), { reply_to_message_id: message.message_id });
}

async function runCommand({ name, args }, { message, chatId, userId, say, show }) {
  const { context } = await getState(userId);
  switch (name) {
    case 'start':
      await say('📒 سلام! این دفترچه یادداشت توست. هر چیزی بفرستی یادداشت می‌شود.\nراهنما: /help', { reply_markup: mainKeyboard() });
      await quietly(() => api.setMyCommands({ commands: MENU_COMMANDS }));
      return;
    case 'help':
      await say(HELP_TEXT, { reply_markup: mainKeyboard() });
      return;
    case 'new': {
      if (!args) {
        await setPending(userId, 'new');
        await show(prompts.newNote);
        return;
      }
      if (args.length > NOTE_MAX_CHARS) {
        await say(`❌ متن بیشتر از ${fa(NOTE_MAX_CHARS)} نویسه است.`);
        return;
      }
      const id = await createNote(userId, { body: args, sourceMsgId: message.message_id });
      await show(await moveView(userId, id));
      return;
    }
    case 'cats':
    case 'categories':
      await show(await homeView(userId));
      return;
    case 'search':
      if (args) {
        await show(await openSearch(userId, args));
      } else {
        await setPending(userId, 'search');
        await show(prompts.search);
      }
      return;
    case 'pinned':
      await show(await openList(userId, 'p', 0, context));
      return;
    case 'trash':
      await show(await openList(userId, 't', 0, context));
      return;
    case 'tags':
      await show(await openTags(userId));
      return;
    case 'settings':
      await show(await settingsView(userId));
      return;
    case 'export':
      await sendExport(chatId, userId);
      return;
    default:
      await say('دستور ناشناخته است. راهنما: /help');
  }
}

// The text of a message, or of an attached .txt/.md file (for long edits).
async function textInput(message, text) {
  const doc = message.document;
  if (!doc) return { value: text };
  if (!/\.(txt|md|markdown)$/i.test(doc.file_name || '') && !/^text\//.test(doc.mime_type || '')) {
    return { error: 'فقط متن یا فایل .txt / .md قبول است.' };
  }
  if (doc.file_size && doc.file_size > 1024 * 1024) return { error: 'فایل بزرگ‌تر از ۱ مگابایت است.' };
  try {
    return { value: decodeUtf8(await api.getFileContent(doc.file_id)).trim(), fromFile: true };
  } catch {
    return { error: 'خواندن فایل ممکن نشد.' };
  }
}

async function handlePending(pending, { message, userId, say, show, context, text }) {
  const [kind, arg] = pending.split(':');
  const id = Number(arg);

  if (kind === 'new') {
    const input = noteFromMessage(message);
    if (!input || input.error) {
      await show({ ...prompts.newNote, text: input?.error ? `❌ ${input.error}` : prompts.newNote.text });
      return;
    }
    const noteId = await createNote(userId, { ...input, sourceMsgId: message.message_id });
    await setPending(userId, null);
    await show(await moveView(userId, noteId));
    return;
  }

  if (kind === 'search') {
    if (!text) {
      await show(prompts.search);
      return;
    }
    await setPending(userId, null);
    await show(await openSearch(userId, text));
    return;
  }

  if (kind === 'edit') {
    const note = await getNote(userId, id);
    if (!note) {
      await setPending(userId, null);
      await show(await homeView(userId, '⚠️ این یادداشت دیگر وجود ندارد.'));
      return;
    }
    const input = await textInput(message, text);
    if (input.error || (!input.value && note.kind === 'text')) {
      await show({ ...prompts.edit(note), text: `❌ ${input.error || 'متن خالی است.'}\n\n${prompts.edit(note).text}` });
      return;
    }
    if (input.value.length > NOTE_MAX_CHARS) {
      await show({ ...prompts.edit(note), text: `❌ متن بیشتر از ${fa(NOTE_MAX_CHARS)} نویسه است.` });
      return;
    }
    // Your new message becomes the note's source, so editing it in Telegram updates the note.
    await updateNoteBody(userId, id, input.value, input.fromFile ? null : message.message_id);
    await setPending(userId, null);
    await show(await noteView(userId, id, context.back, '✅ ویرایش شد.'));
    return;
  }

  if (kind === 'catnew') {
    const { name, emoji } = parseCategoryInput(text);
    const problem = await checkCategoryName(userId, name);
    if (problem) {
      await show({ ...prompts.categoryName, text: `❌ ${problem}\n\n${prompts.categoryName.text}` });
      return;
    }
    const catId = await createCategory(userId, name, emoji);
    await setPending(userId, null);
    const cat = await getCategory(userId, catId);
    if (id) {
      // Made while choosing a category for a note: put the note in it.
      await moveNote(userId, id, catId);
      await show(await noteView(userId, id, context.back, `📂 در ${categoryLabel(cat)} ذخیره شد.`));
    } else {
      await show(await homeView(userId, `✅ دسته‌ی ${categoryLabel(cat)} ساخته شد.`));
    }
    return;
  }

  if (kind === 'catrename' || kind === 'catemoji') {
    const cat = await getCategory(userId, id);
    if (!cat) {
      await setPending(userId, null);
      await show(await homeView(userId, '⚠️ این دسته دیگر وجود ندارد.'));
      return;
    }
    if (kind === 'catrename') {
      const { name, emoji } = parseCategoryInput(text);
      const problem = await checkCategoryName(userId, name, id);
      if (problem) {
        await show({ ...prompts.rename(cat), text: `❌ ${problem}\n\n${prompts.rename(cat).text}` });
        return;
      }
      await renameCategory(userId, id, name);
      if (emoji) await setCategoryEmoji(userId, id, emoji);
    } else {
      const value = (text || '').trim();
      if (value !== '-' && !isEmoji(value)) {
        await show({ ...prompts.emoji(cat), text: `❌ فقط یک ایموجی بفرست.\n\n${prompts.emoji(cat).text}` });
        return;
      }
      await setCategoryEmoji(userId, id, value === '-' ? null : value);
    }
    await setPending(userId, null);
    await show(await categoryOptionsView(userId, id, '✅ ذخیره شد.'));
    return;
  }

  // Unknown leftover state: forget it and treat the message normally next time.
  await setPending(userId, null);
  await say('دوباره بفرست.');
}
