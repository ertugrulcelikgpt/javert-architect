/**
 * JAVERT Architect — arayüz katmanı.
 * Durum: aktif görev, yerleştirilen katmanlar, ipuçları ve görev ilerlemesi (localStorage).
 */
(function () {
  'use strict';

  const { LAYERS, CATEGORIES, byId: L } = window.JavertLayers;
  const { SCENARIOS } = window.JavertScenarios;
  const Engine = window.JavertEngine;

  const STORE_KEY = 'javert.progress.v1';
  const $ = (sel) => document.querySelector(sel);

  const state = {
    index: 0,
    placed: [],
    hinted: new Set(),
    query: '',
    category: 'all',
    expanded: null,
    progress: loadProgress(),
  };

  // ---------- Kalıcı ilerleme ----------
  function loadProgress() {
    try {
      const data = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
      return { best: data.best || {}, last: data.last ?? 0 };
    } catch {
      return { best: {}, last: 0 };
    }
  }
  function saveProgress() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state.progress)); } catch { /* gizli pencere */ }
  }

  const scenario = () => SCENARIOS[state.index];

  // ---------- Yardımcılar ----------
  function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = v;
      else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
      else if (k === 'style') node.setAttribute('style', v);
      else node.setAttribute(k, v === true ? '' : v);
    }
    for (const c of children.flat()) {
      if (c === null || c === undefined || c === false) continue;
      node.append(c instanceof Node ? c : document.createTextNode(String(c)));
    }
    return node;
  }

  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
  }

  // ---------- Görev ----------
  function loadMission(index, { keepPlacement = false } = {}) {
    state.index = (index + SCENARIOS.length) % SCENARIOS.length;
    if (!keepPlacement) {
      state.placed = [];
      state.hinted = new Set();
    }
    state.progress.last = state.index;
    saveProgress();

    const s = scenario();
    $('#m-diff').textContent = s.difficulty;
    $('#m-diff').dataset.level = s.difficulty;
    $('#m-count').textContent = `${state.index + 1}/${SCENARIOS.length} GÖREV`;
    $('#m-title').textContent = s.title;
    $('#m-brief').textContent = s.brief;
    $('#src-icon').textContent = s.source.icon;
    $('#src-name').textContent = s.source.name;
    $('#src-note').textContent = s.source.note;
    $('#tgt-icon').textContent = s.target.icon;
    $('#tgt-name').textContent = s.target.name;
    document.title = `${s.title} — JAVERT Architect`;

    showView('builder');
    renderAll();
  }

  function showView(name) {
    $('#view-builder').hidden = name !== 'builder';
    $('#view-result').hidden = name !== 'result';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderAll() {
    renderChips();
    renderPalette();
    renderDropzone();
    renderBudget();
  }

  // ---------- Katman işlemleri ----------
  function addLayer(id, at = state.placed.length) {
    if (state.placed.includes(id)) return;
    state.placed.splice(at, 0, id);
    renderPlacementChange();
  }
  function removeLayer(id) {
    state.placed = state.placed.filter((x) => x !== id);
    renderPlacementChange();
  }
  function moveLayer(from, to) {
    if (from === to || from < 0) return;
    const [item] = state.placed.splice(from, 1);
    state.placed.splice(to > from ? to - 1 : to, 0, item);
    renderPlacementChange();
  }
  function renderPlacementChange() {
    renderDropzone();
    renderPalette();
    renderBudget();
  }

  // ---------- Palet ----------
  function renderChips() {
    const wrap = $('#chips');
    wrap.replaceChildren();
    const entries = [['all', 'Tümü'], ...Object.entries(CATEGORIES)];
    for (const [key, label] of entries) {
      wrap.append(el('button', {
        class: `chip${state.category === key ? ' active' : ''}`,
        type: 'button',
        text: label,
        onclick: () => { state.category = key; renderChips(); renderPalette(); },
      }));
    }
  }

  function matchesFilter(layer) {
    if (state.category !== 'all' && layer.category !== state.category) return false;
    if (!state.query) return true;
    const q = state.query.toLocaleLowerCase('tr');
    return (layer.name + ' ' + layer.desc).toLocaleLowerCase('tr').includes(q);
  }

  function renderPalette() {
    const list = $('#palette');
    list.replaceChildren();
    const items = LAYERS.filter(matchesFilter);
    if (!items.length) {
      list.append(el('li', { class: 'muted small', text: 'Eşleşen katman yok.' }));
      return;
    }
    for (const layer of items) {
      const used = state.placed.includes(layer.id);
      const open = state.expanded === layer.id;
      const row = el('div', { class: 'pitem-row', draggable: used ? 'false' : 'true' },
        el('span', { class: 'ico', 'aria-hidden': 'true', text: layer.icon }),
        el('button', {
          class: 'name', type: 'button', text: layer.name, 'aria-expanded': String(open),
          onclick: () => { state.expanded = open ? null : layer.id; renderPalette(); },
        }),
        el('span', { class: 'cost', title: 'Bütçe maliyeti (birim)', text: `${layer.cost} br` }),
        el('button', {
          class: 'add', type: 'button', text: used ? '✓' : '+', disabled: used,
          'aria-label': `${layer.name} ekle`,
          onclick: () => addLayer(layer.id),
        }),
      );
      row.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', `add:${layer.id}`);
        e.dataTransfer.effectAllowed = 'copy';
      });
      row.addEventListener('dblclick', () => !used && addLayer(layer.id));

      const li = el('li', { class: `pitem${used ? ' used' : ''}` }, row);
      if (open) {
        li.append(el('div', { class: 'more' }, layer.desc,
          el('span', { class: 'tag', text: `${CATEGORIES[layer.category]} · NIST CSF: ${layer.nist}` })));
      }
      list.append(li);
    }
  }

  // ---------- Mimari alanı ----------
  function renderDropzone() {
    const zone = $('#dropzone');
    zone.replaceChildren();
    if (!state.placed.length) {
      zone.append(el('li', { class: 'dropzone-empty', text: 'Paletten katman seç, sürükle veya + ile ekle' }));
    }
    state.placed.forEach((id, i) => {
      const layer = L[id];
      const item = el('li', {
        class: `placed${state.hinted.has(id) ? ' hint-glow' : ''}`,
        draggable: 'true',
        'data-index': i,
      },
        el('span', { class: 'idx', text: String(i + 1).padStart(2, '0') }),
        el('span', { class: 'ico', 'aria-hidden': 'true', text: layer.icon }),
        el('div', {}, el('div', { class: 'name', text: layer.name }), el('div', { class: 'desc', text: layer.desc })),
        el('div', { class: 'ctrl' },
          el('button', { class: 'icon-btn', type: 'button', text: '↑', title: 'Yukarı taşı', disabled: i === 0,
            'aria-label': `${layer.name} yukarı taşı`, onclick: () => moveLayer(i, i - 1) }),
          el('button', { class: 'icon-btn', type: 'button', text: '↓', title: 'Aşağı taşı', disabled: i === state.placed.length - 1,
            'aria-label': `${layer.name} aşağı taşı`, onclick: () => moveLayer(i, i + 2) }),
          el('button', { class: 'icon-btn remove', type: 'button', text: '✕', title: 'Kaldır',
            'aria-label': `${layer.name} kaldır`, onclick: () => removeLayer(id) }),
        ),
      );
      item.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', `move:${i}`);
        e.dataTransfer.effectAllowed = 'move';
        requestAnimationFrame(() => item.classList.add('dragging'));
      });
      item.addEventListener('dragend', () => item.classList.remove('dragging'));
      zone.append(item);
    });
    $('#btn-eval').disabled = state.placed.length === 0;
  }

  function insertIndexFor(zone, clientY) {
    const items = [...zone.querySelectorAll('.placed')];
    for (const item of items) {
      const r = item.getBoundingClientRect();
      if (clientY < r.top + r.height / 2) return Number(item.dataset.index);
    }
    return items.length;
  }

  function clearDropMarks(zone) {
    zone.classList.remove('drag-over');
    zone.querySelectorAll('.drop-before').forEach((n) => n.classList.remove('drop-before'));
  }

  function setupDropzone() {
    const zone = $('#dropzone');
    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.classList.add('drag-over');
      const idx = insertIndexFor(zone, e.clientY);
      zone.querySelectorAll('.placed').forEach((n) => n.classList.toggle('drop-before', Number(n.dataset.index) === idx));
    });
    zone.addEventListener('dragleave', (e) => {
      if (!zone.contains(e.relatedTarget)) clearDropMarks(zone);
    });
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      const data = e.dataTransfer.getData('text/plain');
      const idx = insertIndexFor(zone, e.clientY);
      clearDropMarks(zone);
      if (data.startsWith('add:')) addLayer(data.slice(4), idx);
      else if (data.startsWith('move:')) moveLayer(Number(data.slice(5)), idx);
    });
  }

  // ---------- Bütçe ----------
  function renderBudget() {
    const cost = Engine.costOf(state.placed, L);
    const budget = Engine.budgetFor(scenario(), L);
    const ratio = cost / budget;
    const fill = $('#budget-fill');
    fill.style.width = `${Math.min(100, ratio * 100)}%`;
    fill.classList.toggle('warn', ratio > 0.85 && ratio <= 1);
    fill.classList.toggle('over', ratio > 1);
    $('.budget').classList.toggle('over', ratio > 1);
    $('#budget-text').textContent = `${cost} / ${budget} birim${ratio > 1 ? ' · AŞILDI' : ''}`;
  }

  // ---------- İpucu ----------
  function useHint() {
    const s = scenario();
    const next = Engine.nextHint(s, state.placed);
    if (!next) {
      // Tüm katmanlar yerinde: sırayı düzelt
      const ordered = s.ideal.filter((id) => state.placed.includes(id));
      const current = state.placed.filter((id) => s.ideal.includes(id));
      if (ordered.join() !== current.join()) {
        toast('İpucu: zorunlu katmanları saldırının izleyeceği yola göre diz (dıştan içe).');
      } else {
        toast('Tüm temel katmanlar yerinde ve sıralı. İpucuna gerek yok!');
      }
      return;
    }
    state.hinted.add(next);
    const idealIdx = s.ideal.indexOf(next);
    // Ideal sıraya en yakın konuma yerleştir
    const after = s.ideal.slice(0, idealIdx).filter((id) => state.placed.includes(id));
    const at = after.length ? state.placed.indexOf(after[after.length - 1]) + 1 : 0;
    addLayer(next, at);
    toast(`İpucu: ${L[next].name} eklendi (−${Engine.PENALTY.hint} puan)`);
  }

  // ---------- Değerlendirme ----------
  function evaluateNow() {
    if (!state.placed.length) return;
    const s = scenario();
    const res = Engine.evaluate(s, state.placed, L, { hintsUsed: state.hinted.size });

    const prev = state.progress.best[s.id];
    if (!state.demo && (prev === undefined || res.score > prev)) {
      state.progress.best[s.id] = res.score;
      saveProgress();
      if (prev !== undefined) toast(`Yeni rekor: ${res.score} puan!`);
    }
    renderResult(s, res);
    showView('result');
  }

  function renderResult(s, res) {
    const score = $('#r-score');
    score.textContent = '0';
    score.className = `score ${res.grade.key}`;
    animateNumber(score, res.score);
    const grade = $('#r-grade');
    grade.textContent = res.grade.label;
    grade.className = `grade ${res.grade.key}`;

    const bd = res.breakdown;
    const tile = (k, v, max, neg) => el('div', { class: `bd${neg ? ' neg' : ''}` },
      el('div', { class: 'k', text: k }),
      el('div', { class: 'v' }, neg && v > 0 ? `−${v}` : String(v), max ? el('small', { text: ` / ${max}` }) : null),
      max ? el('div', { class: 'bar' }, el('i', { style: `width:${(v / max) * 100}%` })) : null,
    );
    $('#r-breakdown').replaceChildren(
      tile('Kapsam', bd.coverage, Engine.WEIGHTS.coverage),
      tile('Sıra', bd.order, Engine.WEIGHTS.order),
      tile('Bonus', bd.bonus, Engine.WEIGHTS.bonus),
      tile('Ceza', bd.penalty, 0, true),
    );

    const marks = { miss: '×', warn: '~', good: '✓' };
    $('#r-feedback').replaceChildren(...res.feedback.map((f) =>
      el('li', { class: `fb ${f.type}` }, el('span', { class: 'm', text: marks[f.type] }), el('span', { text: f.text }))));

    // Simülasyon
    const sim = res.simulation;
    const outcomeText = {
      stopped: `🛡 Saldırı "${sim.stoppedAt && sim.stoppedAt.stage}" aşamasında durduruldu.`,
      contained: '⚠ Saldırı önlenemedi, ancak tespit / kurtarma katmanları hasarı sınırladı.',
      breach: `✕ İhlal: saldırgan ${s.target.name} hedefine ulaştı.`,
    }[sim.outcome];
    $('#r-outcome').className = `outcome ${sim.outcome}`;
    $('#r-outcome').replaceChildren(outcomeText,
      el('span', { class: 'depth', text: `Savunma derinliği: ${sim.depth}/${sim.preventTotal} önleme aşaması bağımsız olarak kesiliyor · ${sim.blockedCount}/${sim.stages.length} aşama kontrol altında` }));

    $('#r-chain').replaceChildren(...sim.stages.map((st, i) =>
      el('li', { class: `kc${st.blocked ? ' blocked' : ''}`, style: `animation-delay:${i * 220}ms` },
        el('div', {},
          el('span', { class: 'st', text: st.stage }),
          el('span', { class: 'tech', text: st.technique }),
          el('span', { class: 'phase', text: st.phase === 'prevent' ? 'önleme' : 'kurtarma' })),
        el('div', { class: 'lbl', text: st.label }),
        el('div', { class: `status ${st.blocked ? 'ok' : 'fail'}` },
          st.blocked ? 'ENGELLENDİ' : 'GEÇTİ',
          st.blocked ? el('div', { class: 'muted', style: 'font-weight:400;letter-spacing:0', text: st.blockedBy.map((id) => L[id].name).join(', ') }) : null),
      )));

    // İdeal mimari
    $('#r-rationale').textContent = s.rationale;
    const missing = new Set(res.missing);
    $('#r-ideal').replaceChildren(
      el('li', { class: 'endpoint' }, el('span', { class: 'ico', text: s.source.icon }), el('div', {}, el('div', { class: 'name', text: s.source.name }))),
      ...s.ideal.map((id) => el('li', { class: missing.has(id) ? 'mark-missing' : '' },
        el('span', { class: 'ico', text: L[id].icon }),
        el('div', {}, el('div', { class: 'name', text: L[id].name }), el('div', { class: 'desc', text: L[id].desc })))),
      el('li', { class: 'target' }, el('span', { class: 'ico', text: s.target.icon }), el('div', {}, el('div', { class: 'name', text: s.target.name }))),
    );
  }

  function animateNumber(node, target) {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { node.textContent = String(target); return; }
    const start = performance.now();
    const dur = 700;
    const step = (now) => {
      const p = Math.min(1, (now - start) / dur);
      node.textContent = String(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // ---------- Görev listesi ----------
  function renderMissions() {
    const best = state.progress.best;
    const done = SCENARIOS.filter((s) => best[s.id] !== undefined);
    const total = done.reduce((sum, s) => sum + best[s.id], 0);
    $('#overall').innerHTML = '';
    $('#overall').append(
      'Tamamlanan: ', el('b', { text: `${done.length}/${SCENARIOS.length}` }),
      '  ·  Toplam puan: ', el('b', { text: `${total}/${SCENARIOS.length * 100}` }),
    );
    $('#mission-grid').replaceChildren(...SCENARIOS.map((s, i) => {
      const b = best[s.id];
      return el('li', {}, el('button', {
        class: `mcard${i === state.index ? ' current' : ''}`, type: 'button',
        onclick: () => { $('#missions-dialog').close(); loadMission(i); },
      },
        el('div', { class: 'top' }, `GÖREV ${String(i + 1).padStart(2, '0')}`, el('span', { class: 'badge', 'data-level': s.difficulty, text: s.difficulty })),
        el('div', { class: 't', text: s.title }),
        el('div', { class: `best${b !== undefined ? ' done' : ''}`, text: b !== undefined ? `En iyi: ${b}/100` : 'Henüz denenmedi' }),
      ));
    }));
  }

  function nextMission() {
    // Sıradaki, henüz 85 altında kalan göreve git
    for (let k = 1; k <= SCENARIOS.length; k++) {
      const i = (state.index + k) % SCENARIOS.length;
      if ((state.progress.best[SCENARIOS[i].id] ?? -1) < 85) return loadMission(i);
    }
    loadMission(state.index + 1);
  }

  // ---------- Olaylar ----------
  function bind() {
    $('#search').addEventListener('input', (e) => { state.query = e.target.value.trim(); renderPalette(); });
    $('#btn-eval').addEventListener('click', evaluateNow);
    $('#btn-clear').addEventListener('click', () => { state.placed = []; state.hinted = new Set(); renderPlacementChange(); });
    $('#btn-hint').addEventListener('click', useHint);
    $('#btn-retry').addEventListener('click', () => { showView('builder'); renderAll(); });
    $('#btn-next').addEventListener('click', nextMission);
    $('#btn-missions').addEventListener('click', () => { renderMissions(); $('#missions-dialog').showModal(); });
    $('#btn-close-missions').addEventListener('click', () => $('#missions-dialog').close());
    $('#missions-dialog').addEventListener('click', (e) => { if (e.target.id === 'missions-dialog') e.target.close(); });
    $('#btn-reset').addEventListener('click', () => {
      if (!confirm('Tüm görev puanları silinsin mi?')) return;
      state.progress = { best: {}, last: state.index };
      saveProgress();
      renderMissions();
    });
    setupDropzone();
  }

  // ---------- Başlat ----------
  // URL parametreleri: ?m=<görev-id> ile doğrudan görev açılır, &demo=1 ile örnek çözüm değerlendirilir.
  function init() {
    bind();
    const params = new URLSearchParams(location.search);
    const fromUrl = SCENARIOS.findIndex((s) => s.id === params.get('m'));
    loadMission(fromUrl !== -1 ? fromUrl : state.progress.last || 0);
    if (params.has('demo')) {
      state.demo = true;
      const s = scenario();
      state.placed = params.get('demo') === 'full' ? [...s.ideal, ...s.bonus.slice(0, 2)] : s.ideal.filter((_, i) => i % 2 === 1).concat(s.bonus.slice(0, 1));
      renderAll();
      if (params.has('eval')) evaluateNow();
    }
  }

  init();
})();
