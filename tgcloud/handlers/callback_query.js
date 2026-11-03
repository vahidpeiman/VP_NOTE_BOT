// Inline buttons. The button data format is described at the top of lib/views.js.
import { api } from 'sdk';
import { isAllowed } from '../lib/access.js';
import {
  getState, setPending, setContext, getNote, getCategory, moveNote, togglePin, trashNote, restoreNote,
  deleteNoteForever, emptyTrash, deleteCategory,
} from '../lib/store.js';
import {
  homeView, noteView, moveView, deleteNoteConfirm, trashNoteView, deleteForeverConfirm, emptyTrashConfirm,
  categoryOptionsView, categoryDeleteConfirm, settingsView, prompts, HELP_TEXT, categoryLabel, UNCATEGORIZED,
} from '../lib/views.js';
import { openList, openTags, sendExport } from '../lib/actions.js';
import {
  editView, sendView, sendCopyable, sendAttachment, sendLong, sendTextFile, quietly,
} from '../lib/tg.js';
import { fa } from '../lib/text.js';

const button = (text, data) => ({ text, callback_data: data });

export default async function (query) {
  const userId = query.from?.id;
  const chatId = query.message?.chat?.id;
  const messageId = query.message?.message_id;
  let toast = '';
  try {
    // Buttons only work for listed users (they never see the bot's messages anyway).
    if (!isAllowed(userId) || !chatId) return;
    const show = (view) => editView(chatId, messageId, view);
    const { context } = await getState(userId);
    const back = context.back || 'h';
    const [area, action, rawId, rawArg] = String(query.data || '').split(':');
    const id = Number(rawId);

    switch (area) {
      case '-':
        return;
      case 'x':
        await setPending(userId, null);
        await show({ text: '❌ لغو شد.' });
        return;
      case 'h':
        await show(await homeView(userId));
        return;
      case 'l':
        await show(await openList(userId, action, Number(rawId) || 0, context));
        return;
      case 'sr':
        await setPending(userId, 'search');
        await show(prompts.search);
        return;
      case 'g':
        if (action === undefined) {
          await show(await openTags(userId));
          return;
        }
        {
          const tag = (context.tagList || [])[Number(action)];
          if (!tag) {
            await show(await openTags(userId));
            return;
          }
          await setContext(userId, { tag });
          await show(await openList(userId, 'g', 0, { ...context, tag }));
        }
        return;
      case 'st':
        await show(await settingsView(userId));
        return;
      case 'hp':
        await show({ text: HELP_TEXT, reply_markup: { inline_keyboard: [[button('« Settings', 'st')]] } });
        return;
      case 'ex':
        toast = '📤 در حال آماده‌سازی…';
        await quietly(() => api.answerCallbackQuery({ callback_query_id: query.id, text: toast }));
        toast = null; // already answered
        await sendExport(chatId, userId);
        return;
      case 'n':
        toast = await noteAction(action, id, rawArg, { userId, chatId, show, back });
        return;
      case 't':
        toast = await trashAction(action, id, { userId, show, back });
        return;
      case 'c':
        toast = await categoryAction(action, id, { userId, show, context });
        return;
      default:
    }
  } catch (error) {
    console.error('Button failed:', error);
    toast = '⚠️ خطا؛ دوباره امتحان کن.';
  } finally {
    if (toast !== null) await quietly(() => api.answerCallbackQuery({ callback_query_id: query.id, ...(toast ? { text: toast } : {}) }));
  }
}

async function noteAction(action, id, arg, { userId, chatId, show, back }) {
  switch (action) {
    case 'v':
      await show(await noteView(userId, id, back));
      return '';
    case 'e': {
      const note = await getNote(userId, id);
      if (!note) {
        await show(await homeView(userId, '⚠️ این یادداشت پیدا نشد.'));
        return '';
      }
      await setPending(userId, `edit:${id}`);
      if (note.body) await sendCopyable(chatId, note.body, `note-${id}.md`);
      await sendView(chatId, prompts.edit(note));
      return '';
    }
    case 'm':
      await show(await moveView(userId, id));
      return '';
    case 'mc': {
      const catId = Number(arg) || 0;
      const cat = catId ? await getCategory(userId, catId) : null;
      if (catId && !cat) {
        await show(await moveView(userId, id));
        return 'این دسته دیگر وجود ندارد.';
      }
      if (!(await getNote(userId, id))) {
        await show(await homeView(userId, '⚠️ این یادداشت پیدا نشد.'));
        return '';
      }
      await moveNote(userId, id, catId);
      await show(await noteView(userId, id, back, `📂 در ${categoryLabel(cat)} است.`));
      return '';
    }
    case 'mn':
      await setPending(userId, `catnew:${id}`);
      await show(prompts.categoryName);
      return '';
    case 'p': {
      const note = await getNote(userId, id);
      if (!note) return 'پیدا نشد.';
      await togglePin(userId, id);
      await show(await noteView(userId, id, back));
      return note.pinned ? 'سنجاق برداشته شد.' : '📌 سنجاق شد.';
    }
    case 'd':
      await show(await deleteNoteConfirm(userId, id));
      return '';
    case 'dy':
    case 'x': {
      // dy: "delete" confirmed. x: "undo" right after a quick save. Both go to the trash.
      const note = await getNote(userId, id);
      if (!note) {
        await show(await homeView(userId, '⚠️ این یادداشت پیدا نشد.'));
        return '';
      }
      await trashNote(userId, id);
      await show({
        text: `🗑 «${note.title}» به سطل زباله رفت.`,
        reply_markup: { inline_keyboard: [[button('↩️ Undo', `t:r:${id}`), ...(action === 'dy' ? [button('« Back', back)] : [])]] },
      });
      return '';
    }
    case 'f': {
      const note = await getNote(userId, id, { withDeleted: true });
      if (!note?.file_id) return 'پیوستی ندارد.';
      await sendAttachment(chatId, note);
      return '';
    }
    case 't': {
      const note = await getNote(userId, id, { withDeleted: true });
      if (!note) return 'پیدا نشد.';
      if (note.body.length > 12000) await sendTextFile(chatId, note.body, `note-${id}.md`);
      else await sendLong(chatId, note.body);
      return '';
    }
    default:
      return '';
  }
}

async function trashAction(action, id, { userId, show, back }) {
  switch (action) {
    case 'v':
      await show(await trashNoteView(userId, id));
      return '';
    case 'r': {
      const note = await getNote(userId, id, { withDeleted: true });
      if (!note) return 'پیدا نشد.';
      await restoreNote(userId, id);
      await show(await noteView(userId, id, back, '♻️ برگشت.'));
      return '';
    }
    case 'x':
      await show(deleteForeverConfirm(id));
      return '';
    case 'xy':
      await deleteNoteForever(userId, id);
      await show(await openList(userId, 't', 0, {}));
      return 'برای همیشه پاک شد.';
    case 'e':
      await show(await emptyTrashConfirm(userId));
      return '';
    case 'ey': {
      const count = await emptyTrash(userId);
      await show(await openList(userId, 't', 0, {}));
      return `🧹 ${fa(count)} یادداشت پاک شد.`;
    }
    default:
      return '';
  }
}

async function categoryAction(action, id, { userId, show }) {
  switch (action) {
    case 'n':
      await setPending(userId, 'catnew');
      await show(prompts.categoryName);
      return '';
    case 'o':
      await show(await categoryOptionsView(userId, id));
      return '';
    case 'r':
    case 'e': {
      const cat = await getCategory(userId, id);
      if (!cat) {
        await show(await homeView(userId, '⚠️ این دسته دیگر وجود ندارد.'));
        return '';
      }
      await setPending(userId, `${action === 'r' ? 'catrename' : 'catemoji'}:${id}`);
      await show(action === 'r' ? prompts.rename(cat) : prompts.emoji(cat));
      return '';
    }
    case 'd':
      await show(await categoryDeleteConfirm(userId, id));
      return '';
    case 'dm':
    case 'dt': {
      const cat = await getCategory(userId, id);
      if (!cat) {
        await show(await homeView(userId));
        return '';
      }
      await deleteCategory(userId, id, action === 'dt' ? 'trash' : 'move');
      await show(await homeView(userId, `🗑 دسته‌ی ${categoryLabel(cat)} حذف شد.` +
        (action === 'dm' ? ` یادداشت‌هایش در ${UNCATEGORIZED} هستند.` : ' یادداشت‌هایش در سطل زباله‌اند.')));
      return '';
    }
    default:
      return '';
  }
}
