// Text helpers: Persian normalization, titles, hashtags, dates and digits.
import { TITLE_MAX } from './config.js';

// Labels for notes that are attachments.
export const KIND = {
  text: { icon: '', label: 'یادداشت' },
  photo: { icon: '🖼 ', label: 'عکس' },
  voice: { icon: '🎙 ', label: 'پیام صوتی' },
  audio: { icon: '🎵 ', label: 'فایل صوتی' },
  video: { icon: '🎬 ', label: 'ویدیو' },
  video_note: { icon: '⭕️ ', label: 'ویدیومسیج' },
  animation: { icon: '🎞 ', label: 'گیف' },
  document: { icon: '📎 ', label: 'فایل' },
};

// One form for search: Arabic ي/ك → Persian ی/ک, no diacritics or half-spaces,
// Persian/Arabic digits → 0-9, lower case, single spaces.
export function normalize(text) {
  return String(text || '')
    .replace(/[يى]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[ۀة]/g, 'ه')
    .replace(/[أإآ]/g, 'ا')
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[‌‍‎‏]/g, ' ')
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06F0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function shorten(text, max) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

// The first non-empty line, or the attachment type.
export function titleOf(body, kind = 'text') {
  const line = String(body || '').split('\n').map((item) => item.trim()).find(Boolean);
  return line ? shorten(line, TITLE_MAX) : (KIND[kind] || KIND.text).label;
}

// "#idea #book" → " #idea #book " (normalized, unique), or "".
export function tagsOf(body) {
  const found = new Set();
  for (const match of String(body || '').matchAll(/(?:^|[^\p{L}\p{N}_])#([\p{L}\p{N}_]{1,40})/gu)) {
    found.add(`#${normalize(match[1])}`);
  }
  return found.size ? ` ${[...found].join(' ')} ` : '';
}

// For LIKE '%…%' with ESCAPE '!' (no backslash, so it reads the same in any template).
export const escapeLike = (text) => String(text).replace(/[!%_]/g, (c) => `!${c}`);

export function escapeHtml(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Latin digits → Persian digits.
export const fa = (value) => String(value).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);

// ---------- Dates (Persian calendar, Tehran time) ----------

const MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];

export function toJalali(gy, gm, gd) {
  const before = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = gy <= 1600 ? 0 : 979;
  gy -= gy <= 1600 ? 621 : 1600;
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days = 365 * gy + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100)
    + Math.floor((gy2 + 399) / 400) - 80 + gd + before[gm - 1];
  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const jm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  return [jy, jm, jd];
}

// Tehran is UTC+3:30 all year (no daylight saving since 2022).
function tehranParts(ms) {
  const date = new Date(Number(ms) + 3.5 * 3600 * 1000);
  const [jy, jm, jd] = toJalali(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
  return { jy, jm, jd, hh: date.getUTCHours(), mm: date.getUTCMinutes() };
}

const pad = (n) => String(n).padStart(2, '0');

// "۱۲ آبان ۱۴۰۵، ۱۰:۲۴"
export function faDate(ms) {
  const p = tehranParts(ms);
  return fa(`${p.jd} ${MONTHS[p.jm - 1]} ${p.jy}، ${pad(p.hh)}:${pad(p.mm)}`);
}

// "1405-08-12" (for file names)
export function jalaliStamp(ms) {
  const p = tehranParts(ms);
  return `${p.jy}-${pad(p.jm)}-${pad(p.jd)}`;
}
