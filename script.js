/* =========================================================
   도욱 — script.js
   1) 화면 전환(주소 끝 #이름)
   2) 첫 화면 · 디자인 · 교육 · 노래: 같은 얼굴. 첫 화면에서는 로고가 커서, 주제에 들어가면 로고가 주제 옆에 고정
   3) 목록 · 나에 대해서 · 작업/수업 하나 · 소식지(첫 화면 쪽지와 보관함)
   4) 이스터에그, 편집 모드 (맨 아래)
   글과 목록은 모두 content/data.js(window.SITE)에서 읽는다.
   ========================================================= */

/* ===== 조절하기 쉬운 값 ===== */
const SECRET_CLICKS = 5;   // 얼굴을 몇 번 연속 눌러야 불안 페이지가 열리는지
const SECRET_GAP = 600;    // 연속 클릭으로 인정하는 간격(ms)
const LONG_PRESS = 450;    // 휴대폰: 꾹 누르는 시간(ms)
const LIFT = 56;           // 휴대폰: 손가락에서 로고 중심까지 위로 띄우는 거리(px)
const LOGO_W = 80.4;       // 로고 폭(대지 단위)

const SITE = window.SITE;
const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const brs = (s) => esc(s).replaceAll('\n', '<br>');          // 글 속 \n = 줄바꿈(세로 글에서는 다음 줄)
// 편집할 수 있는 글 조각: data-edit에 SITE 안의 위치를 적어 둔다 (예: design.0.desc)
// 설명문(.long): \n으로 나눈 한 줄(문장)을 한 덩어리로 두고, 넘치면 줄 길이를 고르게 나눠 끝에 한 단어만 남지 않게 한다
const lines = (s, fmt = esc) => String(s ?? '').split('\n').map((t) => `<span class="ln">${t ? fmt(t) : '<br>'}</span>`).join('');
const ed = (path, text, tag = 'span', cls = '') =>
  `<${tag}${cls ? ` class="${cls}"` : ''} data-edit="${path}">${/\blong\b/.test(cls) ? lines(text) : brs(text)}</${tag}>`;
const getPath = (path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), SITE);

// 설명 속 [글자]는 링크가 된다(그 작업의 첫 링크 주소로). 편집 중에는 [ ]가 그대로 보인다.
const linkify = (html, url) => html.replace(/\[([^\]]+)\]/g, (m, t) =>
  url ? `<a href="${esc(url)}" target="_blank" rel="noopener">${t}</a>` : t);
const richHTML = (text, url, long) => long ? lines(text, (t) => linkify(esc(t), url)) : linkify(brs(text), url);
const rich = (path, text, url, tag = 'p', cls = '') =>
  `<${tag} class="${cls}" data-edit="${path}" data-rich="${esc(url || '')}">${richHTML(text, url, /\blong\b/.test(cls))}</${tag}>`;
function paintRich(editing) {
  document.querySelectorAll('[data-rich]').forEach((el) => {
    const t = getPath(el.dataset.edit) || '';
    el.innerHTML = editing ? brs(t) : richHTML(t, el.dataset.rich, el.classList.contains('long'));
  });
  document.querySelectorAll('[data-vt]').forEach((el) => {
    let t = getPath(el.dataset.edit) || '';
    if (el.dataset.flat && !editing) t = t.replace(/\n/g, ' ');   // 고정 제목: 한 줄로 이어 쓰고 길면 알아서 다음 줄로
    el.classList.toggle('v-raw', editing);
    el.innerHTML = editing ? brs(t) : vt(t, +el.dataset.vt || Infinity, !!el.dataset.flat);
  });
}

/* 세로쓰기: 글자를 한 자씩 쌓는다. \n은 다음 줄(오른쪽 열), maxEm을 넘으면 띄어쓰기에서 다음 줄로 */
const VCH = 1.028, VSP = 0.2545;
const vlen = (w) => [...w].length * VCH;
// 세로쓰기의 마침표는 고리점, 쉼표는 모점으로: 마지막 글자 오른쪽 아래(다음 칸 오른쪽 위)에 원을 그린다. 글자는 '.' 그대로 둬서 복사하면 마침표로 나온다
const vcell = (ch) => ch === ' ' ? '<i class="sp"></i>'
  : ch === '.' ? '<i class="pd">.</i>'
  : ch === ',' ? '<i class="pd cm">,</i>'
  : /[()[\]{}<>〈〉《》「」『』]/.test(ch) ? `<i class="rt">${esc(ch)}</i>` : `<i>${esc(ch)}</i>`;
function vwrap(line, maxEm) {
  const cols = [];
  let cur = '', h = 0;
  for (const word of line.split(' ')) {
    const add = (cur ? VSP : 0) + vlen(word);
    if (cur && h + add > maxEm) { cols.push(cur); cur = word; h = vlen(word); }
    else { cur += (cur ? ' ' : '') + word; h += add; }
  }
  cols.push(cur);
  return cols;
}
// balance: 한 줄이 넘쳐 여러 열로 나뉠 때, 열 수는 그대로 두고 열 길이를 고르게(마지막 열에 한두 단어만 남지 않게)
function vt(text, maxEm = Infinity, balance = false) {
  const cols = [];
  for (const line of String(text ?? '').split('\n')) {
    let c = vwrap(line, maxEm);
    if (balance && c.length > 1) {
      let lo = Math.max(...line.split(' ').map(vlen)), hi = maxEm;
      for (let k = 0; k < 20; k++) { const mid = (lo + hi) / 2; if (vwrap(line, mid).length > c.length) lo = mid; else hi = mid; }
      c = vwrap(line, hi);
    }
    cols.push(...c);
  }
  return cols.map((c) => `<span class="vc">${[...c].map(vcell).join('')}</span>`).join('');
}
// 편집할 수 있는 세로 글
const edv = (path, text, tag, cls, maxEm = 0) =>
  `<${tag} class="${cls}" data-edit="${path}" data-vt="${maxEm || ''}">${vt(text, maxEm || Infinity)}</${tag}>`;

// 2026.06–07 → ['Jun 26 –', 'Jul 26'],  2026.10.14 → ['Oct 26']
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function monthYear(period) {
  const m = String(period).match(/^(\d{4})\.(\d{1,2})(?:\.\d{1,2})?(?:\s*[–-]\s*(?:(\d{4})\.)?(\d{1,2}))?/);
  if (!m) return esc(period);
  const yy = m[1].slice(2);
  const a = `${MON[+m[2] - 1]} ${yy}`;
  if (!m[4]) return a;
  return `${a} –<br>${MON[+m[4] - 1]} ${(m[3] || m[1]).slice(2)}`;
}

/* ---------- 대지 단위(px) ---------- */
const portrait = matchMedia('(max-aspect-ratio: 1/1)');
const artW = () => (portrait.matches ? 1080 : 1920);
function unit() {   // 대지 1단위가 화면에서 몇 px인지
  const b = document.querySelector('.view:not([hidden]) .board') || document.querySelector('.board');
  return b.getBoundingClientRect().width / artW();
}
function sizeCursor() { cursor.style.setProperty('--cw', `${LOGO_W * unit()}px`); }

/* =========================================================
   첫 화면 · 디자인 · 교육 · 노래
   ========================================================= */
const hero = $('#hero');
const face = $('#hm-face');
const cursor = $('#hm-cursor');
const pin = $('#pin');
let mode = 'home';
let view = 'hero';

function renderHead(m) {
  const h = SITE.heads[m] || SITE.heads.home;
  $('#hero-ko').innerHTML = edv(`heads.${m}.ko`, h.ko, 'span', 'v v40');
  $('#hero-en').innerHTML = ed(`heads.${m}.en`, h.en);
}

/* ---------- 목록 ---------- */
function renderList(m) {
  const list = $('#list');
  if (m === 'design') {
    list.innerHTML = SITE.design.map((w, i) => `
      <article class="row">
        ${edv(`design.${i}.ko`, w.ko || w.title, 'h2', 'row-ko v v28')}
        <p class="row-date en t28">${monthYear(w.period)}</p>
        ${ed(`design.${i}.en`, w.en || '', 'p', 'row-en en t28')}
        <div class="row-media">
          <a class="row-thumb" href="#work-${i}" aria-label="${esc(w.title)} 자세히 보기"><img src="assets/design/${esc(w.cover)}" alt="${esc(w.title)}" loading="lazy"></a>
          <a class="row-go" href="#work-${i}"><span class="v v28">${vt('자세히 보기')}</span><span class="en t30">view</span></a>
        </div>
      </article>`).join('');
  } else if (m === 'education') {
    list.innerHTML = SITE.education.map((l, i) => `
      <article class="row">
        ${edv(`education.${i}.ko`, l.ko || l.title, 'h2', 'row-ko v v28')}
        <p class="row-date en t28">${monthYear(l.date)}</p>
        ${ed(`education.${i}.en`, l.en || '', 'p', 'row-en en t28')}
        <div class="row-media">
          <a class="row-thumb" href="#lesson-${i}" aria-label="${esc(l.title)} 자세히 보기"><img src="assets/edu/${esc(l.cover || l.images[0].src)}" alt="${esc(l.title)} 표지" loading="lazy"></a>
          <a class="row-go" href="#lesson-${i}"><span class="v v28">${vt('자세히 보기')}</span><span class="en t30">view</span></a>
        </div>
      </article>`).join('');
  } else if (m === 'singing') {
    const tpl = $('#ear-row-tpl').innerHTML;
    list.innerHTML = SITE.songs.map((s, i) => `
      <article class="song">
        <div class="song-head">
          ${edv(`songs.${i}.ko`, s.ko || s.title, 'h2', 'song-ko v v28')}
          <p class="song-artist">${ed(`songs.${i}.artist`, s.artist, 'span', 'ko t28')}${ed(`songs.${i}.artistEn`, s.artistEn || '', 'span', 'en t28')}</p>
        </div>
        <p class="song-en en t28">${ed(`songs.${i}.en`, s.en || s.title)}${s.with ? `<span class="with">with ${ed(`songs.${i}.with`, s.with)}</span>` : ''}</p>
        <div class="song-ear">${tpl}</div>
        <button class="song-go" type="button" aria-pressed="false" aria-label="${esc(s.en || s.title)} 들어보기"><span class="v v28">${vt('들어보기')}</span><span class="en t30">Listen</span></button>
        <audio preload="none" src="assets/audio/${esc(s.file)}"></audio>
      </article>`).join('');
    list.querySelectorAll('.song').forEach((row) => {
      const btn = row.querySelector('.song-go');
      const au = row.querySelector('audio');
      btn.addEventListener('click', () => {
        const on = btn.getAttribute('aria-pressed') === 'true';
        stopAllSongs();
        if (on) return;
        btn.setAttribute('aria-pressed', 'true');
        row.classList.add('is-playing');
        hero.classList.add('is-listening');
        au.play().catch(() => stopAllSongs());
      });
      au.addEventListener('ended', stopAllSongs);
    });
  } else {
    list.innerHTML = '';
  }
}
function stopAllSongs() {
  document.querySelectorAll('.song').forEach((row) => {
    const au = row.querySelector('audio');
    au.pause(); au.currentTime = 0;
    row.classList.remove('is-playing');
    row.querySelector('.song-go').setAttribute('aria-pressed', 'false');
  });
  hero.classList.remove('is-listening');
}

/* ---------- 로고 커서 (첫 화면) ---------- */
let curX = null, curY = null;     // 로고 위치(화면 좌표). 없으면 null
const homeOn = () => view === 'hero' && mode === 'home';

function moveCursor(x, y) {
  curX = x; curY = y;
  cursor.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
  cursor.classList.add('is-on');
}
function hideCursor() { curX = curY = null; cursor.classList.remove('is-on'); }

const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
window.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse' || !finePointer.matches || !homeOn()) return;
  moveCursor(e.clientX, e.clientY);
});
document.documentElement.addEventListener('mouseleave', hideCursor);
window.addEventListener('blur', hideCursor);

// 휴대폰: 꾹 누르면 손가락 위에 로고 → 끌면 따라옴 → 놓으면 로고 자리를 누른다
let pressTimer = null, pressing = false, sx = 0, sy = 0;
const editing = () => document.body.classList.contains('is-editing');
document.addEventListener('touchstart', (e) => {
  if (!homeOn() || e.touches.length !== 1 || editing()) return;
  sx = e.touches[0].clientX; sy = e.touches[0].clientY;
  clearTimeout(pressTimer);
  pressTimer = setTimeout(() => {
    pressTimer = null;
    pressing = true;
    if (navigator.vibrate) navigator.vibrate(8);
    moveCursor(sx, sy - LIFT);
  }, LONG_PRESS);
}, { passive: true });
document.addEventListener('touchmove', (e) => {
  const t = e.touches[0];
  if (pressing) { e.preventDefault(); moveCursor(t.clientX, t.clientY - LIFT); return; }
  if (pressTimer && Math.hypot(t.clientX - sx, t.clientY - sy) > 10) { clearTimeout(pressTimer); pressTimer = null; }
}, { passive: false });
function endPress(e, fire) {
  clearTimeout(pressTimer); pressTimer = null;
  if (!pressing) return;
  pressing = false;
  if (e.cancelable) e.preventDefault();             // 손가락 밑이 아니라 로고 자리를 누르게
  const el = fire && curX !== null ? document.elementFromPoint(curX, curY) : null;
  const hit = el && el.closest('a, button');
  if (hit) hit.click();
  setTimeout(() => { if (homeOn()) hideCursor(); }, 700);
}
document.addEventListener('touchend', (e) => endPress(e, true), { passive: false });
document.addEventListener('touchcancel', (e) => endPress(e, false));
document.addEventListener('contextmenu', (e) => { if (homeOn() && !editing()) e.preventDefault(); });

/* ---------- 눈: 로고(커서 또는 고정된 로고)를 본다 ----------
   PDF의 네 장면(첫 화면·디자인·교육·노래)에서 눈 위치를 재서 맞춘 타원. 좌표는 얼굴 svg 단위 */
const EYES = [
  { el: $('#hm-eye-l'), cx: 115.6, cy: 102.7, rx: 56.9, ry: 31.0, rest: [163.3, 92.3] },
  { el: $('#hm-eye-r'), cx: 435.2, cy: 104.1, rx: 64.3, ry: 39.1, rest: [471.9, 94.3] },
];
EYES.forEach((e) => { [e.x, e.y] = e.rest; });
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
function lookTarget() {
  if (view !== 'hero') return null;
  if (mode === 'home') return curX === null ? null : [curX, curY];
  const r = pin.getBoundingClientRect();
  return [r.left + r.width / 2, r.top + r.height / 2];
}
let eyeRaf = null;
function look() {
  const t = lookTarget();
  let p = null;
  if (t) { const m = face.getScreenCTM(); if (m) p = new DOMPoint(t[0], t[1]).matrixTransform(m.inverse()); }
  const k = reduce.matches ? 1 : 0.18;
  for (const e of EYES) {
    let [tx, ty] = e.rest;
    if (p) {
      const dx = p.x - e.cx, dy = p.y - e.cy;
      const d = Math.hypot(dx, dy) || 1;
      const f = Math.min(1, d / 160);           // 아주 가까우면 덜 움직인다
      tx = e.cx + dx / d * e.rx * f;
      ty = e.cy + dy / d * e.ry * f;
    }
    e.x += (tx - e.x) * k;
    e.y += (ty - e.y) * k;
    e.el.setAttribute('cx', e.x.toFixed(2));
    e.el.setAttribute('cy', e.y.toFixed(2));
  }
  eyeRaf = requestAnimationFrame(look);
}
function startEyes() { if (!eyeRaf) eyeRaf = requestAnimationFrame(look); }
function stopEyes() { cancelAnimationFrame(eyeRaf); eyeRaf = null; }

/* =========================================================
   나에 대해서
   ========================================================= */
function renderAbout() {
  const a = SITE.about;
  const mail = ['wookdo1225', 'gmail.com'].join('@');   // 소스에서 긁어 가는 스팸 줄이기
  $('#about-1').innerHTML = `
    <h1 class="v v40 at ab-title">${vt('나에 대해서')}</h1>
    <dl class="ab-rows">
      <dt class="en t30">about me</dt>
      <dd>${ed('about.ko', a.ko, 'p', 'ko t28')}${ed('about.en', a.en, 'p', 'en t28')}</dd>
      <dt class="en t30">Instagram</dt>
      <dd><a class="ab-mail en t28" href="https://www.instagram.com/douk.dsgn/" target="_blank" rel="noopener">douk.dsgn</a></dd>
      <dt class="en t30">email</dt>
      <dd><a class="ab-mail en t28" href="mailto:${mail}">${mail}</a></dd>
    </dl>`;
  $('#about-2').innerHTML = `
    <div class="hist">${a.history.map((h, i) => `
      <div class="hist-row">
        ${edv(`about.history.${i}.ko`, h.ko, 'p', 'v v28')}
        ${ed(`about.history.${i}.date`, h.date, 'p', 'en t28')}
        ${ed(`about.history.${i}.en`, h.en, 'p', 'en t28')}
      </div>`).join('')}
    </div>`;
}

/* =========================================================
   작업 · 수업 하나: 첫 화면은 소개, 내려가면 이미지
   ========================================================= */
/* 디자인 블록 종류 (content/data.js 의 작업 "blocks"에 위에서부터 차례로):
   image  { src }                         이미지 한 장
   loop   { src }                         소리 없이 반복되는 짧은 영상
   film   { src, poster }                 소리 있는 영상(누르면 재생)
   frames { frames: [{ src, ms }] }       이미지 여러 장이 정해진 간격으로 넘어가며 반복
   shuffle{ dir, prefix, n, cols, rows, ms, ratio }  격자 이미지가 계속 다른 이미지로 바뀜
   flipgrid { dir, a, b, n, cols, rows }  격자에 a(같이) 그림을 깔고, 칸을 누르면 짝인 b(따로) 그림으로 바뀜
   book   { dir, n, pad, ratio, max, label, toc }    실제 책처럼 좌우로 넘겨 보기
   두 칸에 나란히 놓이고, film·shuffle·flipgrid·book은 한 줄을 다 쓴다.
   모든 경로는 assets/design/ 기준. "cap"을 적으면 아래에 한 줄 설명이 붙는다. */
const A = (src) => `assets/design/${esc(src)}`;
const WIDE = ['film', 'shuffle', 'flipgrid', 'book'];
let workCleanups = [];
function stopWork() { workCleanups.forEach((f) => f()); workCleanups = []; }

function blockHTML(bl, w, path, k) {
  const alt = esc(w.title);
  const cap = 'cap' in bl ? ed(`${path}.cap`, bl.cap || '', 'figcaption') : '';
  const wide = WIDE.includes(bl.type) ? ' wide' : '';
  switch (bl.type) {
    case 'loop':
      return `<figure class="blk"><video src="${A(bl.src)}" muted autoplay loop playsinline preload="auto" aria-label="${alt}"></video>${cap}</figure>`;
    case 'film':
      return `<figure class="blk blk-film${wide}"><video src="${A(bl.src)}" ${bl.poster ? `poster="${A(bl.poster)}"` : ''} controls playsinline preload="metadata" aria-label="${alt} 영상"></video>${cap}</figure>`;
    case 'frames':
      return `<figure class="blk" data-blk="frames" data-k="${k}"><img src="${A(bl.frames[0].src)}" alt="${alt}">${cap}</figure>`;
    case 'shuffle':
      return `<figure class="blk blk-shuffle${wide}" data-blk="shuffle" data-k="${k}"><div class="shuffle" style="--cols:${bl.cols};--ratio:${bl.ratio}"></div>${cap}</figure>`;
    case 'flipgrid':
      return `<figure class="blk blk-flipgrid${wide}" data-blk="flipgrid" data-k="${k}"><div class="flipgrid" style="--cols:${bl.cols};--ratio:${bl.ratio}"></div>${cap}</figure>`;
    case 'book':
      return `<div class="blk-book${wide}" data-blk="book" data-k="${k}"></div>`;
    default:
      return `<figure class="blk"><img src="${A(bl.src)}" alt="${alt}" loading="lazy">${cap}</figure>`;
  }
}

function setFixed(title, titlePath, en, enPath, back) {
  // 세로 제목이 아래 영문 제목에 닿지 않도록 길면 다음 줄로
  const tMax = portrait.matches ? 38 : 17.5;
  $('#fix-title').innerHTML = title ? `<span data-flat="1" class="v v40" data-edit="${titlePath}" data-vt="${tMax}">${vt(title, tMax, true)}</span>` : '';
  $('#fix-en').innerHTML = en ? ed(enPath, en) : '';
  $('#fix-back').href = back;
}

function renderWork(i) {
  stopWork();
  const w = SITE.design[i];
  if (!w) { location.replace('#design'); return; }
  const b = `design.${i}`;
  const url = (w.links.find((l) => l.url && !l.url.includes('instagram.com')) || {}).url || '';
  const tk = w.koDetail ? 'koDetail' : 'ko';   // 상세 페이지 세로 제목을 목록과 다르게 줄이고 싶으면 koDetail
  const te = w.enDetail ? 'enDetail' : 'en';
  setFixed((w[tk] || w.title).replace(/\n/g, ' '), `${b}.${tk}`, w[te], `${b}.${te}`, '#design');
  $('#detail-1').innerHTML = `
    <div class="d-text">
      ${rich(`${b}.desc`, w.desc, url, 'p', 'ko t28 long')}
      ${w.descEn ? rich(`${b}.descEn`, w.descEn, url, 'p', 'd-en en t28 long') : ''}
    </div>`;
  const blocks = w.blocks && w.blocks.length ? w.blocks : [{ type: 'image', src: w.cover }];
  const el = $('#detail-2');
  // 블록 하나가 한 화면. 세로 제목 윗선(150)에 맞추고, 고정 글자에 닿지 않는 칸(357~1669 × 150~862) 안에 들어간다
  el.innerHTML = blocks.map((bl, k) => page(blockHTML(bl, w, `${b}.blocks.${k}`, k), bl.type === 'book' && bl.toc ? ' has-toc' : '')).join('');
  const books = [];
  el.querySelectorAll('[data-blk]').forEach((node) => {
    const bl = blocks[+node.dataset.k];
    if (bl.type === 'frames') startFrames(node, bl);
    if (bl.type === 'shuffle') startShuffle(node, bl, w);
    if (bl.type === 'flipgrid') startFlipGrid(node, bl, w);
    if (bl.type === 'book') books.push(makeBook(node, bl, w));
    if (bl.type === 'shuffle' || bl.type === 'flipgrid') fitGrid(node, bl);
  });
  workCleanups.push(() => el.querySelectorAll('video').forEach((v) => v.pause()));
}

function renderLesson(i) {
  stopWork();
  const l = SITE.education[i];
  if (!l) { location.replace('#education'); return; }
  const b = `education.${i}`;
  setFixed(l.title, `${b}.title`, l.en, `${b}.en`, '#education');
  $('#detail-1').innerHTML = `
    <div class="d-text">
      ${ed(`${b}.introKo`, l.introKo || l.summary, 'p', 'ko t28 long')}
      ${l.introEn ? ed(`${b}.introEn`, l.introEn, 'p', 'd-en en t28 long') : ''}
    </div>`;
  // 수업 자료: 한 화면에 슬라이드 4장(2×2, 휴대폰은 3장). 학습지는 한 장씩 한 화면
  const fig = (im, k) => `
    <figure class="slide">
      <img src="assets/edu/${esc(im.src)}" alt="${esc(l.title)} ${esc(im.alt || '')}" loading="lazy">
      ${im.credit ? `<figcaption>${ed(`${b}.images.${k}.credit`, im.credit)}</figcaption>` : ''}
    </figure>`;
  // "layout": "photos" 이면 사진(비율이 제각각)을 한 화면에 나란히. 높이를 맞추고, ratio(가로/세로)로 폭을 나눈다
  if (l.layout === 'photos') {
    const sum = l.images.reduce((t, im) => t + (+im.ratio || 1), 0);
    $('#detail-2').innerHTML = page(`<div class="photos" style="--sum:${sum};--n:${l.images.length}">${l.images.map((im) => `
      <img src="assets/edu/${esc(im.src)}" alt="${esc(l.title)} ${esc(im.alt || '')}" style="--ar:${+im.ratio || 1}" loading="lazy">`).join('')}
    </div>`);
    return;
  }
  const per = portrait.matches ? 3 : 4;
  const pages = [];
  let cur = [];
  l.images.forEach((im, k) => {
    if (/-ws-/.test(im.src)) {
      if (cur.length) { pages.push(`<div class="slides">${cur.join('')}</div>`); cur = []; }
      pages.push(`<div class="sheet">${fig(im, k)}</div>`);
      return;
    }
    cur.push(fig(im, k));
    if (cur.length === per) { pages.push(`<div class="slides">${cur.join('')}</div>`); cur = []; }
  });
  if (cur.length) pages.push(`<div class="slides">${cur.join('')}</div>`);
  $('#detail-2').innerHTML = pages.map((p) => page(p)).join('');
}

const page = (inner, cls = '') => `<section class="screen m-screen"><div class="frame"><div class="media${cls}">${inner}</div></div></section>`;

/* 격자 블록(shuffle·flipgrid)은 칸 높이(712)에 맞춰 폭을 정한다 */
function fitGrid(node, bl) {
  const [a, c] = String(bl.ratio).split('/').map(Number);
  const r = c ? a / c : +bl.ratio || 1;
  const H = portrait.matches ? 1390 : 712, G = 10;
  const w = ((H - (bl.rows - 1) * G) / bl.rows) * r * bl.cols + (bl.cols - 1) * G;
  node.style.width = `min(100%, calc(${w.toFixed(1)} * var(--p)))`;
}

/* 이미지 여러 장을 정해진 간격(ms)으로 넘기며 반복 */
function startFrames(node, bl) {
  const img = node.querySelector('img');
  bl.frames.forEach((f) => { const im = new Image(); im.src = A(f.src); });
  if (reduce.matches) return;
  let k = 0, t = null;
  const tick = () => { k = (k + 1) % bl.frames.length; img.src = A(bl.frames[k].src); t = setTimeout(tick, bl.frames[k].ms); };
  t = setTimeout(tick, bl.frames[0].ms);
  workCleanups.push(() => clearTimeout(t));
}

/* 격자(cols×rows)에 n장 중 일부를 놓고, ms마다 모든 칸을 다른 이미지로 바꾼다 */
function startShuffle(node, bl, w) {
  const grid = node.querySelector('.shuffle');
  const cells = bl.cols * bl.rows;
  const src = (j) => A(`${bl.dir}/${bl.prefix}${String(j).padStart(2, '0')}.jpg`);
  for (let j = 1; j <= bl.n; j++) { const im = new Image(); im.src = src(j); }
  const pick = (avoid) => {
    const pool = [...Array(bl.n).keys()].map((x) => x + 1).sort(() => Math.random() - 0.5);
    const out = [];
    for (let c = 0; c < cells; c++) {
      let at = pool.findIndex((x) => !avoid || x !== avoid[c]);
      if (at < 0) at = 0;
      out.push(pool.splice(at, 1)[0]);
    }
    return out;
  };
  let cur = pick();
  grid.innerHTML = cur.map((j) => `<img src="${src(j)}" alt="">`).join('');
  grid.setAttribute('role', 'img');
  grid.setAttribute('aria-label', `${w.title} 이미지 ${bl.n}장이 계속 바뀌는 격자`);
  if (reduce.matches) return;
  const imgs = [...grid.children];
  const t = setInterval(() => { cur = pick(cur); imgs.forEach((im, c) => { im.src = src(cur[c]); }); }, bl.ms);
  workCleanups.push(() => clearInterval(t));
}

/* 같이 ↔ 따로: 칸을 누르면 그 짝인 '따로' 그림으로 바뀐다(다시 누르면 돌아옴) */
function startFlipGrid(node, bl, w) {
  const grid = node.querySelector('.flipgrid');
  const src = (pre, j) => A(`${bl.dir}/${pre}${String(j).padStart(2, '0')}.${bl.ext || 'jpg'}`);
  for (let j = 1; j <= bl.n; j++) [bl.a, bl.b].forEach((pre) => { const im = new Image(); im.src = src(pre, j); });
  const cells = [];
  for (let r = 0; r < bl.rows; r++) for (let c = 0; c < bl.cols; c++) {
    const at = r * bl.cols + c;
    cells.push(bl.cols * bl.rows <= bl.n ? at + 1 : (at + Math.floor(r / 2)) % bl.n + 1);
  }
  grid.innerHTML = cells.map((j) =>
    `<button type="button" class="fg-cell" data-j="${j}" aria-pressed="false" aria-label="${esc(w.title)} ${j}번, 누르면 따로와 같이가 바뀜"><img src="${src(bl.a, j)}" alt=""></button>`).join('');
  grid.addEventListener('click', (e) => {
    const cell = e.target.closest('.fg-cell');
    if (!cell) return;
    const on = cell.getAttribute('aria-pressed') !== 'true';
    cell.setAttribute('aria-pressed', String(on));
    cell.querySelector('img').src = src(on ? bl.b : bl.a, +cell.dataset.j);
  });
}

/* ---------- 책: 실제 책처럼 좌우로 넘겨 보기 ---------- */
function spreadsOf(n) {
  const s = [[null, 1]];
  for (let p = 2; p <= n; p += 2) s.push([p, p + 1 <= n ? p + 1 : null]);
  return s;
}
function makeBook(host, bl, w) {
  const spreads = spreadsOf(bl.n);
  const src = (p) => A(`${bl.dir}/p-${String(p).padStart(bl.pad || 2, '0')}.jpg`);
  const name = `${w.title}${bl.label ? ` (${bl.label})` : ''}`;
  let cur = 0;
  const row = document.createElement('div');
  row.className = 'book-row' + (bl.toc ? ' has-toc' : '');
  row.style.setProperty('--ratio', 2 * bl.ratio);
  row.innerHTML = `
    <div class="book-main">
      <div class="bk-frame" style="--max:${bl.max || 1100}px; --ratio:${2 * bl.ratio}">
      <div class="bk-stage" style="--ratio:${2 * bl.ratio}; --max:${bl.max || 1100}px" tabindex="0" aria-label="${esc(name)}. 좌우 화살표로 넘겨 보세요.">
        <div class="spread"><div class="half l"></div><div class="half r"></div></div>
        <button class="hit prev" type="button" aria-label="앞 장"></button>
        <button class="hit next" type="button" aria-label="다음 장"></button>
      </div>
      </div>
    </div>`;
  host.appendChild(row);
  const stage = row.querySelector('.bk-stage');
  const spread = row.querySelector('.spread');
  const L = row.querySelector('.half.l'), R = row.querySelector('.half.r');
  const btns = { prev: [row.querySelector('.hit.prev')], next: [row.querySelector('.hit.next')] };
  const img = (p) => p ? `<img src="${src(p)}" alt="${esc(name)} ${p}쪽" draggable="false">` : '';
  const warm = (k) => (spreads[k] || []).forEach((p) => { if (p) { const im = new Image(); im.src = src(p); } });
  let tocEl = null;
  function paint(k) {
    const [a, c] = spreads[k];
    L.innerHTML = img(a); R.innerHTML = img(c);
    spread.classList.toggle('is-first', a === null);
    spread.classList.toggle('is-last', c === null && a !== null);
    btns.prev.forEach((x) => { x.disabled = k === 0; });
    btns.next.forEach((x) => { x.disabled = k === spreads.length - 1; });
    warm(k + 1); warm(k + 2); warm(k - 1);
    if (tocEl) tocEl.querySelectorAll('button[data-p]').forEach((x) => {
      const p = +x.dataset.p; x.classList.toggle('is-here', p === a || p === c);
    });
  }
  function go(to) { if (to === cur || to < 0 || to >= spreads.length) return; cur = to; paint(cur); }
  const step = (d) => go(cur + d);
  btns.prev.forEach((x) => x.addEventListener('click', () => step(-1)));
  btns.next.forEach((x) => x.addEventListener('click', () => step(1)));
  stage.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
  });
  let x0 = null;
  stage.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  stage.addEventListener('touchend', (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0; x0 = null;
    if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1);
  });
  const home = () => go(0);
  if (bl.toc) {
    const spreadOfPage = (p) => spreads.findIndex(([a, c]) => a === p || c === p);
    const li = (it) => `<li${it.items ? ' class="ch"' : ''}><button type="button" data-p="${it.p}"><span class="t">${esc(it.t)}</span><span class="pg">${it.p}</span></button>${it.items ? `<ol>${it.items.map(li).join('')}</ol>` : ''}</li>`;
    tocEl = document.createElement('nav');
    tocEl.className = 'toc';
    tocEl.setAttribute('aria-label', '목차');
    tocEl.innerHTML = `<p class="toc-h">목차</p><ol class="toc-top">${bl.toc.map(li).join('')}</ol>`;
    row.appendChild(tocEl);
    tocEl.addEventListener('click', (e) => {
      const x = e.target.closest('button[data-p]');
      if (!x) return;
      go(spreadOfPage(+x.dataset.p));
      stage.focus({ preventScroll: true });
    });
    const fit = () => { tocEl.style.height = portrait.matches ? '' : `${stage.offsetHeight / 2}px`; };   // 목차는 책과 같은 높이에서 시작해 절반 길이
    const ro = new ResizeObserver(fit); ro.observe(stage); fit();
    workCleanups.push(() => ro.disconnect());
  }
  paint(0);
  return { home, go };
}

/* ---------- 고정된 세로 글(메뉴·김도욱·뒤로)도 한 자씩 쌓기 ---------- */
document.querySelectorAll('.v:not([data-edit])').forEach((el) => { el.innerHTML = vt(el.textContent.trim()); });

/* ---------- 불안 페이지 글 ---------- */
document.querySelectorAll('[data-edit^="intro."]').forEach((el) => {
  el.innerHTML = brs(SITE.intro[el.dataset.edit.slice(6)] || '');
});

/* ---------- 편집 설정 화면 (#editor-setup, 어디에도 링크하지 않는다) ---------- */
{
  const sec = document.createElement('section');
  sec.className = 'view';
  sec.dataset.view = 'editor-setup';
  sec.hidden = true;
  sec.innerHTML = `
    <div class="page">
      <a class="home-link" href="#home" aria-label="처음으로"><svg class="logo-mark" aria-hidden="true"><use href="#logo-small"/></svg></a>
      <form class="setup" id="setup" autocomplete="off">
        <p>이 기기에서 편집할 수 있게 설정합니다. 열쇠는 이 브라우저 안에만 비밀번호로 잠겨 저장됩니다.</p>
        <label>GitHub 열쇠(token)<input type="password" name="token" required></label>
        <label>비밀번호<input type="password" name="pw" required minlength="8"></label>
        <label>비밀번호 확인<input type="password" name="pw2" required minlength="8"></label>
        <p class="setup-actions"><button type="submit" class="u-line">저장</button><button type="button" class="u-line" id="setup-forget">이 기기에서 지우기</button></p>
        <p class="setup-msg" id="setup-msg" aria-live="polite"></p>
      </form>
    </div>`;
  document.querySelector('main').appendChild(sec);
}

/* =========================================================
   소식지
   - content/data.js 의 "news": [{ id: "2026-11", src: "2026-11.png", alt: "글 전체" }]
     이미지는 assets/news/ 에. id(연-월) 순서로 정렬해서 마지막이 이달의 소식지.
   - 소식지는 한 사람(한 브라우저)이 한 번만 펼쳐 볼 수 있다. 펼친 뒤 화면을 눌러 닫으면 '읽음'.
   - 첫 화면 쪽지: 안 읽었으면 누르면 펼쳐진다. 읽고 나면 쪽지도 사라진다.
   - 보관함: 한 해 한 화면, 맨 위가 가장 최근 해. 안 읽은 달만 눌러서 펼칠 수 있다.
   - 펼친 소식지는 브라우저 뒤로 가기로 닫히지 않는다. 화면 아무 데나 눌러야 닫힌다.
   ========================================================= */
const News = (() => {
  const KEY = 'dowook-news-read';
  const GUARD = 450;                      // 펼치자마자 닫히지 않게(ms)
  const all = () => (SITE.news || []).filter((n) => /^\d{4}-\d{1,2}$/.test(n.id))
    .sort((a, b) => key(a) - key(b));
  const key = (n) => { const [y, m] = n.id.split('-').map(Number); return y * 100 + m; };
  const ym = (n) => n.id.split('-').map(Number);
  const label = (n) => `${ym(n)[1]}월`;
  const src = (n) => `assets/news/${esc(n.src)}`;

  /* 읽음 기록: 이 브라우저 안에만 */
  const read = new Set();
  try { (JSON.parse(localStorage.getItem(KEY)) || []).forEach((id) => read.add(id)); } catch { /* 무시 */ }
  const markRead = (n) => { read.add(n.id); try { localStorage.setItem(KEY, JSON.stringify([...read])); } catch { /* 무시 */ } };
  const isRead = (n) => read.has(n.id);

  /* 손으로 그린 종이: 달마다 조금씩 다르게 기울고 흔들린다(같은 달은 언제나 같은 모양) */
  function rand(seed) { let s = seed >>> 0 || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
  function paper(seed, W = 144, H = 150) {
    const r = rand(seed * 2654435761);
    const j = (a) => (r() * 2 - 1) * a;
    const lean = 12 + r() * 10;            // 윗변이 오른쪽으로 밀린 만큼(시안처럼 비스듬히)
    const c = [[lean + j(3), 1 + j(2)], [W - 1 + j(2), 2 + j(2)], [W - lean * 0.6 + j(3), H - 1 + j(2)], [1 + j(2), H - 4 + j(2)]];
    let d = `M${c[0][0].toFixed(1)},${c[0][1].toFixed(1)}`;
    for (let k = 0; k < 4; k++) {
      const [ax, ay] = c[k], [bx, by] = c[(k + 1) % 4];
      const len = Math.hypot(bx - ax, by - ay), nx = -(by - ay) / len, ny = (bx - ax) / len;
      const pts = [];
      for (let t = 1; t < 5; t++) { const o = j(1.8); pts.push([ax + (bx - ax) * t / 5 + nx * o, ay + (by - ay) * t / 5 + ny * o]); }
      pts.push([bx, by]);
      pts.forEach(([x, y], i) => {
        if (i === pts.length - 1) { d += `L${x.toFixed(1)},${y.toFixed(1)}`; return; }
        d += `Q${x.toFixed(1)},${y.toFixed(1)} ${((x + pts[i + 1][0]) / 2).toFixed(1)},${((y + pts[i + 1][1]) / 2).toFixed(1)}`;
      });
    }
    return `<svg class="paper" viewBox="0 0 ${W} ${H}" aria-hidden="true"><path d="${d}Z"/></svg>`;
  }
  const paperOf = (n) => paper(key(n));

  /* 펼친 소식지 */
  const box = $('#news-open');
  const img = box.querySelector('img');
  let cur = null, openedAt = 0, onClose = null;
  function open(n, after) {
    if (!n || isRead(n) || cur) return;
    cur = n; openedAt = Date.now(); onClose = after || null;
    img.src = src(n);
    img.alt = n.alt || '';
    box.setAttribute('aria-label', `월간 소식지 ${label(n)}`);
    box.hidden = false;
    document.documentElement.classList.add('news-lock');
    history.pushState({ newsOpen: true }, '');       // 뒤로 가기를 한 번 받아 줄 자리
    box.focus({ preventScroll: true });
  }
  function close() {
    if (!cur || Date.now() - openedAt < GUARD) return;
    markRead(cur);
    cur = null;
    box.hidden = true;
    img.removeAttribute('src');
    document.documentElement.classList.remove('news-lock');
    if (history.state && history.state.newsOpen) history.back();
    renderNote();
    if (onClose) onClose();
  }
  box.addEventListener('click', close);
  box.addEventListener('keydown', (e) => { if (['Escape', 'Enter', ' '].includes(e.key)) { e.preventDefault(); close(); } });
  // 펼쳐 둔 채로 뒤로 가기를 누르면: 닫지 않고 다시 자리를 만든다
  window.addEventListener('popstate', () => { if (cur) history.pushState({ newsOpen: true }, ''); });

  /* 첫 화면 쪽지 */
  function renderNote() {
    const host = $('#news-note');
    const list = all();
    const n = list.at(-1);
    // 한 번 읽은 소식지는 첫 화면에서 쪽지까지 사라진다(없었던 것처럼)
    host.hidden = !n || isRead(n);
    if (host.hidden) { host.innerHTML = ''; return; }
    const inner = `${paperOf(n)}<span class="m">${label(n)}</span>`;
    host.innerHTML = `<button class="news-hit" type="button" aria-label="월간 소식지 ${label(n)} 펼치기">${inner}</button>`;
    host.querySelector('button').addEventListener('click', () => open(n));
    const pre = new Image(); pre.src = src(n);        // 누르자마자 보이게 미리 받아 둔다
  }

  /* 보관함 */
  function renderArchive() {
    const byYear = new Map();
    all().forEach((n) => { const y = ym(n)[0]; if (!byYear.has(y)) byYear.set(y, []); byYear.get(y).push(n); });
    const years = [...byYear.keys()].sort((a, b) => b - a);
    $('#news-years').innerHTML = years.map((y) => `
      <section class="screen" aria-label="${y}년 소식지">
        <div class="frame">
          <h2 class="en t40 at news-year">${y}</h2>
          ${byYear.get(y).map((n, i) => {
            const r = rand(key(n) * 40503), j = (a) => (r() * 2 - 1) * a;   // 손으로 붙인 듯 조금씩 어긋나게
            const x = 295 + (i % 7) * 215 + j(10), yy = 140 + Math.floor(i / 7) * 271 + j(7);
            const mx = 330 + (i % 3) * 248 + j(8), my = 110 + Math.floor(i / 3) * 260 + j(6);
            const inner = `${paperOf(n)}<span class="m">${label(n)}</span>`;
            const tag = isRead(n)
              ? `<div class="news-hit" aria-label="${label(n)} 소식지 (이미 읽음)">${inner}</div>`
              : `<button class="news-hit" type="button" data-id="${esc(n.id)}" aria-label="${label(n)} 소식지 펼치기">${inner}</button>`;
            return `<div class="news-tile" style="--x:${x.toFixed(1)};--y:${yy.toFixed(1)};--mx:${mx.toFixed(1)};--my:${my.toFixed(1)}">${tag}</div>`;
          }).join('')}
        </div>
      </section>`).join('');
  }
  $('#news-years').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-id]');
    if (!b) return;
    open(all().find((n) => n.id === b.dataset.id), renderArchive);
  });

  return { renderNote, renderArchive, count: () => all().length };
})();

/* =========================================================
   화면 전환 (주소 끝의 #이름)
   ========================================================= */
const HERO = ['home', 'design', 'education', 'singing'];
const listY = {};
const views = () => document.querySelectorAll('[data-view]');

function route() {
  const hash = location.hash.slice(1) || 'home';
  const was = { view, mode };
  if (was.view === 'hero' && was.mode !== 'home') listY[was.mode] = window.scrollY;   // 목록에서 보던 자리
  let m, next = null, nextMode = mode;
  if (HERO.includes(hash)) { next = 'hero'; nextMode = hash; }
  else if (hash === 'about' || hash === 'email') next = 'about';
  else if (hash === 'news' && News.count()) next = 'news';
  else if ((m = hash.match(/^work-(\d+)$/))) next = 'detail';
  else if ((m = hash.match(/^lesson-(\d+)$/))) next = 'detail';
  else if (hash === 'anxiety' || hash === 'editor-setup') next = hash;
  else { history.replaceState(null, '', location.pathname); next = 'hero'; nextMode = 'home'; }

  stopAllSongs();
  stopWork();
  view = next; mode = nextMode;
  views().forEach((v) => { v.hidden = v.dataset.view !== view; });

  if (view === 'hero') {
    hero.dataset.mode = mode;
    renderHead(mode);
    const list = $('#list');
    if (list.dataset.mode !== mode || list.dataset.dirty) { renderList(mode); list.dataset.mode = mode; delete list.dataset.dirty; }
  }
  if (view === 'about') renderAbout();
  if (view === 'news') News.renderArchive();
  if (view === 'hero') News.renderNote();
  if (view === 'detail') (hash.startsWith('work-') ? renderWork : renderLesson)(+m[1]);

  // 고정 글자: 나에 대해서 · 소식지 보관함은 '뒤로'만, 작업·수업 하나는 제목까지
  const fix = $('#fix');
  fix.hidden = !(view === 'about' || view === 'detail' || view === 'news');
  if (view === 'about' || view === 'news') setFixed('', '', '', '', '#home');

  document.body.classList.toggle('hm-on', homeOn());
  if (!homeOn()) hideCursor();
  view === 'hero' ? startEyes() : stopEyes();
  // 작업·수업에서 목록으로 돌아오면 보던 자리로, 그 밖에는 맨 위로
  const back = view === 'hero' && was.view === 'detail' && listY[mode] != null;
  window.scrollTo(0, back ? listY[mode] : 0);
  if (!back && view === 'hero') listY[mode] = 0;
  sizeCursor();
  Editor.refresh();

}
window.addEventListener('hashchange', route);

/* ---------- 화면 넘기기: 나에 대해서 · 작업/수업 하나 · 소식지 보관함 ----------
   스크롤은 자유롭게(자석처럼 붙는 스냅 없음). 링크·버튼·영상·책 같은 것이 아닌 빈 곳을 누르면 다음 화면으로 바로 넘어간다 */
document.addEventListener('click', (e) => {
  if (!['about', 'detail', 'news'].includes(view) || e.defaultPrevented || e.button !== 0) return;
  if (document.body.classList.contains('is-editing') || String(getSelection())) return;
  if (e.target.closest('a, button, input, textarea, select, label, video, audio, [contenteditable], .book-row, .toc, .news-hit, .news-open')) return;
  const at = window.scrollY + 4;
  const next = [...document.querySelectorAll(`[data-view="${view}"] .screen`)]
    .map((el) => Math.round(el.getBoundingClientRect().top + window.scrollY))
    .find((y) => y > at);
  if (next != null) window.scrollTo({ top: Math.min(next, document.documentElement.scrollHeight - innerHeight), behavior: 'instant' });
});
window.addEventListener('resize', sizeCursor);
portrait.addEventListener('change', () => { if (view === 'detail') route(); });   // 가로↔세로가 바뀌면 화면 나누기를 다시

/* ---------- 이스터에그: 얼굴을 빠르게 연속으로 누르면 불안 ---------- */
let clicks = 0, lastClick = 0;
face.addEventListener('click', () => {
  if (Editor.swallowClick()) return;        // 꾹 누른 직후의 클릭은 무시
  const now = Date.now();
  clicks = (now - lastClick < SECRET_GAP) ? clicks + 1 : 1;
  lastClick = now;
  if (clicks >= SECRET_CLICKS) { clicks = 0; location.hash = 'anxiety'; }
});

/* =========================================================
   편집 모드
   - 첫 화면 얼굴을 꾹(3초) 누르면 화면에는 아무 변화 없이 보이지 않는 입력을 받는다.
   - 비밀번호를 치고 Enter → 이 기기에 저장해 둔 GitHub 열쇠가 풀리면 편집 모드.
   - 열쇠는 사이트(저장소)에 없다. #editor-setup 에서 기기마다 한 번 넣으면
     이 브라우저 안에만 비밀번호로 잠겨(PBKDF2 + AES-GCM) 저장된다.
   - 저장하면 GitHub의 content/data.js 를 바꾼다 → 1~2분 뒤 사이트에 반영.
   ========================================================= */
const Editor = (() => {
  const REPO = { owner: 'zinoka1225', repo: 'dowook-site', path: 'content/data.js', branch: 'main' };
  const API = `https://api.github.com/repos/${REPO.owner}/${REPO.repo}/contents/${REPO.path}`;
  const STORE = 'dowook-editor-v1';
  const HOLD = 3000;              // 꾹 누르는 시간(ms) — 3초
  const HEADER = '/* 사이트에 들어가는 모든 글과 작업 목록. 이 파일이 원본이다.\n   웹의 편집 모드에서 저장하면 이 파일이 바뀐다. */\n';

  let token = null, editing = false, dirty = false, original = JSON.stringify(SITE);
  let holdTimer = null, held = false;

  /* --- 이 브라우저 안의 저장 공간 --- */
  const store = {
    get() { try { return JSON.parse(localStorage.getItem(STORE)); } catch { return null; } },
    set(v) { try { localStorage.setItem(STORE, JSON.stringify(v)); return true; } catch { return false; } },
    del() { try { localStorage.removeItem(STORE); } catch { /* 무시 */ } },
  };
  const b64 = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000)); return btoa(s); };
  const unb64 = (s) => Uint8Array.from(atob(s.replace(/\s/g, '')), (c) => c.charCodeAt(0));
  async function keyFrom(pw, salt) {
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 600000, hash: 'SHA-256' },
      base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  async function lock(tok, pw) {
    const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await keyFrom(pw, salt), new TextEncoder().encode(tok));
    return { salt: b64(salt), iv: b64(iv), ct: b64(new Uint8Array(ct)) };
  }
  async function unlock(pw) {
    const s = store.get();
    if (!s) return null;
    try {
      const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(s.iv) }, await keyFrom(pw, unb64(s.salt)), unb64(s.ct));
      return new TextDecoder().decode(pt);
    } catch { return null; }
  }

  /* --- GitHub --- */
  const gh = (tok, opt = {}) => fetch(API + (opt.method ? '' : `?ref=${REPO.branch}`), {
    cache: 'no-store', ...opt,
    headers: { Authorization: `Bearer ${tok}`, Accept: 'application/vnd.github+json', ...(opt.headers || {}) },
  });
  const parseSite = (text) => JSON.parse(text.slice(text.indexOf('window.SITE = ') + 14, text.trimEnd().lastIndexOf(';')));

  /* --- 보이지 않는 입력 --- */
  const sink = document.createElement('input');
  Object.assign(sink, { type: 'text', autocomplete: 'off', spellcheck: false, tabIndex: -1 });
  sink.setAttribute('autocapitalize', 'off');
  sink.setAttribute('autocorrect', 'off');
  sink.setAttribute('aria-hidden', 'true');
  sink.className = 'secret-sink';
  document.body.appendChild(sink);
  let sinkTimer = null;
  function listen() {
    sink.value = '';
    sink.focus({ preventScroll: true });
    clearTimeout(sinkTimer);
    sinkTimer = setTimeout(() => sink.blur(), 30000);
  }
  sink.addEventListener('blur', () => { sink.value = ''; clearTimeout(sinkTimer); });
  sink.addEventListener('keydown', async (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const pw = sink.value;
    sink.blur();
    const tok = pw && await unlock(pw);
    if (tok) { token = tok; start(); }                // 틀리면 아무 일도 일어나지 않는다
  });

  // 꾹 누르기 (첫 화면 얼굴). 누른 채로 움직이면 취소(휴대폰에서 로고를 끄는 동작과 겹치지 않게)
  const coreLogo = document.getElementById('hm-face');
  let hx = 0, hy = 0;
  coreLogo.addEventListener('pointerdown', (e) => {
    held = false; hx = e.clientX; hy = e.clientY;
    clearTimeout(holdTimer);
    holdTimer = setTimeout(() => { held = true; }, HOLD);
  });
  coreLogo.addEventListener('pointermove', (e) => {
    if (Math.hypot(e.clientX - hx, e.clientY - hy) > 12) { clearTimeout(holdTimer); held = false; }
  });
  ['pointerleave', 'pointercancel'].forEach((t) => coreLogo.addEventListener(t, () => clearTimeout(holdTimer)));
  coreLogo.addEventListener('pointerup', () => {
    clearTimeout(holdTimer);
    if (held && !editing) listen();                   // 손을 뗄 때(사용자 동작 안에서) 입력을 받기 시작
  });
  coreLogo.addEventListener('contextmenu', (e) => e.preventDefault());

  /* --- 편집 막대 --- */
  const bar = document.createElement('div');
  bar.className = 'edit-bar';
  bar.hidden = true;
  bar.innerHTML = '<span>편집 중</span><button type="button" data-act="save">저장</button><button type="button" data-act="exit">끝내기</button><span class="edit-msg" aria-live="polite"></span>';
  document.body.appendChild(bar);
  const msg = (t) => { bar.querySelector('.edit-msg').textContent = t; };
  const exitBtn = bar.querySelector('[data-act="exit"]');

  // 이 브라우저가 서식 없는 편집을 지원하는지
  const plainOK = (() => { const d = document.createElement('div'); try { d.contentEditable = 'plaintext-only'; } catch { return false; } return d.contentEditable === 'plaintext-only'; })();

  function refresh() {
    paintRich(editing);                               // 링크가 든 설명: 편집 중에는 [ ]를 그대로 보여 준다
    document.querySelectorAll('[data-edit]').forEach((el) => {
      if (editing) el.contentEditable = plainOK ? 'plaintext-only' : 'true';
      else el.removeAttribute('contenteditable');
    });
  }
  function start() {
    editing = true;
    document.body.classList.add('is-editing');
    bar.hidden = false;
    exitBtn.textContent = '끝내기';
    msg('');
    refresh();
  }
  function stop() {
    editing = false;
    document.body.classList.remove('is-editing');
    bar.hidden = true;
    refresh();
  }

  // SITE 안의 위치(예: education.0.plan.1)에 값 넣기
  function setPath(path, value) {
    const keys = path.split('.');
    let o = SITE;
    keys.slice(0, -1).forEach((k) => { o = o[k]; });
    o[keys.at(-1)] = value;
  }
  document.addEventListener('input', (e) => {
    const el = e.target.closest && e.target.closest('[data-edit]');
    if (!editing || !el) return;
    setPath(el.dataset.edit, el.innerText.replace(/\n+$/, ''));
    dirty = true;
    exitBtn.textContent = '끝내기';
    msg('저장 안 됨');
  });
  // 편집 중에는 글 조각을 눌러도 링크 이동·노래 재생이 되지 않게
  document.addEventListener('click', (e) => {
    if (editing && e.target.closest && e.target.closest('[data-edit]')) { e.preventDefault(); e.stopPropagation(); }
  }, true);
  // 서식 있는 붙여넣기 막기(plaintext-only를 못 쓰는 브라우저)
  document.addEventListener('paste', (e) => {
    if (!editing || plainOK || !e.target.closest || !e.target.closest('[data-edit]')) return;
    e.preventDefault();
    document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
  });
  window.addEventListener('beforeunload', (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

  async function save() {
    if (!dirty) { msg('바뀐 곳이 없어요'); return; }
    msg('저장하는 중…');
    try {
      const res = await gh(token);
      if (!res.ok) throw new Error(`불러오기 실패 (${res.status})`);
      const cur = await res.json();
      const remote = new TextDecoder().decode(unb64(cur.content));
      if (JSON.stringify(parseSite(remote)) !== original) {
        msg('사이트가 아직 최신 내용이 아니에요. 1~2분 뒤 새로고침하고 다시 고쳐 주세요.');
        return;
      }
      // 비운 문단은 지운다
      SITE.education.forEach((l) => ['plan', 'result', 'next'].forEach((k) => { l[k] = (l[k] || []).filter((p) => p.trim()); }));
      SITE.updated = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);   // 한국 날짜
      const text = HEADER + 'window.SITE = ' + JSON.stringify(SITE, null, 1) + ';\n';
      const put = await gh(token, {
        method: 'PUT',
        body: JSON.stringify({ message: '웹에서 글 수정', content: b64(new TextEncoder().encode(text)), sha: cur.sha, branch: REPO.branch }),
      });
      if (!put.ok) throw new Error(`저장 실패 (${put.status})`);
      original = JSON.stringify(SITE);
      dirty = false;

      msg('저장했어요. 1~2분 뒤 사이트에 반영돼요.');
    } catch (err) {
      msg(String(err.message || err));
    }
  }
  bar.addEventListener('click', (e) => {
    const act = e.target.dataset && e.target.dataset.act;
    if (act === 'save') save();
    if (act === 'exit') {
      if (dirty && exitBtn.textContent === '끝내기') { exitBtn.textContent = '저장 안 하고 끝내기'; return; }
      if (dirty) { dirty = false; location.reload(); return; }
      stop();
    }
  });

  /* --- 설정 화면 --- */
  const form = document.getElementById('setup');
  const setupMsg = (t) => { document.getElementById('setup-msg').textContent = t; };
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const tok = form.token.value.trim(), pw = form.pw.value;
    if (pw !== form.pw2.value) { setupMsg('비밀번호가 서로 달라요.'); return; }
    setupMsg('열쇠를 확인하는 중…');
    try {
      const res = await gh(tok);
      if (!res.ok) { setupMsg(`이 열쇠로는 저장소에 들어갈 수 없어요 (${res.status}).`); return; }
      if (!store.set(await lock(tok, pw))) { setupMsg('이 브라우저에는 저장할 수 없어요(개인 정보 보호 모드 등).'); return; }
      form.reset();
      setupMsg('이 기기에 저장했어요. 첫 화면에서 얼굴을 꾹 누른 뒤 비밀번호를 치고 Enter.');
    } catch (err) { setupMsg(String(err.message || err)); }
  });
  document.getElementById('setup-forget').addEventListener('click', () => { store.del(); setupMsg('이 기기에서 지웠어요.'); });

  return {
    refresh,
    swallowClick() { if (held) { held = false; return true; } return false; },
  };
})();


route();
