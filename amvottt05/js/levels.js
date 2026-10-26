/* =========================================================
   levels.js : فصول الجزء الثاني (15 فصلًا)
   تُبنى الفصول من «غرف» جاهزة (rooms) — كل غرفة لغز أو تحدٍّ.
   كل غرفة تضيف أيضًا «حلًّا آليًا» (solve) يُستخدم لاختبار أن
   الفصل قابل للإنهاء — لا يراه اللاعب.
   الإحداثيات: y يزداد للأسفل. الأرض الأساسية y = 600.
   مرجع الحركة: القفز ≈ 109، التعلق بالحافة ≤ ~150،
   القفزة الأفقية ≈ 150، مع الداش ≈ 230، السقوط القاتل > 385.
   ========================================================= */
(function (LT) {
  'use strict';

  // ---------------- أداة البناء ----------------
  function Ch(o) {
    const c = Object.assign({ solids: [], ents: [], deco: [], fg: [], solve: [], x: 0, y: 600, nid: 0, minY: 600, maxY: 600 }, o);
    c.g = function (x1, x2, top) { this.solids.push([x1, top, x2 - x1, 2600 - top]); this.track(top); return this; };
    c.b = function (x, y, w, h) { this.solids.push([x, y, w, h]); return this; };
    c.e = function (t, p) { p = p || {}; p.t = t; if (!p.id) p.id = t + '_' + (this.nid++); this.ents.push(p); return p; };
    c.d = function () { this.deco.push(Array.prototype.slice.call(arguments)); return this; };
    c.S = function () { for (let i = 0; i < arguments.length; i++) { const a = arguments[i]; if (Array.isArray(a)) this.solve.push.apply(this.solve, a); else this.solve.push(a); } return this; };
    c.track = function (y) { this.minY = Math.min(this.minY, y); this.maxY = Math.max(this.maxY, y); };
    c.cp = function (dx) { this.e('checkpoint', { x: this.x + (dx || 20) }); return this; };
    c.think = function (id, dx) { this.e('thought', { x: this.x + (dx || 0), id: id }); return this; };
    c.uid = function (p) { return p + '_' + (this.nid++); };
    return c;
  }
  function finish(c) {
    const X = c.x;
    c.g(X, X + 420, c.y);
    c.e('exit', { x: X + 300 });
    c.b(X + 420, c.y - 2000, 300, 4600);
    c.b(-500, -2400, 400, 5000);
    c.width = X + 420;
    c.bottom = c.maxY + 520;
    c.camMin = -100;
    delete c.g; delete c.b; delete c.e; delete c.d; delete c.S; delete c.track; delete c.cp; delete c.think; delete c.uid;
    return c;
  }

  // ---------------- مقاطع حلول جاهزة (للاختبار الآلي) ----------------
  const onG = (P) => P.onGround && P.state === 'normal';
  const J = (edge) => [{ r: 1, ux: edge - 2 }, { r: 1, j: 1, t: 0.2 }, { r: 1, until: onG, t: 3 }];
  const JD = (edge) => [{ r: 1, ux: edge - 2 }, { r: 1, j: 1, t: 0.3 }, { r: 1, D: 1, t: 0.05 }, { r: 1, until: onG, t: 3 }];
  const CLIMB = (wallX, topY) => [{ r: 1, ux: wallX - 1 }, { r: 1, j: 1, t: 0.15 }, { r: 1, until: (P) => onG(P) && P.y + P.h <= topY + 1, t: 3 }];
  const WAITCD = { until: (P) => P.dashCD <= 0, t: 3 };
  const byId = (W, id) => W.byId[id];

  // ================= الغرف =================
  const R = {};

  // أرض مستوية
  R.flat = function (c, len) { c.g(c.x, c.x + len, c.y); c.S({ r: 1, ux: c.x + len - 40 }); c.x += len; };

  // حفرة يُقفز فوقها (spikes | acid | deep). أكثر من 140 تحتاج داش
  R.pit = function (c, gap, haz) {
    const X = c.x, Y = c.y;
    c.g(X, X + 100, Y);
    const a = X + 100, b = a + gap;
    if (haz === 'acid') { c.g(a, b, Y + 170); c.e('water', { x: a, y: Y + 40, w: gap, h: 130, acid: true }); }
    else if (haz === 'spikes') { c.g(a, b, Y + 150); c.e('spikes', { x: a, y: Y + 128, w: gap }); }
    c.g(b, b + 160, Y);
    if (gap > 140) c.S(WAITCD, JD(a)); else c.S(J(a));
    c.x = b + 160;
  };

  // درجة صعود / نزول
  R.up = function (c, h) {
    const X = c.x, Y = c.y;
    c.g(X, X + 120, Y);
    c.g(X + 120, X + 260, Y - h);
    c.S(h <= 95 ? [{ r: 1, ux: X + 118 }, { r: 1, j: 1, t: 0.15 }, { r: 1, until: (P) => onG(P) && P.y + P.h <= Y - h + 1, t: 3 }] : CLIMB(X + 120, Y - h));
    c.y -= h; c.x = X + 260;
  };
  R.down = function (c, h) {
    const X = c.x, Y = c.y;
    c.g(X, X + 120, Y);
    c.g(X + 120, X + 260, Y + h);
    c.S({ r: 1, until: (P) => onG(P) && P.y + P.h >= Y + h - 1, t: 3 });
    c.y += h; c.x = X + 260;
  };

  // منصات تنهار فوق الحمض
  R.crumble = function (c, n, gap, respawn) {
    const X = c.x, Y = c.y, w = 90;
    gap = gap || 70;
    c.g(X, X + 80, Y);
    const L = n * w + (n + 1) * gap;
    c.g(X + 80, X + 80 + L, Y + 170);
    c.e('water', { x: X + 80, y: Y + 40, w: L, h: 130, acid: true });
    const edges = [X + 80];
    for (let i = 0; i < n; i++) {
      const px = X + 80 + gap + i * (w + gap);
      c.e('crumble', { x: px, y: Y, w: w, delay: 0.5, respawn: respawn || 3 });
      edges.push(px + w);
    }
    c.g(X + 80 + L, X + 80 + L + 140, Y);
    for (const e of edges) c.S(J(e));
    c.x = X + 80 + L + 140;
  };

  // ممر مناشير
  R.saws = function (c, n) {
    const X = c.x, Y = c.y;
    c.g(X, X + 160 + n * 170, Y);
    const ids = [];
    for (let i = 0; i < n; i++) {
      const s = c.e('saw', { x: X + 160 + i * 170, y: Y - 180, x2: X + 160 + i * 170, y2: Y - 26, r: 26, per: 2.2, off: i * 1.1 });
      ids.push(s.id);
    }
    ids.forEach(function (id, i) {
      c.S({ r: 1, ux: X + 160 + i * 170 - 40 }, { until: (P, W) => byId(W, id).cy < Y - 170, t: 4 }, { r: 1, ux: X + 160 + i * 170 + 70 });
    });
    c.x = X + 160 + n * 170;
  };

  // بوابات ليزر بتوقيت
  R.lasers = function (c, n, per) {
    const X = c.x, Y = c.y;
    per = per || 2.4;
    c.g(X, X + 120 + n * 150, Y);
    for (let i = 0; i < n; i++) {
      const lx = X + 120 + i * 150;
      const off = i * 0.7;
      c.e('elec', { red: true, x: lx, y: Y - 170, w: 6, h: 170, per: per, duty: 0.5, off: off });
      c.S({ r: 1, ux: lx - 26 }, { until: (P, W) => { const ph = ((W.time + off) % per) / per; return ph > 0.52 && ph < 0.6; }, t: 4 }, { r: 1, ux: lx + 40 });
    }
    c.x = X + 120 + n * 150;
  };

  // مروحة ترفعك إلى حافة عالية (lever = يجب تشغيلها أولًا)
  R.fan = function (c, h, lever) {
    const X = c.x, Y = c.y;
    c.g(X, X + 200, Y);
    let sig;
    if (lever) { sig = c.uid('fan'); c.e('lever', { x: X + 40, y: Y, sig: sig }); c.S({ go: X + 36 }, { a: 1, t: 0.25 }); }
    c.e('fan', { x: X + 128, y: Y - 14, w: 72, h: h + 10, sig: sig });
    c.g(X + 200, X + 340, Y - h);
    c.S({ r: 1, ux: X + 160 }, { until: (P) => P.y + P.h < Y - h - 6, t: 4 }, { r: 1, until: (P) => onG(P) && P.y + P.h <= Y - h + 1, t: 3 });
    c.y -= h; c.x = X + 340;
  };

  // نابض يقذفك لحافة عالية
  R.spring = function (c, h) {
    const X = c.x, Y = c.y;
    c.g(X, X + 220, Y);
    c.e('spring', { x: X + 110, y: Y, w: 46, power: 1080 });
    c.g(X + 220, X + 360, Y - h);
    c.S({ r: 1, ux: X + 130 }, { r: 1, until: (P) => onG(P) && P.y + P.h <= Y - h + 1, t: 4 });
    c.y -= h; c.x = X + 360;
  };

  // جدار زجاجي يُكسر بالداش (وبعده قد تأتي حفرة تحتاج داشًا آخر)
  R.glassWall = function (c, thenGap) {
    const X = c.x, Y = c.y;
    c.g(X, X + 260, Y);
    c.e('glass', { x: X + 200, y: Y - 170, w: 14, h: 170 });
    c.b(X + 196, Y - 1200, 22, 1030);
    c.S(WAITCD, { r: 1, ux: X + 190 }, { r: 1, D: 1, t: 0.3 }, { r: 1, ux: X + 250 });
    c.x = X + 260;
    if (thenGap) R.pit(c, thenGap, 'acid');
  };

  // أرضية زجاجية تنكسر بصندوق ثقيل، ثم ادفعه في الأسفل وتسلّق
  R.glassFloor = function (c) {
    const X = c.x, Y = c.y;
    const gid = c.uid('gf'), bid = c.uid('gfb');
    c.g(X, X + 260, Y);
    c.b(X + 260, Y, 40, 30);
    c.e('glass', { id: gid, x: X + 300, y: Y, w: 120, h: 16, max: 2, nodash: true });
    c.b(X + 420, Y, 160, 30);
    c.b(X + 580, Y - 900, 40, 930);
    c.g(X + 260, X + 780, Y + 180);
    c.g(X + 780, X + 920, Y);
    c.e('box', { id: bid, x: X + 150, y: Y - 64, w: 64, h: 64, mass: 2, mat: 'metal' });
    c.S(
      { r: 1, until: (P, W) => byId(W, gid).broken, t: 14 },
      { t: 1 },
      { r: 1, until: (P) => onG(P) && P.y + P.h >= Y + 179, t: 3 },
      { l: 1, j: 1, t: 0.1 }, { l: 1, until: (P, W) => onG(P) && P.x + P.w < byId(W, bid).x, t: 3 }, { t: 0.2 },
      { r: 1, until: (P, W) => byId(W, bid).x + 64 >= X + 779, t: 14 },
      { r: 1, j: 1, t: 0.6 },
      { r: 1, j: 1, t: 0.1 },
      { r: 1, until: (P) => onG(P) && P.y + P.h <= Y + 1, t: 3 }
    );
    c.x = X + 920;
  };

  // قطعة داخل زجاج مقوّى — أسقط عليه الصندوق المعلّق بسحب الحبل
  R.caseDrop = function (c, group) {
    const X = c.x, Y = c.y;
    const sig = c.uid('cd');
    c.g(X, X + 520, Y);
    c.e('pullrope', { x: X + 120, y: Y - 230, len: 130, sig: sig, once: true });
    c.e('box', { x: X + 300, y: Y - 330, w: 56, h: 56, mass: 1, mat: 'wood', held: true, release: sig, chainTo: Y - 800 });
    c.e('glass', { x: X + 286, y: Y - 60, w: 80, h: 60, nodash: true });
    c.e('piece', { x: X + 300, y: Y - 28, group: group });
    c.S({ go: X + 116 }, { a: 1, t: 0.2 }, { t: 1.4 }, { r: 1, ux: X + 297 }, { t: 0.2 }, { r: 1, j: 1, t: 0.4 }, { r: 1, ux: X + 500 });
    c.x = X + 520;
  };

  // قطعة على منصة عالية (نابض)
  R.pieceHigh = function (c, group) {
    const X = c.x, Y = c.y;
    c.g(X, X + 460, Y);
    c.e('spring', { x: X + 100, y: Y, w: 46, power: 1080 });
    c.b(X + 250, Y - 250, 140, 20);
    c.e('piece', { x: X + 330, y: Y - 276, group: group });
    c.S({ r: 1, ux: X + 120 }, { r: 1, until: (P) => onG(P) && P.y + P.h <= Y - 249, t: 3 }, { r: 1, ux: X + 400 }, { r: 1, until: (P) => onG(P) && P.y + P.h >= Y - 1, t: 3 });
    c.x = X + 460;
  };

  // قطعة معلّقة فوق حفرة حمض — تُلتقط في منتصف قفزة بالداش
  R.pieceGap = function (c, group) {
    const X = c.x, Y = c.y;
    c.g(X, X + 100, Y);
    c.g(X + 100, X + 320, Y + 170);
    c.e('water', { x: X + 100, y: Y + 40, w: 220, h: 130, acid: true });
    c.e('piece', { x: X + 210, y: Y - 128, group: group });
    c.g(X + 320, X + 460, Y);
    c.S(WAITCD, JD(X + 100));
    c.x = X + 460;
  };

  // مقبس القطع يفتح بوابة
  R.socketGate = function (c, group, need) {
    const X = c.x, Y = c.y;
    const sig = c.uid('sock');
    c.g(X, X + 360, Y);
    c.e('socket', { x: X + 110, y: Y, group: group, need: need, sig: sig });
    c.e('door', { x: X + 260, y: Y - 220, w: 26, h: 220, sig: sig, speed: 0.8 });
    c.b(X + 260, Y - 1400, 26, 1180);
    c.S({ go: X + 106 }, { a: 1, t: 0.3 }, { t: 1.6 }, { r: 1, ux: X + 350 });
    c.x = X + 360;
  };

  // قفل الرموز. mode: 'plain' (الرمز على الجدار) | 'lamp' (يظهر بالضوء فقط) | 'none' (الدليل في غرف سابقة)
  R.symbols = function (c, code, mode) {
    const X = c.x, Y = c.y;
    const group = c.uid('sym'), sig = c.uid('symsig');
    const n = code.length, LX = X + 220 + n * 70 + 40, DX = LX + 70;
    c.g(X, DX + 100, Y);
    if (mode === 'plain') c.e('glyphs', { x: X + 50, y: Y - 170, code: code, s: 9 });
    if (mode === 'lamp') {
      const lid = c.uid('lmp');
      const lsig = c.uid('lsig');
      c.e('pullrope', { x: X + 30, y: Y - 250, len: 150, sig: lsig, dur: 5 });
      c.e('lamp', { id: lid, x: X + 110, y: Y - 260, r: 230, sig: lsig, dur: true });
      c.e('glyphs', { x: X + 70, y: Y - 160, code: code, s: 9, lamp: lid });
    }
    const init = code.map((k, i) => (k + 2 + i) % 6);
    for (let i = 0; i < code.length; i++) {
      c.e('dial', { x: X + 220 + i * 70, y: Y - 34, sym: init[i], group: group, idx: i });
    }
    c.e('symlock', { x: LX, y: Y - 230, group: group, code: code, sig: sig });
    c.e('door', { x: DX, y: Y - 220, w: 26, h: 220, sig: sig, speed: 1 });
    c.b(DX, Y - 1400, 26, 1180);
    for (let i = 0; i < code.length; i++) {
      const dx = X + 220 + i * 70;
      c.S({ go: dx - 4 }, { t: 0.15 });
      const presses = (code[i] - init[i] + 6) % 6;
      for (let k = 0; k < presses; k++) c.S({ a: 1, t: 0.12 }, { t: 0.08 });
    }
    c.S({ t: 1.2 }, { r: 1, ux: DX + 90 });
    c.x = DX + 100;
    return group;
  };
  // جزء من دليل الرموز يُرسم في غرفة أخرى (مع رقم ترتيبه)
  R.clueGlyph = function (c, code, pos, dx, dy) {
    const shown = code.map((k, i) => (i === pos ? k : -1));
    const order = code.map((k, i) => i + 1);
    c.e('glyphs', { x: c.x + (dx || 0) - pos * 25, y: c.y - (dy || 150), code: shown, order: order, s: 9, frame: false });
  };

  // طوف خشبي على الحمض: الرافعة ترفع الحمض، ادفع الصندوق واركبه
  R.raft = function (c, len) {
    const X = c.x, Y = c.y;
    len = len || 440;
    const sig = c.uid('raft'), bid = c.uid('raftb'), aid = c.uid('acid');
    c.g(X, X + 120, Y);
    c.e('lever', { x: X + 22, y: Y, sig: sig, once: true });
    c.e('box', { id: bid, x: X + 62, y: Y - 56, w: 56, h: 56, mass: 1, mat: 'wood' });
    c.g(X + 120, X + 120 + len, Y + 260);
    c.e('water', { id: aid, x: X + 120, y: Y + 235, w: len, h: 25, levels: [Y + 235, Y + 10], sig: sig, rate: 55, flow: 50, acid: true });
    c.g(X + 120 + len, X + 120 + len + 160, Y - 80);
    c.S(
      { go: X + 18 }, { a: 1, t: 0.25 },
      { until: (P, W) => byId(W, aid).cur <= Y + 12, t: 8 },
      { r: 1, until: (P, W) => byId(W, bid).inW, t: 5 }, { t: 0.05 },
      { r: 1, j: 1, t: 0.15 }, { r: 1, until: onG, t: 2 }, { t: 0.05 },
      { until: (P, W) => byId(W, bid).x + 56 >= X + 120 + len - 2, t: 20 },
      { r: 1, j: 1, t: 0.2 }, { r: 1, until: (P) => onG(P) && P.y + P.h <= Y - 79, t: 3 }
    );
    c.y -= 80; c.x = X + 120 + len + 160;
  };

  // تصريف الحمض لثوانٍ — اركض في القاع قبل أن يعود
  R.drain = function (c, w, pulse) {
    const X = c.x, Y = c.y;
    w = w || 300; pulse = pulse || 4;
    const sig = c.uid('drain'), aid = c.uid('dacid');
    c.g(X, X + 130, Y);
    c.e('lever', { x: X + 60, y: Y, sig: sig, pulse: pulse });
    c.g(X + 130, X + 130 + w, Y + 110);
    c.e('water', { id: aid, x: X + 130, y: Y + 15, w: w, h: 95, levels: [Y + 15, Y + 112], sig: sig, rate: 150, acid: true });
    c.g(X + 130 + w, X + 300 + w, Y);
    c.S({ go: X + 56 }, { a: 1, t: 0.2 }, { until: (P, W) => byId(W, aid).cur >= Y + 108, t: 3 }, CLIMB(X + 130 + w, Y));
    c.x = X + 300 + w;
  };

  // بكرة: صندوق ثقيل يُنزل جهة فترتفع الأخرى
  R.pulley = function (c) {
    const X = c.x, Y = c.y;
    const bid = c.uid('pb'), pid = c.uid('pul');
    c.g(X, X + 400, Y);
    c.e('box', { id: bid, x: X + 130, y: Y - 64, mass: 2, mat: 'metal' });
    c.g(X + 400, X + 500, Y + 156); c.g(X + 500, X + 650, Y); c.g(X + 650, X + 750, Y + 156);
    c.e('pulley', { id: pid, ax: X + 400, bx: X + 650, y: Y, w: 100, range: 140, top: 330 });
    c.g(X + 750, X + 900, Y - 300);
    c.S(
      { r: 1, until: (P, W) => byId(W, bid).x > X + 405, t: 12 }, { t: 2 },
      { r: 1, j: 1, t: 0.15 }, { r: 1, until: (P) => onG(P) && P.y + P.h >= Y + 139, t: 3 },
      CLIMB(X + 500, Y), { r: 1, ux: X + 640 }, { r: 1, j: 1, t: 1.2 }, { t: 0.5 },
      { r: 1, j: 1, t: 1.4 }, { r: 1, until: (P) => onG(P) && P.y + P.h <= Y - 299, t: 3 }
    );
    c.y -= 300; c.x = X + 900;
  };

  // الحارس الآلي + مخبأ + موزّع صناديق
  R.robot = function (c) {
    const X = c.x, Y = c.y;
    const rid = c.uid('rob');
    c.g(X, X + 1480, Y);
    c.b(X + 80, Y - 1500, 1500, 1070);
    c.b(X + 280, Y - 1500, 150, 1460);
    c.e('shade', { x: X + 265, y: Y - 70, w: 180, h: 70 });
    const dsig = c.uid('disp');
    c.e('lever', { x: X + 410, y: Y, sig: dsig, pulse: 0.6 });
    c.e('dispenser', { x: X + 830, y: Y - 430, sig: dsig, max: 3 });
    c.e('robot', { id: rid, x: X + 980, gy: Y, x1: X + 530, x2: X + 1180, dir: -1 });
    const rb = (W) => byId(W, rid);
    c.S(
      { until: (P, W) => rb(W).dir > 0 && rb(W).x > X + 680, t: 25 },
      { r: 1, ux: X + 440 },
      { until: (P, W) => rb(W).dir < 0 && rb(W).x < X + 885 && rb(W).x > X + 868 && rb(W).wait <= 0, t: 30 },
      { a: 1, t: 0.2 }, { t: 1.5 },
      { r: 1, ux: X + 770 }, { r: 1, j: 1, t: 0.7 }, { r: 1, j: 1, t: 0.7 },
      { r: 1, ux: X + 1470 }
    );
    c.x = X + 1480;
  };

  // منصات خفية تظهر بالضوء فوق الحمض
  R.ghost = function (c) {
    const X = c.x, Y = c.y;
    const sig = c.uid('gl');
    c.g(X, X + 600, Y);
    c.e('lamp', { x: X + 200, y: Y - 255, r: 260, flick: true });
    c.e('pullrope', { x: X + 555, y: Y - 270, len: 170, sig: sig, dur: 9 });
    c.e('lamp', { x: X + 880, y: Y - 255, r: 430, sig: sig, dur: true });
    c.e('ghost', { x: X + 690, y: Y - 20, w: 90 });
    c.e('ghost', { x: X + 850, y: Y - 40, w: 90 });
    c.e('ghost', { x: X + 1010, y: Y - 10, w: 90 });
    c.g(X + 600, X + 1150, Y + 170);
    c.e('water', { x: X + 600, y: Y + 60, w: 550, h: 110, acid: true });
    c.g(X + 1150, X + 1300, Y);
    c.S({ r: 1, ux: X + 560 }, { a: 1, t: 0.2 }, J(X + 600), J(X + 782), J(X + 942), J(X + 1102));
    c.x = X + 1300;
  };

  // جدار سري يُكتشف بالصوت (طرق الجدار)
  R.secret = function (c) {
    const X = c.x, Y = c.y;
    const sig = c.uid('sec');
    c.g(X, X + 880, Y);
    c.b(X + 40, Y - 140, 840, 30);
    c.b(X + 40, Y - 1400, 840, 1130);
    c.e('secret', { x: X + 340, y: Y - 270, w: 40, h: 130, real: true, sig: sig });
    c.e('ticker', { x: X + 370, y: Y - 200, per: 0.9, stop: sig });
    c.e('secret', { x: X + 840, y: Y - 110, w: 40, h: 110, real: false });
    c.g(X + 880, X + 1100, Y - 140);
    c.S({ r: 1, ux: X + 38 }, { r: 1, j: 1, t: 1.2 }, { r: 1, ux: X + 337 }, { a: 1, t: 0.2 }, { t: 2.6 }, { r: 1, ux: X + 1000 });
    c.y -= 140; c.x = X + 1100;
  };

  // حبل متأرجح فوق الحمض
  R.swing = function (c) {
    const X = c.x, Y = c.y;
    const sid = c.uid('sw');
    c.g(X, X + 200, Y);
    c.e('swing', { id: sid, x: X + 310, y: Y - 260, len: 240 });
    c.g(X + 200, X + 480, Y + 170);
    c.e('water', { x: X + 200, y: Y + 40, w: 280, h: 130, acid: true });
    c.g(X + 480, X + 640, Y);
    c.S({ r: 1, ux: X + 196 }, { r: 1, j: 1, t: 0.6 }, { r: 1, t: 0.6 }, { l: 1, t: 0.6 },
      { r: 1, until: (P, W) => { const e = byId(W, sid); return e.a > 0.5 && e.av > 0; }, t: 6 },
      { r: 1, j: 1, t: 0.1 }, { r: 1, until: onG, t: 3 });
    c.x = X + 640;
  };

  // مكابس ساحقة بتوقيت
  R.crushers = function (c, n) {
    const X = c.x, Y = c.y;
    n = n || 3;
    c.g(X, X + 140 + n * 160 + 60, Y);
    for (let i = 0; i < n; i++) {
      const id = c.uid('cr'), cx = X + 140 + i * 160;
      c.e('crusher', { id: id, x: cx, y: Y - 280, w: 80, h: 150, drop: 128, per: 2.4, off: i * 0.8 });
      c.S({ r: 1, ux: cx - 6 }, { until: (P, W) => { const e = byId(W, id); return e.ph > 0.64 && e.ph < 0.75; }, t: 4 }, { r: 1, ux: cx + 120 });
    }
    c.x = X + 140 + n * 160 + 60;
  };

  // جسر شجرة (اسحب الحبل فتسقط الشجرة فوق الحمض)
  R.tree = function (c) {
    const X = c.x, Y = c.y;
    const sig = c.uid('tree');
    c.g(X, X + 200, Y);
    c.e('pullrope', { x: X + 100, y: Y - 185, len: 130, sig: sig, once: true });
    c.e('tree', { x: X + 170, y: Y, len: 380, dir: 1, sig: sig });
    c.g(X + 200, X + 500, Y + 170);
    c.e('water', { x: X + 200, y: Y + 40, w: 300, h: 130, acid: true });
    c.g(X + 500, X + 660, Y);
    c.S({ go: X + 96 }, { a: 1, t: 0.2 }, { t: 2.6 }, { r: 1, ux: X + 600 });
    c.x = X + 660;
  };

  // ادفع صندوقًا إلى الجرف وتسلّق
  R.boxCliff = function (c) {
    const X = c.x, Y = c.y;
    c.g(X, X + 340, Y);
    c.e('box', { x: X + 140, y: Y - 64, w: 64, h: 64, mass: 1, mat: 'wood' });
    c.g(X + 340, X + 520, Y - 190);
    c.S({ r: 1, ux: X + 274 }, { t: 0.1 }, { r: 1, j: 1, t: 0.7 }, { r: 1, j: 1, t: 1.2 }, { r: 1, until: (P) => onG(P) && P.y + P.h <= Y - 189, t: 3 });
    c.y -= 190; c.x = X + 520;
  };

  // كدّس صندوقين من الموزّع للوصول للأعلى
  R.stack = function (c) {
    const X = c.x, Y = c.y;
    const sig = c.uid('stk');
    c.g(X, X + 740, Y);
    c.b(X, Y - 1400, 740, 1000);
    c.e('lever', { x: X + 260, y: Y, sig: sig, pulse: 0.6 });
    c.e('dispenser', { x: X + 708, y: Y - 400, sig: sig, max: 3 });
    c.g(X + 740, X + 1040, Y - 260);
    c.S({ r: 1, ux: X + 270 }, { a: 1, t: 0.2 }, { t: 2.2 }, { a: 1, t: 0.2 }, { t: 2.2 },
      { r: 1, ux: X + 674 }, { r: 1, j: 1, t: 0.9 }, { r: 1, j: 1, t: 0.9 }, { r: 1, j: 1, t: 1.4 },
      { r: 1, until: (P) => onG(P) && P.y + P.h <= Y - 259, t: 3 });
    c.y -= 260; c.x = X + 1040;
  };

  // مصعد ← رف ← كهرباء ← أسقط الصندوق على لوح الضغط ← بوابة
  R.lift = function (c) {
    const X = c.x, Y = c.y;
    const ls = c.uid('lift'), ps = c.uid('plate'), bid = c.uid('lb');
    c.g(X, X + 1000, Y);
    c.b(X, Y - 1400, 1000, 1000);
    c.e('lever', { x: X + 80, y: Y, sig: ls });
    c.e('lift', { x: X + 140, y: Y - 16, w: 110, h: 16, y2: Y - 270, sig: ls, speed: 85, delay: 1.6 });
    c.b(X + 260, Y - 270, 380, 30);
    c.e('box', { id: bid, x: X + 320, y: Y - 334, mass: 2, mat: 'metal' });
    c.e('elec', { x: X + 520, y: Y - 400, w: 14, h: 130, per: 2.6, duty: 0.55 });
    c.e('plate', { x: X + 770, y: Y, w: 80, min: 2, sig: ps });
    c.e('door', { x: X + 920, y: Y - 400, w: 26, h: 400, sig: ps });
    c.S(
      { go: X + 76 }, { a: 1, t: 0.2 }, { r: 1, ux: X + 160 }, { t: 0.3 }, { t: 4.5 },
      { r: 1, ux: X + 300 }, { r: 1, until: (P, W) => byId(W, bid).x > X + 325, t: 3 },
      { r: 1, until: (P) => P.x + P.w > X + 510, t: 6 },
      { until: (P, W) => { const ph = ((W.time) % 2.6) / 2.6; return ph > 0.56 && ph < 0.62; }, t: 4 },
      { r: 1, until: (P) => P.x > X + 540, t: 3 },
      { r: 1, until: (P, W) => byId(W, bid).y > Y - 100, t: 4 }, { t: 1 },
      { r: 1, until: (P) => onG(P) && P.y > Y - 100, t: 3 },
      { l: 1, j: 1, t: 0.1 }, { l: 1, until: (P, W) => onG(P) && P.x + P.w < byId(W, bid).x - 4, t: 3 }, { t: 0.2 },
      { r: 1, until: (P, W) => byId(W, bid).x >= X + 762, t: 8 }, { t: 1.5 },
      { r: 1, j: 1, t: 0.8 }, { r: 1, ux: X + 990 }
    );
    c.x = X + 1000;
  };

  // حطام يسقط من السقف بتوقيت
  R.droppers = function (c, n) {
    const X = c.x, Y = c.y;
    n = n || 3;
    c.g(X, X + 120 + n * 120 + 80, Y);
    c.b(X + 60, Y - 1400, n * 120 + 120, 1100);
    for (let i = 0; i < n; i++) {
      const id = c.uid('dr'), dx = X + 120 + i * 120;
      c.e('dropper', { id: id, x: dx, y: Y - 300, gy: Y, per: 2.4, off: i * 0.8 });
      c.S({ r: 1, ux: dx - 10 }, { until: (P, W) => byId(W, id).st === 2, t: 4 }, { r: 1, ux: dx + 64 });
    }
    c.x = X + 120 + n * 120 + 80;
  };

  // سير ناقل عكسي فوق أشواك
  R.conveyor = function (c) {
    const X = c.x, Y = c.y;
    c.g(X, X + 100, Y);
    c.g(X + 100, X + 520, Y + 150);
    c.e('spikes', { x: X + 100, y: Y + 128, w: 420 });
    c.e('conveyor', { x: X + 160, y: Y - 10, w: 300, h: 18, speed: -90 });
    c.g(X + 520, X + 660, Y);
    c.S(J(X + 100), { r: 1, ux: X + 456 }, J(X + 460));
    c.x = X + 660;
  };

  // ممر منخفض يُزحف تحته
  R.crawl = function (c, len) {
    const X = c.x, Y = c.y;
    len = len || 300;
    c.g(X, X + len + 200, Y);
    c.b(X + 100, Y - 900, len, 868);
    c.S({ r: 1, ux: X + len + 190 });
    c.x = X + len + 200;
  };

  // ذكرى مخفية
  R.memory = function (c, cid, dx, dy) { c.e('clue', { x: c.x + (dx || 0), y: c.y - (dy || 26), cid: cid }); };

  // ================= الفصول =================
  function ch1() {
    const c = Ch({ theme: 'pods', mat: 'metal', spawn: [200, 600], music: 'dark', dark: 0.35, plight: 260 });
    c.g(-100, 1000, 600);
    c.e('pod', { x: 211, y: 600, num: '08' });
    ['01', '02', '03', '04', '05', '06', '07'].forEach(function (n, i) { c.e('pod', { x: 340 + i * 90, y: 600, num: n, broken: true }); });
    R.memory(c, 'c1', 150);
    c.think('t1c', 420);
    c.x = 1000;
    c.S({ r: 1, ux: 980 });
    c.think('t1d', 40);
    R.pit(c, 110, 'spikes');
    R.up(c, 90);
    c.cp();
    R.flat(c, 160);
    c.e('thought', { x: c.x - 60, id: 'hintDash' });
    R.pit(c, 200, 'spikes');
    c.cp();
    R.up(c, 140);
    R.flat(c, 120);
    c.e('thought', { x: c.x - 40, id: 'hintGlass' });
    R.glassWall(c);
    c.cp();
    R.lasers(c, 2);
    R.down(c, 140);
    c.cp();
    R.glassWall(c, 190);
    c.cp();
    R.crumble(c, 3, 70);
    R.up(c, 120);
    c.cp();
    R.saws(c, 2);
    c.cp();
    R.pit(c, 215, 'acid');
    R.up(c, 100);
    R.glassWall(c, 205);
    c.cp();
    R.crumble(c, 4, 75);
    R.down(c, 120);
    c.cp();
    R.crawl(c, 260);
    R.pit(c, 210, 'spikes');
    c.cp();
    R.flat(c, 200);
    return finish(c);
  }

  function ch2() {
    const c = Ch({ theme: 'sentinel', mat: 'metal', spawn: [140, 600], music: 'dark' });
    c.g(-100, 0, 600);
    R.flat(c, 260);
    c.think('t2a', -140);
    c.e('thought', { x: c.x + 160, id: 'hintSym' });
    R.symbols(c, [1, 3, 0], 'plain');
    c.cp();
    const code3 = [2, 0, 5, 1];
    R.clueGlyph(c, code3, 0, 60, 160);
    R.clueGlyph(c, code3, 1, 140, 160);
    R.pit(c, 210, 'spikes');
    c.cp();
    R.clueGlyph(c, code3, 2, 60, 150);
    R.lasers(c, 4, 2.2);
    R.clueGlyph(c, code3, 3, 40, 160);
    R.crumble(c, 3, 80);
    c.cp();
    R.symbols(c, code3, 'none');
    c.cp();
    c.think('t2b', 60);
    R.lasers(c, 3, 2.2);
    R.up(c, 130);
    c.cp();
    const code2 = [4, 2, 5];
    R.clueGlyph(c, code2, 0, 80, 160);
    R.pit(c, 205, 'spikes');
    c.cp();
    R.clueGlyph(c, code2, 1, 70, 170);
    R.glassFloor(c);
    c.cp();
    R.clueGlyph(c, code2, 2, 60, 150);
    R.crushers(c, 3);
    c.cp();
    R.symbols(c, code2, 'none');
    c.cp();
    c.think('t2c', 40);
    R.saws(c, 2);
    R.memory(c, 'c2', 60);
    R.up(c, 100);
    R.symbols(c, [5, 0, 3], 'lamp');
    c.cp();
    R.pit(c, 220, 'spikes');
    R.flat(c, 160);
    return finish(c);
  }

  function ch3() {
    const c = Ch({ theme: 'acidlab', mat: 'metal', spawn: [140, 600], music: 'dark' });
    c.g(-100, 0, 600);
    R.flat(c, 260);
    c.think('t3a', -60);
    R.pit(c, 130, 'acid');
    c.cp();
    R.raft(c, 440);
    c.cp();
    R.glassWall(c, 210);
    c.cp();
    R.raft(c, 380);
    c.cp();
    R.crumble(c, 5, 75);
    c.cp();
    R.swing(c);
    R.pit(c, 220, 'acid');
    c.cp();
    c.think('t3b', 40);
    R.pit(c, 215, 'acid');
    c.cp();
    R.drain(c, 300, 4);
    c.cp();
    R.crumble(c, 4, 80);
    c.cp();
    R.memory(c, 'c3', 60);
    R.swing(c);
    c.cp();
    c.think('t3c', 40);
    R.raft(c, 560);
    c.cp();
    R.drain(c, 360, 4.2);
    R.lasers(c, 2);
    c.cp();
    R.pit(c, 225, 'acid');
    R.flat(c, 160);
    return finish(c);
  }

  function ch4() {
    const c = Ch({ theme: 'greenhouse', mat: 'wood', spawn: [140, 600], music: 'calm' });
    c.g(-100, 0, 600);
    R.flat(c, 240);
    c.think('t4a', -100);
    R.glassWall(c);
    c.cp();
    c.e('thought', { x: c.x + 40, id: 'hintPieces' });
    R.caseDrop(c, 'gh');
    c.cp();
    R.glassFloor(c);
    c.cp();
    R.boxCliff(c);
    c.cp();
    R.glassFloor(c);
    c.cp();
    R.swing(c);
    c.cp();
    c.think('t4b', 40);
    R.pieceHigh(c, 'gh');
    c.cp();
    R.glassWall(c, 200);
    c.cp();
    R.pieceGap(c, 'gh');
    R.memory(c, 'c4', 60);
    R.crumble(c, 3, 90);
    c.cp();
    R.caseDrop(c, 'gh');
    c.cp();
    c.think('t4c', 60);
    R.socketGate(c, 'gh', 4);
    c.cp();
    R.spring(c, 260);
    R.pit(c, 210, 'acid');
    R.flat(c, 160);
    return finish(c);
  }

  function ch5() {
    const c = Ch({ theme: 'foundry', mat: 'metal', spawn: [140, 600], music: 'dark' });
    c.g(-100, 0, 600);
    R.flat(c, 240);
    c.think('t5a', -100);
    R.crushers(c, 3);
    c.cp();
    R.conveyor(c);
    c.cp();
    R.pulley(c);
    c.cp();
    R.saws(c, 3);
    c.cp();
    R.glassFloor(c);
    c.cp();
    R.pulley(c);
    c.cp();
    R.droppers(c, 3);
    c.cp();
    c.think('t5b', 40);
    R.droppers(c, 4);
    c.cp();
    R.pit(c, 215, 'spikes');
    R.memory(c, 'c5', 80);
    R.stack(c);
    c.cp();
    R.crushers(c, 4);
    c.cp();
    c.think('t5c', 40);
    R.conveyor(c);
    R.glassWall(c, 200);
    c.cp();
    R.flat(c, 160);
    return finish(c);
  }

  function ch6() {
    const c = Ch({ theme: 'archive', mat: 'stone', spawn: [140, 600], music: 'dark', dark: 0.8, plight: 150 });
    c.g(-100, 0, 600);
    c.e('lamp', { x: 150, y: 345, r: 240, flick: true });
    R.flat(c, 260);
    c.think('t6a', -120);
    R.symbols(c, [2, 4, 1], 'lamp');
    c.cp();
    R.ghost(c);
    c.cp();
    R.symbols(c, [3, 1, 4, 0], 'lamp');
    c.cp();
    R.crumble(c, 3, 85);
    R.secret(c);
    c.cp();
    R.ghost(c);
    c.cp();
    c.think('t6b', 40);
    const code = [0, 5, 3];
    R.secret(c);
    c.cp();
    c.e('lamp', { x: c.x + 150, y: c.y - 255, r: 280 });
    R.clueGlyph(c, code, 0, 60, 150);
    R.clueGlyph(c, code, 1, 150, 150);
    R.clueGlyph(c, code, 2, 240, 150);
    R.flat(c, 320);
    R.pit(c, 210, 'spikes');
    c.cp();
    R.memory(c, 'c6', 60);
    c.e('lamp', { x: c.x + 300, y: c.y - 255, r: 300 });
    R.symbols(c, code, 'none');
    c.cp();
    c.think('t6c', 40);
    R.ghost(c);
    c.cp();
    R.up(c, 140);
    R.flat(c, 160);
    return finish(c);
  }

  function ch7() {
    const c = Ch({ theme: 'vents', mat: 'metal', spawn: [140, 900], music: 'dark', dark: 0.6, plight: 190, y: 900, minY: 900, maxY: 900 });
    c.g(-100, 0, 900);
    R.flat(c, 240);
    c.think('t7a', -100);
    R.fan(c, 280);
    c.cp();
    R.pit(c, 210, 'spikes');
    R.fan(c, 330, true);
    c.cp();
    R.fan(c, 300, true);
    R.pit(c, 215, 'spikes');
    c.cp();
    R.lasers(c, 4, 2.0);
    c.cp();
    R.spring(c, 260);
    R.glassWall(c, 210);
    c.cp();
    R.down(c, 200);
    R.down(c, 200);
    c.cp();
    c.think('t7b', 40);
    R.lasers(c, 3, 2.0);
    c.cp();
    R.spring(c, 270);
    R.crumble(c, 3, 80);
    c.cp();
    R.memory(c, 'c7', 60);
    R.fan(c, 340);
    c.cp();
    R.glassWall(c, 205);
    c.cp();
    c.think('t7c', 40);
    R.saws(c, 3);
    R.down(c, 200);
    R.down(c, 200);
    c.cp();
    R.pit(c, 220, 'spikes');
    R.flat(c, 160);
    return finish(c);
  }

  // الفصل الثامن: هروب كامل من موجة الحمض والانهيار
  function ch8() {
    const c = Ch({ theme: 'escape', mat: 'metal', spawn: [140, 600], music: 'chase', alarm: true });
    c.g(-100, 0, 600);
    R.flat(c, 300);
    c.think('t8a', -80);
    const chs = c.e('chaser', { style: 'flood', trig: 260, end: 99999, off: 520, speed: 195 });
    R.pit(c, 120, 'acid');
    R.up(c, 90);
    R.pit(c, 205, 'acid');
    c.cp();
    R.crumble(c, 3, 70, 99);
    R.glassWall(c);
    R.down(c, 120);
    c.cp();
    R.pit(c, 130, 'acid');
    R.glassWall(c);
    R.up(c, 100);
    R.crumble(c, 3, 65, 99);
    c.cp();
    R.pit(c, 210, 'acid');
    R.down(c, 140);
    R.crawl(c, 180);
    R.pit(c, 140, 'acid');
    R.up(c, 120);
    R.pit(c, 215, 'acid');
    c.cp();
    R.crumble(c, 4, 60, 99);
    R.glassWall(c);
    R.pit(c, 125, 'acid');
    R.down(c, 130);
    c.cp();
    c.think('t8b', 40);
    R.pit(c, 140, 'acid');
    R.crawl(c, 220);
    R.pit(c, 215, 'acid');
    c.cp();
    R.up(c, 130);
    R.crumble(c, 4, 60, 99);
    R.pit(c, 130, 'acid');
    c.cp();
    R.glassWall(c);
    R.pit(c, 120, 'acid');
    R.up(c, 90);
    R.pit(c, 210, 'acid');
    c.cp();
    R.down(c, 160);
    R.crumble(c, 3, 70, 99);
    R.pit(c, 220, 'acid');
    c.cp();
    R.up(c, 120);
    R.pit(c, 130, 'acid');
    R.crawl(c, 200);
    R.pit(c, 215, 'acid');
    chs.end = c.x + 60;
    c.cp(80);
    c.think('t8c', 160);
    R.memory(c, 'c8', 260);
    R.flat(c, 360);
    return finish(c);
  }

  function ch9() {
    const c = Ch({ theme: 'pumps', mat: 'metal', spawn: [140, 600], music: 'dark' });
    c.g(-100, 0, 600);
    R.flat(c, 240);
    c.think('t9a', -100);
    R.drain(c, 320, 4);
    c.cp();
    R.raft(c, 480);
    c.cp();
    R.caseDrop(c, 'pm');
    c.cp();
    R.pulley(c);
    c.cp();
    R.raft(c, 420);
    c.cp();
    R.caseDrop(c, 'pm');
    c.cp();
    R.drain(c, 300, 3.8);
    c.cp();
    c.think('t9b', 40);
    R.pieceGap(c, 'pm');
    R.drain(c, 360, 4.2);
    c.cp();
    R.memory(c, 'c9', 60);
    R.pieceHigh(c, 'pm');
    c.cp();
    R.symbols(c, [3, 3, 1], 'plain');
    c.cp();
    c.think('t9c', 40);
    R.socketGate(c, 'pm', 3);
    c.cp();
    R.pit(c, 215, 'acid');
    R.flat(c, 160);
    return finish(c);
  }

  function ch10() {
    const c = Ch({ theme: 'echo', mat: 'stone', spawn: [140, 600], music: 'calm' });
    c.g(-100, 0, 600);
    R.flat(c, 260);
    c.think('t10a', -120);
    R.crumble(c, 3, 80);
    R.up(c, 120);
    c.cp();
    R.droppers(c, 3);
    c.cp();
    R.pit(c, 215, 'deep');
    R.spring(c, 260);
    c.cp();
    R.stack(c);
    c.cp();
    R.down(c, 260);
    R.crumble(c, 4, 80);
    c.cp();
    R.glassFloor(c);
    c.cp();
    R.pit(c, 220, 'deep');
    c.cp();
    c.think('t10b', 40);
    R.glassWall(c, 205);
    c.cp();
    R.boxCliff(c);
    c.cp();
    R.memory(c, 'c10', 60);
    R.crumble(c, 4, 85);
    c.cp();
    R.down(c, 200);
    c.think('t10c', 40);
    R.droppers(c, 4);
    c.cp();
    R.pit(c, 225, 'deep');
    R.up(c, 100);
    R.flat(c, 160);
    return finish(c);
  }

  function ch11() {
    const c = Ch({ theme: 'burned', mat: 'dirt', spawn: [140, 600], music: 'calm' });
    c.g(-100, 0, 600);
    R.flat(c, 260);
    c.think('t11a', -120);
    R.tree(c);
    c.cp();
    R.boxCliff(c);
    c.cp();
    R.glassWall(c, 205);
    c.cp();
    R.crumble(c, 4, 85);
    c.cp();
    R.boxCliff(c);
    R.swing(c);
    c.cp();
    c.think('t11b', 40);
    R.swing(c);
    c.cp();
    R.memory(c, 'c11', 60);
    R.flat(c, 200);
    const chs = c.e('chaser', { trig: c.x + 40, end: 99999, off: 560, speed: 205 });
    R.pit(c, 130, 'spikes');
    R.pit(c, 205, 'spikes');
    R.crawl(c, 200);
    R.pit(c, 140, 'spikes');
    chs.end = c.x;
    c.cp();
    c.think('t11c', 40);
    R.tree(c);
    c.cp();
    R.crumble(c, 3, 85);
    R.pit(c, 220, 'acid');
    R.flat(c, 160);
    return finish(c);
  }

  function ch12() {
    const c = Ch({ theme: 'observatory', mat: 'stone', spawn: [140, 600], music: 'calm', dark: 0.7, plight: 170 });
    c.g(-100, 0, 600);
    R.flat(c, 260);
    c.think('t12a', -120);
    R.ghost(c);
    c.cp();
    R.symbols(c, [4, 0, 1], 'lamp');
    c.cp();
    const code = [5, 2, 0, 4];
    R.clueGlyph(c, code, 0, 80, 160);
    R.crumble(c, 3, 80);
    c.cp();
    R.clueGlyph(c, code, 1, 60, 160);
    R.fan(c, 320);
    R.clueGlyph(c, code, 2, 60, 150);
    R.pit(c, 215, 'deep');
    c.cp();
    R.clueGlyph(c, code, 3, 50, 150);
    R.flat(c, 200);
    R.symbols(c, code, 'none');
    c.cp();
    R.down(c, 200);
    R.down(c, 160);
    c.cp();
    c.think('t12b', 40);
    R.fan(c, 300, true);
    c.cp();
    R.spring(c, 270);
    R.memory(c, 'c12', 80);
    R.secret(c);
    c.cp();
    c.think('t12c', 40);
    R.ghost(c);
    c.cp();
    R.pit(c, 215, 'deep');
    R.flat(c, 160);
    return finish(c);
  }

  function ch13() {
    const c = Ch({ theme: 'sentinel', mat: 'metal', spawn: [140, 600], music: 'dark' });
    c.g(-100, 0, 600);
    R.flat(c, 260);
    c.think('t13a', -120);
    R.robot(c);
    c.cp();
    R.lasers(c, 3, 2.0);
    c.cp();
    R.crushers(c, 4);
    c.cp();
    R.glassWall(c, 210);
    c.cp();
    R.stack(c);
    c.cp();
    R.down(c, 260);
    c.cp();
    c.think('t13b', 40);
    R.lift(c);
    c.cp();
    R.memory(c, 'c13', 60);
    R.symbols(c, [5, 1, 4], 'plain');
    c.cp();
    c.think('t13c', 40);
    R.robot(c);
    c.cp();
    R.pit(c, 215, 'spikes');
    R.flat(c, 160);
    return finish(c);
  }

  function ch14() {
    const c = Ch({ theme: 'core', mat: 'metal', spawn: [140, 600], music: 'dark', alarm: true });
    c.g(-100, 0, 600);
    R.flat(c, 260);
    c.think('t14a', -120);
    R.caseDrop(c, 'core');
    c.cp();
    R.crushers(c, 3);
    c.cp();
    R.pieceGap(c, 'core');
    R.lasers(c, 3, 2.0);
    c.cp();
    R.glassFloor(c);
    c.cp();
    R.lasers(c, 4, 1.9);
    c.cp();
    R.crumble(c, 4, 75);
    c.cp();
    c.think('t14b', 40);
    R.pieceHigh(c, 'core');
    c.cp();
    R.stack(c);
    c.cp();
    R.memory(c, 'c14', 60);
    R.caseDrop(c, 'core');
    c.cp();
    c.think('t14c', 40);
    R.socketGate(c, 'core', 4);
    c.cp();
    R.glassWall(c, 210);
    R.flat(c, 160);
    return finish(c);
  }

  function ch15() {
    const c = Ch({ theme: 'source', mat: 'metal', spawn: [140, 600], music: 'dark' });
    c.g(-100, 0, 600);
    R.flat(c, 260);
    c.think('t15a', -120);
    R.lift(c);
    c.cp();
    R.symbols(c, [0, 4, 0], 'plain');
    c.cp();
    R.pulley(c);
    c.cp();
    R.down(c, 300);
    R.lasers(c, 4, 1.9);
    c.cp();
    R.ghost(c);
    c.cp();
    R.saws(c, 3);
    c.cp();
    c.think('t15b', 40);
    R.crumble(c, 4, 80);
    R.glassWall(c, 210);
    c.cp();
    R.robot(c);
    c.cp();
    R.memory(c, 'c15', 60);
    // قاعة المصدر: الأوعية 01–08 فارغة، و09 ينام فيه طفل
    const X = c.x, Y = c.y;
    c.g(X, X + 1200, Y);
    c.think('t15c', 200);
    c.e('shadowfig', { x: X + 880, y: Y, trig: X + 120, facing: -1, near: 220 });
    ['01', '02', '03', '04', '05', '06', '07', '08'].forEach(function (n, i) { c.e('pod', { x: X + 240 + i * 80, y: Y, num: n, broken: true }); });
    c.e('pod', { x: X + 960, y: Y, num: '09', occupied: true, active: true });
    c.e('glass', { x: X + 932, y: Y - 160, w: 56, h: 8, final: true });
    c.S({ r: 1, ux: X + 950 }, { a: 1, t: 0.3 });
    c.x = X + 1200;
    c.g(c.x, c.x + 700, c.y);
    c.x += 700;
    return finish(c);
  }

  LT.L2 = { Ch: Ch, R: R, finish: finish };
  LT.LEVELS = [null, ch1(), ch2(), ch3(), ch4(), ch5(), ch6(), ch7(), ch8(), ch9(), ch10(), ch11(), ch12(), ch13(), ch14(), ch15()];
})(window.LT);
