/* =========================================================
   input.js : أزرار اللمس (متعدد اللمس) + لوحة المفاتيح
   + محرر أماكن الأزرار
   ========================================================= */
(function (LT) {
  'use strict';

  const I = LT.Input = {
    left: false, right: false, jump: false, act: false, down: false, dash: false,
    jumpP: false, actP: false, dashP: false, pauseP: false,
    visible: false, editing: false
  };

  const BTN = ['left', 'right', 'act', 'jump', 'dash'];
  const DEFAULT = {
    left: { x: 0.085, y: 0.80 },
    right: { x: 0.225, y: 0.80 },
    act: { x: 0.775, y: 0.83 },
    jump: { x: 0.915, y: 0.74 },
    dash: { x: 0.83, y: 0.56 }
  };
  const ICON = {
    left: '<svg viewBox="0 0 40 40"><path d="M26 8 L12 20 L26 32" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    right: '<svg viewBox="0 0 40 40"><path d="M14 8 L28 20 L14 32" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    jump: '<svg viewBox="0 0 40 40"><path d="M10 24 L20 13 L30 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 31 L28 31" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>',
    dash: '<svg viewBox="0 0 40 40"><path d="M8 14 H20 M5 20 H22 M8 26 H20" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><path d="M22 10 L33 20 L22 30" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    act: '<svg viewBox="0 0 40 40"><path d="M14 30 V15 a2.5 2.5 0 0 1 5 0 V22 V11 a2.5 2.5 0 0 1 5 0 V22 V13 a2.5 2.5 0 0 1 5 0 V24 c0 6 -3 9 -8 9 h-2 c-3 0 -5 -2 -7 -5 l-4 -6 a2.3 2.3 0 0 1 3.8 -2.6 L14 22" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/></svg>'
  };

  let els = {}, rects = {}, pointers = {}, kb = {}, touchState = {};
  let layer, pauseBtn, dragId = null, dragBtn = null;

  I.layout = function () {
    const d = LT.Save.data;
    return d.layout || LT.clone(DEFAULT);
  };

  I.init = function () {
    layer = document.getElementById('touch');
    BTN.forEach(function (k) {
      const b = document.createElement('div');
      b.className = 'tbtn tbtn-' + k;
      b.innerHTML = ICON[k];
      layer.appendChild(b);
      els[k] = b;
    });
    pauseBtn = document.getElementById('pausebtn');
    pauseBtn.addEventListener('pointerdown', function (e) {
      e.preventDefault(); e.stopPropagation();
      if (I.visible || LT.Game.state === 'play') I.pauseP = true;
    });

    this.applyLayout();
    window.addEventListener('resize', function () { setTimeout(function () { I.applyLayout(); }, 60); });

    // اللمس عبر Pointer Events (تدعم اللمس المتعدد)
    const opts = { passive: false };
    window.addEventListener('pointerdown', onDown, opts);
    window.addEventListener('pointermove', onMove, opts);
    window.addEventListener('pointerup', onUp, opts);
    window.addEventListener('pointercancel', onUp, opts);
    window.addEventListener('blur', function () { pointers = {}; kb = {}; refresh(); });

    // لوحة المفاتيح
    window.addEventListener('keydown', function (e) {
      if (e.repeat) { if (isGameKey(e.code)) e.preventDefault(); return; }
      kb[e.code] = true;
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'KeyK') I.jumpP = true;
      if (e.code === 'KeyE' || e.code === 'KeyJ' || e.code === 'Enter') I.actP = true;
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyL' || e.code === 'KeyX') I.dashP = true;
      if (e.code === 'Escape' || e.code === 'KeyP') I.pauseP = true;
      if (isGameKey(e.code) && LT.Game.state !== 'menu') e.preventDefault();
      refresh();
    });
    window.addEventListener('keyup', function (e) { kb[e.code] = false; refresh(); });
  };

  function isGameKey(c) {
    return ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(c) >= 0;
  }

  I.applyLayout = function () {
    if (!layer) return;
    const L = this.layout();
    const s = LT.Save.data.settings;
    const W = window.innerWidth, H = window.innerHeight;
    const base = Math.min(W, H) * 0.19 * s.btnSize;
    const size = LT.clamp(base, 48, 150);
    BTN.forEach(function (k) {
      const b = els[k];
      const p = L[k] || DEFAULT[k];
      const sz = (k === 'jump') ? size * 1.12 : size;
      b.style.width = sz + 'px';
      b.style.height = sz + 'px';
      b.style.left = (p.x * W - sz / 2) + 'px';
      b.style.top = (p.y * H - sz / 2) + 'px';
      b.style.opacity = I.editing ? 0.9 : s.btnOpacity;
      rects[k] = { cx: p.x * W, cy: p.y * H, r: sz * 0.62 };
    });
  };

  I.setVisible = function (v) {
    this.visible = v && LT.isTouch;
    layer.style.display = (this.visible || this.editing) ? 'block' : 'none';
    pauseBtn.style.display = v ? 'flex' : 'none';
    if (!v) { pointers = {}; refresh(); }
  };

  function hit(x, y) {
    let best = null, bd = 1e9;
    for (const k of BTN) {
      const r = rects[k];
      if (!r) continue;
      const d = Math.hypot(x - r.cx, y - r.cy);
      if (d < r.r * 1.15 && d < bd) { bd = d; best = k; }
    }
    return best;
  }

  function onDown(e) {
    if (I.editing) {
      const k = hit(e.clientX, e.clientY);
      if (k) { dragId = e.pointerId; dragBtn = k; e.preventDefault(); }
      return;
    }
    if (!I.visible) return;
    if (e.target && e.target.closest && e.target.closest('#ui, #pausebtn')) return;
    pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
    e.preventDefault();
    refresh();
  }
  function onMove(e) {
    if (I.editing && dragId === e.pointerId) {
      const L = I.layout();
      L[dragBtn] = { x: LT.clamp(e.clientX / window.innerWidth, 0.04, 0.96), y: LT.clamp(e.clientY / window.innerHeight, 0.08, 0.95) };
      LT.Save.data.layout = L;
      I.applyLayout();
      e.preventDefault();
      return;
    }
    if (pointers[e.pointerId]) {
      pointers[e.pointerId].x = e.clientX; pointers[e.pointerId].y = e.clientY;
      e.preventDefault();
      refresh();
    }
  }
  function onUp(e) {
    if (I.editing && dragId === e.pointerId) { dragId = null; dragBtn = null; LT.Save.write(); return; }
    if (pointers[e.pointerId]) { delete pointers[e.pointerId]; refresh(); }
  }

  function refresh() {
    const t = { left: false, right: false, jump: false, act: false, dash: false };
    for (const id in pointers) {
      const k = hit(pointers[id].x, pointers[id].y);
      if (k) t[k] = true;
    }
    if (t.jump && !touchState.jump) I.jumpP = true;
    if (t.act && !touchState.act) I.actP = true;
    if (t.dash && !touchState.dash) I.dashP = true;
    touchState = t;
    BTN.forEach(function (k) { els[k] && els[k].classList.toggle('on', !!t[k]); });

    I.left = t.left || !!(kb.ArrowLeft || kb.KeyA);
    I.right = t.right || !!(kb.ArrowRight || kb.KeyD);
    I.jump = t.jump || !!(kb.Space || kb.ArrowUp || kb.KeyW || kb.KeyK);
    I.act = t.act || !!(kb.KeyE || kb.KeyJ || kb.Enter);
    I.down = !!(kb.ArrowDown || kb.KeyS);
  }

  // لقطة من حالة الإدخال تُعطى لخطوة الفيزياء
  I.snapshot = function () {
    return { left: I.left, right: I.right, jump: I.jump, act: I.act, down: I.down, jumpP: I.jumpP, actP: I.actP, dashP: I.dashP };
  };
  I.clearEdges = function () { I.jumpP = false; I.actP = false; I.dashP = false; };
  // مؤشر انتظار الداش على الزر (0 = جاهز، 1 = بدأ الانتظار)
  let lastCD = -1;
  I.setDashCD = function (k) {
    k = Math.round(k * 20) / 20;
    if (k === lastCD || !els.dash) return;
    lastCD = k;
    els.dash.style.setProperty('--cd', (k * 360) + 'deg');
    els.dash.classList.toggle('cool', k > 0);
  };
  I.NONE = { left: false, right: false, jump: false, act: false, down: false, jumpP: false, actP: false, dashP: false };

  // ---------- محرر الأماكن ----------
  I.startEdit = function (onDone) {
    this.editing = true;
    layer.style.display = 'block';
    layer.classList.add('editing');
    this.applyLayout();
    const bar = document.getElementById('editbar');
    bar.style.display = 'flex';
    bar.querySelector('.eb-text').textContent = LT.t('editHelp');
    const bDone = bar.querySelector('.eb-done'), bReset = bar.querySelector('.eb-reset');
    bDone.textContent = LT.t('done');
    bReset.textContent = LT.t('resetLayout');
    bReset.onclick = function () { LT.Save.data.layout = null; LT.Save.write(); I.applyLayout(); };
    bDone.onclick = function () {
      I.editing = false;
      layer.classList.remove('editing');
      bar.style.display = 'none';
      LT.Save.write();
      I.applyLayout();
      I.setVisible(false);
      if (onDone) onDone();
    };
  };
})(window.LT);
