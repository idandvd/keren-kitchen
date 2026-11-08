// המטבח של קרן – קבלת טיפים ותמונות מהאתר, עם מייל לאישור.
//
// התקנה (פעם אחת):
// 1. ליצור גיליון חדש (sheets.new) ולקרוא לו "המטבח של קרן – הצעות".
// 2. Extensions ← Apps Script, למחוק את מה שיש ולהדביק את כל הקובץ הזה. לשמור.
// 3. Deploy ← New deployment ← סוג: Web app. Execute as: Me, Who has access: Anyone. לאשר הרשאות.
// 4. להעתיק את ה-Web app URL (מסתיים ב-/exec) לתוך config.js באתר.
//
// כל הצעה חדשה נרשמת בגיליון ונשלח מייל עם כפתורי "לאשר" / "לדחות".
// אפשר גם לשנות ידנית את עמודת "סטטוס" בגיליון ל"מאושר" או "נדחה".
// אחרי שינוי בקוד: Deploy ← Manage deployments ← עריכה ← Version: New version (הכתובת נשארת זהה).

const SITE_URL = 'https://idandvd.github.io/keren-kitchen/';
const FOLDER_NAME = 'המטבח של קרן – תמונות שנשלחו';
const MAX_PER_HOUR = 30; // הגנה בסיסית מהצפה

const TABS = {
  tip: { name: 'טיפים', headers: ['מזהה', 'תאריך', 'סטטוס', 'שם', 'טיפ', 'מתכון', 'מפתח'] },
  photo: { name: 'תמונות', headers: ['מזהה', 'תאריך', 'סטטוס', 'שם', 'מתכון', 'קישור לתמונה', 'מזהה קובץ', 'הערה', 'מפתח'] }
};
const PENDING = 'ממתין', APPROVED = 'מאושר', REJECTED = 'נדחה';

function doPost(e) {
  let d = {};
  try { d = JSON.parse(e.postData.contents); } catch (err) { return json({ ok: false, error: 'bad request' }); }
  if (d.website) return json({ ok: true }); // מלכודת לבוטים
  if (!underRateLimit()) return json({ ok: false, error: 'busy' });

  const clip = (v, n) => String(v == null ? '' : v).trim().slice(0, n || 200).replace(/^[=+\-@]/, "'$&");
  const id = Utilities.getUuid().slice(0, 8);
  const key = Utilities.getUuid().replace(/-/g, '');
  const name = clip(d.name, 60) || 'אנונימי';
  const recipe = clip(d.recipeTitle, 80);
  const recipeId = clip(d.recipeId, 10);

  if (d.type === 'tip') {
    const text = clip(d.text, 1000);
    if (text.length < 3) return json({ ok: false, error: 'empty' });
    sheet('tip').appendRow([id, new Date(), PENDING, name, text, recipeId ? recipeId + ' ' + recipe : '', key]);
    notify('טיפ חדש לאתר המטבח של קרן',
      `<p><b>${esc(name)}</b> שלח/ה טיפ${recipe ? ' למתכון <b>' + esc(recipe) + '</b>' : ''}:</p>
       <blockquote style="font-size:18px;border-right:3px solid #b08840;padding-right:12px;margin:12px 0">${esc(text)}</blockquote>`,
      'tip', id, key);
    return json({ ok: true });
  }

  if (d.type === 'photo') {
    const m = String(d.image || '').match(/^data:(image\/(jpeg|png|webp));base64,(.+)$/);
    if (!m) return json({ ok: false, error: 'no image' });
    const bytes = Utilities.base64Decode(m[3]);
    if (bytes.length > 8 * 1024 * 1024) return json({ ok: false, error: 'too big' });
    const blob = Utilities.newBlob(bytes, m[1], `${recipeId || 'photo'}-${id}.${m[2] === 'jpeg' ? 'jpg' : m[2]}`);
    const file = folder().createFile(blob);
    const note = clip(d.text, 500);
    sheet('photo').appendRow([id, new Date(), PENDING, name, recipeId + ' ' + recipe, file.getUrl(), file.getId(), note, key]);
    notify('תמונה חדשה למתכון: ' + recipe,
      `<p><b>${esc(name)}</b> שלח/ה תמונה למתכון <b>${esc(recipe)}</b>.</p>
       ${note ? `<p>הערה: ${esc(note)}</p>` : ''}
       <p><img src="cid:photo" style="max-width:480px;border-radius:8px"></p>`,
      'photo', id, key, blob);
    return json({ ok: true });
  }
  return json({ ok: false, error: 'unknown type' });
}

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.action === 'approve' || p.action === 'reject') return review(p);
  // ברירת מחדל: רשימת ההצעות המאושרות, לאתר
  const cache = CacheService.getScriptCache();
  const hit = cache.get('list');
  if (hit) return ContentService.createTextOutput(hit).setMimeType(ContentService.MimeType.JSON);
  const out = { tips: [], photos: [] };
  rows('tip').forEach(r => {
    if (r[2] === APPROVED) out.tips.push({ id: r[0], date: r[1], name: r[3], text: r[4], recipeId: String(r[5]).split(' ')[0] });
  });
  rows('photo').forEach(r => {
    if (r[2] === APPROVED) out.photos.push({ id: r[0], name: r[3], recipeId: String(r[4]).split(' ')[0], src: 'https://lh3.googleusercontent.com/d/' + r[6] + '=w1600' });
  });
  const s = JSON.stringify(out);
  cache.put('list', s, 300);
  return ContentService.createTextOutput(s).setMimeType(ContentService.MimeType.JSON);
}

function review(p) {
  const type = p.type === 'photo' ? 'photo' : 'tip';
  const sh = sheet(type), data = sh.getDataRange().getValues();
  const keyCol = TABS[type].headers.indexOf('מפתח');
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === p.id && data[i][keyCol] === p.key) {
      const status = p.action === 'approve' ? APPROVED : REJECTED;
      sh.getRange(i + 1, 3).setValue(status);
      if (type === 'photo') {
        const f = DriveApp.getFileById(data[i][6]);
        f.setSharing(status === APPROVED ? DriveApp.Access.ANYONE_WITH_LINK : DriveApp.Access.PRIVATE, DriveApp.Permission.VIEW);
      }
      CacheService.getScriptCache().remove('list');
      return page(status === APPROVED ? '✓ אושר! זה יופיע באתר תוך כמה דקות.' : 'נדחה. זה לא יופיע באתר.');
    }
  }
  return page('לא נמצא (אולי הקישור ישן).');
}

/* ---------- helpers ---------- */
function notify(subject, body, type, id, key, blob) {
  const base = ScriptApp.getService().getUrl();
  const link = a => `${base}?action=${a}&type=${type}&id=${id}&key=${key}`;
  const html = `<div dir="rtl" style="font-family:Arial,sans-serif;font-size:16px;color:#3b2a24">
    ${body}
    <p style="margin-top:20px">
      <a href="${link('approve')}" style="background:#7a2335;color:#fff;padding:10px 22px;border-radius:999px;text-decoration:none;font-weight:bold">לאשר ולהציג באתר</a>
      &nbsp;
      <a href="${link('reject')}" style="color:#7f6b60">לדחות</a>
    </p>
    <p style="color:#7f6b60;font-size:13px">אפשר גם לנהל הכל בגיליון: ${SpreadsheetApp.getActiveSpreadsheet().getUrl()}<br>האתר: ${SITE_URL}</p>
  </div>`;
  const opts = { htmlBody: html, name: 'המטבח של קרן' };
  if (blob) opts.inlineImages = { photo: blob };
  MailApp.sendEmail(Session.getEffectiveUser().getEmail(), subject, 'יש הצעה חדשה באתר המטבח של קרן', opts);
}

function sheet(type) {
  const ss = SpreadsheetApp.getActiveSpreadsheet(), t = TABS[type];
  let sh = ss.getSheetByName(t.name);
  if (!sh) {
    sh = ss.insertSheet(t.name);
    sh.appendRow(t.headers);
    sh.setFrozenRows(1);
    sh.setRightToLeft(true);
    sh.hideColumns(t.headers.length); // עמודת המפתח
  }
  return sh;
}
function rows(type) { return sheet(type).getDataRange().getValues().slice(1); }

function folder() {
  const it = DriveApp.getFoldersByName(FOLDER_NAME);
  return it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER_NAME);
}

function underRateLimit() {
  const cache = CacheService.getScriptCache();
  const n = Number(cache.get('rate') || 0);
  if (n >= MAX_PER_HOUR) return false;
  cache.put('rate', String(n + 1), 3600);
  return true;
}

function json(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function page(msg) {
  return HtmlService.createHtmlOutput(`<div dir="rtl" style="font-family:Arial;font-size:22px;text-align:center;padding:60px;color:#7a2335">${msg}<br><br><a href="${SITE_URL}" style="font-size:16px">לאתר</a></div>`).setTitle('המטבח של קרן');
}
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

// להרצה ידנית פעם אחת מהעורך, כדי לאשר את כל ההרשאות (גיליון, דרייב, מייל)
function setup() { sheet('tip'); sheet('photo'); folder(); }
