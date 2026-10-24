/* =========================================================
   world.js : عالم المرحلة — التصادمات، الإشارات، الحمل على
   المنصات، نقاط الحفظ، والموت وإعادة المحاولة
   ========================================================= */
(function (LT) {
  'use strict';

  const ov = LT.overlap;
  let ID = 1;

  class World {
    constructor(def, chIndex, game) {
      this.def = def;
      this.ch = chIndex;
      this.game = game;
      this.theme = def.theme;
      this.solids = def.solids.map(function (r) { return { x: r[0], y: r[1], w: r[2], h: r[3], st: true }; });
      this.bottom = def.bottom || 1300;
      this.time = 0;
      this.sig = {};
      this.ents = LT.clone(def.ents);
      const self = this;
      this.ents.forEach(function (e) {
        if (!e.id) e.id = 'e' + (ID++);
        const T = LT.Ent[e.t];
        if (!T) console.warn('Unknown entity', e.t);
        else if (T.init) T.init(e, self);
      });
      this.index();
      this.player = new LT.Player(this, def.spawn[0], def.spawn[1]);
      this.cam = { x: def.spawn[0] - 400, y: def.spawn[1] - 320, shake: 0, sx: 0, sy: 0, look: 0, ov: null };
      this.particles = [];
      this.snapshot = null;
      this.noiseEvents = [];
      this.deathT = 0;
      this.flash = 0;
      this.shadowFx = 0;
    }

    index() {
      this.byId = {};
      this.boxes = [];
      for (const e of this.ents) {
        this.byId[e.id] = e;
        if (e.t === 'box') this.boxes.push(e);
      }
    }

    // ---------- الإشارات (روافع، ألواح ضغط، حبال...) ----------
    S(expr) {
      if (!expr) return false;
      if (expr.indexOf('|') >= 0) return expr.split('|').some((x) => this.S(x));
      if (expr.indexOf('&') >= 0) return expr.split('&').every((x) => this.S(x));
      if (expr[0] === '!') return !this.sig[expr.slice(1)];
      return !!this.sig[expr];
    }

    // ---------- التصادم ----------
    cols(exclude, forPlayer) {
      const out = [];
      const ex = exclude;
      const minX = ex ? ex.x - 300 : -1e9, maxX = ex ? ex.x + ex.w + 300 : 1e9;
      for (const s of this.solids) if (s.x < maxX && s.x + s.w > minX) out.push(s);
      for (const e of this.ents) {
        if (e === ex) continue;
        const T = LT.Ent[e.t];
        if (!T || !T.solid) continue;
        const r = T.solid(e, this, forPlayer);
        if (!r) continue;
        if (Array.isArray(r)) { for (const q of r) out.push(q); } else out.push(r);
      }
      return out;
    }

    moveX(b, dx, cols) {
      if (!dx) return null;
      b.x += dx;
      let hit = null;
      for (const c of cols) {
        if (c.ent === b) continue;
        if (ov(b, c)) {
          // تجاهل التلامس السطحي جدًا (حافة علوية/سفلية) حتى لا يُدفع الجسم جانبيًا
          const oy = Math.min(b.y + b.h, c.y + c.h) - Math.max(b.y, c.y);
          if (oy < 2.5) continue;
          if (dx > 0) b.x = c.x - b.w; else b.x = c.x + c.w;
          hit = c;
        }
      }
      return hit;
    }

    moveY(b, dy, cols) {
      if (!dy) return null;
      b.y += dy;
      let hit = null;
      for (const c of cols) {
        if (c.ent === b) continue;
        if (ov(b, c)) {
          if (dy > 0) b.y = c.y - b.h; else b.y = c.y + c.h;
          hit = c;
        }
      }
      return hit;
    }

    free(r, cols) {
      for (const c of cols) if (ov(r, c)) return false;
      return true;
    }

    // الأجسام القابلة للحمل على المنصات: اللاعب + الصناديق
    bodies() {
      const list = [];
      const p = this.player;
      if (p.state !== 'dead' && p.state !== 'swing' && p.state !== 'hang' && p.state !== 'climb') list.push(p);
      for (const b of this.boxes) if (!b.held) list.push(b);
      return list;
    }

    restingOn(rect, body) {
      return Math.abs((body.y + body.h) - rect.y) <= 3 &&
        body.x + body.w > rect.x + 1 && body.x < rect.x + rect.w - 1 &&
        (body.vy === undefined || body.vy >= -5);
    }

    // نقل الأجسام الواقفة فوق جسم متحرك
    carry(rect, dx, dy, depth) {
      depth = depth || 0;
      if (depth > 2 || (!dx && !dy)) return;
      for (const b of this.bodies()) {
        if (b === rect.ent) continue;
        if (!this.restingOn(rect, b)) continue;
        const before = { x: b.x, y: b.y, w: b.w, h: b.h, ent: b };
        b.y = rect.y + dy - b.h;
        // لا تحمل الجسم إذا كان سيدخل في جدار ثابت
        let stuck = false;
        for (const s of this.solids) if (ov(b, s)) { stuck = true; break; }
        if (stuck) { b.y = before.y; continue; }
        if (dx) this.moveX(b, dx, this.cols(b, b === this.player).filter((c) => c.ent !== rect.ent));
        if (b.t === 'box') this.carry(before, b.x - before.x, b.y - before.y, depth + 1);
      }
    }

    // الوزن فوق منصة (للبكرات)
    weightOn(rect) {
      let w = 0;
      for (const b of this.bodies()) {
        if (b === rect.ent) continue;
        if (this.restingOn(rect, b)) {
          w += b.mass || 1;
          if (b.t === 'box') w += this.weightOn({ x: b.x, y: b.y, w: b.w, h: b.h, ent: b });
        }
      }
      return w;
    }

    // دفع صندوق أفقيًا (مع حمل ما فوقه)
    pushBox(box, dx) {
      const x0 = box.x, y0 = box.y;
      const cols = this.cols(box, false);
      this.moveX(box, dx, cols);
      const moved = box.x - x0;
      if (moved) this.carry({ x: x0, y: y0, w: box.w, h: box.h, ent: box }, moved, 0, 1);
      return moved;
    }

    // ---------- الماء ----------
    waters() { return this.ents.filter((e) => e.t === 'water'); }
    waterAt(x, y) {
      for (const e of this.ents) {
        if (e.t !== 'water') continue;
        if (x >= e.x && x <= e.x + e.w && y > e.cur && y < e.y + e.h + 2) return e;
      }
      return null;
    }

    // ---------- الضوء (للأنفاق والمنصات الخفية) ----------
    lights() {
      const L = [];
      const p = this.player;
      const amb = this.def.dark ? (this.def.plight || 120) : 0;
      if (amb) L.push({ x: p.x + p.w / 2, y: p.y + 10, r: amb, k: 0.85 });
      for (const e of this.ents) {
        const T = LT.Ent[e.t];
        if (T && T.light) { const l = T.light(e, this); if (l) { if (Array.isArray(l)) L.push.apply(L, l); else L.push(l); } }
      }
      return L;
    }
    lightAt(x, y) {
      let v = 0;
      for (const l of this.lights()) {
        const d = LT.dist(x, y, l.x, l.y);
        if (d < l.r) v = Math.max(v, (1 - d / l.r) * (l.k || 1));
      }
      return v;
    }

    // ---------- أحداث صوتية تجذب كائن المستنقع ----------
    noise(x, y) {
      for (const e of this.ents) if (e.t === 'creature') LT.Ent.creature.hear(e, this, x, y);
    }

    snd(name, x, opt) { LT.Audio.play(name, x, opt); }
    shake(a) {
      if (!LT.Save.data.settings.shake) a *= 0.25;
      this.cam.shake = Math.max(this.cam.shake, a);
    }

    // ---------- الجزيئات ----------
    spawn(p) {
      if (this.particles.length > 700) this.particles.shift();
      p.life = p.life || 1; p.t = 0;
      this.particles.push(p);
    }
    burst(x, y, n, o) {
      for (let i = 0; i < n; i++) {
        const a = (o.a !== undefined ? o.a : -Math.PI / 2) + (Math.random() - 0.5) * (o.spread || Math.PI);
        const s = (o.sp || 120) * (0.4 + Math.random() * 0.8);
        this.spawn({
          k: o.k || 'dust', x: x + (Math.random() - 0.5) * (o.w || 0), y: y + (Math.random() - 0.5) * (o.h || 0),
          vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: (o.life || 0.6) * (0.6 + Math.random() * 0.8),
          s: (o.s || 2) * (0.6 + Math.random() * 0.8), g: o.g === undefined ? 300 : o.g, c: o.c, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 10
        });
      }
    }

    // ---------- التحديث الثابت ----------
    step(dt, inp) {
      this.time += dt;
      const sig = this.sig = {};
      for (const e of this.ents) {
        const T = LT.Ent[e.t];
        if (T && T.signal) T.signal(e, this, sig);
      }
      for (const e of this.ents) {
        if (e.t === 'box') continue;
        const T = LT.Ent[e.t];
        if (T && T.update) T.update(e, this, dt);
      }
      for (let i = 0; i < this.boxes.length; i++) LT.Ent.box.update(this.boxes[i], this, dt);

      this.player.step(dt, inp);

      const p = this.player;
      if (p.state !== 'dead') {
        const pr = p.rect();
        for (const e of this.ents) {
          const T = LT.Ent[e.t];
          if (T && T.hazard) {
            const cause = T.hazard(e, this, pr);
            if (cause) { p.die(cause); break; }
          }
        }
        if (p.y > this.bottom) p.die('pit');
      }
    }

    // ---------- تحديث بإطار العرض (جزيئات + كاميرا) ----------
    frame(dt) {
      const P = this.particles;
      for (let i = P.length - 1; i >= 0; i--) {
        const q = P[i];
        q.t += dt;
        if (q.t >= q.life) { P.splice(i, 1); continue; }
        q.vy += (q.g || 0) * dt;
        if (q.drag) { q.vx *= 1 - q.drag * dt; q.vy *= 1 - q.drag * dt; }
        q.x += q.vx * dt; q.y += q.vy * dt;
        if (q.vr) q.rot += q.vr * dt;
      }
      if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 2.5);
      this.updateCamera(dt);
    }

    updateCamera(dt) {
      const c = this.cam, p = this.player, R = LT.Render;
      const vw = R.viewW, vh = LT.C.VIEW_H;
      let tx, ty;
      if (c.ov) { tx = c.ov.x - vw / 2; ty = c.ov.y - vh / 2; }
      else {
        const fac = p.state === 'dead' ? 0 : p.facing;
        const moving = Math.abs(p.vx) > 40 ? 1 : 0.35;
        c.look = LT.lerp(c.look, fac * 90 * moving, 1 - Math.exp(-dt * 1.4));
        tx = p.x + p.w / 2 - vw / 2 + c.look;
        ty = p.y + p.h / 2 - vh * 0.64;
      }
      const d = this.def;
      tx = LT.clamp(tx, d.camMin !== undefined ? d.camMin : -200, (d.width || 5000) - vw + 200);
      if (d.camY) ty = LT.clamp(ty, d.camY[0], d.camY[1]);
      const k = c.snap ? 1 : 1 - Math.exp(-dt * (c.ov ? (c.ov.k || 1.6) : 4));
      const ky = c.snap ? 1 : 1 - Math.exp(-dt * 3);
      c.x = LT.lerp(c.x, tx, k);
      c.y = LT.lerp(c.y, ty, ky);
      c.snap = false;
      if (c.shake > 0) {
        c.sx = (Math.random() - 0.5) * c.shake * 2;
        c.sy = (Math.random() - 0.5) * c.shake * 2;
        c.shake = Math.max(0, c.shake - dt * c.shake * 4 - dt * 2);
      } else { c.sx = c.sy = 0; }
      LT.Audio.camX = c.x; LT.Audio.viewW = vw;
    }

    // ---------- نقاط الحفظ ----------
    takeSnapshot(cpId) {
      const p = this.player;
      return {
        ents: LT.clone(this.ents),
        px: p.x, py: p.y + p.h, facing: p.facing,
        cp: cpId, time: this.time
      };
    }
    applySnapshot(s) {
      this.ents = LT.clone(s.ents);
      this.index();
      const p = this.player;
      p.reset(s.px, s.py, s.facing);
      this.particles.length = 0;
      this.cam.snap = true;
      this.cam.ov = null;
      this.updateCamera(0.016);
      this.cam.snap = true;
    }
    checkpoint(e) {
      this.snapshot = this.takeSnapshot(e.id);
      this.game.onCheckpoint(this.snapshot);
    }

    tryInteract(p) {
      let best = null, bd = 1e9;
      const cx = p.x + p.w / 2;
      for (const e of this.ents) {
        const T = LT.Ent[e.t];
        if (!T || !T.interact || !T.near) continue;
        if (!T.near(e, this, p)) continue;
        const ex = T.ix ? T.ix(e) : e.x;
        const d = Math.abs(ex - cx);
        if (d < bd) { bd = d; best = e; }
      }
      if (best) return LT.Ent[best.t].interact(best, this, p) !== false;
      return false;
    }
  }

  LT.World = World;
})(window.LT);
