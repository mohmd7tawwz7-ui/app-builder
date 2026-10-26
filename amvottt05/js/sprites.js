/* =========================================================
   sprites.js : رسومات آدم (Sprite Sheets) من تصميم محمد
   - كل حركة في ملف PNG داخل assets/sprites/
   - n: عدد الفريمات، w/h: حجم الفريم، ax/ay: نقطة الارتكاز (القدمان أو اليدان)
   - الرسومات محفوظة بضعف الحجم (SCALE = 0.5 عند الرسم)
   - إذا لم تُحمّل الصور، تعود اللعبة للشخصية المرسومة بالكود
   ========================================================= */
(function (LT) {
  'use strict';

  const META = {
    idle: { n: 8, w: 60, h: 118, ax: 33.1, ay: 116.0 },
    look: { n: 6, w: 105, h: 120, ax: 57.9, ay: 118.0 },
    walk: { n: 14, w: 132, h: 118, ax: 65.8, ay: 116.0 },
    run: { n: 16, w: 113, h: 112, ax: 42.4, ay: 110.0 },
    stop: { n: 4, w: 136, h: 121, ax: 80.9, ay: 116.0 },
    jump: { n: 9, w: 103, h: 124, ax: 44.4, ay: 122.0 },
    fall: { n: 6, w: 124, h: 142, ax: 61.7, ay: 60.0 },
    land: { n: 6, w: 97, h: 118, ax: 52.3, ay: 116.0 },
    hang: { n: 4, w: 86, h: 155, ax: 66.6, ay: 1.0 },
    climb: { n: 8, w: 79, h: 131, ax: 41.6, ay: 129.0 },
    push: { n: 12, w: 97, h: 111, ax: 30.2, ay: 109.0 },
    pull: { n: 11, w: 105, h: 113, ax: 62.5, ay: 111.0 },
    crawl: { n: 11, w: 111, h: 116, ax: 51.9, ay: 114.0 },
    rope_pull: { n: 8, w: 113, h: 158, ax: 44.5, ay: 156.0 },
    swing: { n: 8, w: 96, h: 167, ax: 64.2, ay: 1.0 },
    swim: { n: 9, w: 95, h: 121, ax: 53.1, ay: 53.5 },
    wake: { n: 19, w: 114, h: 119, ax: 50.9, ay: 117.0 },
    drown: { n: 8, w: 133, h: 163, ax: 63.6, ay: 78.0 },
    death: { n: 9, w: 132, h: 118, ax: 67.2, ay: 116.0 },
    fear: { n: 8, w: 70, h: 118, ax: 33.0, ay: 116.0 }
  };

  const S = LT.Sprites = { META: META, img: {}, ready: false, loaded: 0, SCALE: 0.5, enabled: true };
  const names = Object.keys(META);

  S.load = function () {
    names.forEach(function (n) {
      const im = new Image();
      im.onload = function () { S.loaded++; if (S.loaded >= names.length) S.ready = true; };
      let triedFile = false;
      im.onerror = function () {
        // إذا فشل المصدر الأول نجرّب الملف من مجلد assets
        if (!triedFile) { triedFile = true; im.src = 'assets/sprites/' + n + '.png'; }
        else console.warn('sprite missing:', n);
      };
      if (LT.SPRITE_DATA && LT.SPRITE_DATA[n]) im.src = LT.SPRITE_DATA[n];
      else { triedFile = true; im.src = 'assets/sprites/' + n + '.png'; }
      S.img[n] = im;
    });
  };

  S.has = function (n) { const im = S.img[n]; return S.enabled && im && im.complete && im.naturalWidth > 0; };

  // رسم فريم: (x, y) = نقطة الارتكاز في العالم
  S.draw = function (ctx, name, idx, x, y, facing, alpha, rot) {
    const m = META[name];
    if (!m || !S.has(name)) return false;
    idx = ((Math.floor(idx) % m.n) + m.n) % m.n;
    const k = S.SCALE;
    ctx.save();
    ctx.translate(x, y);
    if (rot) ctx.rotate(rot);
    ctx.scale(facing < 0 ? -k : k, k);
    if (alpha !== undefined) ctx.globalAlpha *= alpha;
    ctx.drawImage(S.img[name], idx * m.w, 0, m.w, m.h, -m.ax, -m.ay, m.w, m.h);
    ctx.restore();
    return true;
  };

  // ---------- اختيار الحركة المناسبة لحالة آدم ----------
  S.pick = function (p, t) {
    const C = LT.C;
    const st = p.state;
    const sp = Math.abs(p.vx);
    const A = p._anim || (p._anim = { last: t, idleT: 0, lookT: 0, stopT: 0, wasRun: false });
    const dt = LT.clamp(t - A.last, 0, 0.1); A.last = t;
    const r = { a: 'idle', i: 0, x: p.cx, y: p.y + p.h, rot: 0, alpha: 1 };
    const dist = Math.abs(p.phase) / 0.105;     // المسافة المقطوعة بالبكسل

    // ----- المشاهد -----
    if (p.pose === 'sleep') { r.a = 'wake'; r.i = Math.floor(t * 1.2) % 3; return r; }
    if (p.pose === 'wake') { r.a = 'wake'; r.i = Math.min(18, 3 + Math.floor(p.poseT / 2.3 * 16)); return r; }
    if (p.pose === 'kneel') { r.a = 'fear'; r.i = 6; return r; }

    // ----- الداش -----
    if (st === 'normal' && p.dashT > 0) { r.a = 'run'; r.i = 5; return r; }

    // ----- الموت -----
    if (st === 'dead') {
      const c = p.cause, d = p.deadT;
      if (c === 'drown' || c === 'creature' || c === 'acid') { r.a = 'drown'; r.i = Math.min(7, d * 7); r.y = p.y + p.h / 2; r.alpha = LT.clamp(1 - d / 1.4, 0, 1); return r; }
      if (c === 'pit') { r.a = 'fall'; r.i = t * 10; r.y = p.y + p.h / 2; return r; }
      r.a = 'death'; r.i = Math.min(8, d * 16);
      if (c === 'shadow' || c === 'electric' || c === 'robot') r.alpha = LT.clamp(1 - d / 0.9, 0, 1);
      if (c === 'spike' || c === 'crush') r.alpha = LT.clamp(1 - d / 0.25, 0, 1);
      return r;
    }

    // ----- التعلق والتسلق -----
    if (st === 'hang' && p.hang) {
      r.a = 'hang'; r.i = t * 3;
      r.x = p.hang.lx - p.hang.dir * 2; r.y = p.hang.ly - 2;
      return r;
    }
    if (st === 'climb') {
      const k = LT.clamp(p.climbT / 0.5, 0, 1);
      if (k < 0.3 && p.climbTo) { r.a = 'hang'; r.i = 0; r.x = p.climbTo.x + p.w / 2 - p.facing * (p.w / 2 + 2); r.y = p.climbTo.y + C.PH - 2; return r; }
      r.a = 'climb'; r.i = 2 + (k - 0.3) / 0.7 * 5.99;
      return r;
    }
    if (st === 'swing' && p.rope) {
      const e = p.world.byId[p.rope.id];
      r.a = 'swing'; r.i = t * (3 + (e ? Math.abs(e.av) * 2 : 0));
      r.y = p.y + 6; r.rot = e ? -e.a * 0.85 : 0;
      return r;
    }
    if (st === 'swim') { r.a = 'swim'; r.i = p.phase * 1.5; r.y = p.y + p.h / 2 + 4; return r; }

    // ----- الزحف -----
    if (p.crouch) { r.a = 'crawl'; r.i = sp > 8 ? 3 + Math.floor(dist / 6) % 8 : 3; return r; }

    // ----- في الهواء -----
    if (!p.onGround) {
      A.wasRun = false;
      if (p.vy < -300) { r.a = 'jump'; r.i = 2 + (p.vy < -500 ? 0 : 1); return r; }
      if (p.vy < 80) { r.a = 'jump'; r.i = 4 + Math.floor(t * 8) % 3; return r; }
      if (p.vy < 650) { r.a = 'jump'; r.i = 7; return r; }
      r.a = 'fall'; r.i = t * 10; r.y = p.y + p.h / 2; return r;
    }

    // ----- الدفع والسحب -----
    if (p.grab) {
      if (p.pulling) { r.a = 'pull'; r.i = sp > 5 ? dist / 6 : 0; }
      else { r.a = 'push'; r.i = sp > 5 ? dist / 6 : 0; }
      return r;
    }
    if (p.pushing && sp > 5) { r.a = 'push'; r.i = dist / 6; return r; }

    // ----- الهبوط -----
    if (p.landT > 0.1 && sp < 60) { r.a = 'land'; r.i = Math.min(5, (1 - p.landT / 0.5) * 6); return r; }

    // ----- سحب رافعة/حبل -----
    if (p.interactT > 0) { const seq = [0, 1, 2, 2, 2, 1, 0]; r.a = 'rope_pull'; r.i = seq[Math.min(6, Math.floor((1 - p.interactT / 0.45) * 7))]; return r; }

    // ----- المشي والجري -----
    if (sp > 8) {
      A.idleT = 0; A.lookT = 0;
      if (sp > 170) { A.wasRun = true; r.a = 'run'; r.i = Math.floor(dist / (120 / 16)); }
      else { r.a = 'walk'; r.i = Math.floor(dist / (78 / 14)); if (sp < 120) A.wasRun = false; }
      return r;
    }
    // ----- التوقف المفاجئ بعد الجري -----
    if (A.wasRun) { A.wasRun = false; A.stopT = 0.34; }
    if (A.stopT > 0) { A.stopT -= dt; r.a = 'stop'; r.i = Math.min(3, (1 - A.stopT / 0.34) * 4); return r; }

    // ----- الوقوف -----
    const tense = (p.world.game && p.world.game.tension) || 0;
    if (tense > 0.2) { r.a = 'fear'; r.i = 2 + Math.floor(t * 7) % 4; return r; }
    A.idleT += dt;
    if (A.idleT > 7) { A.lookT = 1.6; A.idleT = 0; }
    if (A.lookT > 0) { A.lookT -= dt; r.a = 'look'; r.i = Math.min(5, (1 - A.lookT / 1.6) * 6); return r; }
    r.a = 'idle'; r.i = Math.floor(t * 5);
    return r;
  };

  S.load();
})(window.LT);
