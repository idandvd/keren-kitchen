"""AI illustration photos for recipes that have no real photo.

Usage (from the project folder):
    python tools/ai_images.py                 # generate all missing (needs GEMINI_API_KEY with billing)
    python tools/ai_images.py r01 r16         # generate only these
    python tools/ai_images.py --prompts       # write tools/ai-prompts.html (copy prompts into Gemini/ChatGPT)
    python tools/ai_images.py --import DIR    # add images you made yourself; name files r01.png, r16.jpg ...

Images are saved as images/<id>-ai.jpg and marked "ai": true in data.js, so the site labels them.
"""
import base64, io, json, os, sys, time, urllib.error, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL = os.environ.get('GEMINI_IMAGE_MODEL', 'gemini-3-pro-image')

STYLE = ("A realistic, unstyled home photo taken with a smartphone in an Israeli family kitchen. "
         "Natural daylight from a window, shot from slightly above. The food is served in an everyday dish "
         "on a kitchen counter or a Shabbat table with a white tablecloth. Generous homemade portion, authentic and "
         "a little imperfect, like a photo a family member would send on WhatsApp. "
         "No people, no hands, no text, no labels, no watermark, no date or time stamp, no numbers anywhere in the image. "
         "Landscape 4:3.")

DISH = {
    'r01': "Israeli white cabbage salad: very thinly shredded white cabbage dressed with soy sauce, date syrup (silan), oil and lemon, topped with toasted sesame seeds, sunflower seeds and slivered almonds, in a large glass bowl.",
    'r02': "Fresh coleslaw-style salad of thinly shredded white cabbage, grated carrot, finely chopped celery, cilantro and parsley, dressed with oil and lemon, in a glass bowl.",
    'r03': "Simple salad of small diced cucumbers mixed with canned sweet corn kernels in mayonnaise, in a glass serving bowl.",
    'r07': "Purple cabbage salad: finely shredded red cabbage in a light creamy mayonnaise and lemon dressing, bright purple-pink, in a glass bowl.",
    'r08': "Waldorf salad: diced green Granny Smith apple and pineapple cubes with thinly sliced celery in a light mayonnaise dressing, topped with walnut pieces, in a glass bowl.",
    'r12': "Pieces of chicken (thighs and drumsticks) with red kidney beans stewed in a thick red tomato paste and paprika sauce, in a wide cooking pot on the stove.",
    'r14': "Grilled boneless chicken thighs (pargiyot) cut into strips, tossed with golden fried onions and turmeric-paprika seasoning, in a large frying pan.",
    'r15': "Beef and walnut meatballs simmered in a glossy dark sauce of caramelized red onions, soy sauce and date syrup, in a wide pot.",
    'r16': "Moroccan-style stuffed peppers: light green peppers, fried and peeled, stuffed with rice and ground beef, tops removed, arranged upright in a baking dish in a reddish paprika-turmeric sauce, after baking.",
    'r19': "Golden fried vegetable patties (latkes-style) made of grated potato, parsley and green onion, piled on a plate lined with paper towel.",
    'r20': "Israeli red peas: green peas cooked in a red tomato-paprika sauce, in a small pot, served as a side dish.",
    'r22': "Traditional Shabbat chamin (cholent) in a big pot: beef, whole head of garlic, large white beans, chickpeas, potatoes browned from slow cooking overnight and brown slow-cooked eggs, with a side bag of cooked wheat berries.",
    'r30': "Passover cheesecake in a rectangular pan: cookie crumb base, baked creamy cheese layer, and a smooth white whipped cream and vanilla pudding topping; one square slice cut out.",
    'r31': "Dense non-dairy chocolate cake with chopped walnuts, a glossy chocolate glaze and a layer of whipped topping, in a medium baking pan, cut into squares.",
    'r33': "Semolina coconut cake (basbousa-style) in a rectangular aluminum baking pan, golden, soaked in sugar syrup and sprinkled with shredded coconut, cut into squares.",
    'r34': "Cheesecake for breaking the Yom Kippur fast in a rectangular glass dish: crushed biscuit base, baked cheese layer and a thick white whipped cream topping; a few pieces cut.",
    'r35': "Fudgy chocolate walnut brownies dusted with powdered sugar, cut into squares in a baking pan, with crackly tops.",
}


def api_key():
    for line in open(os.path.join(ROOT, '.env'), encoding='utf-8'):
        if line.startswith('GEMINI_API_KEY='):
            return line.split('=', 1)[1].strip().strip('"\'')
    sys.exit('GEMINI_API_KEY missing in .env')


def generate(prompt, key):
    body = {'contents': [{'parts': [{'text': prompt}]}],
            'generationConfig': {'responseModalities': ['IMAGE'], 'imageConfig': {'aspectRatio': '4:3'}}}
    req = urllib.request.Request(
        f'https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent',
        data=json.dumps(body).encode(), headers={'x-goog-api-key': key, 'Content-Type': 'application/json'})
    for attempt in range(3):
        try:
            d = json.load(urllib.request.urlopen(req, timeout=180))
            for part in d['candidates'][0]['content']['parts']:
                data = part.get('inlineData') or part.get('inline_data')
                if data:
                    return base64.b64decode(data['data'])
            raise RuntimeError('no image in response')
        except urllib.error.HTTPError as e:
            msg = e.read()[:300].decode(errors='replace')
            if e.code in (429, 500, 503) and attempt < 2:
                time.sleep(20 * (attempt + 1)); continue
            raise RuntimeError(f'HTTP {e.code}: {msg}')


DATA = os.path.join(ROOT, 'data.js')


def load_book():
    src = open(DATA, encoding='utf-8').read()
    return json.loads(src[src.index('{'):src.rindex('}') + 1])


def save_book(book):
    open(DATA, 'w', encoding='utf-8').write(
        '// Generated from the book document. Edit freely.\nwindow.BOOK = ' + json.dumps(book, ensure_ascii=False, indent=1) + ';\n')


def save_ai(book, r, im):
    im = im.convert('RGB')
    im.thumbnail((1400, 1400))
    out = f'images/{r["id"]}-ai.jpg'
    im.save(os.path.join(ROOT, out), quality=82, optimize=True, progressive=True)
    r['image'], r['ai'] = out, True
    save_book(book)
    print(r['id'], 'saved', out)


def write_prompts():
    book = load_book()
    esc = lambda s: s.replace('&', '&amp;').replace('<', '&lt;')
    rows = ''.join(
        f'<section><h2>{esc(r["title"])}</h2><p>לשמור בשם: <b>{r["id"]}.png</b></p>'
        f'<textarea readonly>{esc(DISH[r["id"]] + " " + STYLE)}</textarea><button>העתקה</button></section>'
        for r in book['recipes'] if r['id'] in DISH and not (r.get('image') and not r.get('ai')))
    html = f'''<!doctype html><html lang="he" dir="rtl"><meta charset="utf-8"><title>פרומפטים לתמונות AI</title>
<style>body{{font:16px/1.5 Arial;max-width:820px;margin:24px auto;padding:0 16px;background:#f8f2e8;color:#3b2a24}}
section{{background:#fff;border-radius:12px;padding:14px 18px;margin:12px 0}}h2{{margin:0;color:#7a2335}}
textarea{{width:100%;height:96px;direction:ltr;font:13px/1.4 monospace}}button{{padding:6px 16px;border-radius:99px;border:0;background:#7a2335;color:#fff;cursor:pointer}}</style>
<h1>תמונות AI למתכונים</h1>
<ol><li>לפתוח את gemini.google.com (או ChatGPT) ולהדביק את הפרומפט.</li>
<li>לשמור את התמונה בשם שמופיע (למשל r16.png) בתיקייה אחת.</li>
<li>להריץ: <code>python tools/ai_images.py --import התיקייה</code> (או לבקש מ-Claude).</li></ol>
{rows}
<script>document.querySelectorAll('button').forEach(b=>b.onclick=()=>{{navigator.clipboard.writeText(b.previousElementSibling.value);b.textContent='הועתק ✓'}})</script>'''
    out = os.path.join(ROOT, 'tools', 'ai-prompts.html')
    open(out, 'w', encoding='utf-8').write(html)
    print('wrote', out)


def import_dir(folder):
    from PIL import Image
    book = load_book()
    by_id = {r['id']: r for r in book['recipes']}
    for f in sorted(os.listdir(folder)):
        rid = os.path.splitext(f)[0].lower().split('-')[0].split(' ')[0]
        if rid in by_id and f.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
            r = by_id[rid]
            if r.get('image') and not r.get('ai'):
                print(rid, 'has a real photo, skipped'); continue
            save_ai(book, r, Image.open(os.path.join(folder, f)))


def main():
    if sys.argv[1:2] == ['--prompts']:
        return write_prompts()
    if sys.argv[1:2] == ['--import']:
        return import_dir(sys.argv[2])
    from PIL import Image
    key = api_key()
    book = load_book()
    wanted = sys.argv[1:] or [r['id'] for r in book['recipes'] if not r.get('image') or r.get('ai')]
    for r in book['recipes']:
        if r['id'] not in wanted or r['id'] not in DISH:
            continue
        if r.get('image') and not r.get('ai'):
            print(r['id'], 'has a real photo, skipped'); continue
        print(r['id'], 'generating…', flush=True)
        try:
            raw = generate(DISH[r['id']] + ' ' + STYLE, key)
        except Exception as e:
            print('  failed:', e); continue
        save_ai(book, r, Image.open(io.BytesIO(raw)))


if __name__ == '__main__':
    main()
