/* स्वयंघोषणापत्र — चतु:सिमा + पिक पेरणी PDF generator
 * Static site (GitHub Pages). PDF libraries are loaded on demand from /vendor.
 */
(function () {
  'use strict';

  // ---------- config ----------
  const CROPS = ['कापूस', 'सोयाबीन'];
  const VILLAGES = ['पिंपळनेर', 'ताडसोन्ना', 'वलीपूर', 'मन्यारवाडी', 'बेलवाडी', 'पटेगाव', 'बोरदेवी', 'सुर्डी (थोट)'];
  const MAXG = 10, MAXR = 6;
  const MD = '०१२३४५६७८९';
  const PAGE_W = 794, PAGE_H = 1123;      // A4 @ 96 dpi
  const PHOTO_MAX = 600;                   // px — photo box is 132×148, so this is plenty for print
  const PDF_SCALE = 2.5;
  const VENDOR = ['vendor/html2canvas.min.js', 'vendor/jspdf.umd.min.js'];

  // ---------- state ----------
  const S = { c_gender: 'm', p_relation: '0', p_season: 'k', rows: [], gats: [], photo: null, mDigits: false };
  const newGat = () => ({ gat: '', area: '', north: '', south: '', east: '', west: '' });

  // ---------- helpers ----------
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const dig = v => S.mDigits ? String(v).replace(/[0-9]/g, d => MD[d]) : String(v);
  const fmtDate = v => { if (!v) return ''; const [y, m, d] = v.split('-'); return `${d}/${m}/${y}`; };
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
  const esc = t => t.replace(/[&<>"]/g, c => ESC[c]);
  const el = (tag, props = {}, kids = []) => {
    const e = document.createElement(tag);
    Object.assign(e, props);
    kids.forEach(k => e.append(k));
    return e;
  };
  const gatNums = () => S.gats.map(g => g.gat.trim()).filter(Boolean);
  const cropName = r => r.crop === '__other' ? r.other : r.crop;

  // ---------- defaults ----------
  const today = new Date();
  const iso = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  S.c_date = iso;
  S.p_year = String(today.getFullYear()).slice(2);
  S.p_occupation = 'शेती';
  $('[data-k="c_date"]').value = iso;
  $('[data-k="p_year"]').value = S.p_year;
  S.gats = [newGat()];
  S.rows = [{ gav: '', autoGav: true, gat: '', autoGat: true, crop: '', other: '', area: '', remark: '' }];

  // ---------- fill a page from state ----------
  function val(k, g) {
    if (k.startsWith('g_')) return dig(g ? (g[k.slice(2)] || '') : '');
    if (k === 'gatList') return dig(gatNums().join(', '));
    let v = S[k] || '';
    if (k.endsWith('_date')) v = fmtDate(v);
    return dig(v);
  }

  function fill(root, g) {
    const cs = root.classList.contains('cs');
    root.querySelectorAll('[data-v]').forEach(e => {
      const t = val(e.dataset.v, g);
      // Hind draws Devanagari digits in Latin shapes, so set them in Mukta on the chatursima page
      if (cs) e.innerHTML = esc(t).replace(/[०-९]+/g, m => `<span class="dvd">${m}</span>`);
      else if (e.textContent !== t) e.textContent = t;
    });
    root.querySelectorAll('[data-opt]').forEach(e => {
      const [k, want] = e.dataset.opt.split(':');
      e.classList.toggle('strike', String(S[k]) !== want);
    });
  }

  // ---------- preview (batched to one paint per frame) ----------
  const csBox = $('#csPages');
  const tplCs = $('#tplCs').content.firstElementChild;
  const ppPage = $('#page-pp');
  const cropBody = $('#cropBody');
  const photoBox = $('#photoBox');
  let lastPhoto;

  function renderNow() {
    // one chatursima page per gat — reuse existing page nodes, add/remove only the difference
    while (csBox.children.length > S.gats.length) csBox.lastElementChild.remove();
    while (csBox.children.length < S.gats.length) {
      const page = tplCs.cloneNode(true);
      csBox.append(el('div', { className: 'pv on' }, [
        el('p', { className: 'pv-label' }),
        el('div', { className: 'sheet-wrap' }, [page])
      ]));
    }
    S.gats.forEach((g, i) => {
      const wrap = csBox.children[i];
      wrap.firstElementChild.textContent = `पान ${i + 1} — चतु:सिमा${g.gat ? ' (गट नं. ' + g.gat + ')' : ''}`;
      fill(wrap.querySelector('.page'), g);
    });

    $('#ppLabel').textContent = `पान ${S.gats.length + 1} — पिक पेरणी`;
    fill(ppPage, null);

    // crop table (min 3 rows)
    const frag = document.createDocumentFragment();
    const n = Math.max(3, S.rows.length);
    for (let i = 0; i < n; i++) {
      const r = S.rows[i] || {};
      const cells = [r.gav || '', dig(r.gat || ''), r.crop ? cropName(r) : '', dig(r.area || ''), r.remark || ''];
      frag.append(el('tr', {}, cells.map(t => el('td', { textContent: t }))));
    }
    cropBody.replaceChildren(frag);

    // photo — only touch the DOM when it changes
    if (S.photo !== lastPhoto) {
      lastPhoto = S.photo;
      if (S.photo) photoBox.replaceChildren(el('img', { src: S.photo, alt: '' }));
      else photoBox.innerHTML = 'पासपोर्ट<br>आकाराचा<br>फोटो';
    }
  }

  let rafId = 0;
  function render() {
    if (rafId) return;
    rafId = requestAnimationFrame(() => { rafId = 0; renderNow(); });
  }
  function flushRender() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    renderNow();
  }

  // ---------- gat cards ----------
  function drawGats() {
    const box = $('#gatList');
    const frag = document.createDocumentFragment();
    S.gats.forEach((g, i) => {
      const inp = (key, label, ph = '', cls = '') => {
        const x = el('input', { value: g[key], placeholder: ph });
        if (key === 'gat') x.inputMode = 'text';
        x.addEventListener('input', () => { g[key] = x.value; if (key === 'gat') syncGat(); render(); });
        return el('label', { className: cls }, [label, x]);
      };
      const del = el('button', { type: 'button', className: 'icon-btn', textContent: '×', disabled: S.gats.length === 1 });
      del.setAttribute('aria-label', `गट ${i + 1} काढा`);
      del.addEventListener('click', () => { S.gats.splice(i, 1); drawGats(); syncGat(); render(); });
      const head = el('div', { className: 'gat-head' }, [el('b', { textContent: `गट ${i + 1}` }), del]);
      const grid = el('div', { className: 'grid' }, [
        inp('gat', 'गट नंबर'), inp('area', 'क्षेत्र (हे.आर)', 'उदा. 1.20'),
        inp('north', 'उत्तर', 'उदा. गट नं. 45 – राम पाटील'), inp('south', 'दक्षिण'),
        inp('east', 'पूर्व'), inp('west', 'पश्चिम', 'उदा. शेत रस्ता')
      ]);
      frag.append(el('div', { className: 'gat-card' }, [head, grid]));
    });
    box.replaceChildren(frag);
    $('#addGat').disabled = S.gats.length >= MAXG;
  }

  $('#addGat').addEventListener('click', () => {
    if (S.gats.length >= MAXG) return;
    S.gats.push(newGat());
    drawGats(); render();
    const cards = $$('#gatList .gat-card');
    cards[cards.length - 1].querySelector('input').focus();
  });

  // ---------- crop rows ----------
  // dropdown + "इतर" manual entry, bound to row[key]
  function pickField(r, key, label, list, otherPh, onChange) {
    const sel = el('select');
    sel.append(el('option', { value: '', textContent: '— निवडा —' }));
    list.forEach(v => sel.append(el('option', { value: v, textContent: v })));
    sel.append(el('option', { value: '__other', textContent: 'इतर' }));
    const isOther = r[key] && !list.includes(r[key]);
    sel.value = isOther ? '__other' : (r[key] || '');
    const other = el('input', { value: isOther ? r[key] : '', placeholder: otherPh, hidden: !isOther });
    sel.addEventListener('change', () => {
      other.hidden = sel.value !== '__other';
      r[key] = sel.value === '__other' ? other.value : sel.value;
      if (onChange) onChange();
      if (!other.hidden) other.focus();
      render();
    });
    other.addEventListener('input', () => { r[key] = other.value; if (onChange) onChange(); render(); });
    return el('label', {}, [label, sel, other]);
  }

  function drawRows() {
    const box = $('#cropRows');
    const frag = document.createDocumentFragment();
    const nums = gatNums();
    S.rows.forEach((r, i) => {
      const txt = (key, label, ph = '') => {
        const x = el('input', { value: r[key], placeholder: ph });
        x.addEventListener('input', () => { r[key] = x.value; render(); });
        return el('label', {}, [label, x]);
      };
      const gavL = pickField(r, 'gav', 'गाव', VILLAGES, 'गावाचे नाव लिहा', () => { r.autoGav = !r.gav; });
      const gatL = pickField(r, 'gat', 'गट नं. (अ.क्र.)', nums, 'गट नंबर लिहा', () => { r.autoGat = !r.gat; });

      const sel = el('select');
      sel.append(el('option', { value: '', textContent: '— निवडा —' }));
      CROPS.forEach(c => sel.append(el('option', { value: c, textContent: c })));
      sel.append(el('option', { value: '__other', textContent: 'इतर' }));
      sel.value = r.crop;
      const other = el('input', { value: r.other, placeholder: 'पिकाचे नाव लिहा', hidden: r.crop !== '__other' });
      sel.addEventListener('change', () => { r.crop = sel.value; other.hidden = sel.value !== '__other'; if (!other.hidden) other.focus(); render(); });
      other.addEventListener('input', () => { r.other = other.value; render(); });
      const cropL = el('label', {}, ['पिकाचे नाव', sel, other]);

      const del = el('button', { type: 'button', className: 'icon-btn', textContent: '×', disabled: S.rows.length === 1 });
      del.setAttribute('aria-label', `ओळ ${i + 1} काढा`);
      del.addEventListener('click', () => { S.rows.splice(i, 1); drawRows(); render(); });
      const head = el('div', { className: 'gat-head' }, [el('b', { textContent: `ओळ ${i + 1}` }), del]);

      frag.append(el('div', { className: 'gat-card' }, [head, el('div', { className: 'grid' }, [
        gavL, gatL, cropL, txt('area', 'क्षेत्र'), el('div', { className: 'full' }, [txt('remark', 'शेरा')])
      ])]));
    });
    box.replaceChildren(frag);
    $('#addRow').disabled = S.rows.length >= MAXR;
  }

  $('#addRow').addEventListener('click', () => {
    if (S.rows.length >= MAXR) return;
    const used = S.rows.map(r => r.gat);
    const nums = gatNums();
    const next = nums.find(x => !used.includes(x)) || nums[0] || '';
    S.rows.push({ gav: S.c_landVillage || '', autoGav: true, gat: next, autoGat: false, crop: '', other: '', area: '', remark: '' });
    drawRows(); render();
  });

  // ---------- auto-fill row village and gat ----------
  let prevLand = '';
  function sync() {
    const land = S.c_landVillage || '';
    if (land === prevLand) return;
    S.rows.forEach(r => { if (r.autoGav !== false && (!r.gav || r.gav === prevLand)) r.gav = land; });
    prevLand = land;
    drawRows();
  }

  // Rows' gat dropdowns depend on the gat list; rebuilding them is debounced
  // so typing in a gat card doesn't rebuild every row on every keystroke.
  let gatTimer = 0;
  function syncGat() {
    const nums = gatNums();
    S.rows.forEach((r, i) => { if (r.autoGat) r.gat = nums[i] || ''; });
    clearTimeout(gatTimer);
    gatTimer = setTimeout(drawRows, 250);
  }

  // ---------- simple inputs ----------
  $$('[data-k]').forEach(inp => {
    inp.addEventListener('input', () => {
      let v = inp.value;
      if (inp.hasAttribute('data-aadhaar')) {
        v = v.replace(/\D/g, '').slice(0, 12).replace(/(\d{4})(?=\d)/g, '$1 ');
        inp.value = v;
      }
      S[inp.dataset.k] = v;
      sync(); render();
    });
  });
  $$('input[type=radio]').forEach(r => r.addEventListener('change', () => { S[r.name] = r.value; render(); }));
  $('#mDigits').addEventListener('change', e => { S.mDigits = e.target.checked; render(); });

  $$('[data-sel]').forEach(sel => {
    const k = sel.dataset.sel;
    const other = $(`[data-other="${k}"]`);
    const apply = () => {
      const isOther = sel.value === '__other';
      other.hidden = !isOther;
      S[k] = isOther ? other.value : sel.value;
      sync(); render();
    };
    sel.addEventListener('change', () => { apply(); if (sel.value === '__other') other.focus(); });
    other.addEventListener('input', apply);
    S[k] = sel.value === '__other' ? '' : sel.value;
  });

  // ---------- photo (downscaled + grayscale) ----------
  function grey(c) {
    const x = c.getContext('2d', { willReadFrequently: true });
    const d = x.getImageData(0, 0, c.width, c.height);
    const a = d.data;
    for (let i = 0; i < a.length; i += 4) {
      const g = (a[i] * 0.299 + a[i + 1] * 0.587 + a[i + 2] * 0.114 + 0.5) | 0;
      a[i] = a[i + 1] = a[i + 2] = g;
    }
    x.putImageData(d, 0, 0);
  }

  $('#photo').addEventListener('change', e => {
    const f = e.target.files[0];
    if (!f) { S.photo = null; render(); return; }
    const url = URL.createObjectURL(f);
    const im = new Image();
    im.onload = () => {
      // Phone photos can be 12+ MP; shrink first so the page stays fast and memory-safe
      const k = Math.min(1, PHOTO_MAX / Math.max(im.naturalWidth, im.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.round(im.naturalWidth * k);
      c.height = Math.round(im.naturalHeight * k);
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      grey(c);
      S.photo = c.toDataURL('image/jpeg', 0.92);
      render();
    };
    im.onerror = () => { URL.revokeObjectURL(url); toast('फोटो उघडता आला नाही'); };
    im.src = url;
  });

  // ---------- scale preview (inherited by every sheet-wrap) ----------
  const stage = $('.stage');
  function fit() {
    const w = stage.clientWidth - 2 * parseFloat(getComputedStyle(stage).paddingLeft);
    stage.style.setProperty('--s', Math.min(1, w / PAGE_W).toFixed(4));
  }
  new ResizeObserver(fit).observe(stage);
  fit();

  // ---------- toast ----------
  let tt;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(tt);
    tt = setTimeout(() => t.classList.remove('show'), 2600);
  }

  // ---------- on-demand PDF libraries ----------
  let libsP = null;
  function loadScript(src) {
    return new Promise((res, rej) => {
      const s = el('script', { src, async: false });
      s.onload = res;
      s.onerror = () => rej(new Error('load failed: ' + src));
      document.head.append(s);
    });
  }
  function loadLibs() {
    if (window.jspdf && window.html2canvas) return Promise.resolve();
    if (!libsP) libsP = Promise.all(VENDOR.map(loadScript)).catch(err => { libsP = null; throw err; });
    return libsP;
  }
  // Warm the cache once the page is idle, so the first click is quick
  const idle = window.requestIdleCallback || (fn => setTimeout(fn, 1500));
  window.addEventListener('load', () => idle(() => loadLibs().catch(() => {})));

  // ---------- PDF ----------
  const allPages = () => $$('.stage .page');

  async function buildPdf(pages) {
    await document.fonts.ready;
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
    const cap = $('#capture');
    for (let i = 0; i < pages.length; i++) {
      const clone = pages[i].cloneNode(true);
      clone.removeAttribute('id');
      cap.replaceChildren(clone);
      const canvas = await html2canvas(clone, {
        scale: PDF_SCALE, backgroundColor: '#ffffff', useCORS: true, logging: false,
        width: PAGE_W, height: PAGE_H, windowWidth: PAGE_W
      });
      grey(canvas);
      if (i > 0) pdf.addPage();
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.93), 'JPEG', 0, 0, 210, 297);
      canvas.width = canvas.height = 0; // free memory early (helps on phones)
    }
    cap.replaceChildren();
    return pdf.output('blob');
  }

  function printPages(pages) {
    const pa = $('#printArea');
    pa.replaceChildren(...pages.map(pg => { const c = pg.cloneNode(true); c.removeAttribute('id'); return c; }));
    try { window.print(); } catch (e) { toast('प्रिंट उपलब्ध नाही'); }
  }

  function saveBlob(blob, filename) {
    const a = el('a', { href: URL.createObjectURL(blob), download: filename });
    document.body.append(a);
    a.click();
    setTimeout(() => { a.remove(); URL.revokeObjectURL(a.href); }, 4000);
  }

  $('#dlBoth').addEventListener('click', async e => {
    const btn = e.currentTarget;
    const label = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'PDF तयार होत आहे…';
    flushRender(); // make sure the preview reflects the latest keystroke
    const pages = allPages();
    try {
      try { await loadLibs(); }
      catch (err) { toast('PDF साधन लोड झाले नाही — इंटरनेट तपासा'); return; }
      const blob = await buildPdf(pages);
      const nm = (S.c_name || '').trim().replace(/[\\/:*?"<>|.]+/g, '').replace(/\s+/g, '_');
      saveBlob(blob, (nm || 'Swayamghoshanapatra') + '.pdf');
      toast('PDF डाउनलोड झाली');
    } catch (err) {
      console.error(err);
      toast('PDF बनवता आली नाही — प्रिंट पर्याय उघडत आहे');
      printPages(pages);
    } finally {
      btn.disabled = false;
      btn.textContent = label;
    }
  });

  // ---------- init ----------
  drawGats(); drawRows(); sync(); renderNow();
})();
