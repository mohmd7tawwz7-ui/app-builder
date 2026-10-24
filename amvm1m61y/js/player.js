/* =========================================================
   player.js : آدم — الحركة، القفز، التعلق، التسلق، الزحف،
   الدفع والسحب، الحبال، السباحة، الموت، والرسم الهيكلي
   ========================================================= */
(function (LT) {
  'use strict';

  const C = LT.C;
  const ov = LT.overlap;

  class Player {
    constructor(world, x, feetY) {
      this.world = world;
      this.mass = 1;
      this.reset(x, feetY, 1);
    }

    reset(x, feetY, facing) {
      this.w = C.PW; this.h = C.PH;
      this.x = x; this.y = feetY - this.h;
      this.vx = 0; this.vy = 0;
      this.facing = facing || 1;
      this.state = 'normal';
      this.onGround = true; this.ground = null;
      this.crouch = false;
      this.coyote = 0; this.jumpBuf = 0;
      this.runT = 0;
      this.phase = 0; this.animT = 0;
      this.grab = null; this.pushing = null; this.pulling = false;
      this.hang = null; this.climbT = 0; this.ledgeCD = 0;
      this.rope = null; this.ropeCD = 0;
      this.water = null; this.stamina = C.STAMINA; this.sinkT = 0;
      this.deadT = 0; this.cause = null;
      this.landT = 0; this.stepT = 0; this.interactT = 0;
      this.pose = null; this.poseT = 0;
      this.fallMax = 0;
      this.scarf = null;
      this.lastMat = 'dirt';
    }

    rect() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
    get cx() { return this.x + this.w / 2; }

    setHeight(h) {
      const feet = this.y + this.h;
      this.h = h; this.y = feet - h;
    }
    canStand(cols) {
      const r = { x: this.x, y: this.y + this.h - C.PH, w: this.w, h: C.PH };
      return this.world.free(r, cols);
    }

    die(cause) {
      if (this.state === 'dead') return;
      if (this.world.game.godMode) return;
      this.state = 'dead';
      this.cause = cause;
      this.deadT = 0;
      this.grab = null; this.rope = null; this.hang = null;
      this.world.game.onDeath(cause);
    }

    material(c) {
      if (!c) return 'dirt';
      if (c.ent) {
        const e = c.ent;
        if (e.t === 'box') return e.mat === 'metal' ? 'metal' : 'wood';
        if (e.t === 'tree') return 'wood';
        if (e.t === 'crumble') return this.world.def.mat === 'metal' ? 'metal' : 'wood';
        return 'metal';
      }
      return this.world.def.mat || 'dirt';
    }

    // ================= الخطوة الفيزيائية =================
    step(dt, inp) {
      const W = this.world;
      if (this.pose) { this.poseT += dt; }
      if (this.state === 'dead') { this.stepDead(dt); return; }
      if (this.pose === 'sleep' || this.pose === 'wake' || this.pose === 'kneel') { this.vx = 0; this.gravityOnly(dt); return; }

      this.ledgeCD = Math.max(0, this.ledgeCD - dt);
      this.ropeCD = Math.max(0, this.ropeCD - dt);
      this.interactT = Math.max(0, this.interactT - dt);
      this.landT = Math.max(0, this.landT - dt);

      if (this.state === 'hang') return this.stepHang(dt, inp);
      if (this.state === 'climb') return this.stepClimb(dt);
      if (this.state === 'swing') return this.stepSwing(dt, inp);
      if (this.state === 'swim') return this.stepSwim(dt, inp);
      this.stepNormal(dt, inp);
    }

    gravityOnly(dt) {
      const W = this.world;
      this.vy = Math.min(this.vy + C.G * dt, C.MAXFALL);
      const cols = W.cols(this, true);
      const h = W.moveY(this, this.vy * dt, cols);
      if (h && this.vy > 0) { this.onGround = true; this.vy = 0; this.ground = h; }
    }

    stepNormal(dt, inp) {
      const W = this.world;
      let dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
      const cols = W.cols(this, true);

      // ---- الماء ----
      const wat = W.waterAt(this.cx, this.y + this.h * 0.4);
      if (wat && !this.onGround) {
        const depth = this.depthBelow(wat, cols);
        if (depth > C.PH * 0.85) { this.enterWater(wat); return; }
      }
      const wading = W.waterAt(this.cx, this.y + this.h - 6);
      if (this.onGround) this.stamina = C.STAMINA;

      // ---- الانحناء التلقائي تحت الأسقف المنخفضة ----
      let wantCrouch = !!inp.down && this.onGround;
      if (this.onGround && dir !== 0 && !this.crouch) {
        const ahead = { x: this.x + dir * 5, y: this.y, w: this.w, h: this.h };
        const low = { x: this.x + dir * 5, y: this.y + this.h - C.PCH, w: this.w, h: C.PCH };
        if (!W.free(ahead, cols) && W.free(low, cols)) wantCrouch = true;
      }
      if (this.crouch && !wantCrouch && !this.canStand(cols)) wantCrouch = true;
      if (wantCrouch !== this.crouch) {
        this.crouch = wantCrouch;
        this.setHeight(wantCrouch ? C.PCH : C.PH);
      }

      // ---- التفاعل والإمساك ----
      if (inp.actP) {
        if (W.tryInteract(this)) { this.interactT = 0.45; inp.actP = false; }
      }
      if (inp.act && this.onGround && !this.crouch && this.interactT <= 0) {
        if (!this.grab) {
          const b = this.adjacentBox(this.facing, cols) || this.adjacentBox(-this.facing, cols);
          if (b && b.mass <= 2) {
            this.grab = b.id;
            this.facing = (b.x + b.w / 2 > this.cx) ? 1 : -1;
            W.snd('grab', this.cx);
          }
        }
      } else this.grab = null;
      let gbox = this.grab ? W.byId[this.grab] : null;
      if (gbox && (!this.touching(gbox, this.facing) || !gbox.ground)) { this.grab = null; gbox = null; }

      // ---- السرعة الأفقية ----
      if (dir !== 0 && this.onGround) this.runT += dt; else if (dir === 0) this.runT = 0;
      let maxSp = this.runT > 0.4 ? C.RUN : LT.lerp(C.WALK, C.RUN, this.runT / 0.4);
      if (this.crouch) maxSp = C.CRAWL;
      if (wading) maxSp *= 0.6;
      this.pushing = null; this.pulling = false;
      if (gbox) {
        maxSp = gbox.mass >= 2 ? 62 : 85;
        this.pulling = dir === -this.facing;
        if (dir === this.facing) this.pushing = gbox;
      } else if (this.onGround && dir !== 0) {
        const b = this.adjacentBox(dir, cols);
        if (b && b.ground) {
          if (b.mass <= 2) { this.pushing = b; maxSp = b.mass >= 2 ? 62 : 105; }
        }
      }
      if (!gbox && dir !== 0) this.facing = dir;

      const acc = this.onGround ? 1900 : 1100;
      const dec = this.onGround ? 2600 : 350;
      if (dir !== 0) this.vx = LT.approach(this.vx, dir * maxSp, acc * dt);
      else this.vx = LT.approach(this.vx, 0, dec * dt);
      if (Math.abs(this.vx) > maxSp + 1 && this.onGround) this.vx = LT.approach(this.vx, Math.sign(this.vx) * maxSp, 2600 * dt);

      // ---- القفز ----
      if (inp.jumpP) this.jumpBuf = 0.13;
      else this.jumpBuf = Math.max(0, this.jumpBuf - dt);
      if (this.onGround) this.coyote = 0.1; else this.coyote = Math.max(0, this.coyote - dt);
      if (this.jumpBuf > 0 && this.coyote > 0 && !gbox) {
        let ok = true;
        if (this.crouch) { if (this.canStand(cols)) { this.crouch = false; this.setHeight(C.PH); } else ok = false; }
        if (ok) {
          this.vy = -C.JUMP * (wading ? 0.85 : 1);
          this.onGround = false; this.coyote = 0; this.jumpBuf = 0;
          this.fallMax = 0;
          W.snd('jump', this.cx);
          if (wading) { W.snd('splash', this.cx, { k: 0.4 }); W.noise(this.cx, this.y + this.h); }
        }
      }
      inp.jumpP = false;

      // ---- الجاذبية ----
      this.vy = Math.min(this.vy + C.G * dt, C.MAXFALL);
      if (this.vy > this.fallMax) this.fallMax = this.vy;

      // ---- الحركة الأفقية مع الدفع والسحب ----
      const dx = this.vx * dt;
      const x0 = this.x;
      if (gbox && this.pulling) {
        const hit = W.moveX(this, dx, cols);
        const moved = this.x - x0;
        if (moved) {
          const bm = W.pushBox(gbox, moved);
          if (Math.abs(bm - moved) > 0.01) { this.x = x0 + bm; }
          if (Math.abs(bm) > 0.05) this.scrape(gbox, dt);
        }
        if (hit) this.vx = 0;
      } else if (this.pushing && dx * (this.pushing.x > this.x ? 1 : -1) > 0) {
        const bm = W.pushBox(this.pushing, dx);
        if (Math.abs(bm) > 0.05) this.scrape(this.pushing, dt);
        const hit = W.moveX(this, dx, W.cols(this, true));
        if (hit) this.vx = Math.sign(this.vx) * Math.min(Math.abs(this.vx), Math.abs(bm / dt) + 5);
      } else {
        const hit = W.moveX(this, dx, cols);
        if (hit) {
          // صعود الدرجات الصغيرة
          const rise = (this.y + this.h) - hit.y;
          const stepable = hit.st || (hit.ent && hit.ent.t !== 'box' && hit.ent.t !== 'door');
          if (this.onGround && rise > 0 && rise <= 20 && stepable) {
            const test = { x: x0 + dx, y: hit.y - this.h, w: this.w, h: this.h };
            if (W.free(test, cols)) { this.x = test.x; this.y = test.y; }
            else this.vx = 0;
          } else this.vx = 0;
        }
      }

      // ---- الحركة العمودية ----
      const wasGround = this.onGround;
      const vyBefore = this.vy;
      const cols2 = W.cols(this, true);
      // تصحيح الزوايا: إذا ارتطم الرأس بحافة جسم بفارق صغير، انزلق جانبًا
      if (this.vy < 0) {
        const test = { x: this.x, y: this.y + this.vy * dt, w: this.w, h: this.h };
        for (const c of cols2) {
          if (!ov(test, c) || c.y + c.h > this.y + 4) continue;
          const inL = (this.x + this.w) - c.x, inR = (c.x + c.w) - this.x;
          let nx = null;
          const lim = c.h < 40 ? 26 : 14;
          if (inL > 0 && inL <= lim) nx = c.x - this.w - 0.1;
          else if (inR > 0 && inR <= lim) nx = c.x + c.w + 0.1;
          if (nx !== null && W.free({ x: nx, y: test.y, w: this.w, h: this.h }, cols2)) this.x = nx;
          break;
        }
      }
      const hy = W.moveY(this, this.vy * dt, cols2);
      this.onGround = false;
      if (hy) {
        if (vyBefore > 0) {
          this.onGround = true; this.ground = hy;
          if (!wasGround) this.onLand(vyBefore);
          if (this.state === 'dead') return;
        }
        this.vy = 0;
      }

      // ---- التعلق بالحواف ----
      if (!this.onGround && dir !== 0 && this.vy > -380 && this.ledgeCD <= 0 && !this.crouch) {
        if (this.tryLedge(dir, cols2)) return;
      }
      // ---- الإمساك بحبل متأرجح ----
      if (!this.onGround && this.ropeCD <= 0) this.tryRope();

      // ---- أصوات الخطوات وأطوار الحركة ----
      if (this.onGround) {
        const sp = Math.abs(this.x - x0) / dt;
        this.phase += (this.x - x0) * (this.crouch ? 0.16 : 0.105) * this.facing;
        this.stepT -= Math.abs(this.x - x0);
        if (this.stepT <= 0 && sp > 20) {
          this.stepT = this.crouch ? 26 : (sp > 170 ? 36 : 30);
          const mat = wading ? 'water' : this.material(this.ground);
          W.snd('step', this.cx, { mat: mat, v: this.crouch ? 0.4 : 0.9 });
          if (wading) W.noise(this.cx, this.y + this.h);
          if (sp > 170 && Math.random() < 0.5) W.burst(this.cx - this.facing * 6, this.y + this.h, 2, { k: 'dust', sp: 40, life: 0.5, s: 1.6, g: -20, a: -Math.PI / 2 - this.facing * 0.8, spread: 0.6 });
        }
      }
      this.animT += dt;
    }

    scrape(box, dt) {
      this.scrapeT = (this.scrapeT || 0) - dt;
      if (this.scrapeT <= 0) { this.scrapeT = 0.11; this.world.snd('scrape', box.x + box.w / 2, { mat: box.mat }); }
    }

    onLand(v) {
      const W = this.world;
      if (v > C.FALL_KILL) { this.die('fall'); return; }
      this.landT = LT.clamp(v / 900, 0.15, 0.5);
      W.snd('land', this.cx, { k: LT.clamp(v / 900, 0.3, 1.2) });
      if (v > 500) W.burst(this.cx, this.y + this.h, 6, { k: 'dust', sp: 90, life: 0.6, s: 2, g: -10, spread: 2.6, w: 10 });
      if (v > 900) W.shake(3);
    }

    depthBelow(wat, cols) {
      // المسافة بين سطح الماء وأول أرض تحته
      const probe = { x: this.x + 2, y: wat.cur, w: this.w - 4, h: 4 };
      for (let d = 0; d < 200; d += 6) {
        probe.y = wat.cur + d;
        if (!this.world.free(probe, cols)) return d;
      }
      return 999;
    }

    adjacentBox(dir, cols) {
      const probe = { x: dir > 0 ? this.x + this.w : this.x - 3, y: this.y + 6, w: 3, h: this.h - 12 };
      for (const b of this.world.boxes) {
        if (b.held) continue;
        if (ov(probe, b) && b.y < this.y + this.h - 8 && b.y + b.h > this.y + this.h - 4) return b;
      }
      return null;
    }
    touching(b, dir) {
      const probe = { x: dir > 0 ? this.x + this.w : this.x - 4, y: this.y + 6, w: 4, h: this.h - 12 };
      return ov(probe, b);
    }

    // ================= التعلق بالحافة =================
    tryLedge(dir, cols) {
      const W = this.world;
      const top = this.y;
      for (const c of cols) {
        if (c.ent && ['box', 'tree', 'lift', 'crumble', 'ghost', 'pulley', 'conveyor'].indexOf(c.ent.t) < 0) continue;
        if (c.nograb) continue;
        if (c.ent && c.ent.t === 'box' && c.ent.held) continue;
        const side = dir > 0 ? c.x : c.x + c.w;
        const mySide = dir > 0 ? this.x + this.w : this.x;
        if (Math.abs(side - mySide) > 3) continue;
        if (c.y < top - 14 || c.y > top + 30) continue;
        const stand = { x: dir > 0 ? c.x + 2 : c.x + c.w - this.w - 2, y: c.y - C.PH, w: this.w, h: C.PH };
        if (!W.free(stand, cols)) continue;
        const hangR = { x: this.x, y: c.y - 6, w: this.w, h: this.h };
        if (!W.free(hangR, cols.filter((q) => q !== c))) continue;
        // تعلق
        this.state = 'hang';
        this.hang = { dir: dir, ly: c.y, lx: side, ent: c.ent ? c.ent.id : null, part: c.part, hold: 0 };
        this.y = c.y - 6;
        this.vx = 0; this.vy = 0;
        this.facing = dir;
        W.snd('grab', this.cx);
        return true;
      }
      return false;
    }

    // مستطيل الحافة الحالي (إذا كانت على جسم متحرك)
    ledgeRect(H) {
      if (!H || !H.ent) return null;
      const e = this.world.byId[H.ent];
      if (!e) return null;
      const T = LT.Ent[e.t];
      let r = T.solid ? T.solid(e, this.world, true) : null;
      if (Array.isArray(r)) r = r[H.part || 0];
      return r;
    }

    stepHang(dt, inp) {
      const H = this.hang;
      const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
      // تتبع الصندوق إذا كانت الحافة صندوقًا
      if (H.ent) {
        const e = this.world.byId[H.ent];
        if (!e) { this.state = 'normal'; this.hang = null; return; }
        const T = LT.Ent[e.t];
        let r = T.solid ? T.solid(e, this, true) : null;
        if (Array.isArray(r)) r = r[H.part || 0];
        if (!r) { this.state = 'normal'; this.hang = null; return; }
        H.ly = r.y; H.lx = H.dir > 0 ? r.x : r.x + r.w;
        this.y = H.ly - 6;
        this.x = H.dir > 0 ? H.lx - this.w : H.lx;
      }
      H.hold += dt;
      if (inp.jumpP || (dir === H.dir && H.hold > 0.18)) {
        this.state = 'climb'; this.climbT = 0;
        const lr = this.ledgeRect(H);
        this.climbRef = lr ? { H: H, x: lr.x, y: lr.y } : null;
        this.climbFrom = { x: this.x, y: this.y };
        this.climbTo = { x: H.dir > 0 ? H.lx + 2 : H.lx - this.w - 2, y: H.ly - C.PH };
        this.world.snd('climb', this.cx);
      } else if (dir === -H.dir) {
        this.state = 'normal'; this.hang = null; this.ledgeCD = 0.35;
        this.vx = dir * 40; this.vy = 0;
      }
      inp.jumpP = false;
      this.animT += dt;
    }

    stepClimb(dt) {
      this.climbT += dt;
      // تتبّع الحافة المتحركة (صندوق طافٍ مثلًا)
      if (this.climbRef) {
        const e = this.ledgeRect(this.climbRef.H);
        if (e) {
          const ddx = e.x - this.climbRef.x, ddy = e.y - this.climbRef.y;
          this.climbFrom.x += ddx; this.climbFrom.y += ddy; this.climbTo.x += ddx; this.climbTo.y += ddy;
          this.climbRef.x = e.x; this.climbRef.y = e.y;
        }
      }
      const D = 0.5;
      const p = this.climbT / D;
      const f = this.climbFrom, t = this.climbTo;
      this.x = LT.lerp(f.x, t.x, LT.ease((p - 0.45) / 0.55));
      this.y = LT.lerp(f.y, t.y, LT.ease(p / 0.6));
      if (p >= 1) {
        this.x = t.x; this.y = t.y;
        this.state = 'normal'; this.hang = null;
        this.onGround = true; this.vx = 0; this.vy = 0;
        this.ledgeCD = 0.2;
      }
      this.animT += 1 / 120;
    }

    // ================= الحبل المتأرجح =================
    tryRope() {
      const W = this.world;
      const px = this.cx, py = this.y + 10;
      for (const e of W.ents) {
        if (e.t !== 'swing') continue;
        const sx = Math.sin(e.a), sy = Math.cos(e.a);
        const rx = px - e.x, ry = py - e.y;
        let t = rx * sx + ry * sy;
        t = LT.clamp(t, 40, e.len);
        const nx = e.x + sx * t, ny = e.y + sy * t;
        if (LT.dist(px, py, nx, ny) < 20) {
          this.state = 'swing';
          this.rope = { id: e.id, L: t };
          // تحويل السرعة إلى سرعة زاوية
          const tang = this.vx * Math.cos(e.a) - this.vy * Math.sin(e.a);
          e.av = LT.clamp(tang / t, -3.5, 3.5);
          e.held = true;
          W.snd('rope', this.cx);
          return true;
        }
      }
      return false;
    }

    stepSwing(dt, inp) {
      const W = this.world;
      const e = W.byId[this.rope.id];
      if (!e) { this.state = 'normal'; return; }
      const L = this.rope.L;
      const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
      let acc = -(C.G / L) * Math.sin(e.a) * 0.85 + dir * 2.4 * Math.cos(e.a);
      e.av += acc * dt;
      e.av *= 1 - 0.15 * dt;
      e.av = LT.clamp(e.av, -4, 4);
      const pa = e.a;
      e.a = LT.clamp(e.a + e.av * dt, -1.35, 1.35);
      if (Math.abs(e.a) >= 1.35) e.av *= -0.3;
      const hx = e.x + Math.sin(e.a) * L, hy = e.y + Math.cos(e.a) * L;
      const nx = hx - this.w / 2, ny = hy - 6;
      const cols = W.cols(this, true);
      if (!W.free({ x: nx, y: ny, w: this.w, h: this.h }, cols)) {
        e.a = pa; e.av = -e.av * 0.35;
      } else { this.x = nx; this.y = ny; }
      if (dir) this.facing = dir;
      if (Math.abs(e.av) > 1.2 && Math.random() < dt * 2) W.snd('creak', this.cx, { v: 0.6 });
      if (inp.jumpP) {
        const v = e.av * L;
        this.vx = Math.cos(e.a) * v;
        this.vy = -Math.sin(e.a) * v - 260;
        if (Math.abs(this.vx) > 40) this.facing = Math.sign(this.vx);
        this.state = 'normal'; this.rope = null; this.ropeCD = 0.4;
        e.held = false;
        this.onGround = false; this.fallMax = 0;
        W.snd('jump', this.cx);
      }
      inp.jumpP = false;
      this.animT += dt;
    }

    // ================= السباحة =================
    enterWater(wat) {
      const W = this.world;
      this.state = 'swim';
      this.water = wat.id;
      if (this.crouch) { this.crouch = false; this.setHeight(C.PH); }
      W.snd('splash', this.cx, { k: LT.clamp(this.vy / 600, 0.4, 1.3) });
      W.burst(this.cx, wat.cur, 14, { k: 'splash', sp: 220, life: 0.7, s: 2.2, g: 900, spread: 1.6 });
      W.noise(this.cx, wat.cur);
      this.vy *= 0.3;
      this.sinkT = 0;
    }

    stepSwim(dt, inp) {
      const W = this.world;
      const wat = W.byId[this.water];
      const cols = W.cols(this, true);
      if (!wat) { this.state = 'normal'; return; }
      const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
      const surf = wat.cur;
      const deep = this.depthBelow(wat, cols) > C.PH * 0.85;
      if (deep) this.stamina -= dt; else this.stamina = Math.min(C.STAMINA, this.stamina + dt * 2);
      let floatY = surf - 16;
      if (this.stamina < 0) {
        this.sinkT += dt;
        floatY = surf - 16 + this.sinkT * 70;
        if (this.sinkT > 0.4 && Math.random() < dt * 8) W.burst(this.cx, surf, 1, { k: 'bubble', sp: 20, life: 0.6, s: 2, g: -40 });
        if (this.y > surf + 4) { this.die('drown'); return; }
      }
      this.vy += ((floatY - this.y) * 22 - this.vy * 5) * dt;
      this.vx = LT.approach(this.vx, dir * 95, 650 * dt);
      if (dir) this.facing = dir;
      W.flowAt = wat.flow || 0;
      const x0 = this.x;
      W.moveX(this, (this.vx + (wat.flow || 0)) * dt, cols);
      const hy = W.moveY(this, this.vy * dt, cols);
      if (hy && this.vy > 0) this.vy = 0;
      this.phase += dt * 6;
      this.stepT -= dt;
      if (this.stepT <= 0 && (dir || this.stamina < 2)) {
        this.stepT = 0.45;
        W.snd('swim', this.cx, { v: 0.8 });
        W.noise(this.cx, surf);
        W.spawn({ k: 'ring', x: this.cx, y: surf, vx: 0, vy: 0, life: 1.2, s: 4 });
      }
      // الخروج من الماء بالقفز
      if (inp.jumpP && this.stamina > -0.2) {
        this.vy = -560;
        this.state = 'normal'; this.onGround = false; this.fallMax = 0;
        this.water = null;
        W.snd('splash', this.cx, { k: 0.5 });
        W.burst(this.cx, surf, 8, { k: 'splash', sp: 180, life: 0.6, s: 2, g: 900, spread: 1.4 });
        inp.jumpP = false;
        this.ledgeCD = 0;
        return;
      }
      inp.jumpP = false;
      // التعلق بالحافة من الماء
      if (dir !== 0 && this.tryLedge(dir, cols)) { this.water = null; this.stamina = C.STAMINA; return; }
      // الخروج إلى أرض ضحلة
      if (!deep && this.y + this.h > surf + 10) {
        const below = { x: this.x, y: this.y + this.h, w: this.w, h: 6 };
        if (!W.free(below, cols)) { this.state = 'normal'; this.water = null; this.onGround = true; this.vy = 0; }
      }
      if (!W.waterAt(this.cx, this.y + this.h * 0.4) && this.y + this.h * 0.4 < surf - 4) {
        this.state = 'normal'; this.water = null;
      }
      this.animT += dt;
    }

    // ================= الموت =================
    stepDead(dt) {
      this.deadT += dt;
      const c = this.cause;
      if (c === 'drown' || c === 'creature') {
        this.vy = c === 'creature' ? 160 : 40; this.vx *= 0.9;
        this.y += this.vy * dt;
      } else if (c === 'fall' || c === 'crush' || c === 'robot' || c === 'electric' || c === 'spike' || c === 'shadow') {
        // يبقى في مكانه
      } else if (c === 'pit') {
        this.y += 400 * dt;
      }
    }

    // ================= حساب وضعية الجسم للرسم =================
    computePose(t) {
      const P = { lean: 0, hip: 24, th: [0, 0], sh: [0, 0], a1: [0.15, -0.1], a2: [0.25, 0.3], head: 0, rot: 0, crawl: 0, alpha: 1 };
      const st = this.state;
      const sp = Math.abs(this.vx);
      const breath = Math.sin(t * 2.4) * 0.6;

      if (this.pose === 'sleep' || (this.pose === 'wake' && this.poseT < 0.6)) {
        P.rot = -Math.PI / 2 * this.facing; P.lean = 0; P.hip = 24;
        P.th = [0.25, 0.1]; P.sh = [0.5, 0.3]; P.a1 = [0.3, 0.1]; P.a2 = [0.6, 0.5]; P.head = 0.2;
        P.lyingBreath = breath * 0.5;
        return P;
      }
      if (this.pose === 'wake') {
        const k = LT.clamp((this.poseT - 0.6) / 1.6, 0, 1);
        const e = LT.ease(k);
        P.rot = 0;
        P.hip = LT.lerp(9, 24, LT.ease((k - 0.3) / 0.7));
        P.lean = LT.lerp(0.9, 0.05, e);
        P.th = [LT.lerp(1.4, 0, e), LT.lerp(-0.2, 0, e)];
        P.sh = [LT.lerp(2.3, 0, e), LT.lerp(1.8, 0, e)];
        P.a1 = [LT.lerp(0.1, 0.1, e), LT.lerp(-0.2, -0.1, e)];
        P.a2 = [0.3, 0.3];
        P.head = LT.lerp(0.4, -0.15, e) + Math.sin(this.poseT * 3) * 0.05 * (1 - e);
        return P;
      }
      if (this.pose === 'kneel') {
        P.hip = 14; P.lean = 0.25; P.th = [1.5, -0.2]; P.sh = [2.6, 1.2]; P.a1 = [1.1, 0.9]; P.a2 = [0.4, 0.3]; P.head = 0.25;
        return P;
      }

      if (st === 'dead') {
        const c = this.cause, k = LT.clamp(this.deadT / 0.35, 0, 1);
        if (c === 'drown' || c === 'creature') {
          P.lean = 0.2; P.a1 = [2.6 + Math.sin(t * 7) * 0.3, 2.8]; P.a2 = [0.3, 0.3];
          P.alpha = LT.clamp(1 - this.deadT / 1.4, 0, 1);
          return P;
        }
        if (c === 'shadow' || c === 'electric' || c === 'robot') {
          P.alpha = LT.clamp(1 - this.deadT / 0.9, 0, 1);
          P.lean = -0.3 * k; P.a1 = [1.8, 2.0]; P.a2 = [0.5, 0.4]; P.th = [0.3, -0.2]; P.sh = [0.4, 0.2];
          return P;
        }
        if (c === 'spike' || c === 'crush') { P.alpha = LT.clamp(1 - this.deadT / 0.25, 0, 1); }
        P.rot = -this.facing * Math.PI / 2 * LT.ease(k);
        P.th = [0.4, -0.3]; P.sh = [0.8, 0.2]; P.a1 = [0.6, -0.5]; P.a2 = [0.8, 0.2];
        return P;
      }

      if (st === 'hang') {
        const sw = Math.sin(t * 3) * 0.08;
        P.a1 = [Math.PI - 0.15, Math.PI - 0.05]; P.a2 = [0.1, 0.1];
        P.th = [0.15 + sw, -0.1 + sw]; P.sh = [0.25, 0.4]; P.lean = 0.08; P.head = -0.25;
        P.handsUp = true;
        return P;
      }
      if (st === 'climb') {
        const k = LT.clamp(this.climbT / 0.5, 0, 1);
        P.lean = LT.lerp(0.1, 0.6, Math.sin(k * Math.PI));
        P.a1 = [LT.lerp(Math.PI - 0.15, 0.9, k), LT.lerp(Math.PI - 0.1, 0.4, k)];
        P.a2 = [LT.lerp(0.1, 1.2, k), 0.3];
        P.th = [LT.lerp(0.2, 1.4, Math.sin(k * Math.PI)), LT.lerp(-0.1, 0.4, k)];
        P.sh = [LT.lerp(0.3, 2.0, Math.sin(k * Math.PI)), 0.5];
        P.head = -0.1;
        return P;
      }
      if (st === 'swing') {
        const e = this.world.byId[this.rope.id];
        const a = e ? e.a : 0, av = e ? e.av : 0;
        P.rot = -a * 0.85;
        P.a1 = [Math.PI - 0.05, Math.PI + 0.05]; P.a2 = [0, 0];
        P.th = [0.3 + av * 0.15 * this.facing, 0.1 - av * 0.1 * this.facing]; P.sh = [0.4, 0.2];
        P.handsUp = true; P.head = -0.2;
        return P;
      }
      if (st === 'swim') {
        const ph = this.phase;
        P.lean = 0.35; P.hip = 22;
        P.a1 = [1.6 + Math.sin(ph) * 1.0, 1.6 + Math.sin(ph + Math.PI) * 1.0]; P.a2 = [0.4, 0.4];
        P.th = [0.5 + Math.sin(ph * 1.3) * 0.4, 0.5 + Math.sin(ph * 1.3 + Math.PI) * 0.4]; P.sh = [0.4, 0.4];
        P.head = -0.35;
        return P;
      }

      if (this.crouch) {
        const ph = this.phase;
        const m = sp > 10 ? 1 : 0;
        P.crawl = 1; P.hip = 13; P.lean = 1.15; P.head = -0.9;
        P.th = [1.5 + Math.sin(ph) * 0.35 * m, 1.5 + Math.sin(ph + Math.PI) * 0.35 * m];
        P.sh = [2.9, 2.9];
        P.a1 = [0.25 + Math.sin(ph + Math.PI) * 0.4 * m, 0.25 + Math.sin(ph) * 0.4 * m];
        P.a2 = [-0.1, -0.1];
        return P;
      }

      if (!this.onGround) {
        if (this.vy < 0) {
          P.th = [0.9, -0.15]; P.sh = [1.4, 0.5]; P.a1 = [2.3, -0.4]; P.a2 = [0.6, 0.3]; P.lean = 0.12; P.head = -0.1;
        } else {
          const f = LT.clamp(this.vy / 900, 0, 1);
          P.th = [0.5, -0.25]; P.sh = [0.7, 0.4];
          P.a1 = [1.9 + f * 0.7 + Math.sin(t * 14) * 0.15 * f, 2.4 + f * 0.4 + Math.sin(t * 13 + 1) * 0.15 * f];
          P.a2 = [0.5, 0.5]; P.lean = 0.05; P.head = 0.1;
        }
        return P;
      }

      // على الأرض
      const ph = this.phase;
      if (this.pushing && sp > 5) {
        P.lean = 0.42; P.head = -0.25;
        P.th = [Math.sin(ph) * 0.5 - 0.05, Math.sin(ph + Math.PI) * 0.5 - 0.05];
        P.sh = [Math.max(0, Math.sin(ph + 1.6)) * 0.9 + 0.1, Math.max(0, Math.sin(ph + Math.PI + 1.6)) * 0.9 + 0.1];
        P.a1 = [1.55, 1.45]; P.a2 = [0.25, 0.25];
        return P;
      }
      if (this.grab) {
        P.lean = this.pulling ? -0.32 : 0.3; P.head = this.pulling ? 0.1 : -0.2;
        const m = sp > 5 ? 1 : 0;
        P.th = [Math.sin(ph) * 0.4 * m, Math.sin(ph + Math.PI) * 0.4 * m];
        P.sh = [Math.max(0, Math.sin(ph + 1.6)) * 0.7 * m + 0.15, Math.max(0, Math.sin(ph + Math.PI + 1.6)) * 0.7 * m + 0.15];
        P.a1 = [1.45 + (this.pulling ? 0.25 : 0), 1.4 + (this.pulling ? 0.25 : 0)]; P.a2 = [0.1, 0.1];
        return P;
      }
      if (sp > 8) {
        const run = LT.clamp((sp - C.WALK) / (C.RUN - C.WALK), 0, 1);
        const amp = LT.lerp(0.55, 0.85, run);
        P.lean = LT.lerp(0.06, 0.22, run);
        P.th = [Math.sin(ph) * amp, Math.sin(ph + Math.PI) * amp];
        P.sh = [Math.max(0, Math.sin(ph - 1.4)) * LT.lerp(0.8, 1.6, run) + 0.05, Math.max(0, Math.sin(ph + Math.PI - 1.4)) * LT.lerp(0.8, 1.6, run) + 0.05];
        P.a1 = [Math.sin(ph + Math.PI) * LT.lerp(0.45, 0.9, run), Math.sin(ph) * LT.lerp(0.45, 0.9, run)];
        P.a2 = [LT.lerp(0.3, 1.1, run), LT.lerp(0.3, 1.1, run)];
        P.hip = 24 - Math.abs(Math.sin(ph)) * LT.lerp(0.5, 1.8, run);
        P.head = -0.05;
        return P;
      }
      // وقوف وتنفس
      const tense = this.world.game.tension || 0;
      P.lean = 0.03 + breath * 0.012 + (tense > 0.2 ? 0.08 : 0);
      P.hip = 24 + breath * 0.25 - this.landT * 10;
      P.th = [0.03 - this.landT * 0.8, -0.06 - this.landT * 0.8];
      P.sh = [this.landT * 1.6, this.landT * 1.6];
      P.a1 = [0.12 + breath * 0.03 + (tense > 0.2 ? 0.3 : 0), -0.08 + breath * 0.03 + (tense > 0.2 ? 0.4 : 0)];
      P.a2 = [0.25 + (tense > 0.2 ? 0.8 : 0), 0.3 + (tense > 0.2 ? 0.9 : 0)];
      P.head = Math.sin(t * 0.4) * 0.06 + (tense > 0.2 ? Math.sin(t * 9) * 0.03 : 0);
      if (this.interactT > 0) {
        const k = this.interactT / 0.45;
        P.a1[0] = LT.lerp(0.1, 2.6, Math.sin(k * Math.PI));
        P.a2[0] = 0.2;
      }
      return P;
    }
  }

  // ================= رسم الشخصية (هيكل عظمي إجرائي) =================
  // يُستخدم أيضًا لرسم "الظل" بنفس الهيئة
  LT.drawFigure = function (ctx, x, feetY, facing, P, opt) {
    opt = opt || {};
    // الظل ووعاء الحفظ يستخدمان نفس رسمة آدم
    if (LT.Sprites && LT.Sprites.ready && LT.Sprites.enabled && !opt.procedural) {
      const tt = performance.now() / 1000;
      LT.Sprites.draw(ctx, 'idle', Math.floor(tt * 4), x, feetY, facing, P.alpha === undefined ? 1 : P.alpha, 0);
      return { nx: x, ny: feetY - 40, hx: x, hy: feetY - 48 };
    }
    const col = opt.color || '#050505';
    ctx.save();
    ctx.translate(x, feetY);
    if (P.rot) {
      ctx.translate(0, -10);
      ctx.rotate(P.rot);
      ctx.translate(0, 10 + (P.lyingBreath || 0));
    }
    ctx.scale(facing, 1);
    ctx.globalAlpha *= (P.alpha === undefined ? 1 : P.alpha);
    ctx.strokeStyle = col; ctx.fillStyle = col;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    const hipX = 0, hipY = -P.hip;
    const tl = 18;
    const nx = hipX + Math.sin(P.lean) * tl, ny = hipY - Math.cos(P.lean) * tl;
    const ha = P.lean + P.head;
    const hx = nx + Math.sin(ha) * 8.5, hy = ny - Math.cos(ha) * 8.5;

    function limb(ox, oy, a1, a2, l1, l2, w) {
      const kx = ox + Math.sin(a1) * l1, ky = oy + Math.cos(a1) * l1;
      const ex = kx + Math.sin(a1 + a2) * l2, ey = ky + Math.cos(a1 + a2) * l2;
      ctx.lineWidth = w;
      ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(kx, ky); ctx.lineTo(ex, ey); ctx.stroke();
      return [ex, ey];
    }
    // الساق البعيدة والذراع البعيدة أغمق قليلًا (عمق)
    const legL = 12.5;
    // ساق خلفية
    const back = opt.backColor || col;
    ctx.strokeStyle = back;
    const f2 = limb(hipX - 1, hipY, P.th[1], -P.sh[1], legL, legL, 5.2);
    // ذراع خلفية
    const shX = nx - Math.sin(P.lean) * 2, shY = ny + Math.cos(P.lean) * 2;
    limb(shX, shY, P.a1[1], P.a2[1], 9, 9, 4.2);
    ctx.strokeStyle = col;

    // المعطف (جسم)
    const perp = P.lean + Math.PI / 2;
    const px = Math.sin(perp), py = -Math.cos(perp);
    ctx.beginPath();
    ctx.moveTo(nx - px * 4.5 + Math.sin(P.lean) * -1, ny - py * 4.5);
    ctx.lineTo(nx + px * 4.5, ny + py * 4.5);
    const bx = hipX + Math.sin(P.lean) * -3, by = hipY + Math.cos(P.lean) * 3;
    ctx.lineTo(bx + px * 7.5, by + py * 7.5 + 2);
    ctx.quadraticCurveTo(bx, by + 6, bx - px * 7.5, by - py * 7.5 + 2);
    ctx.closePath(); ctx.fill();
    // حافة المعطف الممزقة
    ctx.beginPath();
    ctx.moveTo(bx - px * 7, by - py * 7 + 2);
    ctx.lineTo(bx - px * 4, by + 7);
    ctx.lineTo(bx - px * 1, by + 4);
    ctx.lineTo(bx + px * 3, by + 8);
    ctx.lineTo(bx + px * 7, by + py * 7 + 2);
    ctx.fill();

    // ساق أمامية
    const f1 = limb(hipX + 1, hipY, P.th[0], -P.sh[0], legL, legL, 5.6);
    // قدمان
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(f1[0] - 1, f1[1]); ctx.lineTo(f1[0] + 3.5, f1[1] + 0.5); ctx.stroke();
    ctx.strokeStyle = back;
    ctx.beginPath(); ctx.moveTo(f2[0] - 1, f2[1]); ctx.lineTo(f2[0] + 3.5, f2[1] + 0.5); ctx.stroke();
    ctx.strokeStyle = col;

    // الرأس والقلنسوة
    ctx.beginPath(); ctx.arc(hx, hy, 7.6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(hx - Math.sin(ha) * -7 - 6.5 * Math.cos(ha), hy - 1);
    ctx.quadraticCurveTo(hx - 12 * Math.cos(ha) + Math.sin(ha) * 4, hy - 9, hx - 2, hy - 8.6);
    ctx.lineTo(hx + 3, hy - 6);
    ctx.lineTo(hx - 5, hy + 4);
    ctx.closePath(); ctx.fill();
    // خصلة شعر بارزة من القلنسوة
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(hx + 4, hy - 5); ctx.quadraticCurveTo(hx + 9, hy - 6, hx + 8, hy - 2); ctx.stroke();

    // الذراع الأمامية
    limb(shX + 0.5, shY, P.a1[0], P.a2[0], 9, 9, 4.6);

    // الوشاح يُرسم بإحداثيات العالم
    ctx.restore();
    return { nx: x + facing * nx, ny: feetY + ny, hx: x + facing * hx, hy: feetY + hy };
  };

  Player.prototype.draw = function (ctx, t, opt) {
    // رسومات السبرايت (من تصميم محمد) إن كانت محمّلة
    if (LT.Sprites && LT.Sprites.ready && LT.Sprites.enabled) {
      const r = LT.Sprites.pick(this, t);
      if (this.onGround && this.state === 'normal' && !(opt && opt.reflect)) {
        ctx.save(); ctx.globalAlpha = 0.25; ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.ellipse(this.cx, this.y + this.h + 1, 14, 2.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
      if (LT.Sprites.draw(ctx, r.a, r.i, r.x, r.y, this.facing, r.alpha, r.rot)) return;
    }
    const P = this.computePose(t);
    const fx = this.cx;
    let fy = this.y + this.h;
    if (this.state === 'hang' || this.state === 'swing') fy = this.y + C.PH + 4;
    if (this.crouch) fy = this.y + this.h;
    const col = (opt && opt.color) || '#040404';
    // ظل خفيف على الأرض
    if (this.onGround && this.state === 'normal' && !(opt && opt.reflect)) {
      ctx.save(); ctx.globalAlpha = 0.25; ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.ellipse(fx, fy + 1, 13, 2.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    const j = LT.drawFigure(ctx, fx, fy, this.facing, P, { color: col, backColor: (opt && opt.back) || '#121212' });
    // الوشاح (محاكاة نقاط متتالية)
    if (!(opt && opt.reflect)) this.drawScarf(ctx, j, P, col);
    this.joints = j;
  };

  Player.prototype.drawScarf = function (ctx, j, P, col) {
    const n = 6;
    if (!this.scarf) { this.scarf = []; for (let i = 0; i < n; i++) this.scarf.push({ x: j.nx, y: j.ny, px: j.nx, py: j.ny }); }
    const S = this.scarf;
    const wind = Math.sin(this.world.time * 1.3) * 18 + 30;
    S[0].x = j.nx - this.facing * 1; S[0].y = j.ny + 2;
    for (let i = 1; i < n; i++) {
      const s = S[i];
      const vx = (s.x - s.px) * 0.9, vy = (s.y - s.py) * 0.9;
      s.px = s.x; s.py = s.y;
      s.x += vx - this.vx * 0.004 + wind * 0.004 * -this.facing * 0.2 + (Math.random() - 0.5) * 0.3;
      s.y += vy + 0.35;
    }
    for (let k = 0; k < 3; k++) {
      for (let i = 1; i < n; i++) {
        const a = S[i - 1], b = S[i];
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
        const L = 4.2, f = (d - L) / d;
        b.x -= dx * f; b.y -= dy * f;
      }
    }
    if (P.alpha !== undefined && P.alpha < 1) ctx.globalAlpha *= P.alpha;
    ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.lineWidth = 3.4;
    ctx.beginPath(); ctx.moveTo(S[0].x, S[0].y);
    for (let i = 1; i < n; i++) ctx.lineTo(S[i].x, S[i].y);
    ctx.stroke();
    ctx.globalAlpha = 1;
  };

  LT.Player = Player;
})(window.LT);
