/* =========================================================
   entities2.js : عناصر الجزء الثاني
   الحمض، الزجاج، أقفال الرموز، القطع والمقابس، المراوح،
   النوابض، الليزر، موجة الهروب، الأفكار (الحوار الداخلي)
   ========================================================= */
(function (LT) {
  'use strict';

  const E = LT.Ent;
  const ov = LT.overlap;
  function R(e) { return { x: e.x, y: e.y, w: e.w, h: e.h, ent: e }; }
  function pnear(p, x, y, rx, ry) {
    const cx = p.x + p.w / 2;
    return Math.abs(cx - x) < rx && y > p.y - (ry || 30) && y < p.y + p.h + 10;
  }

  // ====================================================
  // الحمض: نفس سائل الجزء الأول لكن مع acid:true
  // اللمس = موت، الصناديق الخشبية تطفو، المعدنية تغرق
  // ====================================================
  const W0 = E.water;
  const waterUpdate = W0.update;
  W0.update = function (e, w, dt) {
    waterUpdate.call(this, e, w, dt);
    if (!e.acid) return;
    const cam = w.cam, VW = LT.Render.viewW;
    if (e.x > cam.x + VW + 100 || e.x + e.w < cam.x - 100) return;
    if (Math.random() < dt * Math.min(12, e.w / 60)) {
      const x = Math.max(e.x + 4, cam.x) + Math.random() * Math.min(e.w - 8, VW);
      if (x < e.x + e.w) w.spawn({ k: 'acidb', x: x, y: e.cur + 2, vx: 0, vy: -8, life: 0.8 + Math.random() * 0.6, s: 1.5 + Math.random() * 2.5, g: 0 });
    }
    if (Math.random() < dt * Math.min(5, e.w / 150)) {
      const x = e.x + Math.random() * e.w;
      w.spawn({ k: 'fume', x: x, y: e.cur - 2, vx: (Math.random() - 0.5) * 8, vy: -14 - Math.random() * 10, life: 2.5, s: 10 + Math.random() * 10, g: 0 });
    }
    LT.Audio.flowLevel = Math.max(LT.Audio.flowLevel, LT.clamp(1 - Math.abs(w.player.cx - (e.x + e.w / 2)) / (e.w / 2 + 500), 0, 0.5));
  };
  W0.hazard = function (e, w, pr) {
    if (!e.acid) return null;
    if (pr.x + pr.w > e.x + 3 && pr.x < e.x + e.w - 3 && pr.y + pr.h > e.cur + 6 && pr.y < e.y + e.h) return 'acid';
    return null;
  };
  W0.light = function (e, w) {
    if (!e.acid || !w.def.dark) return null;
    const L = [];
    for (let x = e.x + 60; x < e.x + e.w; x += 160) L.push({ x: x, y: e.cur, r: 130, k: 0.45 });
    return L;
  };

  // ====================================================
  // الزجاج: يتحطم بالداش، أو بصندوق يسقط عليه، أو بوزن زائد
  // ====================================================
  E.glass = {
    layer: 'mid',
    init(e) { e.w = e.w || 16; e.h = e.h || 120; e.broken = !!e.broken; e.crack = 0; e.max = e.max || 0; e.fx = 0; },
    solid(e) { return e.broken ? null : R(e); },
    shatter(e, w, why) {
      if (e.broken) return false;
      e.broken = true;
      w.snd('glass', e.x + e.w / 2);
      w.shake(3);
      const n = Math.min(40, 10 + Math.round((e.w * e.h) / 250));
      for (let i = 0; i < n; i++) {
        w.spawn({ k: 'shardg', x: e.x + Math.random() * e.w, y: e.y + Math.random() * e.h,
          vx: (Math.random() - 0.5) * 320 + (why === 'dash' ? w.player.dashDir * 220 : 0), vy: -Math.random() * 260,
          life: 1.2 + Math.random() * 0.8, s: 2 + Math.random() * 4, g: 1200, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 16 });
      }
      w.noise(e.x + e.w / 2, e.y);
      return true;
    },
    // صندوق ارتطم به من الأعلى
    impact(e, w, box, v) {
      if (e.broken) return;
      if (v > 330 || (box.mass >= 2 && v > 170)) { this.shatter(e, w, 'box'); box.vy = v * 0.55; box.ground = false; }
    },
    update(e, w, dt) {
      if (e.broken) return;
      if (e.max > 0) {
        const m = w.weightOn(R(e));
        if (m >= e.max) {
          e.crack += dt;
          if (Math.random() < dt * 14) w.snd('tick', e.x + e.w / 2, { v: 0.6 });
          if (e.crack > 0.45) this.shatter(e, w, 'weight');
        } else e.crack = Math.max(0, e.crack - dt * 0.5);
      }
    },
    signal(e, w, s) { if (e.broken && e.sig) s[e.sig] = true; },
    draw(ctx, e, w) {
      const x = e.x, y = e.y, W = e.w, H = e.h;
      if (e.broken) {
        // بقايا مسننة عند الأطراف
        ctx.fillStyle = 'rgba(200,215,220,0.35)';
        const rnd = LT.rng((x * 3 + y) | 0);
        ctx.beginPath();
        if (H > W) {
          ctx.moveTo(x, y); ctx.lineTo(x + W, y); ctx.lineTo(x + W * 0.6, y + 8 + rnd() * 14); ctx.lineTo(x + W * 0.2, y + 4); ctx.closePath();
          ctx.moveTo(x, y + H); ctx.lineTo(x + W, y + H); ctx.lineTo(x + W * 0.5, y + H - 10 - rnd() * 16); ctx.closePath();
        } else {
          ctx.moveTo(x, y); ctx.lineTo(x, y + H); ctx.lineTo(x + 8 + rnd() * 12, y + H * 0.5); ctx.closePath();
          ctx.moveTo(x + W, y); ctx.lineTo(x + W, y + H); ctx.lineTo(x + W - 8 - rnd() * 12, y + H * 0.4); ctx.closePath();
        }
        ctx.fill();
        return;
      }
      const sx = e.crack > 0 ? (Math.random() - 0.5) * e.crack * 3 : 0;
      ctx.fillStyle = 'rgba(190,210,218,0.16)';
      ctx.fillRect(x + sx, y, W, H);
      ctx.strokeStyle = 'rgba(225,238,242,0.55)'; ctx.lineWidth = 1.2;
      ctx.strokeRect(x + sx + 0.5, y + 0.5, W - 1, H - 1);
      if (e.nodash) {
        // زجاج مقوّى بإطار معدني: لا يكسره الداش، فقط شيء ثقيل يسقط عليه
        ctx.strokeStyle = '#0d0d0d'; ctx.lineWidth = 4; ctx.strokeRect(x + sx + 2, y + 2, W - 4, H - 4);
        ctx.fillStyle = '#1c1c1c';
        for (const [a, b] of [[4, 4], [W - 4, 4], [4, H - 4], [W - 4, H - 4]]) { ctx.beginPath(); ctx.arc(x + sx + a, y + b, 2, 0, 7); ctx.fill(); }
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 2;
      ctx.beginPath();
      if (H > W) { ctx.moveTo(x + sx + 3, y + H * 0.15); ctx.lineTo(x + sx + W - 3, y + H * 0.05); ctx.moveTo(x + sx + 3, y + H * 0.55); ctx.lineTo(x + sx + W - 3, y + H * 0.45); }
      else { ctx.moveTo(x + sx + W * 0.1, y + H - 2); ctx.lineTo(x + sx + W * 0.25, y + 2); ctx.moveTo(x + sx + W * 0.55, y + H - 2); ctx.lineTo(x + sx + W * 0.7, y + 2); }
      ctx.stroke();
      if (e.crack > 0) {
        ctx.strokeStyle = 'rgba(255,255,255,' + Math.min(0.8, e.crack * 2) + ')'; ctx.lineWidth = 1;
        const cx = x + W / 2, cy = y + H / 2;
        ctx.beginPath();
        for (let k = 0; k < 6; k++) { const a = k * 1.05 + 0.3; ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * W * 0.5 * e.crack * 2, cy + Math.sin(a) * H * 0.5 * e.crack * 2); }
        ctx.stroke();
      }
    }
  };

  // ====================================================
  // الرموز: 0 دائرة، 1 مثلث، 2 مربع، 3 إكس، 4 عين، 5 موجة
  // ====================================================
  LT.drawGlyph = function (ctx, k, x, y, s) {
    ctx.beginPath();
    switch (k) {
      case 0: ctx.arc(x, y, s, 0, Math.PI * 2); break;
      case 1: ctx.moveTo(x, y - s); ctx.lineTo(x + s * 0.95, y + s * 0.75); ctx.lineTo(x - s * 0.95, y + s * 0.75); ctx.closePath(); break;
      case 2: ctx.rect(x - s * 0.8, y - s * 0.8, s * 1.6, s * 1.6); break;
      case 3: ctx.moveTo(x - s * 0.8, y - s * 0.8); ctx.lineTo(x + s * 0.8, y + s * 0.8); ctx.moveTo(x + s * 0.8, y - s * 0.8); ctx.lineTo(x - s * 0.8, y + s * 0.8); break;
      case 4:
        ctx.moveTo(x - s, y); ctx.quadraticCurveTo(x, y - s * 1.1, x + s, y); ctx.quadraticCurveTo(x, y + s * 1.1, x - s, y);
        ctx.moveTo(x + s * 0.32, y); ctx.arc(x, y, s * 0.32, 0, Math.PI * 2); break;
      case 5:
        ctx.moveTo(x - s, y); ctx.bezierCurveTo(x - s * 0.5, y - s, x - s * 0.1, y - s, x, y); ctx.bezierCurveTo(x + s * 0.1, y + s, x + s * 0.5, y + s, x + s, y); break;
    }
    ctx.stroke();
  };

  // قرص يدور بالتفاعل
  E.dial = {
    layer: 'back',
    init(e) { e.sym = e.sym || 0; e.spin = 0; },
    near(e, w, p) { return pnear(p, e.x, e.y, 30, 70); },
    interact(e, w) { e.sym = (e.sym + 1) % 6; e.spin = 1; w.snd('dial', e.x); return true; },
    update(e, w, dt) { e.spin = Math.max(0, e.spin - dt * 4); },
    draw(ctx, e, w) {
      ctx.fillStyle = '#0b0b0b';
      ctx.fillRect(e.x - 3, e.y, 6, 60);
      ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(-e.spin * 1.05);
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(0, 0, 17, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#1e1e1e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = 'rgba(225,215,190,0.85)'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      LT.drawGlyph(ctx, e.sym, e.x, e.y, 8);
      const p = w.player;
      if (Math.abs(p.cx - e.x) < 34 && LT.Save.data.settings.hints) LT.Ent.hint.drawIcon(ctx, e.x, e.y - 36, 'act', 0.45);
    }
  };

  // القفل: يفتح عندما تطابق كل الأقراص الرمز المطلوب
  E.symlock = {
    layer: 'back',
    init(e) { e.ok = false; e.lv = 0; },
    update(e, w, dt) {
      const ds = w.ents.filter((d) => d.t === 'dial' && d.group === e.group).sort((a, b) => a.idx - b.idx);
      const ok = ds.length === e.code.length && ds.every((d, i) => d.sym === e.code[i]);
      if (ok && !e.ok) { w.snd('unlock', e.x); w.shake(2); }
      e.ok = ok;
      e.lv = LT.approach(e.lv, ok ? 1 : 0, dt * 3);
    },
    signal(e, w, s) { if (e.ok) s[e.sig] = true; },
    draw(ctx, e) {
      // لوحة صغيرة بمصباح
      ctx.fillStyle = '#0c0c0c'; ctx.fillRect(e.x - 14, e.y - 10, 28, 20);
      ctx.fillStyle = e.lv > 0.05 ? 'rgba(230,180,90,' + (0.3 + e.lv * 0.7) + ')' : '#1a1a1a';
      ctx.beginPath(); ctx.arc(e.x, e.y, 5, 0, Math.PI * 2); ctx.fill();
    },
    light(e) { return e.lv > 0.05 ? { x: e.x, y: e.y, r: 60, k: 0.5 * e.lv } : null; }
  };

  // نقش الرمز على الجدار (الدليل)
  E.glyphs = {
    layer: 'back',
    draw(ctx, e, w) {
      let a = e.alpha === undefined ? 0.75 : e.alpha;
      if (e.lamp) {
        const l = w.byId[e.lamp];
        a *= l ? LT.clamp(l.lv * 1.3, 0, 1) : 0;
      }
      if (e.needBroken) { const g = w.byId[e.needBroken]; if (g && !g.broken) a *= 0.12; }
      if (a <= 0.02) return;
      const s = e.s || 9, gap = s * 2.8;
      ctx.save();
      ctx.globalAlpha = a;
      if (e.frame !== false) {
        ctx.strokeStyle = 'rgba(200,190,170,0.35)'; ctx.lineWidth = 1;
        ctx.strokeRect(e.x - gap * 0.6, e.y - s * 1.8, gap * (e.code.length - 1) + gap * 1.2, s * 3.6);
      }
      ctx.strokeStyle = e.color || 'rgba(232,222,198,1)'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (let i = 0; i < e.code.length; i++) {
        if (e.code[i] < 0) continue;
        LT.drawGlyph(ctx, e.code[i], e.x + i * gap, e.y, s);
      }
      if (e.order) {
        ctx.fillStyle = 'rgba(232,222,198,0.7)'; ctx.font = '9px monospace'; ctx.textAlign = 'center';
        for (let i = 0; i < e.code.length; i++) if (e.code[i] >= 0) ctx.fillText(String(e.order[i]), e.x + i * gap, e.y + s * 2.6);
      }
      ctx.restore();
    }
  };

  // ====================================================
  // القطع (تُجمع) والمقابس (توضع فيها القطع)
  // ====================================================
  E.piece = {
    layer: 'mid',
    init(e) { e.got = !!e.got; e.used = !!e.used; },
    blocked(e, w) {
      const r = { x: e.x - 6, y: e.y - 6, w: 12, h: 12 };
      for (const g of w.ents) if (g.t === 'glass' && !g.broken && ov(r, g)) return true;
      return false;
    },
    update(e, w) {
      if (e.got) return;
      const p = w.player;
      if (p.state === 'dead') return;
      if (LT.dist(p.cx, p.y + p.h / 2, e.x, e.y) < 30 && !this.blocked(e, w)) {
        e.got = true;
        w.snd('piece', e.x);
        w.burst(e.x, e.y, 16, { k: 'spark', sp: 120, life: 0.6, s: 1.4, g: 0, spread: 6 });
        w.game.onPiece(e);
      }
    },
    light(e) { return e.got ? null : { x: e.x, y: e.y, r: 70, k: 0.5 }; },
    draw(ctx, e, w) {
      if (e.got) return;
      const t = w.time, y = e.y + Math.sin(t * 2 + e.x) * 3;
      ctx.save();
      const g = ctx.createRadialGradient(e.x, y, 1, e.x, y, 22);
      g.addColorStop(0, 'rgba(235,175,80,0.55)'); g.addColorStop(1, 'rgba(235,175,80,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(e.x, y, 22, 0, Math.PI * 2); ctx.fill();
      ctx.translate(e.x, y); ctx.rotate(t * 0.8);
      ctx.fillStyle = 'rgba(240,190,100,0.95)';
      ctx.beginPath();
      for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, r = i % 2 ? 6.5 : 8.5; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#2a1a08'; ctx.beginPath(); ctx.arc(0, 0, 2.6, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  };

  E.socket = {
    layer: 'back',
    init(e) { e.placed = e.placed || 0; e.done = !!e.done; e.need = e.need || 3; e.glow = 0; },
    ix(e) { return e.x; },
    near(e, w, p) { return !e.done && pnear(p, e.x, e.y - 30, 40, 80); },
    interact(e, w) {
      const have = w.ents.filter((q) => q.t === 'piece' && q.group === e.group && q.got && !q.used);
      if (!have.length) { w.snd('knock', e.x); w.game.onSocketEmpty(e); return true; }
      for (const q of have) q.used = true;
      e.placed += have.length;
      w.snd('clank', e.x);
      if (e.placed >= e.need) { e.done = true; w.snd('pod', e.x); w.shake(4); }
      return true;
    },
    update(e, w, dt) { e.glow = LT.approach(e.glow, e.done ? 1 : 0, dt); },
    signal(e, w, s) { if (e.done) s[e.sig] = true; },
    light(e) { return e.done ? { x: e.x, y: e.y - 40, r: 140, k: 0.55 } : { x: e.x, y: e.y - 40, r: 60, k: 0.25 }; },
    draw(ctx, e, w) {
      const x = e.x, y = e.y;
      ctx.fillStyle = '#0b0b0b';
      ctx.fillRect(x - 32, y - 70, 64, 70);
      ctx.fillRect(x - 38, y - 76, 76, 8);
      for (let i = 0; i < e.need; i++) {
        const sx = x - (e.need - 1) * 9 + i * 18, sy = y - 44;
        ctx.fillStyle = i < e.placed ? 'rgba(240,190,100,0.95)' : '#1c1c1c';
        ctx.beginPath(); ctx.arc(sx, sy, 6, 0, Math.PI * 2); ctx.fill();
      }
      if (e.glow > 0.02) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = 'rgba(240,180,90,' + (0.25 * e.glow) + ')';
        ctx.fillRect(x - 26, y - 22, 52, 6);
        ctx.restore();
      }
      const p = w.player;
      if (!e.done && Math.abs(p.cx - x) < 46 && LT.Save.data.settings.hints) LT.Ent.hint.drawIcon(ctx, x, y - 100, 'act', 0.45);
    }
  };

  // ====================================================
  // مروحة هواء صاعد
  // ====================================================
  E.fan = {
    layer: 'mid',
    init(e) { e.w = e.w || 70; e.h = e.h || 300; e.spin = 0; e.on = true; e.power = e.power || 2700; e.max = e.max || 330; e.sT = 0; },
    zone(e) { return { x: e.x + 4, y: e.y - e.h, w: e.w - 8, h: e.h }; },
    update(e, w, dt) {
      e.on = e.sig ? (e.inv ? !w.S(e.sig) : w.S(e.sig)) : true;
      e.spin += dt * (e.on ? 22 : 0);
      if (!e.on) return;
      const p = w.player;
      if (p.state === 'normal' && ov(p.rect(), this.zone(e))) {
        p.vy = Math.max(p.vy - e.power * dt, -e.max);
        p.onGround = false; p.fallMax = 0;
      }
      if (Math.random() < dt * 14) w.spawn({ k: 'wind', x: e.x + 6 + Math.random() * (e.w - 12), y: e.y - 4, vx: 0, vy: -260 - Math.random() * 120, life: e.h / 330, s: 10 + Math.random() * 14, g: 0 });
      e.sT -= dt;
      if (e.sT <= 0) { e.sT = 0.6; if (Math.abs(p.x - e.x) < 600) w.snd('fan', e.x); }
    },
    solid(e) { return { x: e.x, y: e.y, w: e.w, h: 14, ent: e }; },
    draw(ctx, e, w) {
      ctx.fillStyle = '#0a0a0a'; ctx.fillRect(e.x, e.y, e.w, 14);
      ctx.strokeStyle = '#1b1b1b'; ctx.lineWidth = 2;
      const c = e.x + e.w / 2;
      for (let i = 0; i < 4; i++) {
        const a = e.spin + i * Math.PI / 2;
        ctx.beginPath(); ctx.moveTo(c, e.y + 7); ctx.lineTo(c + Math.cos(a) * (e.w / 2 - 6), e.y + 7 + Math.sin(a) * 4); ctx.stroke();
      }
      ctx.fillStyle = '#151515'; ctx.fillRect(e.x - 4, e.y - 3, e.w + 8, 4);
    }
  };

  // ====================================================
  // نابض يقذف للأعلى
  // ====================================================
  E.spring = {
    layer: 'mid',
    init(e) { e.w = e.w || 46; e.c = 0; e.power = e.power || 1050; },
    solid(e) { return { x: e.x, y: e.y - 12 + e.c * 6, w: e.w, h: 12 - e.c * 6, ent: e }; },
    update(e, w, dt) {
      const p = w.player;
      if (p.state === 'normal' && p.onGround && p.ground && p.ground.ent === e && p.vy >= 0) {
        p.vy = -e.power; p.onGround = false; p.fallMax = 0; p.coyote = 0;
        e.c = 1; w.snd('spring', e.x + e.w / 2);
      }
      e.c = LT.approach(e.c, 0, dt * 5);
    },
    draw(ctx, e) {
      const top = e.y - 12 + e.c * 6;
      ctx.strokeStyle = '#141414'; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i <= 6; i++) { const yy = LT.lerp(e.y, top + 3, i / 6); ctx.lineTo(e.x + e.w / 2 + (i % 2 ? 10 : -10), yy); }
      ctx.stroke();
      ctx.fillStyle = '#0d0d0d'; ctx.fillRect(e.x, top, e.w, 4); ctx.fillRect(e.x + 4, e.y - 2, e.w - 8, 3);
      ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(e.x, top, e.w, 1);
    }
  };

  // ====================================================
  // ليزر: نفس الكهرباء لكن بشعاع أحمر، ويمكن أن يتحرك
  // ====================================================
  const elecInit = E.elec.init, elecUpdate = E.elec.update, elecDraw = E.elec.draw;
  E.elec.init = function (e, w) { elecInit.call(this, e, w); e.x1 = e.x; };
  E.elec.update = function (e, w, dt) {
    if (e.x2 !== undefined) e.x = LT.lerp(e.x1, e.x2, (Math.sin((w.time + (e.mo || 0)) / (e.mper || 4) * Math.PI * 2) + 1) / 2);
    if (e.red) {
      let on = true, warn = false;
      if (e.sig) on = !w.S(e.sig);
      else if (e.per) { const ph = ((w.time + (e.off || 0)) % e.per) / e.per; on = ph < (e.duty || 0.5); warn = !on && ph > 1 - 0.5 / e.per; }
      if (on && !e.on) w.snd('laser', e.x + e.w / 2, { v: 0.5 });
      e.on = on; e.warn = warn;
      return;
    }
    elecUpdate.call(this, e, w, dt);
  };
  E.elec.draw = function (ctx, e, w) {
    if (!e.red) return elecDraw.call(this, ctx, e, w);
    const vert = e.h > e.w;
    ctx.fillStyle = '#0b0b0b';
    if (vert) { ctx.fillRect(e.x - 5, e.y - 10, e.w + 10, 10); ctx.fillRect(e.x - 5, e.y + e.h, e.w + 10, 6); }
    else { ctx.fillRect(e.x - 10, e.y - 5, 10, e.h + 10); ctx.fillRect(e.x + e.w, e.y - 5, 6, e.h + 10); }
    if (!e.on) {
      if (e.warn && Math.sin(w.time * 40) > 0) {
        ctx.strokeStyle = 'rgba(255,60,40,0.35)'; ctx.lineWidth = 1;
        ctx.beginPath(); if (vert) { ctx.moveTo(e.x + e.w / 2, e.y); ctx.lineTo(e.x + e.w / 2, e.y + e.h); } else { ctx.moveTo(e.x, e.y + e.h / 2); ctx.lineTo(e.x + e.w, e.y + e.h / 2); } ctx.stroke();
      }
      return;
    }
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 3; k++) {
      ctx.strokeStyle = k === 0 ? 'rgba(255,190,170,0.95)' : (k === 1 ? 'rgba(255,50,30,0.55)' : 'rgba(255,40,20,0.18)');
      ctx.lineWidth = k === 0 ? 1.4 : (k === 1 ? 3.5 : 9);
      ctx.beginPath();
      if (vert) { ctx.moveTo(e.x + e.w / 2, e.y); ctx.lineTo(e.x + e.w / 2, e.y + e.h); }
      else { ctx.moveTo(e.x, e.y + e.h / 2); ctx.lineTo(e.x + e.w, e.y + e.h / 2); }
      ctx.stroke();
    }
    ctx.restore();
  };
  const elecLight = E.elec.light;
  E.elec.light = function (e, w) {
    if (!e.red) return elecLight.call(this, e, w);
    return e.on ? { x: e.x + e.w / 2, y: e.y + e.h / 2, r: 60 + Math.max(e.w, e.h) * 0.5, k: 0.4 } : null;
  };

  // ====================================================
  // موجة الهروب: جدار حمض وانهيار يطارد من اليسار
  // ====================================================
  const chUpdate = E.chaser.update, chDraw = E.chaser.draw;
  E.chaser.update = function (e, w, dt) {
    if (e.style !== 'flood') return chUpdate.call(this, e, w, dt);
    const p = w.player;
    if (!e.on && !e.done && p.state !== 'dead' && p.x > e.trig) {
      e.on = true; e.cx = p.x - (e.off || 520);
      w.game.onChase(true); w.snd('rumble', e.cx);
    }
    if (!e.on) { if (e.fade > 0) e.fade = Math.max(0, e.fade - dt); return; }
    e.fade = 1;
    const dist = p.x - e.cx;
    let sp = e.speed;
    if (dist > 700) sp = e.speed * 1.8;
    if (p.state === 'dead') sp = 30;
    e.cx += sp * dt;
    w.game.tension = LT.clamp(1 - (dist - 120) / 500, 0.3, 1);
    if (p.state !== 'dead' && p.x < e.cx - 4) p.die('acid');
    if (p.x > e.end && p.state !== 'dead') { e.on = false; e.done = true; w.game.onChase(false); }
    e.rT = (e.rT || 0) - dt;
    if (e.rT <= 0) { e.rT = 0.9 + Math.random(); w.snd('rumble', e.cx, { v: 0.7 }); w.shake(2); }
    if (Math.random() < dt * 6) w.spawn({ k: 'chip', x: e.cx + Math.random() * 300, y: w.cam.y - 10, vx: (Math.random() - 0.5) * 40, vy: 100, life: 2, s: 2 + Math.random() * 4, g: 900, rot: 0, vr: 5 });
  };
  E.chaser.draw = function (ctx, e, w) {
    if (e.style !== 'flood') return chDraw.call(this, ctx, e, w);
    if (!e.on && e.fade <= 0) return;
    const t = w.time, cam = w.cam;
    const top = cam.y - 80, bot = cam.y + LT.C.VIEW_H + 80;
    ctx.save();
    ctx.globalAlpha = e.on ? 1 : e.fade;
    // جدار انهيار مظلم
    const g = ctx.createLinearGradient(e.cx - 600, 0, e.cx + 30, 0);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.8, 'rgba(4,6,3,0.95)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(e.cx - 2400, top, 2430, bot - top);
    // موجة حمض في الأسفل
    const py = w.player.y + w.player.h;
    ctx.fillStyle = 'rgba(120,160,40,0.85)';
    ctx.beginPath(); ctx.moveTo(e.cx - 2400, bot);
    for (let x = e.cx - 600; x <= e.cx + 40; x += 20) ctx.lineTo(x, py - 90 + Math.sin(x * 0.03 + t * 6) * 12 + (x - (e.cx - 600)) * 0.12);
    ctx.lineTo(e.cx + 40, bot); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(200,240,100,0.6)'; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = e.cx - 600; x <= e.cx + 40; x += 20) ctx.lineTo(x, py - 90 + Math.sin(x * 0.03 + t * 6) * 12 + (x - (e.cx - 600)) * 0.12);
    ctx.stroke();
    // حطام
    ctx.fillStyle = '#000';
    for (let i = 0; i < 18; i++) {
      const yy = top + (i / 17) * (bot - top);
      const r = 26 + Math.sin(t * 3 + i * 1.7) * 10;
      ctx.beginPath(); ctx.moveTo(e.cx - 20 + Math.sin(t * 2 + i) * 14, yy - r); ctx.lineTo(e.cx + r * 0.6, yy); ctx.lineTo(e.cx - 20, yy + r); ctx.fill();
    }
    ctx.restore();
  };

  // ====================================================
  // فكرة / حوار داخلي يظهر عند المرور
  // ====================================================
  E.thought = {
    update(e, w) {
      const p = w.player;
      if (!e.done && p.state !== 'dead' && p.x > e.x && (e.y === undefined || Math.abs(p.y + p.h - e.y) < 260)) { e.done = true; w.game.think(e.id); }
    }
  };

  // ====================================================
  // ذكرى (أثر) للجزء الثاني — تستخدم نفس clue
  // ====================================================
})(window.LT);
