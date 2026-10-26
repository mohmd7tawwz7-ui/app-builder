/* =========================================================
   game.js : الحلقة الرئيسية، حالات اللعبة، الموت وإعادة
   المحاولة، الفصول، المشاهد السينمائية، النصوص
   ========================================================= */
(function (LT) {
  'use strict';

  const G = LT.Game = {
    state: 'menu',          // menu | play | pause | cine
    world: null, ch: 0,
    fade: 1, whiteFade: 0, letter: 0, letterTarget: 0,
    texts: [], tension: 0, saveNote: 0,
    menuT: 0, menuCam: { x: 0, y: 0 },
    cine: null, lock: false, cineInput: null,
    deathT: -1, respawning: false,
    seenCine: {}, alarm: false, godMode: false,
    _last: 0, _acc: 0, _skip: 0
  };

  G.init = function () {
    LT.Render.buildTheme('pods');
    this.menuCam = { x: 0, y: 0 };
    requestAnimationFrame((t) => this.loop(t));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { if (this.state === 'play') this.pause(); LT.Audio.suspend(); }
      else if (this.state !== 'pause') LT.Audio.resume();
    });
  };

  // ---------- النصوص على الشاشة ----------
  G.addText = function (s, o) {
    o = o || {};
    const tx = { s: s, alpha: 0, t: 0, d: o.d || 3, fin: o.fin || 0.9, fout: o.fout || 1, size: o.size || 22, y: o.y, weight: o.weight, color: o.color, spacing: o.spacing, id: o.id };
    this.texts.push(tx);
    return tx;
  };
  G.clearTexts = function () { this.texts.length = 0; };

  // ---------- بدء الفصول ----------
  G.startChapter = function (n, snap) {
    LT.Audio.init();
    const def = LT.LEVELS[n];
    this.ch = n;
    this.world = new LT.World(def, n, this);
    LT.Render.buildTheme(def.theme);
    LT.Render.prepDeco(this.world);
    LT.Audio.setTheme(def.theme);
    LT.Audio.setMusic(def.music || 'calm');
    LT.Audio.tension = 0;
    this.tension = 0;
    this.alarm = !!def.alarm;
    this.clearTexts();
    this.thinkQ = []; this.thoughtsOn = [];
    this.cine = null; this.lock = false;
    this.deathT = -1; this.respawning = false;
    this.letter = 0; this.letterTarget = 0;
    this.whiteFade = 0;
    if (snap) {
      this.world.applySnapshot(snap);
      this.world.snapshot = snap;
      // نعلّم المشاهد التي سبقت نقطة الحفظ كمشاهدة
      this.seenCine = {};
      for (const e of this.world.ents) if (e.t === 'cine' && e.done) this.seenCine[e.cid] = true;
    } else {
      this.seenCine = {};
      this.world.snapshot = this.world.takeSnapshot('start');
    }
    const s = this.world.snapshot;
    LT.Save.setCurrent(n, s);
    this.state = 'play';
    this.fade = 1;
    LT.UI.hideAll();
    LT.Input.setVisible(true);
    this._acc = 0;
    if (!snap || snap.cp === 'start') this.runCine('intro' + n);
    else { this.fadeTo(0, 1.2); this.chapterCard(n, true); }
  };

  G.newGame = function () {
    LT.Save.data.current = null;
    LT.Save.write();
    this.startChapter(1);
  };
  G.continueGame = function () {
    const c = LT.Save.data.current;
    if (c && LT.LEVELS[c.ch]) this.startChapter(c.ch, c.snap);
    else this.startChapter(1);
  };

  G.chapterCard = function (n, short) {
    const VH = LT.C.VIEW_H;
    this.addText(LT.t('chNum')[n], { d: short ? 2 : 3.2, size: 15, y: VH * 0.42, spacing: 2, color: '#bdbab3' });
    this.addText(LT.t('ch')[n], { d: short ? 2 : 3.2, size: 30, y: VH * 0.5 });
  };

  // ---------- الإيقاف المؤقت ----------
  G.pause = function () {
    if (this.state !== 'play' && this.state !== 'cine') return;
    this.prevState = this.state;
    this.state = 'pause';
    LT.Input.setVisible(false);
    LT.Audio.suspend();
    LT.UI.show('pause');
  };
  G.resume = function () {
    if (this.state !== 'pause') return;
    this.state = this.prevState || 'play';
    LT.UI.hideAll();
    LT.Input.setVisible(!this.lock);
    LT.Audio.resume();
    this._last = performance.now();
  };
  G.toMenu = function () {
    this.state = 'menu';
    this.world = null;
    this.cine = null; this.lock = false;
    this.clearTexts();
    this.thinkQ = []; this.thoughtsOn = [];
    this.tension = 0; this.letter = 0; this.letterTarget = 0; this.whiteFade = 0; this.alarm = false;
    LT.Input.setVisible(false);
    LT.Render.buildTheme('pods');
    LT.Audio.resume();
    LT.Audio.setTheme('menu');
    LT.Audio.setMusic('calm');
    LT.Audio.tension = 0;
    this.fade = 1; this.fadeTo(0, 1.5);
    LT.UI.show('main');
  };
  G.restartCheckpoint = function () {
    if (!this.world) return;
    LT.Audio.resume();
    this.state = 'play';
    LT.UI.hideAll();
    LT.Input.setVisible(true);
    this.respawn(true);
  };
  G.restartChapter = function () {
    LT.Audio.resume();
    this.startChapter(this.ch);
  };

  // ---------- التلاشي ----------
  G.fadeTo = function (v, d, cb) { this._fade = { from: this.fade, to: v, t: 0, d: d || 1, cb: cb }; };

  // ---------- الموت ----------
  G.onDeath = function (cause) {
    const W = this.world, p = W.player;
    this.deathT = 0;
    LT.Input.clearEdges();
    const cx = p.cx, cy = p.y + p.h / 2;
    switch (cause) {
      case 'spike': case 'crush':
        W.burst(cx, cy, 26, { k: 'shard', sp: 260, life: 1.2, s: 4, g: 1200, spread: 6 });
        W.burst(cx, cy, 10, { k: 'dust', sp: 80, life: 1, s: 3, g: -10, spread: 6 });
        W.snd(cause === 'crush' ? 'thud' : 'crack', cx); W.shake(7); break;
      case 'fall':
        W.burst(cx, p.y + p.h, 14, { k: 'dust', sp: 120, life: 1, s: 3, g: -10, spread: 3 });
        W.snd('thud', cx); W.shake(6); break;
      case 'electric': case 'robot':
        W.flash = 1;
        W.burst(cx, cy, 30, { k: 'spark', sp: 300, life: 0.6, s: 1.6, g: 800, spread: 6 });
        W.burst(cx, cy, 10, { k: 'smoke', sp: 30, life: 1.6, s: 7, g: -30, spread: 6 });
        W.snd('zap', cx); W.shake(5); break;
      case 'drown':
        for (let i = 0; i < 10; i++) W.spawn({ k: 'bubble', x: cx + (Math.random() - 0.5) * 16, y: cy, vx: 0, vy: -40 - Math.random() * 40, life: 1 + Math.random(), s: 1.5 + Math.random() * 2, g: -20 });
        W.snd('bubble', cx); break;
      case 'shadow':
        W.burst(cx, cy, 40, { k: 'smoke', sp: 90, life: 1.6, s: 10, g: -20, spread: 6 });
        W.snd('shadow', cx); break;
      case 'acid':
        for (let i = 0; i < 24; i++) W.spawn({ k: 'fume', x: cx + (Math.random() - 0.5) * 30, y: p.y + p.h * Math.random(), vx: (Math.random() - 0.5) * 40, vy: -30 - Math.random() * 40, life: 2, s: 8 + Math.random() * 10, g: 0 });
        W.burst(cx, p.y + p.h, 12, { k: 'acidb', sp: 60, life: 0.8, s: 3, g: -40, spread: 3 });
        W.snd('sizzle', cx); break;
      case 'pit':
        W.snd('whoosh', cx); break;
    }
    setTimeout(() => LT.Audio.play('death'), 120);
    LT.Audio.setMusic('none');
  };

  G.respawn = function (immediate) {
    const W = this.world;
    const go = () => {
      W.applySnapshot(W.snapshot);
      this.deathT = -1; this.respawning = false;
      this.tension = 0; LT.Audio.tension = 0;
      LT.Audio.setMusic(W.def.music || 'calm');
      this.cine = null; this.lock = false; this.letterTarget = 0;
      LT.Input.setVisible(true);
      for (const e of W.ents) if (e.t === 'cine' && this.seenCine[e.cid]) e.done = true;
      this.fadeTo(0, 0.6);
    };
    if (immediate) { this.fade = 1; go(); return; }
    this.respawning = true;
    this.fadeTo(1, 0.45, go);
  };

  G.onCheckpoint = function (snap) {
    LT.Save.setCurrent(this.ch, snap);
    this.saveNote = 2;
    LT.Audio.play('save');
  };

  G.onChase = function (on) {
    if (on) { LT.Audio.setMusic('chase'); this.tension = 0.4; }
    else { LT.Audio.setMusic('none'); this.tension = 0; setTimeout(() => { if (this.world && this.state !== 'menu') LT.Audio.setMusic(this.world.def.music || 'calm'); }, 4000); }
  };

  // ---------- الحوار الداخلي ----------
  G.thinkQ = []; G.thoughtsOn = [];
  G.think = function (id) {
    const L = LT.STORY && LT.STORY.thoughts[id];
    if (!L) return;
    if (!this.thinkQ.length && !this.thoughtsOn.length) LT.Audio.play('think');
    for (const l of L) this.thinkQ.push(l);
  };
  G.updateThoughts = function (dt) {
    const on = this.thoughtsOn;
    for (let i = on.length - 1; i >= 0; i--) {
      const th = on[i];
      th.t += dt;
      th.alpha = th.t < 0.4 ? th.t / 0.4 : (th.t > th.d ? Math.max(0, 1 - (th.t - th.d) / 0.6) : 1);
      if (th.t > th.d + 0.6) on.splice(i, 1);
    }
    const cur = on[on.length - 1];
    if (this.thinkQ.length && (!cur || cur.t > cur.d - 0.2)) {
      const l = this.thinkQ.shift();
      const s = l[LT.lang === 'ar' ? 1 : 2];
      on.push({ who: l[0], s: s, t: 0, d: 1.8 + s.length * 0.055, alpha: 0 });
      if (on.length > 2) on.shift();
    }
  };
  G.onPiece = function (e) {
    const W = this.world;
    const all = W.ents.filter((q) => q.t === 'piece' && q.group === e.group);
    const got = all.filter((q) => q.got).length;
    this.texts = this.texts.filter((t) => t.id !== 'piece');
    this.addText(LT.t('pieceGot') + '  ' + got + ' / ' + all.length, { d: 1.6, size: 15, y: LT.C.VIEW_H * 0.2, color: '#e7c27f', id: 'piece' });
  };
  G.onSocketEmpty = function () {
    this.texts = this.texts.filter((t) => t.id !== 'piece');
    this.addText(LT.t('needPieces'), { d: 1.6, size: 15, y: LT.C.VIEW_H * 0.2, color: '#bdb6a6', id: 'piece' });
  };

  G.showClue = function (cid) {
    this.texts = this.texts.filter((t) => t.id !== 'clue');
    this.addText(LT.clueText(cid), { d: 4.5, size: 19, y: LT.C.VIEW_H * 0.2, color: '#e9d9b8', id: 'clue' });
    const n = LT.Save.data.clues.length;
    this.addText(LT.t('cluesFound') + '  ' + n + ' / ' + LT.CLUE_COUNT, { d: 3, size: 12, y: LT.C.VIEW_H * 0.2 + 30, color: '#a39a88', id: 'clue' });
  };

  G.nextChapter = function () {
    const n = this.ch + 1;
    if (n > 15) return;
    LT.Save.data.unlocked = Math.max(LT.Save.data.unlocked, n);
    LT.Save.write();
    this.lock = true;
    LT.Input.setVisible(false);
    this.cineInput = { right: true };
    this.fadeTo(1, 1.6, () => { this.cineInput = null; this.startChapter(n); });
  };

  // ---------- المشاهد السينمائية ----------
  const CINE = {
    intro1: function (G, W) {
      const p = W.player;
      const pod = W.ents.find((e) => e.t === 'pod' && e.num === '08');
      const VH = LT.C.VIEW_H;
      return [
        { lock: true }, { letter: 1 }, { fn: () => { G.fade = 1; p.pose = 'sleep'; p.poseT = 0; LT.Audio.setMusic('none'); } },
        { wait: 1.0 },
        { fade: 0, d: 3.5 },
        { fn: () => G.addText(LT.t('title'), { d: 3.5, size: 44, y: VH * 0.36, spacing: 6, weight: '300' }) },
        { fn: () => G.addText(LT.t('subtitle'), { d: 3.5, size: 13, y: VH * 0.36 + 44, spacing: 4, color: '#9c988f' }) },
        { wait: 4.6 },
        { fn: () => { LT.Audio.play('tick', p.cx, { v: 1.4 }); } }, { wait: 0.5 },
        { fn: () => { LT.Audio.play('tick', p.cx, { v: 1.6 }); W.shake(1); } }, { wait: 0.4 },
        { fn: () => {
            LT.Audio.play('glass', p.cx); W.shake(5); W.flash = 0.4;
            if (pod) pod.broken = true;
            for (let i = 0; i < 40; i++) W.spawn({ k: 'shardg', x: p.cx + (Math.random() - 0.5) * 50, y: p.y - 60 + Math.random() * 120, vx: (Math.random() - 0.2) * 300, vy: -Math.random() * 280, life: 1.5, s: 2 + Math.random() * 4, g: 1200, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 16 });
            for (let i = 0; i < 14; i++) W.spawn({ k: 'fume', x: p.cx + (Math.random() - 0.5) * 40, y: p.y, vx: (Math.random() - 0.5) * 30, vy: -20, life: 2.5, s: 12, g: 0 });
            p.pose = 'wake'; p.poseT = 0; LT.Audio.play('breath', null, { v: 1.6 });
          } },
        { wait: 2.6 },
        { fn: () => { p.pose = null; LT.Audio.setMusic('dark'); } },
        { letter: 0 }, { lock: false },
        { fn: () => G.chapterCard(1) },
        { wait: 2.2 },
        { fn: () => G.think('t1a') }
      ];
    },
    introN: function (G, W) {
      return [
        { lock: true }, { letter: 1 }, { fn: () => { G.fade = 1; } },
        { fade: 0, d: 1.6 },
        { fn: () => G.chapterCard(G.ch) },
        { walk: 1, d: 1.1 },
        { letter: 0 }, { lock: false }
      ];
    },
    dread: function (G, W) {
      const p = W.player;
      return [
        { lock: true }, { letter: 1 },
        { fn: () => { LT.Audio.setMusic('none'); LT.Audio.play('sting'); } },
        { wait: 0.6 },
        { cam: { x: p.cx - 380, y: p.y - 40, k: 2.2 } },
        { fn: () => { for (let i = 0; i < 40; i++) W.spawn({ k: 'smoke', x: p.cx - 560 + Math.random() * 160, y: p.y - 200 + Math.random() * 300, vx: 30 + Math.random() * 30, vy: (Math.random() - 0.5) * 20, life: 2.2, s: 14 + Math.random() * 14, g: 0 }); } },
        { wait: 1.6 },
        { fn: () => { W.shake(3); LT.Audio.play('shadow', p.cx - 400); } },
        { cam: null }, { wait: 0.5 },
        { letter: 0 }, { lock: false }
      ];
    },
    reveal: function (G, W) {
      const sf = W.ents.find((e) => e.t === 'shadowfig');
      return [
        { lock: true }, { letter: 1 },
        { fn: () => LT.Audio.setMusic('none') },
        { cam: { x: sf ? sf.x - 60 : W.player.cx + 300, y: 380, k: 1.5 } },
        { wait: 3.2 },
        { fn: () => { const l = W.ents.find((e) => e.t === 'lamp' && Math.abs(e.x - 3120) < 5); if (l) { l.lv = 0; } if (sf) { sf.st = 2; W.burst(sf.x, sf.y - 30, 40, { k: 'smoke', sp: 70, life: 2, s: 10, g: -20, spread: 6, h: 50 }); } LT.Audio.play('shadow', sf ? sf.x : 0); W.shake(2); } },
        { wait: 1.2 },
        { cam: null }, { wait: 0.4 },
        { letter: 0 }, { lock: false },
        { fn: () => LT.Audio.setMusic('dark') }
      ];
    },
    ending: function (G, W, src) {
      const p = W.player;
      const pod9 = W.ents.find((e) => e.t === 'pod' && e.num === '09');
      const sf = W.ents.find((e) => e.t === 'shadowfig');
      const VH = LT.C.VIEW_H;
      return [
        { lock: true }, { letter: 1 },
        { fn: () => { LT.Audio.setMusic('end'); } },
        { cam: { x: (pod9 ? pod9.x : p.cx) - 80, y: p.y - 40, k: 1.2 } },
        { wait: 1.4 },
        { fn: () => {
            W.ents.filter((e) => e.t === 'glass' && !e.broken).forEach((g) => LT.Ent.glass.shatter(g, W, 'box'));
            W.shake(9); W.flash = 0.9; LT.Audio.play('slam'); LT.Audio.play('robotdie');
          } },
        { wait: 1.2 },
        { fn: () => {
            G.alarm = false;
            W.ents = W.ents.filter((e) => e.t !== 'elec' && e.t !== 'robot'); W.index();
            W.ents.forEach((e) => { if (e.t === 'lamp') e.sig = '__off'; if (e.t === 'pod') { e.active = false; e.lit = 0; e.wake = false; } });
            LT.Audio.play('rumble');
          } },
        { fn: () => G.addText(LT.t('ending1'), { d: 3.2, size: 22, y: VH * 0.22 }) }, { wait: 4.2 },
        { fn: () => { if (sf) { sf.x = p.cx - 110; sf.y = p.y + p.h; sf.facing = 1; sf.st = 1; sf.vis = 0; sf.near = 0; sf.trig = -1e9; } LT.Audio.play('shadow', p.cx - 110); } },
        { fn: () => G.addText(LT.t('ending2'), { d: 3.4, size: 22, y: VH * 0.22 }) }, { wait: 4.4 },
        { fn: () => { if (sf) { sf.st = 2; W.burst(sf.x, sf.y - 30, 40, { k: 'smoke', sp: 50, life: 2.4, s: 10, g: -25, spread: 6, h: 50 }); } } },
        { fn: () => G.addText(LT.t('ending3'), { d: 3.2, size: 22, y: VH * 0.22 }) }, { wait: 3.6 },
        { cam: null },
        { walk: 1, d: 2.6 },
        { white: 1, d: 2.4 },
        { fn: () => G.addText(LT.t('ending4'), { d: 3.4, size: 28, y: VH * 0.5, color: '#2a2a2a', spacing: 2 }) },
        { wait: 4.6 },
        { fn: () => { G.fade = 1; G.whiteFade = 0; G._white = null; } },
        { wait: 1.2 },
        { fn: () => G.addText(LT.t('title'), { d: 4, size: 44, y: VH * 0.45, spacing: 6, weight: '300' }) },
        { wait: 5 },
        { fn: () => G.addText(LT.t('theEnd'), { d: 3, size: 22, y: VH * 0.5, color: '#bdb6a6' }) },
        { wait: 4 },
        { fn: () => G.addText(LT.t('thanks'), { d: 3, size: 16, y: VH * 0.5, color: '#9c988f' }) },
        { wait: 4 },
        { fn: () => { LT.Save.data.completed = true; if (LT.Platform) LT.Platform.happy(); LT.Save.data.current = null; LT.Save.data.unlocked = 15; LT.Save.write(); G.toMenu(); } }
      ];
    }
  };

  G.runCine = function (id, src) {
    if (this.seenCine[id] && id !== 'ending') return;
    let f = CINE[id];
    if (!f && /^intro\d+$/.test(id)) f = CINE.introN;
    if (!f) return;
    if (id !== 'ending' && id.indexOf('intro') !== 0) this.seenCine[id] = true;
    this.cine = { steps: f(this, this.world, src), i: 0, t: 0, started: false };
    this.state = 'cine';
  };

  G.updateCine = function (dt) {
    const c = this.cine;
    if (!c) return;
    const W = this.world;
    while (c.i < c.steps.length) {
      const s = c.steps[c.i];
      if (!c.started) {
        c.started = true; c.t = 0;
        if (s.lock !== undefined) { this.lock = s.lock; LT.Input.setVisible(!s.lock); if (s.lock) LT.Input.clearEdges(); }
        if (s.letter !== undefined) this.letterTarget = s.letter;
        if (s.fn) s.fn();
        if (s.fade !== undefined) this.fadeTo(s.fade, s.d);
        if (s.white !== undefined) this._white = { from: this.whiteFade, to: s.white, t: 0, d: s.d || 0.3 };
        if (s.cam !== undefined) W.cam.ov = s.cam;
        if (s.walk !== undefined) this.cineInput = { right: s.walk > 0, left: s.walk < 0 };
      }
      const dur = s.wait || s.d || 0;
      if (c.t < dur) { c.t += dt; return; }
      if (s.walk !== undefined) this.cineInput = null;
      c.i++; c.started = false;
    }
    this.cine = null;
    if (this.state === 'cine') this.state = 'play';
  };

  // ---------- الحلقة الرئيسية ----------
  G.loop = function (ts) {
    requestAnimationFrame((t) => this.loop(t));
    let dt = (ts - (this._last || ts)) / 1000;
    this._last = ts;
    if (dt > 0.1) dt = 0.1;
    if (LT.Save.data.settings.powerSave) {
      this._skip = (this._skip || 0) + dt;
      if (this._skip < 1 / 31) return;
      dt = this._skip; this._skip = 0;
    }
    if (LT.Input.pauseP) {
      LT.Input.pauseP = false;
      if (this.state === 'play' || this.state === 'cine') this.pause();
      else if (this.state === 'pause') this.resume();
    }
    this.update(dt);
    LT.Render.draw(this);
    if (this.state === 'play' || this.state === 'cine') LT.Render.autoTune(dt);
    if (LT.Platform) LT.Platform.tick(this);
  };

  G.update = function (dt) {
    // التلاشي
    if (this._fade) {
      const f = this._fade; f.t += dt;
      this.fade = LT.lerp(f.from, f.to, LT.clamp(f.t / f.d, 0, 1));
      if (f.t >= f.d) { this._fade = null; if (f.cb) f.cb(); }
    }
    if (this._white) {
      const f = this._white; f.t += dt;
      this.whiteFade = LT.lerp(f.from, f.to, LT.clamp(f.t / f.d, 0, 1));
      if (f.t >= f.d) this._white = null;
    }
    this.letter = LT.approach(this.letter, this.letterTarget, dt * 1.2);
    if (this.state !== 'pause') this.updateThoughts(dt);
    this.saveNote = Math.max(0, this.saveNote - dt);
    // النصوص
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const tx = this.texts[i];
      tx.t += dt;
      if (tx.t < tx.fin) tx.alpha = tx.t / tx.fin;
      else if (tx.t < tx.fin + tx.d) tx.alpha = 1;
      else if (tx.t < tx.fin + tx.d + tx.fout) tx.alpha = 1 - (tx.t - tx.fin - tx.d) / tx.fout;
      else this.texts.splice(i, 1);
    }

    if (this.state === 'menu' || !this.world) {
      this.menuT += dt;
      this.menuCam.x += dt * 18;
      this.menuCam.y = 0;
      LT.Audio.update(dt, this);
      return;
    }
    if (this.state === 'pause') return;

    const W = this.world;
    if (this.cine) this.updateCine(dt);

    // خطوات الفيزياء الثابتة
    this._acc += dt;
    const step = LT.C.STEP;
    let n = 0;
    while (this._acc >= step && n < 12) {
      let inp;
      if (this.lock || this.respawning) inp = Object.assign({}, LT.Input.NONE, this.cineInput || {});
      else { inp = LT.Input.snapshot(); if (n > 0) { inp.jumpP = false; inp.actP = false; inp.dashP = false; } }
      W.step(step, inp);
      this._acc -= step; n++;
    }
    if (n > 0 && !this.lock) LT.Input.clearEdges();
    if (this._acc > step * 4) this._acc = 0;

    W.frame(dt);
    LT.Render.ambient(W, dt);
    LT.Input.setDashCD(W.player.dashCD / LT.C.DASH_CD);

    // الموت → إعادة المحاولة
    if (this.deathT >= 0 && !this.respawning) {
      this.deathT += dt;
      if (this.deathT > 1.5) this.respawn(false);
    }
    if (this.tension > 0 && !W.ents.some((e) => e.t === 'chaser' && e.on)) this.tension = Math.max(0, this.tension - dt * 0.5);
    LT.Audio.tension = this.tension;
    LT.Audio.update(dt, this);
  };
})(window.LT);
