/* =========================================================
   ui.js : القوائم (الرئيسية، الفصول، الإعدادات، الإيقاف،
   معلومات، تأكيد) — عناصر HTML فوق اللوحة
   ========================================================= */
(function (LT) {
  'use strict';

  const UI = LT.UI = { root: null, current: null, stack: [] };

  function el(tag, cls, txt) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt !== undefined) e.textContent = txt;
    return e;
  }
  function btn(txt, fn, cls) {
    const b = el('button', 'btn ' + (cls || ''), txt);
    b.addEventListener('click', function (ev) { ev.stopPropagation(); LT.Audio.init(); LT.Audio.play('ui'); fn(); });
    return b;
  }

  UI.init = function () { this.root = document.getElementById('ui'); };

  UI.hideAll = function () { this.root.innerHTML = ''; this.root.style.display = 'none'; this.current = null; };

  UI.show = function (name, arg) {
    this.root.innerHTML = '';
    this.root.style.display = 'flex';
    this.current = name;
    const panel = el('div', 'panel panel-' + name);
    this.root.appendChild(panel);
    this['build_' + name](panel, arg);
  };

  // ---------- القائمة الرئيسية ----------
  UI.build_main = function (p) {
    const t = el('div', 'logo');
    t.appendChild(el('div', 'logo-main', LT.t('title')));
    t.appendChild(el('div', 'logo-sub', LT.t('subtitle')));
    p.appendChild(t);
    const m = el('div', 'menu');
    const save = LT.Save.data;
    if (save.current) m.appendChild(btn(LT.t('continue'), function () { LT.Game.continueGame(); }, 'primary'));
    m.appendChild(btn(LT.t('newgame'), function () {
      if (save.current) UI.confirm(LT.t('confirmNew'), function () { LT.Game.newGame(); }, function () { UI.show('main'); });
      else LT.Game.newGame();
    }, save.current ? '' : 'primary'));
    m.appendChild(btn(LT.t('chapters'), function () { UI.show('chapters'); }));
    m.appendChild(btn(LT.t('settings'), function () { UI.show('settings', 'main'); }));
    m.appendChild(btn(LT.t('language'), function () {
      LT.setLang(LT.lang === 'ar' ? 'en' : 'ar');
      LT.Save.data.settings.lang = LT.lang; LT.Save.write();
      UI.show('main');
    }, 'small'));
    m.appendChild(btn(LT.t('about'), function () { UI.show('about'); }, 'small'));
    p.appendChild(m);
    const n = save.clues.length;
    if (n > 0) p.appendChild(el('div', 'foot', LT.t('cluesFound') + ': ' + n + ' / ' + LT.CLUE_COUNT));
  };

  // ---------- اختيار الفصل ----------
  UI.build_chapters = function (p) {
    p.appendChild(el('h2', '', LT.t('chapters')));
    const g = el('div', 'grid');
    for (let i = 1; i <= 6; i++) {
      const open = i <= LT.Save.data.unlocked;
      const b = el('button', 'chap' + (open ? '' : ' locked'));
      b.appendChild(el('span', 'cn', LT.t('chNum')[i]));
      b.appendChild(el('span', 'cname', open ? LT.t('ch')[i] : LT.t('locked')));
      if (open) b.addEventListener('click', (function (k) { return function () { LT.Audio.init(); LT.Audio.play('ui'); LT.Game.startChapter(k); }; })(i));
      g.appendChild(b);
    }
    p.appendChild(g);
    p.appendChild(btn(LT.t('back'), function () { UI.show('main'); }, 'small'));
  };

  // ---------- الإعدادات ----------
  UI.build_settings = function (p, from) {
    const S = LT.Save.data.settings;
    p.appendChild(el('h2', '', LT.t('settings')));
    const list = el('div', 'settings');

    function slider(label, key, min, max, step, onch) {
      const row = el('label', 'row');
      row.appendChild(el('span', '', label));
      const r = el('input'); r.type = 'range'; r.min = min; r.max = max; r.step = step; r.value = S[key];
      r.addEventListener('input', function () { S[key] = parseFloat(r.value); LT.Save.write(); if (onch) onch(); });
      row.appendChild(r);
      list.appendChild(row);
    }
    function toggle(label, key, onch) {
      const row = el('div', 'row');
      row.appendChild(el('span', '', label));
      const b = el('button', 'tog' + (S[key] ? ' on' : ''), S[key] ? LT.t('on') : LT.t('off'));
      b.addEventListener('click', function () { S[key] = !S[key]; LT.Save.write(); b.className = 'tog' + (S[key] ? ' on' : ''); b.textContent = S[key] ? LT.t('on') : LT.t('off'); if (onch) onch(); });
      row.appendChild(b);
      list.appendChild(row);
    }
    function choice(label, key, opts, onch) {
      const row = el('div', 'row');
      row.appendChild(el('span', '', label));
      const wrap = el('div', 'seg');
      opts.forEach(function (o) {
        const b = el('button', S[key] === o[0] ? 'on' : '', o[1]);
        b.addEventListener('click', function () { S[key] = o[0]; LT.Save.write(); Array.prototype.forEach.call(wrap.children, function (c) { c.className = ''; }); b.className = 'on'; if (onch) onch(); });
        wrap.appendChild(b);
      });
      row.appendChild(wrap);
      list.appendChild(row);
    }

    slider(LT.t('master'), 'master', 0, 1, 0.05, function () { LT.Audio.applyVolumes(); });
    slider(LT.t('music'), 'music', 0, 1, 0.05, function () { LT.Audio.applyVolumes(); });
    slider(LT.t('sfx'), 'sfx', 0, 1, 0.05, function () { LT.Audio.applyVolumes(); });
    choice(LT.t('quality'), 'quality', [['low', LT.t('qLow')], ['medium', LT.t('qMed')], ['high', LT.t('qHigh')]], function () { LT.Render.resize(); });
    slider(LT.t('btnSize'), 'btnSize', 0.7, 1.5, 0.05, function () { LT.Input.applyLayout(); });
    slider(LT.t('btnOpacity'), 'btnOpacity', 0.15, 0.9, 0.05, function () { LT.Input.applyLayout(); });
    const lay = el('div', 'row');
    lay.appendChild(btn(LT.t('editLayout'), function () {
      UI.hideAll();
      LT.Input.startEdit(function () { UI.show('settings', from); });
    }, 'small wide'));
    list.appendChild(lay);
    toggle(LT.t('hints'), 'hints');
    toggle(LT.t('shake'), 'shake');
    toggle(LT.t('powerSave'), 'powerSave');
    toggle(LT.t('showFps'), 'showFps');
    choice(LT.t('lang'), 'lang', [['ar', 'العربية'], ['en', 'English']], function () { LT.setLang(S.lang); UI.show('settings', from); });
    if (from === 'main') {
      const rr = el('div', 'row');
      rr.appendChild(btn(LT.t('resetProgress'), function () {
        UI.confirm(LT.t('confirmReset'), function () { LT.Save.resetProgress(); UI.show('main'); }, function () { UI.show('settings', from); });
      }, 'small danger wide'));
      list.appendChild(rr);
    }
    p.appendChild(list);
    p.appendChild(btn(LT.t('back'), function () { UI.show(from === 'pause' ? 'pause' : 'main'); }, 'small'));
  };

  // ---------- الإيقاف المؤقت ----------
  UI.build_pause = function (p) {
    p.appendChild(el('h2', '', LT.t('paused')));
    const m = el('div', 'menu');
    m.appendChild(btn(LT.t('resume'), function () { LT.Game.resume(); }, 'primary'));
    m.appendChild(btn(LT.t('restartCp'), function () { LT.Game.restartCheckpoint(); }));
    m.appendChild(btn(LT.t('restartCh'), function () { LT.Game.restartChapter(); }));
    m.appendChild(btn(LT.t('settings'), function () { UI.show('settings', 'pause'); }));
    m.appendChild(btn(LT.t('mainmenu'), function () { LT.Game.toMenu(); }, 'small'));
    p.appendChild(m);
    const ch = LT.Game.ch;
    if (ch) p.appendChild(el('div', 'foot', LT.t('chNum')[ch] + ' — ' + LT.t('ch')[ch]));
  };

  // ---------- معلومات ----------
  UI.build_about = function (p) {
    p.appendChild(el('h2', '', LT.t('about')));
    const t = el('div', 'about');
    LT.t('aboutText').split('\n').forEach(function (line) { t.appendChild(el('p', '', line)); });
    t.appendChild(el('p', 'ver', 'v' + LT.VERSION));
    p.appendChild(t);
    p.appendChild(btn(LT.t('back'), function () { UI.show('main'); }, 'small'));
  };

  // ---------- تأكيد ----------
  UI.confirm = function (msg, yes, no) {
    this.show('confirm', { msg: msg, yes: yes, no: no });
  };
  UI.build_confirm = function (p, a) {
    p.appendChild(el('p', 'msg', a.msg));
    const m = el('div', 'row2');
    m.appendChild(btn(LT.t('yes'), a.yes, 'danger'));
    m.appendChild(btn(LT.t('no'), a.no, 'primary'));
    p.appendChild(m);
  };
})(window.LT);
