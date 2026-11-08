# המטבח של קרן

אוסף מתכונים לזכרה של קרן האהובה שלנו – the family recipe book as a website.

**Live site:** https://idandvd.github.io/keren-kitchen/

## How it works

A plain static site with no build step:

- `index.html`, `styles.css`, `app.js` – the site (Hebrew, RTL, works on phones)
- `data.js` – all the content: recipes, intro, challah blessing, tips, gallery
- `images/` – recipe photos and the "moments" gallery

## Adding or editing a recipe

Edit `data.js`. Each recipe looks like:

```js
{
  "id": "r37",
  "title": "שם המתכון",
  "category": "desserts",          // salads | mains | baking | desserts
  "subtitle": "",                  // optional, e.g. "מתכון שנועה הכינה וקרן אהבה"
  "image": "images/r37.jpg",       // optional
  "ingredients": [{ "title": "", "items": ["2 ביצים", "כוס סוכר"] }],
  "steps": [{ "title": "", "items": ["תערבבי...", "תאפי..."] }],
  "signoff": "בהצלחה!"
}
```

Tips go in the `tips` list. Push to `main` and the site updates within a minute.

## Tips and photos from the family

Visitors can send a tip (general or for a recipe) and a photo of a dish. Nothing appears on
the site until it is approved. Each submission sends an email with an approve button.

How it works: `apps-script.gs` runs as a Google Apps Script web app attached to a Google Sheet.
Submissions are saved in the sheet (tabs "טיפים" and "תמונות"), photos go to a Drive folder,
and the site loads the approved ones from the same web app.

One-time setup:

1. Create a new Google Sheet (sheets.new), e.g. "המטבח של קרן – הצעות".
2. Extensions → Apps Script. Delete what's there, paste all of `apps-script.gs`, save.
3. Choose the `setup` function in the toolbar and press Run, then approve the permissions
   (Sheets, Drive, sending email as you).
4. Deploy → New deployment → type Web app. Execute as: **Me**. Who has access: **Anyone**. Deploy.
5. Copy the Web app URL (ends with `/exec`) into `config.js` as `window.BOOK_API`, and push.

To approve or reject: use the buttons in the email, or change the "סטטוס" column in the sheet to
`מאושר` / `נדחה`. Approved items show up on the site within about 5 minutes.
After editing the script: Deploy → Manage deployments → edit → Version: New version (the URL stays the same).

## AI pictures

Recipes without a real photo can get an AI-generated picture, labeled on the site as AI.
A real photo (from the repo or an approved family upload) always replaces it.

```
python tools/ai_images.py           # all recipes without a photo
python tools/ai_images.py r16       # re-generate one
```

Needs `GEMINI_API_KEY=...` in a `.env` file in this folder (ignored by git), on a Google AI Studio
project with billing enabled (the free tier has no image quota). The prompts are in the script.

## Run locally

```
python -m http.server 8000
```

Then open http://localhost:8000.
