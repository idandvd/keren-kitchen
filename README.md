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

## Run locally

```
python -m http.server 8000
```

Then open http://localhost:8000.
