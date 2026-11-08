(() => {
  const B = window.BOOK;
  const main = document.getElementById('main');
  const catName = Object.fromEntries(B.categories.map(c => [c.id, c.name]));
  const byId = Object.fromEntries(B.recipes.map(r => [r.id, r]));

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // strip niqqud and quote marks so "תפוא" finds 'תפו"א'
  const norm = s => s.normalize('NFD').replace(/[֑-ׇ]/g, '').replace(/["'״׳\-–]/g, '').toLowerCase();
  const ornament = '<div class="ornament" aria-hidden="true"><span></span>♦<span></span></div>';
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch { return {}; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } }
  };

  /* ---------- line icons ---------- */
  const svg = (d, cls = 'ico') => `<svg class="${cls}" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const ICON = {
    salads: '<path d="M6 24h36c0 9-8 16-18 16S6 33 6 24z"/><path d="M17 23c-3-5-1-11 5-13 2 5 0 10-5 13z"/><path d="M26 23c1-5 5-9 11-9-1 5-5 9-11 9z"/><circle cx="31" cy="20" r="2.5"/><path d="M18 40h12"/>',
    mains: '<path d="M9 20h30"/><path d="M12 20v13a6 6 0 0 0 6 6h12a6 6 0 0 0 6-6V20"/><path d="M12 25H7M36 25h5"/><path d="M21 16h6"/><path d="M18 12c-2-2 2-4 0-6M24 12c-2-2 2-4 0-6M30 12c-2-2 2-4 0-6"/>',
    baking: '<path d="M7 31c0-8 8-14 17-14s17 6 17 14v3a4 4 0 0 1-4 4H11a4 4 0 0 1-4-4z"/><path d="M16 23l4 6M23 21l4 6M30 23l4 5"/>',
    desserts: '<path d="M8 27h32v11H8z"/><path d="M8 27c0-6 7-10 16-10s16 4 16 10"/><path d="M8 32c3 2 5 2 8 0s5-2 8 0 5 2 8 0 5-2 8 0"/><path d="M24 17v-6"/><path d="M24 9c-2-2 0-4 0-5 0 1 2 3 0 5z"/>',
    sun: '<circle cx="24" cy="24" r="7"/><path d="M24 6v5M24 37v5M6 24h5M37 24h5M11 11l3.5 3.5M33.5 33.5 37 37M11 37l3.5-3.5M33.5 14.5 37 11"/>',
    reset: '<path d="M10 24a14 14 0 1 0 4-10"/><path d="M10 8v8h8"/>',
    print: '<path d="M14 18V7h20v11"/><rect x="7" y="18" width="34" height="14" rx="3"/><path d="M14 28h20v13H14z"/>',
    share: '<circle cx="35" cy="12" r="5"/><circle cx="13" cy="24" r="5"/><circle cx="35" cy="36" r="5"/><path d="M17.5 21.5l13-7M17.5 26.5l13 7"/>',
    play: '<circle cx="24" cy="24" r="18"/><path d="M20 16l12 8-12 8z"/>',
    arrow: '<path d="M30 12 18 24l12 12"/>'
  };
  const CAT_BLURB = {
    salads: 'צבעוניים, טריים ומהירים – בדיוק לשולחן של שישי',
    mains: 'הסירים שמילאו את הבית בריחות של שבת',
    baking: 'בצק אחד גדול, והרבה חלות',
    desserts: 'העוגות שכולם תמיד ביקשו את המתכון שלהן'
  };

  let state = { q: '', cat: '' };

  /* ---------- home ---------- */
  function home() {
    const withPhotos = B.recipes.filter(r => r.image).length;
    main.innerHTML = `
      <section class="hero">
        <div class="hero-text">
          <p class="eyebrow">ספר מתכונים משפחתי</p>
          <h1>המטבח של קרן</h1>
          <p class="sub">${esc(B.subtitle)}</p>
          ${ornament}
          <p class="tag">${esc(B.tagline)}</p>
          <div class="hero-links">
            <button class="btn primary" id="toRecipes">לכל המתכונים</button>
            <a class="btn ghost" href="#/about">קרן האהובה והמטבח שלה</a>
          </div>
          <dl class="stats">
            <div><dt>${B.recipes.length}</dt><dd>מתכונים</dd></div>
            <div><dt>${B.categories.length}</dt><dd>פרקים</dd></div>
            <div><dt>${withPhotos}</dt><dd>תמונות מהמטבח</dd></div>
          </dl>
        </div>
        <figure class="hero-photo">
          <img src="images/keren-kitchen.jpg" alt="קרן רוקדת במטבח שלה" width="900" height="1200">
          <img class="sig" src="images/signature.jpg" alt="קרן בן דוד">
        </figure>
      </section>

      <section class="cats" aria-label="פרקי הספר">
        ${B.categories.map(c => `<button class="cat-tile" data-cat="${c.id}" style="--c:var(--${c.id});--cs:var(--${c.id}-soft)">
          ${svg(ICON[c.id])}<span class="name">${esc(c.name)}</span>
          <span class="count">${B.recipes.filter(r => r.category === c.id).length} מתכונים</span></button>`).join('')}
      </section>

      <blockquote class="pull">
        <p>${esc(B.intro[1])}</p>
        <a href="#/about">להמשך קריאה</a>
      </blockquote>

      <section id="recipes">
        <div class="toolbar">
          <div class="search-wrap">
            <svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
            <input class="search" type="search" placeholder="חיפוש מתכון או מצרך… (למשל: שמנת, פפריקה)" aria-label="חיפוש" value="${esc(state.q)}">
          </div>
          <div class="chips" role="group" aria-label="סינון לפי פרק"></div>
        </div>
        <div id="list"></div>
      </section>

      <section class="panels">
        <div class="panel tips">
          <h2>הטיפים הקטנים של קרן</h2>
          <p class="muted">${esc(B.tipsIntro)}</p>
          ${B.tips.map(t => `<p class="tip">${esc(t)}</p>`).join('')}
        </div>
        <div class="panel listen">
          <img class="avatar" src="${B.portrait}" alt="קרן מחייכת">
          <h2>לשמוע את קרן</h2>
          <p>${esc(B.listen[0])}</p>
          <p class="muted">${esc(B.listen[2])}</p>
          <a class="btn primary" href="${esc(B.listenUrl)}" target="_blank" rel="noopener">${svg(ICON.play)}להאזנה להקלטה</a>
        </div>
      </section>

      <section class="moments-strip">
        <div class="strip-head"><h2>רגעים של קרן במטבח</h2><a href="#/moments">לכל התמונות ←</a></div>
        <a class="strip" href="#/moments" aria-label="לגלריית התמונות">
          ${B.gallery.slice(0, 6).map(s => `<img src="${s}" alt="" loading="lazy">`).join('')}
        </a>
      </section>`;

    const search = main.querySelector('.search');
    search.addEventListener('input', () => { state.q = search.value; renderList(); });
    main.querySelector('#toRecipes').onclick = () => scrollToList();
    main.querySelector('.cats').onclick = e => {
      const b = e.target.closest('.cat-tile'); if (!b) return;
      state.cat = b.dataset.cat; renderChips(); renderList(); scrollToList();
    };
    renderChips(); renderList();
  }
  const scrollToList = () => main.querySelector('#recipes').scrollIntoView({ behavior: 'smooth' });

  function matches(r) {
    if (state.cat && r.category !== state.cat) return false;
    if (!state.q.trim()) return true;
    const hay = norm([r.title, r.subtitle, ...r.ingredients.flatMap(g => g.items)].join(' '));
    return norm(state.q).split(/\s+/).filter(Boolean).every(w => hay.includes(w));
  }

  function renderChips() {
    const box = main.querySelector('.chips');
    const all = [{ id: '', name: 'הכל' }, ...B.categories];
    box.innerHTML = all.map(c => {
      const n = B.recipes.filter(r => !c.id || r.category === c.id).length;
      return `<button class="chip" data-cat="${c.id}" aria-pressed="${state.cat === c.id}">${esc(c.name)}<span class="n">${n}</span></button>`;
    }).join('');
    box.onclick = e => {
      const b = e.target.closest('.chip'); if (!b) return;
      state.cat = b.dataset.cat; renderChips(); renderList();
    };
  }

  function card(r) {
    const steps = r.steps.reduce((n, g) => n + g.items.length, 0);
    const ings = r.ingredients.reduce((n, g) => n + g.items.length, 0);
    const thumb = r.image
      ? `<div class="thumb"><img src="${r.image}" alt="" loading="lazy"></div>`
      : `<div class="thumb art" aria-hidden="true">${svg(ICON[r.category])}</div>`;
    return `<a class="card" href="#/recipe/${r.id}" style="--c:var(--${r.category});--cs:var(--${r.category}-soft)">${thumb}
      <div class="body"><h3>${esc(r.title)}</h3>
      ${r.subtitle ? `<div class="credit">${esc(r.subtitle)}</div>` : ''}
      <div class="meta">${ings} מצרכים · ${steps} שלבים</div></div></a>`;
  }

  function renderList() {
    const list = main.querySelector('#list');
    const found = B.recipes.filter(matches);
    if (!found.length) { list.innerHTML = '<p class="empty-state">לא נמצאו מתכונים. נסו מילה אחרת.</p>'; return; }
    list.innerHTML = B.categories.map(c => {
      const rs = found.filter(r => r.category === c.id);
      return rs.length ? `<div class="cat-block" style="--c:var(--${c.id});--cs:var(--${c.id}-soft)">
        <header class="cat-head">${svg(ICON[c.id])}<div><h2>${esc(c.name)}</h2><p>${esc(CAT_BLURB[c.id])}</p></div><span class="count">${rs.length}</span></header>
        <div class="grid">${rs.map(card).join('')}</div></div>` : '';
    }).join('');
  }

  /* ---------- recipe ---------- */
  // "בסיס: תטחני..." → bold prefix
  const stepHtml = t => {
    const m = t.match(/^([^:]{2,12}):\s(.+)$/);
    return m ? `<b>${esc(m[1])}:</b> ${esc(m[2])}` : esc(t);
  };

  function recipe(id) {
    const r = byId[id];
    if (!r) return notFound();
    const sib = B.recipes.filter(x => x.category === r.category);
    const idx = B.recipes.indexOf(r);
    const prev = B.recipes[idx - 1], next = B.recipes[idx + 1];
    const checks = store.get('ing-' + id), done = store.get('steps-' + id);
    let k = 0, s = 0;
    const ing = r.ingredients.map(g => `${g.title ? `<h3>${esc(g.title)}</h3>` : ''}<ul class="ingredients">${g.items.map(it => {
      const key = k++;
      return `<li><label><input type="checkbox" data-k="${key}" ${checks[key] ? 'checked' : ''}><span>${esc(it)}</span></label></li>`;
    }).join('')}</ul>`).join('');
    const steps = r.steps.map(g => `${g.title ? `<h3>${esc(g.title)}</h3>` : ''}<ol class="steps">${g.items.map(it => {
      if (/^\(.*\)$/.test(it)) return `<li class="note">${esc(it)}</li>`;
      const key = s++;
      return `<li data-s="${key}" class="${done[key] ? 'done' : ''}">${stepHtml(it)}</li>`;
    }).join('')}</ol>`).join('');
    const totalIng = k;
    const pics = r.image ? [r.image, ...(r.photos || [])] : [];

    main.innerHTML = `
      <article class="recipe" style="--c:var(--${r.category});--cs:var(--${r.category}-soft)">
      <a class="back" href="#/">${svg(ICON.arrow)} לכל המתכונים</a>
      <header class="recipe-head">
        <div class="recipe-title">
          <a class="pill" href="#/" data-cat="${r.category}">${svg(ICON[r.category])}${esc(catName[r.category])}</a>
          <h1>${esc(r.title)}</h1>
          ${r.subtitle ? `<p class="credit">${esc(r.subtitle)}</p>` : ''}
          <p class="meta">${totalIng} מצרכים · ${s} שלבים · מתכון ${sib.indexOf(r) + 1} מתוך ${sib.length} בפרק</p>
          <div class="actions">
            ${'wakeLock' in navigator ? `<button class="btn small" id="wake" aria-pressed="false">${svg(ICON.sun)}שהמסך לא יכבה</button>` : ''}
            <button class="btn small" id="print">${svg(ICON.print)}הדפסה</button>
            ${navigator.share ? `<button class="btn small" id="share">${svg(ICON.share)}שיתוף</button>` : ''}
          </div>
        </div>
        ${pics.length ? `<div class="recipe-photos">
            <button class="recipe-photo" data-i="0" aria-label="הגדלת התמונה"><img src="${pics[0]}" alt="${esc(r.title)}"></button>
            ${pics.length > 1 ? `<div class="more-photos">${pics.slice(1).map((p, i) => `<button data-i="${i + 1}" aria-label="תמונה נוספת"><img src="${p}" alt=""></button>`).join('')}</div>` : ''}
          </div>`
          : `<div class="recipe-art" aria-hidden="true">${svg(ICON[r.category])}</div>`}
      </header>
      <div class="recipe-body">
        <section class="box ing-box">
          <div class="box-head"><h2>את צריכה</h2><span class="progress" aria-live="polite"></span></div>
          ${ing}
          <button class="link-btn" id="reset">${svg(ICON.reset)}ניקוי סימונים</button>
        </section>
        <section class="box">
          <div class="box-head"><h2>איך מכינים</h2></div>
          <p class="hint">לחיצה על שלב מסמנת שסיימת אותו</p>
          ${steps}
          ${r.signoff ? `<p class="signoff">${esc(r.signoff)}</p>` : ''}
        </section>
      </div>
      <nav class="pager">
        ${prev ? `<a class="prev" href="#/recipe/${prev.id}"><small>→ המתכון הקודם</small>${esc(prev.title)}</a>` : '<span></span>'}
        ${next ? `<a class="next" href="#/recipe/${next.id}"><small>המתכון הבא ←</small>${esc(next.title)}</a>` : ''}
      </nav>
      </article>`;

    const progress = main.querySelector('.progress');
    const syncProgress = () => {
      const n = main.querySelectorAll('.ingredients input:checked').length;
      progress.textContent = n ? `${n} / ${totalIng}` : '';
      progress.classList.toggle('full', n === totalIng);
    };
    syncProgress();
    main.querySelectorAll('.ingredients input').forEach(cb => cb.addEventListener('change', () => {
      checks[cb.dataset.k] = cb.checked; store.set('ing-' + id, checks); syncProgress();
    }));
    main.querySelectorAll('.steps li[data-s]').forEach(li => li.addEventListener('click', () => {
      li.classList.toggle('done'); done[li.dataset.s] = li.classList.contains('done'); store.set('steps-' + id, done);
    }));
    main.querySelector('.pill').addEventListener('click', () => { state.cat = r.category; state.q = ''; });
    main.querySelector('#reset').onclick = () => { store.set('ing-' + id, {}); store.set('steps-' + id, {}); recipe(id); };
    main.querySelector('#print').onclick = () => window.print();
    const sh = main.querySelector('#share');
    if (sh) sh.onclick = () => navigator.share({ title: r.title + ' – המטבח של קרן', url: location.href }).catch(() => { });
    const photos = main.querySelector('.recipe-photos');
    if (photos) photos.onclick = e => { const b = e.target.closest('button'); if (b) openLightbox(pics, +b.dataset.i); };
    const wake = main.querySelector('#wake');
    if (wake) {
      syncWake();
      wake.onclick = async () => {
        if (wakeLock) { await wakeLock.release(); wakeLock = null; }
        else { try { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; syncWake(); }); } catch { } }
        syncWake();
      };
    }
    document.title = r.title + ' – המטבח של קרן';
  }
  let wakeLock = null;
  const syncWake = () => { const w = document.getElementById('wake'); if (w) w.setAttribute('aria-pressed', !!wakeLock); };

  /* ---------- other pages ---------- */
  function about() {
    const I = B.intro;
    const paras = [[0, 1, 2], [3, 4], [5, 6], [7], [8, 9]].map(g => `<p>${g.map(i => esc(I[i])).join(' ')}</p>`).join('');
    main.innerHTML = `<article class="page letter">
      <figure class="letter-photo"><img src="${B.aboutPhoto}" alt="קרן במטבח עם צרור עשבי תיבול"></figure>
      <h1>קרן האהובה<br>והמטבח שלה</h1>${ornament}
      <div class="prose">${paras}
        <div class="editor-note">${I.slice(10).map(p => `<p>${esc(p)}</p>`).join('')}</div>
        <p class="dedication">${esc(B.dedication)}</p></div>
      <p class="center"><a class="btn primary" href="#/">למתכונים של קרן</a></p>
    </article>`;
    document.title = 'על קרן – המטבח של קרן';
  }

  function challah() {
    const c = B.challah;
    const body = c.blocks.map(b => b.k === 'h' ? `<h2>${esc(b.t)}</h2>` : b.k === 'note' ? `<p class="note">${esc(b.t)}</p>` : `<p>${esc(b.t)}</p>`).join('');
    main.innerHTML = `<article class="page">
      <h1>${esc(c.title)}</h1><p class="lead">${esc(c.subtitle)}</p>${ornament}
      <div class="prose challah" style="--photo:url('${B.challahBg}')"><div class="challah-text">${body}</div></div>
      <p class="center"><a class="btn" href="#/recipe/${B.recipes.find(r => r.category === 'baking').id}">למתכון בצק לחלה</a></p>
    </article>`;
    document.title = 'הפרשת חלה – המטבח של קרן';
  }

  function moments() {
    main.innerHTML = `<article class="page wide">
      <h1>רגעים של קרן במטבח</h1>${ornament}
      <div class="gallery">${B.gallery.map((src, i) => `<button data-i="${i}" aria-label="הגדלת תמונה ${i + 1}"><img src="${src}" alt="" loading="lazy"></button>`).join('')}</div>
      <div class="closing">${ornament}${B.closing.map(p => `<p>${esc(p)}</p>`).join('')}<span class="heart">♥</span></div>
    </article>`;
    main.querySelector('.gallery').onclick = e => {
      const b = e.target.closest('button'); if (b) openLightbox(B.gallery, +b.dataset.i);
    };
    document.title = 'רגעים – המטבח של קרן';
  }

  function notFound() {
    main.innerHTML = `<div class="page"><h1>לא מצאנו את הדף</h1><p class="center"><a class="btn" href="#/">חזרה לדף הבית</a></p></div>`;
  }

  /* ---------- lightbox ---------- */
  const lb = document.getElementById('lightbox'), lbImg = lb.querySelector('img');
  let lbList = [], lbI = 0;
  function openLightbox(list, i) { lbList = list; lbI = i; showLb(); lb.hidden = false; lb.querySelector('.lb-close').focus(); }
  function showLb() {
    lbImg.src = lbList[lbI];
    lb.querySelector('.lb-prev').hidden = lb.querySelector('.lb-next').hidden = lbList.length < 2;
  }
  const step = d => { lbI = (lbI + d + lbList.length) % lbList.length; showLb(); };
  lb.querySelector('.lb-close').onclick = () => lb.hidden = true;
  lb.querySelector('.lb-prev').onclick = () => step(-1);
  lb.querySelector('.lb-next').onclick = () => step(1);
  lb.onclick = e => { if (e.target === lb) lb.hidden = true; };
  document.addEventListener('keydown', e => {
    if (lb.hidden) return;
    if (e.key === 'Escape') lb.hidden = true;
    if (e.key === 'ArrowRight') step(-1);
    if (e.key === 'ArrowLeft') step(1);
  });

  /* ---------- router ---------- */
  let homeScroll = 0, onHome = false;
  function route() {
    const [, page, arg] = location.hash.replace(/^#\/?/, '/').split('/');
    if (onHome) homeScroll = window.scrollY;
    onHome = !page;
    document.title = 'המטבח של קרן';
    if (!page) home();
    else if (page === 'recipe') recipe(arg);
    else if (page === 'about') about();
    else if (page === 'challah') challah();
    else if (page === 'moments') moments();
    else notFound();
    document.querySelectorAll('[data-nav]').forEach(a => a.classList.toggle('active',
      a.dataset.nav === (page || 'home') || (page === 'recipe' && a.dataset.nav === 'home')));
    main.classList.remove('enter'); void main.offsetWidth; main.classList.add('enter');
    window.scrollTo(0, onHome ? homeScroll : 0);
  }
  window.addEventListener('hashchange', route);
  route();
})();
