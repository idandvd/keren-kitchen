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

  let state = { q: '', cat: '' };

  /* ---------- home ---------- */
  function home() {
    const tips = B.tips.map(t => `<p class="tip">${esc(t)}</p>`).join('');
    main.innerHTML = `
      <section class="hero">
        <div class="hero-text">
          <h1><span class="heart">♥</span>${esc(B.title)}<span class="heart">♥</span></h1>
          <p class="sub">${esc(B.subtitle)}</p>
          ${ornament}
          <p class="tag">${esc(B.tagline)}</p>
          <div class="hero-links">
            <button class="btn primary" id="toRecipes">לכל המתכונים</button>
            <a class="btn" href="#/about">קרן האהובה והמטבח שלה</a>
          </div>
        </div>
        <figure class="hero-photo">
          <img src="images/keren-kitchen.jpg" alt="קרן רוקדת במטבח שלה">
          <img class="sig" src="images/signature.jpg" alt="קרן בן דוד">
        </figure>
      </section>
      <section id="recipes">
        <div class="toolbar">
          <input class="search" type="search" placeholder="חיפוש מתכון או מצרך…" aria-label="חיפוש" value="${esc(state.q)}">
          <div class="chips" role="group" aria-label="קטגוריות"></div>
        </div>
        <div id="list"></div>
      </section>
      <section class="panels">
        <div class="panel">
          <h2>הטיפים הקטנים של קרן</h2>
          <p class="muted">${esc(B.tipsIntro)}</p>
          ${tips}
        </div>
        <div class="panel">
          <h2>♥ לשמוע את קרן</h2>
          ${B.listen.map(p => `<p>${esc(p)}</p>`).join('')}
          <p style="margin-top:14px"><a class="btn primary" href="${esc(B.listenUrl)}" target="_blank" rel="noopener">להאזנה להקלטה</a></p>
        </div>
      </section>`;
    const search = main.querySelector('.search');
    search.addEventListener('input', () => { state.q = search.value; renderList(); });
    main.querySelector('#toRecipes').onclick = () => main.querySelector('#recipes').scrollIntoView({ behavior: 'smooth' });
    renderChips(); renderList();
  }

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
    const thumb = r.image
      ? `<div class="thumb"><img src="${r.image}" alt="" loading="lazy"></div>`
      : `<div class="thumb empty" aria-hidden="true">♦</div>`;
    return `<a class="card" href="#/recipe/${r.id}">${thumb}<div class="body"><h3>${esc(r.title)}</h3>
      <div class="meta">${r.subtitle ? esc(r.subtitle) : esc(catName[r.category])}</div></div></a>`;
  }

  function renderList() {
    const list = main.querySelector('#list');
    const found = B.recipes.filter(matches);
    if (!found.length) { list.innerHTML = '<p class="empty-state">לא נמצאו מתכונים. נסו מילה אחרת.</p>'; return; }
    list.innerHTML = B.categories.map(c => {
      const rs = found.filter(r => r.category === c.id);
      return rs.length ? `<h2 class="cat-title">${esc(c.name)}</h2><div class="grid">${rs.map(card).join('')}</div>` : '';
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

    main.innerHTML = `
      <div class="crumbs"><a href="#/">מתכונים</a> › <a href="#/" data-cat="${r.category}">${esc(catName[r.category])}</a></div>
      <header class="recipe-head">
        <h1>${esc(r.title)}</h1>
        ${r.subtitle ? `<p class="credit">— ${esc(r.subtitle)} —</p>` : ''}
        ${ornament}
      </header>
      ${r.image ? `<div class="recipe-photo"><img src="${r.image}" alt="${esc(r.title)}"></div>` : ''}
      <div class="actions">
        ${'wakeLock' in navigator ? '<button class="btn" id="wake" aria-pressed="false">☀ שהמסך לא יכבה</button>' : ''}
        <button class="btn" id="reset">↺ ניקוי סימונים</button>
        <button class="btn" id="print">🖨 הדפסה</button>
        ${navigator.share ? '<button class="btn" id="share">שיתוף</button>' : ''}
      </div>
      <div class="recipe-body">
        <section class="box"><h2>את צריכה</h2>${ing}</section>
        <section class="box"><h2>איך מכינים</h2><p class="hint">אפשר ללחוץ על שלב כדי לסמן שסיימת אותו</p>${steps}
          ${r.signoff ? `<p class="signoff">${esc(r.signoff)}</p>` : ''}</section>
      </div>
      <nav class="pager">
        ${prev ? `<a class="prev" href="#/recipe/${prev.id}"><small>→ הקודם</small>${esc(prev.title)}</a>` : ''}
        ${next ? `<a class="next" href="#/recipe/${next.id}"><small>הבא ←</small>${esc(next.title)}</a>` : ''}
      </nav>`;

    main.querySelectorAll('.ingredients input').forEach(cb => cb.addEventListener('change', () => {
      checks[cb.dataset.k] = cb.checked; store.set('ing-' + id, checks);
    }));
    main.querySelectorAll('.steps li[data-s]').forEach(li => li.addEventListener('click', () => {
      li.classList.toggle('done'); done[li.dataset.s] = li.classList.contains('done'); store.set('steps-' + id, done);
    }));
    main.querySelector('.crumbs a[data-cat]').addEventListener('click', () => { state.cat = r.category; state.q = ''; });
    main.querySelector('#reset').onclick = () => {
      store.set('ing-' + id, {}); store.set('steps-' + id, {}); recipe(id);
    };
    main.querySelector('#print').onclick = () => window.print();
    const sh = main.querySelector('#share');
    if (sh) sh.onclick = () => navigator.share({ title: r.title + ' – המטבח של קרן', url: location.href }).catch(() => { });
    const photo = main.querySelector('.recipe-photo');
    if (photo) photo.onclick = () => openLightbox([r.image], 0);
    const wake = main.querySelector('#wake');
    if (wake) {
      wake.setAttribute('aria-pressed', !!wakeLock);
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
    main.innerHTML = `<article class="page">
      <h1>קרן האהובה והמטבח שלה</h1>${ornament}
      <div class="prose">${B.intro.map(p => `<p>${esc(p)}</p>`).join('')}
        <p class="dedication">${esc(B.dedication)}</p></div>
      <p style="text-align:center;margin-top:24px"><a class="btn primary" href="#/">למתכונים</a></p>
    </article>`;
    document.title = 'על קרן – המטבח של קרן';
  }

  function challah() {
    const c = B.challah;
    const body = c.blocks.map(b => b.k === 'h' ? `<h2>${esc(b.t)}</h2>` : b.k === 'note' ? `<p class="note">${esc(b.t)}</p>` : `<p>${esc(b.t)}</p>`).join('');
    main.innerHTML = `<article class="page">
      <h1>${esc(c.title)}</h1><p class="lead">${esc(c.subtitle)}</p>${ornament}
      <div class="challah-photo"><img src="images/challah-hands.jpg" alt="ידיים לשות בצק חלה"></div>
      <div class="prose challah">${body}</div>
      <p style="text-align:center;margin-top:24px"><a class="btn" href="#/recipe/${B.recipes.find(r => r.category === 'baking').id}">למתכון בצק לחלה</a></p>
    </article>`;
    document.title = 'הפרשת חלה – המטבח של קרן';
  }

  function moments() {
    main.innerHTML = `<article class="page" style="max-width:960px">
      <h1>♥ רגעים של קרן במטבח ♥</h1>${ornament}
      <div class="gallery">${B.gallery.map((src, i) => `<button data-i="${i}" aria-label="הגדלת תמונה ${i + 1}"><img src="${src}" alt="" loading="lazy"></button>`).join('')}</div>
      ${ornament}
      <div class="closing">${B.closing.map(p => `<p>${esc(p)}</p>`).join('')}</div>
      ${ornament}
    </article>`;
    main.querySelector('.gallery').onclick = e => {
      const b = e.target.closest('button'); if (b) openLightbox(B.gallery, +b.dataset.i);
    };
    document.title = 'רגעים – המטבח של קרן';
  }

  function notFound() {
    main.innerHTML = `<div class="page"><h1>לא מצאנו את הדף</h1><p style="text-align:center"><a class="btn" href="#/">חזרה לדף הבית</a></p></div>`;
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
    window.scrollTo(0, onHome ? homeScroll : 0);
  }
  window.addEventListener('hashchange', route);
  route();
})();
