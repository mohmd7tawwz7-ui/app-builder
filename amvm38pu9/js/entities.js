/* =========================================================
   entities.js : كل عناصر البيئة والألغاز والأعداء
   كل عنصر = كائن بيانات بسيط (يُنسخ عند نقاط الحفظ)
   + سلوك هنا: init / signal / update / solid / hazard /
     interact / near / light / draw
   ========================================================= */
(function (LT) {
  'use strict';

  const E = LT.Ent = {};
  const ov = LT.overlap;
  const C = LT.C;
  function R(e) { return { x: e.x, y: e.y, w: e.w, h: e.h, ent: e }; }
  function pnear(p, x, y, rx, ry) {
    const cx = p.x + p.w / 2;
    return Math.abs(cx - x) < rx && y > p.y - (ry || 30) && y < p.y + p.h + 10;
  }

  // ======================= صندوق =======================
  E.box = {
    layer: 'mid',
    init(e) {
      e.w = e.w || 64; e.h = e.h || 64; e.mass = e.mass || 1; e.mat = e.mat || 'wood';
      e.vx = 0; e.vy = 0; e.ground = false; e.held = !!e.held; e.hx = e.x; e.hy = e.y; e.inW = false;
    },
    solid(e) { return e.held ? R(e) : R(e); },
    update(e, w, dt) {
      if (e.held) {
        if (e.release && w.S(e.release)) { e.held = false; e.vy = 0; w.snd('chain', e.x + e.w / 2); }
        else return;
      }
      const cx = e.x + e.w / 2;
      const wat = w.waterAt(cx, e.y + e.h);
      if (wat) {
        if (!e.inW) {
          e.inW = true;
          if (e.vy > 120) {
            w.snd('splash', cx, { k: 1.2 });
            w.burst(cx, wat.cur, 18, { k: 'splash', sp: 260, life: 0.8, s: 2.4, g: 900, spread: 1.7, w: e.w });
            w.noise(cx, wat.cur);
            w.spawn({ k: 'ring', x: cx, y: wat.cur, vx: 0, vy: 0, life: 1.6, s: 8 });
          }
        }
        if (e.mat === 'wood') {
          const target = wat.cur - e.h * 0.42;
          e.vy += ((target - e.y) * 26 - e.vy * 5.5) * dt;
          e.vx = LT.approach(e.vx, wat.flow || 0, 60 * dt);
        } else {
          e.vy = Math.min(e.vy + C.G * 0.25 * dt, 160);
          e.vx *= 1 - 3 * dt;
        }
      } else {
        e.inW = false;
        e.vy = Math.min(e.vy + C.G * dt, C.MAXFALL);
        if (e.ground) e.vx = LT.approach(e.vx, 0, 1600 * dt);
      }
      const cols = w.cols(e, false);
      const bx0 = e.x, by0 = e.y;
      if (e.vx) {
        const h = w.moveX(e, e.vx * dt, cols);
        if (h) e.vx = 0;
      }
      const vy0 = e.vy;
      const hy = w.moveY(e, e.vy * dt, cols);
      // حمل من يقف فوق صندوق طافٍ أو منزلق
      if ((e.inW || e.vx) && (e.x !== bx0 || e.y !== by0)) {
        w.carry({ x: bx0, y: by0, w: e.w, h: e.h, ent: e }, e.x - bx0, e.y - by0, 1);
      }
      e.ground = false;
      if (hy) {
        if (vy0 > 0) {
          e.ground = true;
          if (vy0 > 380) {
            w.snd('thud', cx, { k: LT.clamp(vy0 / 900, 0.4, 1.3) * (e.mass >= 2 ? 1.2 : 0.8) });
            w.burst(cx, e.y + e.h, 10, { k: 'dust', sp: 110, life: 0.8, s: 2.4, g: -15, spread: 2.8, w: e.w });
            if (e.mass >= 2) w.shake(5);
            for (const r of w.ents) if (r.t === 'robot') E.robot.crushBy(r, w, e, vy0);
          }
        }
        e.vy = 0;
      }
      // صندوق يسقط على الحارس الآلي
      if (vy0 > 250) for (const r of w.ents) if (r.t === 'robot') E.robot.crushBy(r, w, e, vy0);
      // سقوط ثقيل على اللاعب
      const p = w.player;
      if (p.state !== 'dead' && vy0 > 300 && ov(R(e), p.rect()) && e.y + e.h * 0.5 < p.y + p.h * 0.5) p.die('crush');
      // صندوق سقط خارج العالم يعود لمكانه
      if (e.y > w.bottom) { e.x = e.hx; e.y = e.hy - 200; e.vy = 0; e.vx = 0; }
    },
    draw(ctx, e, w) {
      const x = e.x, y = e.y, W = e.w, H = e.h;
      if (e.held && e.chainTo !== undefined) {
        ctx.strokeStyle = '#0a0a0a'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(x + 10, y); ctx.lineTo(x + W / 2, e.chainTo); ctx.lineTo(x + W - 10, y); ctx.stroke();
      }
      if (e.mat === 'metal') {
        ctx.fillStyle = '#0b0c0d'; ctx.fillRect(x, y, W, H);
        ctx.strokeStyle = '#1c1f22'; ctx.lineWidth = 2;
        ctx.strokeRect(x + 3, y + 3, W - 6, H - 6);
        ctx.beginPath(); ctx.moveTo(x + 4, y + 4); ctx.lineTo(x + W - 4, y + H - 4); ctx.moveTo(x + W - 4, y + 4); ctx.lineTo(x + 4, y + H - 4); ctx.stroke();
        ctx.fillStyle = '#2a2d30';
        for (const [a, b] of [[6, 6], [W - 6, 6], [6, H - 6], [W - 6, H - 6]]) { ctx.beginPath(); ctx.arc(x + a, y + b, 1.6, 0, 7); ctx.fill(); }
      } else {
        ctx.fillStyle = '#0c0b0a'; ctx.fillRect(x, y, W, H);
        ctx.strokeStyle = '#1e1b18'; ctx.lineWidth = 1.5;
        const n = Math.max(2, Math.round(H / 16));
        for (let i = 1; i < n; i++) { const yy = y + i * H / n; ctx.beginPath(); ctx.moveTo(x + 2, yy); ctx.lineTo(x + W - 2, yy); ctx.stroke(); }
        ctx.lineWidth = 3; ctx.strokeStyle = '#181614';
        ctx.strokeRect(x + 1.5, y + 1.5, W - 3, H - 3);
        ctx.beginPath(); ctx.moveTo(x + 4, y + H - 4); ctx.lineTo(x + W - 4, y + 4); ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fillRect(x, y, W, 1.2);
    }
  };

  // ======================= لوح ضغط =======================
  E.plate = {
    layer: 'mid',
    init(e) { e.w = e.w || 70; e.min = e.min || 1; e.on = false; e.p = 0; },
    update(e, w, dt) {
      let m = 0;
      const r = { x: e.x, y: e.y, w: e.w };
      const chk = (b) => {
        const bot = b.y + b.h;
        const ox = Math.min(b.x + b.w, r.x + r.w) - Math.max(b.x, r.x);
        return Math.abs(bot - e.y) < 4 && ox >= 14;
      };
      const p = w.player;
      if (p.state !== 'dead' && p.onGround && chk(p)) m += 1;
      for (const b of w.boxes) if (!b.held && chk(b)) m += b.mass;
      const on = m >= e.min;
      if (on !== e.on) { w.snd('plate', e.x + e.w / 2); e.on = on; }
      e.p = LT.approach(e.p, on ? 1 : 0, dt * 8);
    },
    signal(e, w, s) { if (e.on) s[e.sig] = true; },
    draw(ctx, e) {
      const up = 5 * (1 - e.p);
      ctx.fillStyle = '#020202'; ctx.fillRect(e.x - 4, e.y - 1, e.w + 8, 4);
      ctx.fillStyle = e.min > 1 ? '#15130f' : '#121212';
      ctx.fillRect(e.x, e.y - up, e.w, up + 2);
      ctx.fillStyle = 'rgba(255,255,255,0.09)'; ctx.fillRect(e.x, e.y - up, e.w, 1);
      if (e.min > 1) { ctx.fillStyle = '#0a0a0a'; for (let i = 8; i < e.w - 4; i += 12) ctx.fillRect(e.x + i, e.y - up + 1, 5, 1.5); }
    }
  };

  // ======================= بوابة =======================
  E.door = {
    layer: 'mid',
    init(e) { e.w = e.w || 26; e.open = e.open || 0; e.speed = e.speed || 1.1; e.cspeed = e.cspeed || 1.6; e.sT = 0; },
    update(e, w, dt) {
      const want = w.S(e.sig) ? 1 : 0;
      const prev = e.open;
      if (want > e.open) e.open = Math.min(1, e.open + e.speed * dt);
      else if (want < e.open) {
        const n = Math.max(0, e.open - e.cspeed * dt);
        const r = { x: e.x, y: e.y, w: e.w, h: e.h * (1 - n) };
        let blocked = false;
        for (const b of w.boxes) if (ov(r, b)) blocked = true;
        if (!blocked) {
          const p = w.player;
          if (p.state !== 'dead' && ov(r, p.rect())) p.die('crush');
          e.open = n;
        }
      }
      if (e.open !== prev) {
        e.sT -= dt;
        if (e.sT <= 0) { e.sT = 0.12; w.snd('door', e.x + e.w / 2, { v: 0.8 }); }
        if (e.open === 0 && prev > 0) { w.snd('thud', e.x + e.w / 2, { k: 0.7 }); w.shake(2); }
      }
    },
    solid(e) { const h = e.h * (1 - e.open); return h > 1 ? { x: e.x, y: e.y, w: e.w, h: h, ent: e } : null; },
    draw(ctx, e) {
      const h = e.h * (1 - e.open);
      if (h < 1) return;
      ctx.fillStyle = '#080808'; ctx.fillRect(e.x, e.y, e.w, h);
      ctx.strokeStyle = '#161616'; ctx.lineWidth = 2;
      for (let yy = e.y + h - 14; yy > e.y; yy -= 22) { ctx.beginPath(); ctx.moveTo(e.x + 2, yy); ctx.lineTo(e.x + e.w - 2, yy); ctx.stroke(); }
      ctx.fillStyle = '#1a1a1a';
      for (let i = 0; i < 3; i++) { const xx = e.x + 4 + i * (e.w - 8) / 2; ctx.beginPath(); ctx.moveTo(xx - 3, e.y + h); ctx.lineTo(xx, e.y + h + 6); ctx.lineTo(xx + 3, e.y + h); ctx.fill(); }
      ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(e.x, e.y, 1.5, h);
    }
  };

  // ======================= رافعة =======================
  E.lever = {
    layer: 'back',
    init(e) { e.on = !!e.on; e.a = e.on ? 1 : 0; e.timer = 0; },
    near(e, w, p) { return pnear(p, e.x, e.y - 18, 34, 40); },
    interact(e, w) {
      if (e.once && e.used) { w.snd('clank', e.x, { v: 0.4 }); return true; }
      e.used = true;
      if (e.pulse) { e.on = true; e.timer = e.pulse; }
      else e.on = !e.on;
      w.snd('clank', e.x);
      return true;
    },
    update(e, w, dt) {
      if (e.pulse && e.timer > 0) { e.timer -= dt; if (e.timer <= 0) { e.on = false; w.snd('clank', e.x, { v: 0.5 }); } }
      e.a = LT.approach(e.a, e.on ? 1 : 0, dt * 6);
    },
    signal(e, w, s) { if (e.on) s[e.sig] = true; },
    draw(ctx, e) {
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(e.x - 12, e.y - 8, 24, 8);
      const ang = LT.lerp(-0.7, 0.7, e.a);
      ctx.strokeStyle = '#0c0c0c'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(e.x, e.y - 6); ctx.lineTo(e.x + Math.sin(ang) * 30, e.y - 6 - Math.cos(ang) * 30); ctx.stroke();
      ctx.fillStyle = '#121212';
      ctx.beginPath(); ctx.arc(e.x + Math.sin(ang) * 31, e.y - 6 - Math.cos(ang) * 31, 4.5, 0, 7); ctx.fill();
    }
  };

  // ======================= حبل سحب =======================
  E.pullrope = {
    layer: 'back',
    init(e) { e.len = e.len || 120; e.timer = 0; e.pull = 0; },
    ix(e) { return e.x; },
    near(e, w, p) { return pnear(p, e.x, e.y + e.len, 32, 60); },
    interact(e, w) {
      if (e.once && e.used) return false;
      e.used = true; e.pull = 1;
      e.timer = e.dur || 0.3;
      w.snd('rope', e.x);
      return true;
    },
    update(e, w, dt) {
      if (e.timer > 0) {
        e.timer -= dt;
        if (e.dur && e.dur > 1 && e.timer > 0 && Math.random() < dt * 3) w.snd('tick', e.x, { v: 0.5 });
      }
      e.pull = LT.approach(e.pull, (e.latch && e.used) ? 0.6 : 0, dt * (e.dur ? 0.25 / Math.max(1, e.dur) * 4 : 2));
    },
    signal(e, w, s) { if ((e.latch && e.used) || e.timer > 0) s[e.sig] = true; },
    draw(ctx, e, w) {
      const hy = e.y + e.len + e.pull * 22;
      const sway = Math.sin(w.time * 1.2 + e.x) * 2;
      ctx.strokeStyle = '#0d0d0d'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.quadraticCurveTo(e.x + sway, (e.y + hy) / 2, e.x + sway * 0.6, hy); ctx.stroke();
      ctx.fillStyle = '#0d0d0d';
      ctx.beginPath(); ctx.ellipse(e.x + sway * 0.6, hy + 7, 4, 8, 0, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(e.x + sway * 0.6 - 1, hy + 1, 1, 10);
    }
  };

  // ======================= شجرة تسقط (جسر) =======================
  E.tree = {
    layer: 'mid',
    init(e) { e.state = e.state || 'up'; e.a = e.state === 'down' ? 1 : 0; e.v = 0; e.dir = e.dir || 1; e.len = e.len || 360; e.th = e.th || 16; },
    update(e, w, dt) {
      if (e.state === 'up' && w.S(e.sig)) {
        e.state = 'falling'; e.v = 0.05;
        w.snd('crack', e.x); w.burst(e.x, e.y - 20, 12, { k: 'chip', sp: 160, life: 0.8, s: 2.2, g: 600 });
      }
      if (e.state === 'falling') {
        e.v += dt * (0.6 + e.a * 4.5);
        e.a += e.v * dt;
        // قتل من تحت الجذع
        const p = w.player;
        const ang = (Math.PI / 2) * (1 - e.a);
        for (let s = 0.2; s <= 1; s += 0.1) {
          const px = e.x + e.dir * Math.cos(ang) * e.len * s, py = e.y - Math.sin(ang) * e.len * s;
          if (p.state !== 'dead' && px > p.x - 4 && px < p.x + p.w + 4 && py > p.y && py < p.y + p.h) { p.die('crush'); break; }
        }
        if (e.a >= 1) {
          e.a = 1; e.state = 'down';
          w.snd('treefall', e.x + e.dir * e.len * 0.6); w.shake(8);
          w.burst(e.x + e.dir * e.len * 0.7, e.y, 30, { k: 'dust', sp: 150, life: 1.2, s: 3, g: -10, spread: 3, w: e.len * 0.6 });
          w.burst(e.x + e.dir * e.len * 0.7, e.y, 14, { k: 'leaf', sp: 160, life: 2.5, s: 3, g: 60, spread: 3, w: e.len * 0.5 });
        }
      }
    },
    solid(e) {
      if (e.state !== 'down') return { x: e.x - 9, y: e.y - e.len * 0.9, w: 18, h: e.len * 0.9, ent: e, nograb: true };
      return { x: e.dir > 0 ? e.x : e.x - e.len, y: e.y, w: e.len, h: e.th, ent: e };
    },
    draw(ctx, e, w) {
      const ang = e.dir > 0 ? -(Math.PI / 2) * (1 - e.a) : Math.PI + (Math.PI / 2) * (1 - e.a);
      ctx.save();
      ctx.translate(e.x, e.y + e.th / 2);
      const sway = e.state === 'up' ? Math.sin(w.time * 0.9 + e.x) * 0.006 : 0;
      ctx.rotate(ang + sway);
      ctx.fillStyle = '#070707';
      ctx.beginPath();
      ctx.moveTo(0, -11); ctx.lineTo(e.len, -3); ctx.lineTo(e.len, 3); ctx.lineTo(0, 11); ctx.closePath(); ctx.fill();
      const rnd = LT.rng(e.x | 0);
      ctx.strokeStyle = '#070707'; ctx.lineCap = 'round';
      for (let i = 0; i < 9; i++) {
        const s = 0.25 + rnd() * 0.7, side = rnd() < 0.5 ? -1 : 1;
        const bx = e.len * s, bl = 30 + rnd() * 50 * (1 - s * 0.5);
        ctx.lineWidth = 3 * (1 - s) + 1.2;
        ctx.beginPath(); ctx.moveTo(bx, 0);
        ctx.quadraticCurveTo(bx + bl * 0.5, side * bl * 0.3, bx + bl * 0.9, side * bl * 0.55); ctx.stroke();
      }
      ctx.restore();
      if (e.state === 'up') {
        // جذور
        ctx.fillStyle = '#070707';
        ctx.beginPath(); ctx.moveTo(e.x - 22, e.y + 2); ctx.quadraticCurveTo(e.x - 8, e.y - 6, e.x - 8, e.y - 26); ctx.lineTo(e.x + 8, e.y - 26); ctx.quadraticCurveTo(e.x + 8, e.y - 6, e.x + 24, e.y + 2); ctx.fill();
      }
    }
  };

  // ======================= منصة متحركة =======================
  E.lift = {
    layer: 'mid',
    init(e) {
      e.w = e.w || 110; e.h = e.h || 16; e.t0 = e.t0 || 0; e.tt = e.t0;
      e.x1 = e.x; e.y1 = e.y; e.x2 = (e.x2 === undefined ? e.x : e.x2); e.y2 = (e.y2 === undefined ? e.y : e.y2);
      e.dirn = 1; e.wait = 0; e.speed = e.speed || 80; e.sT = 0;
    },
    update(e, w, dt) {
      const len = Math.max(1, LT.dist(e.x1, e.y1, e.x2, e.y2));
      let target;
      if (e.sig) {
        // تأخير قبل الحركة حتى يلحق اللاعب بالمنصة
        const want = w.S(e.sig) ? 1 : 0;
        if (e.cur === undefined) e.cur = want;
        if (want !== e.cur) { e.dl = (e.dl || 0) + dt; if (e.dl >= (e.delay || 0)) { e.cur = want; e.dl = 0; w.snd('clank', e.x + e.w / 2, { v: 0.6 }); } }
        else e.dl = 0;
        target = e.cur;
      }
      else {
        if (e.wait > 0) { e.wait -= dt; target = e.tt; }
        else target = e.dirn > 0 ? 1 : 0;
      }
      const nt = LT.approach(e.tt, target, e.speed / len * dt);
      if (!e.sig && nt === target && e.wait <= 0) { e.dirn *= -1; e.wait = e.pause || 1.2; }
      const nx = LT.lerp(e.x1, e.x2, nt), ny = LT.lerp(e.y1, e.y2, nt);
      const dx = nx - e.x, dy = ny - e.y;
      if (dx || dy) {
        const before = R(e);
        e.x = nx; e.y = ny;
        w.carry(before, dx, dy);
        e.sT -= dt; if (e.sT <= 0) { e.sT = 0.35; w.snd('servo', e.x + e.w / 2, { v: 0.4 }); }
      }
      e.tt = nt;
    },
    solid(e) { return R(e); },
    draw(ctx, e, w) {
      ctx.strokeStyle = '#0a0a0a'; ctx.lineWidth = 2;
      if (e.chain !== false) {
        ctx.beginPath(); ctx.moveTo(e.x + 8, e.y); ctx.lineTo(e.x + 8, e.y - 900); ctx.moveTo(e.x + e.w - 8, e.y); ctx.lineTo(e.x + e.w - 8, e.y - 900); ctx.stroke();
      }
      ctx.fillStyle = '#0b0b0b'; ctx.fillRect(e.x, e.y, e.w, e.h);
      ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 1;
      for (let i = 10; i < e.w; i += 14) { ctx.beginPath(); ctx.moveTo(e.x + i, e.y + 2); ctx.lineTo(e.x + i - 6, e.y + e.h - 2); ctx.stroke(); }
      ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fillRect(e.x, e.y, e.w, 1);
    }
  };

  // ======================= بكرة (منصتان مرتبطتان) =======================
  E.pulley = {
    layer: 'mid',
    init(e) { e.w = e.w || 100; e.h = 16; e.d = e.d || 0; e.v = 0; e.y2 = e.y2 === undefined ? e.y : e.y2; e.range = e.range || 150; e.sT = 0; },
    rects(e) {
      return [
        { x: e.ax, y: e.y + e.d, w: e.w, h: e.h, ent: e, part: 0 },
        { x: e.bx, y: e.y2 - e.d, w: e.w, h: e.h, ent: e, part: 1 }
      ];
    },
    update(e, w, dt) {
      const [ra, rb] = this.rects(e);
      const wa = w.weightOn(ra), wb = w.weightOn(rb);
      const acc = (wa - wb) * 520 - e.v * 3.2;
      e.v = LT.clamp(e.v + acc * dt, -170, 170);
      let nd = e.d + e.v * dt;
      if (nd > e.range) { nd = e.range; if (e.v > 60) { w.snd('clank', e.ax + e.w / 2, { v: 0.6 }); w.shake(2); } e.v = 0; }
      if (nd < -e.range) { nd = -e.range; if (e.v < -60) { w.snd('clank', e.bx + e.w / 2, { v: 0.6 }); w.shake(2); } e.v = 0; }
      const dd = nd - e.d;
      if (dd) {
        e.d = nd;
        w.carry(ra, 0, dd);
        w.carry(rb, 0, -dd);
        e.sT -= dt; if (e.sT <= 0) { e.sT = 0.25; w.snd('creak', (e.ax + e.bx) / 2 + e.w / 2, { v: 0.5 }); }
      }
    },
    solid(e) { return this.rects(e); },
    draw(ctx, e, w) {
      const [a, b] = this.rects(e);
      const topY = Math.min(e.y, e.y2) - (e.top || 260);
      const wx = (a.x + a.w / 2 + b.x + b.w / 2) / 2;
      const rr = Math.abs((b.x + b.w / 2) - (a.x + a.w / 2)) / 2;
      ctx.strokeStyle = '#0b0b0b'; ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(a.x + a.w / 2, a.y); ctx.lineTo(a.x + a.w / 2, topY);
      ctx.moveTo(b.x + b.w / 2, b.y); ctx.lineTo(b.x + b.w / 2, topY);
      ctx.stroke();
      ctx.beginPath(); ctx.arc(wx, topY, rr, Math.PI, 0); ctx.stroke();
      ctx.fillStyle = '#0a0a0a';
      ctx.beginPath(); ctx.arc(wx, topY, 14, 0, 7); ctx.fill();
      ctx.save(); ctx.translate(wx, topY); ctx.rotate(e.d * 0.05);
      ctx.strokeStyle = '#1b1b1b'; ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) { ctx.rotate(Math.PI / 3); ctx.beginPath(); ctx.moveTo(-11, 0); ctx.lineTo(11, 0); ctx.stroke(); }
      ctx.restore();
      ctx.fillStyle = '#0a0a0a'; ctx.fillRect(wx - 3, topY - 400, 6, 400);
      for (const r of [a, b]) {
        ctx.strokeStyle = '#0b0b0b'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(r.x + 4, r.y); ctx.lineTo(r.x + r.w / 2, r.y - 24); ctx.lineTo(r.x + r.w - 4, r.y); ctx.stroke();
        ctx.fillStyle = '#0c0c0c'; ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fillRect(r.x, r.y, r.w, 1);
      }
    }
  };

  // ======================= مكبس ساحق =======================
  E.crusher = {
    layer: 'mid',
    init(e) { e.w = e.w || 80; e.h = e.h || 140; e.drop = e.drop || 130; e.per = e.per || 2.6; e.off = e.off || 0; e.yy = 0; e.ph = 0; },
    update(e, w, dt) {
      const ph = ((w.time + e.off) % e.per) / e.per;
      const prev = e.ph; e.ph = ph;
      let yy;
      if (ph < 0.45) yy = 0;
      else if (ph < 0.5) yy = e.drop * Math.pow((ph - 0.45) / 0.05, 2);
      else if (ph < 0.64) yy = e.drop;
      else yy = e.drop * (1 - LT.ease((ph - 0.64) / 0.36));
      e.slam = ph >= 0.45 && ph < 0.5;
      if (ph >= 0.42 && ph < 0.45 && Math.random() < dt * 20) w.burst(e.x + Math.random() * e.w, e.y + e.h + yy, 1, { k: 'dust', sp: 10, life: 0.8, s: 1.5, g: 80 });
      if (prev < 0.5 && ph >= 0.5) {
        w.snd('slam', e.x + e.w / 2);
        const near = Math.abs(w.player.x - e.x) < 500;
        if (near) w.shake(4);
        w.burst(e.x + e.w / 2, e.y + e.h + e.drop, 10, { k: 'dust', sp: 140, life: 0.7, s: 2.2, g: -20, spread: 2.8, w: e.w });
        w.burst(e.x + e.w / 2, e.y + e.h + e.drop, 5, { k: 'spark', sp: 220, life: 0.4, s: 1.5, g: 700, spread: 2.5, w: e.w });
      }
      e.yy = yy;
    },
    solid(e) { return { x: e.x, y: e.y, w: e.w, h: e.h + e.yy, ent: e }; },
    hazard(e, w, pr) {
      if (!e.slam) return null;
      const r = { x: e.x + 2, y: e.y, w: e.w - 4, h: e.h + e.yy + 2 };
      return ov(r, pr) ? 'crush' : null;
    },
    draw(ctx, e) {
      const y = e.y + e.yy;
      ctx.fillStyle = '#090909';
      ctx.fillRect(e.x + e.w / 2 - 8, e.y - 600, 16, 600 + e.yy);
      ctx.fillRect(e.x, y, e.w, e.h);
      ctx.strokeStyle = '#191919'; ctx.lineWidth = 2;
      for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(e.x + 3, y + i * e.h / 4); ctx.lineTo(e.x + e.w - 3, y + i * e.h / 4); ctx.stroke(); }
      ctx.fillStyle = '#0d0d0d';
      for (let i = 0; i < e.w; i += 10) { ctx.beginPath(); ctx.moveTo(e.x + i, y + e.h); ctx.lineTo(e.x + i + 5, y + e.h + 7); ctx.lineTo(e.x + i + 10, y + e.h); ctx.fill(); }
    }
  };

  // ======================= كهرباء =======================
  E.elec = {
    layer: 'front',
    init(e) { e.on = true; e.warn = false; e.sT = 0; },
    update(e, w, dt) {
      let on = true, warn = false;
      if (e.sig) on = !w.S(e.sig);
      else if (e.per) {
        const ph = ((w.time + (e.off || 0)) % e.per) / e.per;
        const duty = e.duty || 0.5;
        on = ph < duty;
        warn = !on && ph > 1 - 0.5 / e.per;
      }
      if (on && !e.on) w.snd('zap', e.x + e.w / 2, { v: 0.35 });
      e.on = on; e.warn = warn;
      const p = w.player;
      if (on) {
        const d = Math.abs(p.x - (e.x + e.w / 2));
        LT.Audio.buzzLevel = Math.max(LT.Audio.buzzLevel, LT.clamp(1 - d / 500, 0, 1));
        e.sT -= dt;
        if (e.sT <= 0) { e.sT = 0.05 + Math.random() * 0.25; w.burst(e.x + Math.random() * e.w, e.y + Math.random() * e.h, 2, { k: 'spark', sp: 160, life: 0.35, s: 1.3, g: 600, spread: 6 }); }
      } else if (warn && Math.random() < dt * 12) {
        w.burst(e.x + Math.random() * e.w, e.y + Math.random() * e.h, 1, { k: 'spark', sp: 80, life: 0.25, s: 1.1, g: 500, spread: 6 });
        if (Math.random() < 0.2) w.snd('spark', e.x + e.w / 2);
      }
    },
    hazard(e, w, pr) { return e.on && ov(R(e), pr) ? 'electric' : null; },
    light(e) { return e.on ? { x: e.x + e.w / 2, y: e.y + e.h / 2, r: 90 + Math.max(e.w, e.h) * 0.6, k: 0.6 + Math.random() * 0.25 } : null; },
    draw(ctx, e, w) {
      // الأسلاك والأطراف
      ctx.fillStyle = '#0b0b0b';
      const vert = e.h > e.w;
      if (vert) { ctx.fillRect(e.x - 4, e.y - 8, e.w + 8, 8); ctx.fillRect(e.x - 4, e.y + e.h, e.w + 8, 8); }
      else { ctx.fillRect(e.x - 8, e.y - 4, 8, e.h + 8); ctx.fillRect(e.x + e.w, e.y - 4, 8, e.h + 8); }
      if (!e.on) return;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 3; k++) {
        ctx.strokeStyle = k === 0 ? 'rgba(200,220,255,0.85)' : 'rgba(150,180,255,0.35)';
        ctx.lineWidth = k === 0 ? 1.4 : 3;
        ctx.beginPath();
        if (vert) {
          let x = e.x + e.w / 2; ctx.moveTo(x, e.y);
          for (let y = e.y; y < e.y + e.h; y += 10) { x = e.x + e.w / 2 + (Math.random() - 0.5) * e.w * 1.1; ctx.lineTo(x, y + 10); }
        } else {
          let y = e.y + e.h / 2; ctx.moveTo(e.x, y);
          for (let x = e.x; x < e.x + e.w; x += 12) { y = e.y + e.h / 2 + (Math.random() - 0.5) * e.h * 1.4; ctx.lineTo(x + 12, y); }
        }
        ctx.stroke();
      }
      ctx.restore();
    }
  };

  // ======================= أشواك =======================
  E.spikes = {
    layer: 'mid',
    init(e) { e.h = e.h || 22; },
    hazard(e, w, pr) {
      const r = { x: e.x + 3, y: e.y + 6, w: e.w - 6, h: e.h - 6 };
      return ov(r, pr) ? 'spike' : null;
    },
    draw(ctx, e) {
      const rnd = LT.rng((e.x * 7 + e.y) | 0);
      ctx.fillStyle = '#060606';
      ctx.beginPath();
      ctx.moveTo(e.x, e.y + e.h);
      for (let x = e.x; x < e.x + e.w; x += 7 + rnd() * 6) {
        const hh = e.h * (0.5 + rnd() * 0.6);
        ctx.lineTo(x + 2, e.y + e.h - hh);
        ctx.lineTo(x + 5 + rnd() * 3, e.y + e.h);
      }
      ctx.lineTo(e.x + e.w, e.y + e.h);
      ctx.fill();
      // أغصان شائكة متشابكة
      ctx.strokeStyle = '#070707'; ctx.lineWidth = 1.4;
      for (let i = 0; i < e.w / 18; i++) {
        const x = e.x + rnd() * e.w;
        ctx.beginPath(); ctx.moveTo(x, e.y + e.h); ctx.quadraticCurveTo(x + 10, e.y + e.h * 0.2, x + 20 * (rnd() - 0.5), e.y - 4); ctx.stroke();
      }
    }
  };

  // ======================= منشار دوار =======================
  E.saw = {
    layer: 'mid',
    init(e) { e.r = e.r || 26; e.per = e.per || 3; e.off = e.off || 0; e.cx = e.x; e.cy = e.y; e.sT = 0; },
    update(e, w, dt) {
      const k = (Math.sin(((w.time + e.off) / e.per) * Math.PI * 2) + 1) / 2;
      e.cx = LT.lerp(e.x, e.x2 === undefined ? e.x : e.x2, k);
      e.cy = LT.lerp(e.y, e.y2 === undefined ? e.y : e.y2, k);
      e.sT -= dt;
      if (e.sT <= 0) { e.sT = 0.3; if (Math.abs(w.player.x - e.cx) < 500) w.snd('spark', e.cx, { v: 0.5 }); }
    },
    hazard(e, w, pr) {
      const nx = LT.clamp(e.cx, pr.x, pr.x + pr.w), ny = LT.clamp(e.cy, pr.y, pr.y + pr.h);
      return LT.dist(nx, ny, e.cx, e.cy) < e.r - 4 ? 'spike' : null;
    },
    draw(ctx, e, w) {
      ctx.strokeStyle = '#0a0a0a'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.x2 === undefined ? e.x : e.x2, e.y2 === undefined ? e.y : e.y2); ctx.stroke();
      ctx.save(); ctx.translate(e.cx, e.cy); ctx.rotate(w.time * 14);
      ctx.fillStyle = '#080808';
      ctx.beginPath();
      const n = 14;
      for (let i = 0; i < n; i++) {
        const a = i / n * Math.PI * 2, a2 = (i + 0.5) / n * Math.PI * 2;
        ctx.lineTo(Math.cos(a) * e.r, Math.sin(a) * e.r);
        ctx.lineTo(Math.cos(a2) * e.r * 0.78, Math.sin(a2) * e.r * 0.78);
      }
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(0, 0, e.r * 0.6, 0, 2); ctx.stroke();
      ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.arc(0, 0, 4, 0, 7); ctx.fill();
      ctx.restore();
    }
  };

  // ======================= منصة تنهار =======================
  E.crumble = {
    layer: 'mid',
    init(e) { e.h = e.h || 16; e.st = 0; e.tm = 0; e.fy = 0; e.fv = 0; e.delay = e.delay || 0.5; },
    update(e, w, dt) {
      if (e.st === 0) {
        for (const b of w.bodies()) if (w.restingOn(R(e), b)) { e.st = 1; e.tm = 0; w.snd('creak', e.x + e.w / 2); break; }
      } else if (e.st === 1) {
        e.tm += dt;
        if (Math.random() < dt * 10) w.burst(e.x + Math.random() * e.w, e.y + e.h, 1, { k: 'dust', sp: 10, life: 0.6, s: 1.5, g: 150 });
        if (e.tm > e.delay) {
          e.st = 2; e.tm = 0; e.fv = 0;
          w.snd('crack', e.x + e.w / 2);
          w.burst(e.x + e.w / 2, e.y, 10, { k: 'chip', sp: 120, life: 0.9, s: 2.6, g: 900, spread: 3, w: e.w });
        }
      } else {
        e.tm += dt; e.fv += C.G * dt; e.fy += e.fv * dt;
        if (e.respawn && e.tm > e.respawn) { e.st = 0; e.fy = 0; e.tm = 0; }
      }
    },
    solid(e) { return e.st < 2 ? R(e) : null; },
    draw(ctx, e, w) {
      if (e.st === 2 && e.fy > 900) return;
      const sx = e.st === 1 ? (Math.random() - 0.5) * 2 : 0;
      const y = e.y + e.fy;
      ctx.save();
      if (e.st === 2) { ctx.translate(e.x + e.w / 2, y); ctx.rotate(e.fy * 0.002); ctx.translate(-(e.x + e.w / 2), -y); }
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(e.x + sx, y, e.w, e.h);
      ctx.strokeStyle = '#191715'; ctx.lineWidth = 1;
      for (let i = 12; i < e.w; i += 18) { ctx.beginPath(); ctx.moveTo(e.x + sx + i, y + 1); ctx.lineTo(e.x + sx + i + 2, y + e.h - 1); ctx.stroke(); }
      ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(e.x + sx, y, e.w, 1);
      if (e.posts !== false && e.st < 2) {
        ctx.fillStyle = '#080808';
        ctx.fillRect(e.x + 6 + sx, y + e.h, 4, 30); ctx.fillRect(e.x + e.w - 10 + sx, y + e.h, 4, 22);
      }
      ctx.restore();
    }
  };

  // ======================= سير ناقل =======================
  E.conveyor = {
    layer: 'mid',
    init(e) { e.h = e.h || 18; e.speed = e.speed || -60; e.off = 0; },
    update(e, w, dt) {
      const sp = (e.sig && !w.S(e.sig)) ? 0 : e.speed;
      e.off += sp * dt;
      if (sp) w.carry(R(e), sp * dt, 0);
    },
    solid(e) { return R(e); },
    draw(ctx, e) {
      ctx.fillStyle = '#0a0a0a'; ctx.fillRect(e.x, e.y, e.w, e.h);
      ctx.fillStyle = '#151515';
      const o = ((e.off % 16) + 16) % 16;
      for (let x = e.x + o; x < e.x + e.w - 4; x += 16) ctx.fillRect(x, e.y + 1, 5, 2);
      ctx.fillStyle = '#121212';
      for (const x of [e.x + 9, e.x + e.w - 9]) { ctx.beginPath(); ctx.arc(x, e.y + e.h / 2, e.h / 2 - 1, 0, 7); ctx.fill(); }
    }
  };

  // ======================= ماء =======================
  E.water = {
    layer: 'water',
    init(e) { e.levels = e.levels || [e.y]; e.cur = e.cur === undefined ? e.levels[0] : e.cur; e.flow = e.flow || 0; e.rate = e.rate || 45; e.h = e.h || 400; },
    update(e, w, dt) {
      const target = e.sig ? (w.S(e.sig) ? e.levels[1] : e.levels[0]) : e.levels[0];
      if (e.cur !== target) {
        e.cur = LT.approach(e.cur, target, e.rate * dt);
        LT.Audio.flowLevel = Math.max(LT.Audio.flowLevel, LT.clamp(1 - Math.abs(w.player.x - (e.x + e.w / 2)) / 900, 0.3, 1));
        if (Math.random() < dt * 10) w.spawn({ k: 'ring', x: e.x + Math.random() * e.w, y: e.cur, vx: 0, vy: 0, life: 1, s: 3 });
      }
    }
  };

  // ======================= كائن المستنقع =======================
  E.creature = {
    layer: 'water',
    init(e) { e.cx = e.x; e.home = e.x; e.lure = 0; e.lx = 0; e.atk = 0; e.speed = e.speed || 175; e.gT = 3; },
    hear(e, w, x, y) {
      const wat = w.byId[e.wid];
      if (!wat) return;
      if (x < wat.x || x > wat.x + wat.w || y < wat.cur - 30) return;
      const p = w.player;
      const playerNoise = Math.abs(p.cx - x) < 30 && p.state === 'swim';
      if (playerNoise) return;
      e.lure = e.lureDur || 7; e.lx = x;
    },
    update(e, w, dt) {
      const wat = w.byId[e.wid]; if (!wat) return;
      const p = w.player;
      const inW = p.state === 'swim' && p.water === wat.id;
      let tx, sp = e.speed;
      if (e.lure > 0) {
        e.lure -= dt; tx = e.lx;
        if (inW && Math.abs(p.cx - e.cx) < 150) tx = p.cx;
      } else if (inW) tx = p.cx;
      else { tx = e.home + Math.sin(w.time * 0.25 + e.home) * (e.roam || 140); sp = 45; }
      e.hunting = inW && tx === p.cx;
      e.cx = LT.approach(e.cx, LT.clamp(tx, wat.x + 30, wat.x + wat.w - 30), sp * dt);
      e.dir = tx > e.cx ? 1 : -1;
      if (e.atk > 0) e.atk += dt;
      if (inW && p.state !== 'dead' && Math.abs(p.cx - e.cx) < 36) {
        e.atk = 0.01;
        w.snd('growl', e.cx); w.snd('splash', e.cx, { k: 1.4 });
        w.burst(p.cx, wat.cur, 24, { k: 'splash', sp: 300, life: 0.9, s: 2.6, g: 900, spread: 1.5 });
        w.shake(6);
        p.die('creature');
      }
      e.gT -= dt;
      if (e.gT <= 0) { e.gT = 3 + Math.random() * 4; if (Math.abs(w.player.x - e.cx) < 700) w.snd('growl', e.cx, { v: e.hunting ? 1 : 0.5 }); }
      if (Math.random() < dt * (e.hunting ? 8 : 2)) w.spawn({ k: 'bubble', x: e.cx + (Math.random() - 0.5) * 40, y: wat.cur + 20, vx: 0, vy: -30, life: 0.8, s: 2, g: -20 });
      if (e.hunting && Math.random() < dt * 5) w.spawn({ k: 'ring', x: e.cx, y: wat.cur, vx: 0, vy: 0, life: 1.2, s: 6 });
    },
    draw(ctx, e, w) {
      const wat = w.byId[e.wid]; if (!wat) return;
      const t = w.time;
      const depth = e.atk > 0 ? Math.max(-40, 40 - e.atk * 300) : (e.hunting ? 22 : 55);
      const y = wat.cur + depth;
      ctx.save();
      ctx.globalAlpha = e.atk > 0 ? 1 : 0.85;
      ctx.fillStyle = '#000';
      ctx.beginPath();
      const L = 120, d = e.dir || 1;
      for (let i = 0; i <= 20; i++) {
        const s = i / 20, xx = e.cx - d * s * L, yy = y + Math.sin(t * 5 - s * 6) * 6 * s;
        const r = (1 - s) * 13 + 2;
        if (i === 0) ctx.moveTo(xx, yy - r); else ctx.lineTo(xx, yy - r);
      }
      for (let i = 20; i >= 0; i--) {
        const s = i / 20, xx = e.cx - d * s * L, yy = y + Math.sin(t * 5 - s * 6) * 6 * s;
        const r = (1 - s) * 13 + 2;
        ctx.lineTo(xx, yy + r);
      }
      ctx.fill();
      // زعانف/مجسات
      ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
      for (let k = 0; k < 4; k++) {
        const s = 0.15 + k * 0.12, xx = e.cx - d * s * L;
        ctx.beginPath(); ctx.moveTo(xx, y);
        ctx.quadraticCurveTo(xx - d * 10, y + 20 + Math.sin(t * 6 + k) * 6, xx - d * 22, y + 28); ctx.stroke();
      }
      if (e.atk > 0) {
        ctx.lineWidth = 5;
        for (let k = -1; k <= 1; k++) {
          ctx.beginPath(); ctx.moveTo(e.cx + k * 10, wat.cur + 10);
          ctx.quadraticCurveTo(e.cx + k * 25, wat.cur - 50 - e.atk * 60, e.cx + k * 6, wat.cur - 80 - e.atk * 40); ctx.stroke();
        }
      }
      ctx.restore();
    }
  };

  // ======================= حبل متأرجح =======================
  E.swing = {
    layer: 'back',
    init(e) { e.a = e.a || 0; e.av = 0; e.len = e.len || 200; e.held = false; },
    update(e, w, dt) {
      if (e.held && w.player.state === 'swing' && w.player.rope && w.player.rope.id === e.id) return;
      e.held = false;
      e.av += (-(C.G / e.len) * Math.sin(e.a) * 0.6 + Math.sin(w.time * 0.7 + e.x) * 0.05) * dt;
      e.av *= 1 - 0.5 * dt;
      e.a += e.av * dt;
    },
    draw(ctx, e, w) {
      const p = w.player;
      ctx.strokeStyle = '#0c0c0c'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
      const ex = e.x + Math.sin(e.a) * e.len, ey = e.y + Math.cos(e.a) * e.len;
      ctx.beginPath(); ctx.moveTo(e.x, e.y);
      ctx.quadraticCurveTo(e.x + Math.sin(e.a) * e.len * 0.5 - e.av * 6, e.y + Math.cos(e.a) * e.len * 0.5, ex, ey);
      ctx.stroke();
      ctx.fillStyle = '#0c0c0c';
      ctx.beginPath(); ctx.arc(ex, ey + 3, 3.5, 0, 7); ctx.fill();
      ctx.fillRect(e.x - 30, e.y - 8, 60, 8);
    }
  };

  // ======================= الحارس الآلي =======================
  E.robot = {
    layer: 'mid',
    init(e) { e.w = 44; e.h = 60; e.y = e.gy - e.h; e.dir = e.dir || 1; e.wait = 0; e.charge = 0; e.dead = false; e.walkP = 0; e.sT = 0; e.speed = e.speed || 55; },
    eye(e) { return { x: e.x + e.w / 2 + e.dir * 16, y: e.y + 16 }; },
    crushBy(e, w, box, v) {
      if (e.dead) return;
      if (ov({ x: e.x + 4, y: e.y - 10, w: e.w - 8, h: e.h }, box)) {
        e.dead = true; e.charge = 0;
        w.snd('robotdie', e.x + e.w / 2); w.shake(9);
        w.burst(e.x + e.w / 2, e.y + 20, 30, { k: 'spark', sp: 300, life: 0.7, s: 1.8, g: 700, spread: 3.2 });
        w.burst(e.x + e.w / 2, e.y + 20, 16, { k: 'smoke', sp: 40, life: 2.5, s: 10, g: -30, spread: 2 });
        box.y = e.y - box.h + 22; e.h = 22; e.y = e.gy - 22;
      }
    },
    canSee(e, w) {
      const p = w.player;
      if (p.state === 'dead') return false;
      const E2 = this.eye(e);
      const px = p.x + p.w / 2, py = p.y + p.h * 0.35;
      const dx = px - E2.x, dy = py - E2.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > (e.range || 290)) return false;
      if (dx * e.dir < 0) return false;
      const ang = Math.atan2(dy, Math.abs(dx));
      if (Math.abs(ang - 0.18) > 0.36) return false;
      // مختبئ في الظل؟
      for (const z of w.ents) if (z.t === 'shade' && ov(z, p.rect()) && p.crouch) return false;
      // خط النظر
      const cols = w.cols(null, false).filter((c) => c.ent !== e);
      for (let s = 0.08; s < 0.98; s += 0.05) {
        const x = E2.x + dx * s, y = E2.y + dy * s;
        for (const c of cols) if (x > c.x && x < c.x + c.w && y > c.y && y < c.y + c.h) return false;
      }
      return true;
    },
    update(e, w, dt) {
      if (e.dead) { if (Math.random() < dt * 3) w.burst(e.x + e.w / 2, e.y, 1, { k: 'smoke', sp: 10, life: 2.5, s: 8, g: -25 }); return; }
      const seen = this.canSee(e, w);
      if (seen) {
        if (e.charge === 0) w.snd('alarm', e.x + e.w / 2);
        e.charge += dt;
        if (e.charge > 0.75) {
          w.snd('zap', e.x + e.w / 2);
          e.zap = 0.3;
          w.flash = 0.6;
          w.player.die('robot');
          e.charge = 0;
        }
        return;
      }
      e.charge = Math.max(0, e.charge - dt * 0.7);
      if (e.zap > 0) e.zap -= dt;
      if (e.wait > 0) { e.wait -= dt; if (e.wait <= 0) { e.dir *= -1; w.snd('servo', e.x + e.w / 2); } return; }
      const cols = w.cols(e, false).filter((c) => !(c.ent && c.ent.t === 'box' && c.ent.vy > 100));
      const x0 = e.x;
      w.moveX(e, e.dir * e.speed * dt, cols);
      const blocked = Math.abs(e.x - x0) < 0.01;
      e.walkP += Math.abs(e.x - x0) * 0.12;
      e.sT -= Math.abs(e.x - x0);
      if (e.sT <= 0) { e.sT = 30; w.snd('step', e.x + e.w / 2, { mat: 'metal', v: 0.7 }); }
      if (blocked || (e.dir > 0 && e.x > e.x2) || (e.dir < 0 && e.x < e.x1)) { e.wait = 1.4; }
      const p = w.player;
      if (p.state !== 'dead' && ov({ x: e.x + 6, y: e.y, w: e.w - 12, h: e.h }, p.rect())) { w.snd('zap', e.x); p.die('robot'); }
    },
    solid(e) { return e.dead ? R(e) : null; },
    light(e, w) {
      if (e.dead) return null;
      const E2 = this.eye(e);
      return [{ x: E2.x + e.dir * 120, y: E2.y + 40, r: 170, k: 0.55 }, { x: E2.x, y: E2.y, r: 50, k: 0.8 }];
    },
    draw(ctx, e, w) {
      const t = w.time;
      if (e.dead) {
        ctx.fillStyle = '#0a0a0a';
        ctx.beginPath(); ctx.moveTo(e.x - 6, e.y + e.h); ctx.lineTo(e.x + 4, e.y + 2); ctx.lineTo(e.x + 30, e.y + 6); ctx.lineTo(e.x + e.w + 8, e.y + e.h); ctx.fill();
        return;
      }
      const cx = e.x + e.w / 2, d = e.dir;
      const E2 = this.eye(e);
      // مخروط الضوء
      ctx.save();
      const len = e.range || 290;
      const g = ctx.createRadialGradient(E2.x, E2.y, 5, E2.x, E2.y, len);
      const alert = e.charge > 0;
      g.addColorStop(0, alert ? 'rgba(255,90,70,0.32)' : 'rgba(255,255,240,0.22)');
      g.addColorStop(1, 'rgba(255,255,240,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(E2.x, E2.y);
      const a0 = 0.18 - 0.36, a1 = 0.18 + 0.36;
      ctx.lineTo(E2.x + d * Math.cos(a0) * len, E2.y + Math.sin(a0) * len);
      ctx.lineTo(E2.x + d * Math.cos(a1) * len, E2.y + Math.sin(a1) * len);
      ctx.closePath(); ctx.fill();
      ctx.restore();
      // الأرجل
      ctx.strokeStyle = '#090909'; ctx.lineWidth = 4;
      const lp = Math.sin(e.walkP);
      ctx.beginPath();
      ctx.moveTo(cx - 8, e.y + 36); ctx.lineTo(cx - 10 + lp * 6, e.y + 48); ctx.lineTo(cx - 8 + lp * 8, e.y + e.h);
      ctx.moveTo(cx + 8, e.y + 36); ctx.lineTo(cx + 10 - lp * 6, e.y + 48); ctx.lineTo(cx + 8 - lp * 8, e.y + e.h);
      ctx.stroke();
      // الجسم
      ctx.fillStyle = '#0b0b0b';
      ctx.beginPath(); ctx.moveTo(e.x + 4, e.y + 8); ctx.lineTo(e.x + e.w - 4, e.y + 8); ctx.lineTo(e.x + e.w - 9, e.y + 38); ctx.lineTo(e.x + 9, e.y + 38); ctx.fill();
      ctx.fillRect(cx - 2, e.y - 6, 4, 12);
      ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 1.5; ctx.strokeRect(e.x + 10, e.y + 20, e.w - 20, 10);
      // العدسة
      ctx.fillStyle = alert ? 'rgba(255,60,40,0.95)' : 'rgba(230,230,210,0.85)';
      ctx.beginPath(); ctx.arc(E2.x, E2.y, 4 + (alert ? Math.sin(t * 30) : 0), 0, 7); ctx.fill();
      if (e.zap > 0) {
        const p = w.player;
        ctx.strokeStyle = 'rgba(255,200,180,0.9)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(E2.x, E2.y);
        for (let s = 0.2; s <= 1; s += 0.2) ctx.lineTo(LT.lerp(E2.x, p.cx, s) + (Math.random() - 0.5) * 10, LT.lerp(E2.y, p.y + 20, s) + (Math.random() - 0.5) * 10);
        ctx.stroke();
      }
    }
  };

  // ======================= موزع صناديق =======================
  E.dispenser = {
    layer: 'back',
    init(e) { e.last = false; e.cd = 0; e.n = 0; },
    update(e, w, dt) {
      const s = w.S(e.sig);
      e.cd -= dt;
      if (s && !e.last && e.cd <= 0) {
        e.cd = 1.5; e.n++;
        const id = e.id + '_b' + e.n + '_' + Math.floor(w.time * 10);
        const b = { t: 'box', id: id, x: e.x - 32, y: e.y + 4, w: 64, h: 64, mass: 2, mat: 'metal' };
        E.box.init(b, w);
        b.hx = e.x - 32; b.hy = e.y + 4;
        // حد أقصى للصناديق
        const mine = w.ents.filter((q) => q.t === 'box' && q.id.indexOf(e.id + '_b') === 0);
        if (mine.length >= (e.max || 3)) { const old = mine[0]; w.ents.splice(w.ents.indexOf(old), 1); }
        w.ents.push(b); w.index();
        w.snd('chain', e.x);
      }
      e.last = s;
    },
    draw(ctx, e) {
      ctx.fillStyle = '#090909';
      ctx.fillRect(e.x - 44, e.y - 40, 88, 44);
      ctx.fillStyle = '#000'; ctx.fillRect(e.x - 36, e.y - 4, 72, 6);
      ctx.strokeStyle = '#171717'; ctx.lineWidth = 2;
      for (let i = -30; i <= 30; i += 15) { ctx.beginPath(); ctx.moveTo(e.x + i, e.y - 38); ctx.lineTo(e.x + i, e.y - 8); ctx.stroke(); }
    }
  };

  // ======================= الظل المطارد =======================
  E.chaser = {
    layer: 'front',
    init(e) { e.on = false; e.done = false; e.cx = 0; e.fade = 0; e.speed = e.speed || 208; },
    update(e, w, dt) {
      const p = w.player;
      if (!e.on && !e.done && p.state !== 'dead' && p.x > e.trig) {
        e.on = true; e.cx = p.x - (e.off || 560); e.fade = 1;
        w.game.onChase(true);
        w.snd('shadow', e.cx);
      }
      if (e.on) {
        const dist = p.x - e.cx;
        let sp = dist > 430 ? 330 : (dist < 180 ? 170 : e.speed);
        if (p.state === 'dead') sp = 40;
        e.cx += sp * dt;
        w.game.tension = LT.clamp(1 - (dist - 120) / 450, 0.2, 1);
        if (p.state !== 'dead' && p.x < e.cx - 6) {
          w.burst(p.cx, p.y + 20, 30, { k: 'smoke', sp: 80, life: 1.4, s: 9, g: -20, spread: 6 });
          p.die('shadow');
        }
        if (p.x > e.end && p.state !== 'dead') {
          e.on = false; e.done = true;
          w.game.onChase(false);
          w.burst(e.cx - 40, p.y, 40, { k: 'smoke', sp: 90, life: 2, s: 12, g: -30, spread: 6, h: 300 });
        }
        if (Math.random() < dt * 30) w.spawn({ k: 'smoke', x: e.cx - Math.random() * 80, y: p.y + (Math.random() - 0.7) * 300, vx: 40 + Math.random() * 60, vy: (Math.random() - 0.5) * 30, life: 1.4, s: 10 + Math.random() * 12, g: 0 });
      } else if (e.fade > 0) e.fade = Math.max(0, e.fade - dt * 0.8);
    },
    draw(ctx, e, w) {
      if (!e.on && e.fade <= 0) return;
      const t = w.time;
      const cam = w.cam;
      const top = cam.y - 60, bot = cam.y + LT.C.VIEW_H + 60;
      const fx = e.cx;
      ctx.save();
      ctx.globalAlpha = e.on ? 1 : e.fade;
      const g = ctx.createLinearGradient(fx - 500, 0, fx + 40, 0);
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.75, 'rgba(0,0,0,0.92)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(fx - 2000, top, 2040, bot - top);
      // الحافة الدخانية
      ctx.fillStyle = '#000';
      for (let i = 0; i < 26; i++) {
        const yy = top + (i / 25) * (bot - top);
        const r = 30 + Math.sin(t * 3 + i * 1.7) * 14 + Math.sin(t * 7.3 + i) * 6;
        ctx.beginPath(); ctx.arc(fx - 10 + Math.sin(t * 2.3 + i * 2.1) * 18, yy, r, 0, 7); ctx.fill();
      }
      // أذرع ممتدة
      ctx.strokeStyle = '#000'; ctx.lineCap = 'round';
      const py = w.player.y + 20;
      for (let k = 0; k < 5; k++) {
        const reach = 50 + Math.sin(t * 2.7 + k * 1.3) * 30 + k * 8;
        const yy = py + (k - 2) * 50 + Math.sin(t * 1.9 + k) * 20;
        ctx.lineWidth = 7 - k;
        ctx.beginPath(); ctx.moveTo(fx - 20, yy);
        ctx.quadraticCurveTo(fx + reach * 0.5, yy - 20 + Math.sin(t * 4 + k) * 15, fx + reach, yy + Math.sin(t * 5 + k) * 12);
        ctx.stroke();
      }
      ctx.restore();
    }
  };

  // ======================= هيئة الظل (مشهد) =======================
  E.shadowfig = {
    layer: 'front',
    init(e) { e.vis = 0; e.st = 0; e.facing = e.facing || -1; },
    update(e, w, dt) {
      const p = w.player;
      if (e.st === 0 && p.x > e.trig) { e.st = 1; w.snd('sting', e.x); w.game.tension = 0.6; }
      if (e.st === 1) {
        e.vis = Math.min(1, e.vis + dt * 0.7);
        if ((e.lamp && !w.S(e.lamp)) || Math.abs(p.x - e.x) < (e.near || 260)) { e.st = 2; w.snd('shadow', e.x); w.burst(e.x, e.y - 30, 30, { k: 'smoke', sp: 60, life: 2, s: 10, g: -20, spread: 6, h: 50 }); }
      }
      if (e.st === 2) { e.vis = Math.max(0, e.vis - dt * 2.5); }
    },
    draw(ctx, e, w) {
      if (e.vis <= 0) return;
      const t = w.time;
      const P = { lean: 0.02, hip: 24, th: [0, -0.05], sh: [0, 0], a1: [0.1 + (e.st === 1 ? Math.min(1, e.vis) * 1.4 : 0), -0.1], a2: [0.2, 0.3], head: Math.sin(t * 0.7) * 0.08, alpha: e.vis };
      ctx.save();
      for (let k = 0; k < 3; k++) {
        ctx.globalAlpha = 0.35 * e.vis;
        LT.drawFigure(ctx, e.x + Math.sin(t * 9 + k) * 1.5, e.y + Math.cos(t * 7 + k), e.facing, P, { color: '#000', backColor: '#000' });
      }
      ctx.globalAlpha = e.vis;
      LT.drawFigure(ctx, e.x, e.y, e.facing, P, { color: '#000', backColor: '#000' });
      ctx.restore();
      if (Math.random() < 0.3) w.spawn({ k: 'smoke', x: e.x + (Math.random() - 0.5) * 20, y: e.y - Math.random() * 50, vx: (Math.random() - 0.5) * 20, vy: -20, life: 1.2, s: 4, g: 0 });
    }
  };

  // ======================= نقطة حفظ =======================
  E.checkpoint = {
    init(e) { e.done = !!e.done; },
    update(e, w) {
      const p = w.player;
      if (!e.done && p.state === 'normal' && p.onGround && p.x > e.x) { e.done = true; w.checkpoint(e); }
    }
  };

  // ======================= أثر (دليل قصة) =======================
  E.clue = {
    layer: 'back',
    init(e) { e.got = false; },
    near(e, w, p) { return pnear(p, e.x, e.y, 40, 70); },
    interact(e, w) {
      if (!e.got) { e.got = true; LT.Save.addClue(e.cid); }
      w.game.showClue(e.cid);
      w.snd('clue', e.x);
      return true;
    },
    light(e, w) { return { x: e.x, y: e.y, r: 70, k: 0.5 }; },
    draw(ctx, e, w) {
      const t = w.time;
      const known = LT.Save.data.clues.indexOf(e.cid) >= 0;
      const a = known ? 0.35 : 0.55 + Math.sin(t * 2) * 0.25;
      ctx.save();
      const g = ctx.createRadialGradient(e.x, e.y, 1, e.x, e.y, 26);
      g.addColorStop(0, 'rgba(220,170,90,' + (a * 0.6) + ')'); g.addColorStop(1, 'rgba(220,170,90,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(e.x, e.y, 26, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(235,190,110,' + a + ')'; ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(e.x - 6, e.y - 7); ctx.lineTo(e.x + 6, e.y - 7); ctx.lineTo(e.x - 3, e.y + 8);
      ctx.moveTo(e.x - 8, e.y + 1); ctx.lineTo(e.x + 4, e.y + 1);
      ctx.stroke();
      ctx.restore();
      const p = w.player;
      if (Math.abs(p.cx - e.x) < 45 && !known) E.hint.drawIcon(ctx, e.x, e.y - 34, 'act', 0.6);
    }
  };

  // ======================= تلميح تحكم =======================
  E.hint = {
    layer: 'front',
    draw(ctx, e, w) {
      if (!LT.Save.data.settings.hints) return;
      const p = w.player;
      const d = Math.abs(p.cx - e.x);
      if (d > (e.r || 220)) return;
      const a = LT.clamp(1 - d / (e.r || 220), 0, 1) * 0.55;
      this.drawIcon(ctx, e.x, e.y, e.k, a);
    },
    drawIcon(ctx, x, y, k, a) {
      ctx.save();
      ctx.globalAlpha = a;
      ctx.strokeStyle = '#ddd'; ctx.fillStyle = '#ddd'; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.arc(x, y, 13, 0, 7); ctx.stroke();
      ctx.beginPath();
      if (k === 'jump') { ctx.moveTo(x - 5, y + 3); ctx.lineTo(x, y - 4); ctx.lineTo(x + 5, y + 3); }
      else if (k === 'act' || k === 'grab') { ctx.arc(x, y, 4, 0, 7); }
      else if (k === 'right') { ctx.moveTo(x - 3, y - 5); ctx.lineTo(x + 3, y); ctx.lineTo(x - 3, y + 5); }
      else if (k === 'left') { ctx.moveTo(x + 3, y - 5); ctx.lineTo(x - 3, y); ctx.lineTo(x + 3, y + 5); }
      ctx.stroke();
      if (k === 'grab') {
        ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('⟷', x, y + 26);
      }
      if (!LT.isTouch) {
        const key = { jump: 'SPACE', act: 'E', grab: 'E', right: '→', left: '←' }[k];
        ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(key, x, y - 18);
      }
      ctx.restore();
    }
  };

  // ======================= نهاية الفصل =======================
  E.exit = {
    update(e, w) {
      const p = w.player;
      if (!e.done && p.state !== 'dead' && p.x > e.x) { e.done = true; w.game.nextChapter(); }
    }
  };

  // ======================= مشغل مشهد سينمائي =======================
  E.cine = {
    update(e, w) {
      const p = w.player;
      if (!e.done && p.state !== 'dead' && p.x > e.x && (e.y === undefined || p.y < e.y)) { e.done = true; w.game.runCine(e.cid, e); }
    }
  };

  // ======================= منطقة موسيقى / توتر =======================
  E.music = {
    update(e, w) {
      const p = w.player;
      if (!e.done && p.x > e.x) { e.done = true; LT.Audio.setMusic(e.m); }
    }
  };

  // ======================= منطقة ظل للاختباء =======================
  E.shade = {
    layer: 'back',
    draw(ctx, e) {
      const g = ctx.createLinearGradient(e.x, 0, e.x + e.w, 0);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.2, 'rgba(0,0,0,0.55)'); g.addColorStop(0.8, 'rgba(0,0,0,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(e.x, e.y, e.w, e.h);
    }
  };

  // ======================= جدار سري =======================
  E.secret = {
    layer: 'mid',
    init(e) { e.open = 0; e.opening = false; },
    ix(e) { return e.x + e.w / 2; },
    near(e, w, p) {
      const cx = p.x + p.w / 2;
      return (Math.abs(cx - e.x) < 36 || Math.abs(cx - (e.x + e.w)) < 36) && p.y + p.h > e.y && p.y < e.y + e.h;
    },
    interact(e, w) {
      if (e.opening) return false;
      if (e.real) {
        e.opening = true;
        w.snd('knock', e.x + e.w / 2, { hollow: true });
        w.snd('rumble', e.x + e.w / 2);
        w.shake(4);
      } else {
        w.snd('knock', e.x + e.w / 2);
        w.burst(e.x + e.w / 2, e.y + e.h * 0.4, 4, { k: 'dust', sp: 40, life: 0.6, s: 1.5, g: 100 });
      }
      return true;
    },
    update(e, w, dt) {
      if (e.opening && e.open < 1) {
        e.open = Math.min(1, e.open + dt * 0.5);
        if (Math.random() < dt * 20) w.burst(e.x + Math.random() * e.w, e.y + e.h, 1, { k: 'dust', sp: 50, life: 0.8, s: 2.5, g: -10, spread: 3 });
      }
      if (e.real && !e.opening && Math.random() < dt * 0.7) w.burst(e.x + Math.random() * e.w, e.y + 5, 1, { k: 'dust', sp: 5, life: 1.4, s: 1.2, g: 60 });
    },
    signal(e, w, s) { if (e.open >= 1 && e.sig) s[e.sig] = true; },
    solid(e) { const h = e.h * (1 - e.open); return h > 2 ? { x: e.x, y: e.y + e.h - h, w: e.w, h: h, ent: e } : null; },
    draw(ctx, e, w) {
      const h = e.h * (1 - e.open);
      if (h <= 2) return;
      const y = e.y + e.h - h;
      ctx.fillStyle = '#080808'; ctx.fillRect(e.x, y, e.w, h);
      ctx.strokeStyle = '#141414'; ctx.lineWidth = 1.5;
      const rnd = LT.rng(e.x | 0);
      for (let yy = y + 18; yy < y + h; yy += 22) {
        ctx.beginPath(); ctx.moveTo(e.x, yy); ctx.lineTo(e.x + e.w, yy + (rnd() - 0.5) * 4); ctx.stroke();
      }
      ctx.beginPath(); ctx.moveTo(e.x + e.w * 0.5, y + 4); ctx.lineTo(e.x + e.w * 0.4, y + h * 0.4); ctx.lineTo(e.x + e.w * 0.6, y + h * 0.7); ctx.stroke();
    }
  };

  // ======================= مصدر صوت (لغز الصوت) =======================
  E.ticker = {
    init(e) { e.tm = 0; },
    update(e, w, dt) {
      if (e.stop && w.S(e.stop)) return;
      e.tm -= dt;
      if (e.tm <= 0) {
        e.tm = e.per || 0.9;
        const d = Math.abs(w.player.x - e.x);
        if (d < 1100) {
          w.snd('tick', e.x, { v: 1.3 });
          w.spawn({ k: 'ring', x: e.x, y: e.y, vx: 0, vy: 0, life: 0.9, s: 5, wall: true });
        }
      }
    }
  };

  // ======================= مصباح =======================
  E.lamp = {
    layer: 'back',
    init(e) { e.r = e.r || 300; e.lv = 0; },
    update(e, w, dt) {
      const on = e.sig ? w.S(e.sig) : true;
      let target = on ? 1 : 0;
      if (on && e.flick && Math.random() < dt * 4) target = 0.3;
      if (on && e.dur) {
        // وميض تحذيري قبل الانطفاء
        const src = w.ents.find((q) => q.sig === e.sig && q.timer !== undefined && q.timer > 0);
        if (src && src.timer < 2 && Math.sin(w.time * 30) > 0) target = 0.35;
      }
      e.lv = LT.approach(e.lv, target, dt * (target > e.lv ? 10 : 6));
    },
    light(e) { return e.lv > 0.02 ? { x: e.x, y: e.y + 10, r: e.r * (0.6 + 0.4 * e.lv), k: e.lv } : null; },
    draw(ctx, e, w) {
      ctx.strokeStyle = '#0c0c0c'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(e.x, e.y - 400); ctx.lineTo(e.x, e.y); ctx.stroke();
      ctx.fillStyle = '#0c0c0c';
      ctx.beginPath(); ctx.moveTo(e.x - 12, e.y + 10); ctx.lineTo(e.x - 5, e.y); ctx.lineTo(e.x + 5, e.y); ctx.lineTo(e.x + 12, e.y + 10); ctx.fill();
      if (e.lv > 0.02) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(e.x, e.y + 12, 1, e.x, e.y + 12, 60);
        g.addColorStop(0, 'rgba(255,235,190,' + (0.55 * e.lv) + ')'); g.addColorStop(1, 'rgba(255,235,190,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(e.x, e.y + 12, 60, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(255,245,220,' + e.lv + ')'; ctx.beginPath(); ctx.arc(e.x, e.y + 11, 3.5, 0, 7); ctx.fill();
        ctx.restore();
      }
    }
  };

  // ======================= منصة خفية (تظهر بالضوء) =======================
  E.ghost = {
    layer: 'mid',
    init(e) { e.h = e.h || 14; },
    solid(e) { return R(e); },
    draw(ctx, e, w) {
      let lampLv = 0;
      for (const q of w.ents) if (q.t === 'lamp' && LT.dist(q.x, q.y, e.x + e.w / 2, e.y) < q.r) lampLv = Math.max(lampLv, q.lv);
      const a = LT.clamp(lampLv * 1.2, 0, 1);
      if (a <= 0.01) return;
      ctx.save(); ctx.globalAlpha = a;
      ctx.fillStyle = '#121212'; ctx.fillRect(e.x, e.y, e.w, e.h);
      ctx.fillStyle = 'rgba(255,240,210,0.35)'; ctx.fillRect(e.x, e.y, e.w, 1.5);
      ctx.strokeStyle = '#0b0b0b'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(e.x + 6, e.y + e.h); ctx.lineTo(e.x + e.w / 2, e.y + e.h + 18); ctx.lineTo(e.x + e.w - 6, e.y + e.h); ctx.stroke();
      ctx.restore();
    }
  };

  // ======================= حطام يسقط دوريًا =======================
  E.dropper = {
    layer: 'mid',
    init(e) { e.per = e.per || 2.8; e.off = e.off || 0; e.ry = e.y; e.st = 0; e.v = 0; e.w = e.w || 34; },
    update(e, w, dt) {
      const ph = ((w.time + e.off) % e.per) / e.per;
      if (ph < 0.25) { e.st = 0; e.ry = e.y; e.v = 0; if (Math.random() < dt * 14) w.burst(e.x + Math.random() * e.w, e.y + 4, 1, { k: 'dust', sp: 5, life: 0.8, s: 1.4, g: 200 }); }
      else if (e.st === 0) { e.st = 1; w.snd('crack', e.x, { v: 0.5 }); }
      if (e.st === 1) {
        e.v += C.G * dt; e.ry += e.v * dt;
        if (e.ry + 26 >= e.gy) {
          e.st = 2; e.ry = e.gy - 26;
          w.snd('thud', e.x, { k: 0.6 });
          w.burst(e.x + e.w / 2, e.gy, 10, { k: 'chip', sp: 160, life: 0.7, s: 2.4, g: 900, spread: 2.6 });
        }
      }
    },
    hazard(e, w, pr) {
      if (e.st !== 1) return null;
      return ov({ x: e.x, y: e.ry, w: e.w, h: 26 }, pr) ? 'crush' : null;
    },
    draw(ctx, e) {
      if (e.st === 2) return;
      ctx.fillStyle = '#080808';
      ctx.beginPath(); ctx.moveTo(e.x, e.ry); ctx.lineTo(e.x + e.w, e.ry + 4); ctx.lineTo(e.x + e.w - 6, e.ry + 26); ctx.lineTo(e.x + 4, e.ry + 22); ctx.fill();
    }
  };

  // ======================= وعاء حفظ (المشهد الأخير) =======================
  E.pod = {
    layer: 'back',
    init(e) { e.lit = e.lit || 0; },
    near(e, w, p) { return e.active && pnear(p, e.x, e.y - 40, 40, 80); },
    interact(e, w) { if (!e.used) { e.used = true; w.game.runCine('ending', e); } return true; },
    update(e, w, dt) { if (e.wake) e.lit = Math.min(1, e.lit + dt * 0.25); },
    light(e) { return (e.active || e.lit > 0) ? { x: e.x, y: e.y - 70, r: 150, k: 0.4 + e.lit * 0.5 } : null; },
    draw(ctx, e, w) {
      const x = e.x, y = e.y, t = w.time;
      ctx.fillStyle = '#090909';
      ctx.fillRect(x - 30, y - 12, 60, 12);
      ctx.fillRect(x - 30, y - 170, 60, 14);
      // الزجاج
      const glow = e.lit > 0 ? e.lit : (e.active ? 0.25 + Math.sin(t * 2) * 0.1 : 0);
      ctx.fillStyle = glow > 0 ? 'rgba(120,170,190,' + (0.08 + glow * 0.25) + ')' : 'rgba(150,160,170,0.05)';
      ctx.fillRect(x - 24, y - 156, 48, 144);
      ctx.strokeStyle = 'rgba(200,210,220,0.18)'; ctx.lineWidth = 1;
      ctx.strokeRect(x - 24, y - 156, 48, 144);
      ctx.beginPath(); ctx.moveTo(x - 16, y - 150); ctx.lineTo(x - 16, y - 30); ctx.stroke();
      if (e.occupied) {
        const P = { lean: 0, hip: 24, th: [0.1, -0.1], sh: [0.2, 0.2], a1: [0.2, -0.2], a2: [0.3, 0.3], head: 0.3, alpha: 0.85 };
        ctx.save(); ctx.globalAlpha = 0.8;
        LT.drawFigure(ctx, x, y - 30 + Math.sin(t * 0.8) * 2, 1, P, { color: '#050505', backColor: '#0b0b0b' });
        ctx.restore();
        if (Math.random() < 0.05) w.spawn({ k: 'bubble', x: x + (Math.random() - 0.5) * 30, y: y - 20, vx: 0, vy: -40, life: 2, s: 1.5, g: -10 });
      }
      ctx.fillStyle = e.num === '07' ? 'rgba(220,170,90,0.8)' : 'rgba(200,200,200,0.35)';
      ctx.font = '10px monospace'; ctx.textAlign = 'center';
      ctx.fillText(e.num, x, y - 160);
      if (e.active && !e.used) {
        const p = w.player;
        if (Math.abs(p.cx - x) < 50) E.hint.drawIcon(ctx, x, y - 195, 'act', 0.6);
      }
    }
  };
})(window.LT);
