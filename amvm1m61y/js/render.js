/* =========================================================
   render.js : الرسم — خلفيات بطبقات Parallax مولّدة إجرائيًا،
   ضباب متحرك، أشعة ضوء، جزيئات، إضاءة، ماء وانعكاس،
   تأثيرات ما بعد المعالجة (تظليل الأطراف، حبيبات، أشرطة سينمائية)
   ========================================================= */
(function (LT) {
  'use strict';

  const R = LT.Render = {
    canvas: null, ctx: null, scale: 1, viewW: 960, dpr: 1,
    layers: null, themeName: null, q: 'medium'
  };

  // ---------- تعريف الأجواء لكل فصل ----------
  const THEMES = {
    forest: {
      sky: ['#5d6164', '#9ea3a3', '#c7cbc8'], fog: '200,205,203', ground: '#050505', edge: 'grass',
      layers: [
        { par: 0.08, col: '#8d9291', kind: 'trees', n: 26, h: [300, 520], base: 470, w: [3, 7] },
        { par: 0.2, col: '#5f6463', kind: 'trees', n: 20, h: [320, 560], base: 500, w: [5, 11] },
        { par: 0.42, col: '#2f3332', kind: 'trees', n: 13, h: [380, 620], base: 540, w: [9, 18] },
        { par: 0.7, col: '#151716', kind: 'trees', n: 8, h: [450, 700], base: 580, w: [16, 28] }
      ],
      shafts: true, motes: 'dust', leaves: true, vignette: 0.75, grain: 0.07
    },
    swamp: {
      sky: ['#3f4544', '#7f8784', '#a9b0ab'], fog: '170,180,175', ground: '#040504', edge: 'moss',
      layers: [
        { par: 0.08, col: '#7a827f', kind: 'dead', n: 16, h: [180, 360], base: 470, w: [3, 7] },
        { par: 0.2, col: '#4f5654', kind: 'dead', n: 14, h: [200, 400], base: 500, w: [5, 10] },
        { par: 0.42, col: '#272c2b', kind: 'reeds', n: 40, h: [60, 160], base: 540, w: [2, 4] },
        { par: 0.7, col: '#111413', kind: 'dead', n: 7, h: [300, 600], base: 580, w: [12, 22] }
      ],
      shafts: false, motes: 'spore', leaves: false, vignette: 0.8, grain: 0.08
    },
    factory: {
      sky: ['#2c2e30', '#5d6164', '#86898a'], fog: '140,142,144', ground: '#050505', edge: 'metal', mat: 'metal',
      layers: [
        { par: 0.08, col: '#6c7072', kind: 'factory', n: 10, h: [180, 380], base: 470 },
        { par: 0.2, col: '#46494b', kind: 'factory', n: 9, h: [200, 420], base: 500 },
        { par: 0.42, col: '#24272a', kind: 'pipes', n: 10, h: [200, 500], base: 540 },
        { par: 0.7, col: '#111214', kind: 'girders', n: 6, h: [300, 600], base: 580 }
      ],
      shafts: true, motes: 'ash', leaves: false, vignette: 0.8, grain: 0.09
    },
    tunnel: {
      sky: ['#0c0d0d', '#171919', '#202323'], fog: '60,64,64', ground: '#040404', edge: 'rock',
      layers: [
        { par: 0.15, col: '#1c1e1e', kind: 'arches', n: 6, h: [260, 400], base: 520 },
        { par: 0.4, col: '#111313', kind: 'columns', n: 8, h: [400, 600], base: 560 },
        { par: 0.7, col: '#090a0a', kind: 'stalac', n: 14, h: [60, 160], base: 580 }
      ],
      shafts: false, motes: 'dust', leaves: false, vignette: 0.9, grain: 0.1
    },
    city: {
      sky: ['#33393b', '#6d7678', '#9aa3a3'], fog: '160,168,168', ground: '#050606', edge: 'concrete',
      layers: [
        { par: 0.08, col: '#737b7c', kind: 'buildings', n: 12, h: [200, 420], base: 470 },
        { par: 0.2, col: '#4b5253', kind: 'buildings', n: 10, h: [240, 460], base: 500 },
        { par: 0.42, col: '#252a2b', kind: 'buildings', n: 7, h: [300, 520], base: 540 },
        { par: 0.7, col: '#101313', kind: 'poles', n: 6, h: [300, 600], base: 590 }
      ],
      shafts: true, motes: 'rain', leaves: false, vignette: 0.8, grain: 0.08
    },
    lab: {
      sky: ['#151718', '#2a2e30', '#3a3f41'], fog: '110,118,120', ground: '#050606', edge: 'metal', mat: 'metal',
      layers: [
        { par: 0.12, col: '#2c3133', kind: 'lab', n: 8, h: [200, 380], base: 500 },
        { par: 0.35, col: '#1a1d1f', kind: 'pipes', n: 10, h: [260, 500], base: 540 },
        { par: 0.7, col: '#0b0c0d', kind: 'girders', n: 5, h: [300, 600], base: 590 }
      ],
      shafts: false, motes: 'dust', leaves: false, vignette: 0.85, grain: 0.08, red: true
    }
  };
  R.THEMES = THEMES;

  R.init = function (canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.lightCv = document.createElement('canvas');
    this.lightCtx = this.lightCv.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 200));
    // بلاطة الحبيبات (Film grain)
    const g = document.createElement('canvas'); g.width = g.height = 128;
    const gc = g.getContext('2d'); const id = gc.createImageData(128, 128);
    for (let i = 0; i < id.data.length; i += 4) { const v = Math.random() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
    gc.putImageData(id, 0, 0);
    this.grainTile = g;
    // نقطة ضباب ناعمة
    const f = document.createElement('canvas'); f.width = f.height = 128;
    const fc = f.getContext('2d');
    const fg = fc.createRadialGradient(64, 64, 0, 64, 64, 64);
    fg.addColorStop(0, 'rgba(255,255,255,1)'); fg.addColorStop(1, 'rgba(255,255,255,0)');
    fc.fillStyle = fg; fc.fillRect(0, 0, 128, 128);
    this.fogBlob = f;
  };

  R.quality = function () {
    const q = LT.Save.data.settings.quality;
    return q === 'low' || q === 'high' ? q : 'medium';
  };

  R.resize = function () {
    const q = this.quality();
    const dprMax = q === 'high' ? 2 : (q === 'medium' ? 1.5 : 1);
    const k = q === 'low' ? 0.75 : 1;
    this.dpr = Math.min(window.devicePixelRatio || 1, dprMax) * k;
    const cw = window.innerWidth, ch = window.innerHeight;
    this.canvas.width = Math.round(cw * this.dpr);
    this.canvas.height = Math.round(ch * this.dpr);
    this.canvas.style.width = cw + 'px';
    this.canvas.style.height = ch + 'px';
    this.scale = this.canvas.height / LT.C.VIEW_H;
    this.viewW = this.canvas.width / this.scale;
    const ls = q === 'low' ? 0.25 : 0.34;
    this.lightCv.width = Math.max(64, Math.round(this.canvas.width * ls));
    this.lightCv.height = Math.max(36, Math.round(this.canvas.height * ls));
    if (this.themeName) this.buildTheme(this.themeName, true);
  };

  // ---------- توليد طبقات الخلفية ----------
  const LW = 1400, LH = 760;
  R.buildTheme = function (name, force) {
    if (this.themeName === name && !force && this.layers) return;
    this.themeName = name;
    const th = THEMES[name] || THEMES.forest;
    this.theme = th;
    const q = this.quality();
    const res = this.scale * (q === 'high' ? 0.8 : q === 'medium' ? 0.55 : 0.4);
    this.layers = th.layers.map((L, i) => {
      const cv = document.createElement('canvas');
      cv.width = Math.ceil(LW * res); cv.height = Math.ceil(LH * res);
      const c = cv.getContext('2d');
      c.scale(res, res);
      genLayer(c, L, 1234 + i * 977 + name.length * 31);
      return { cv: cv, par: L.par, res: res };
    });
    // ستارة السماء
    const sc = document.createElement('canvas'); sc.width = 4; sc.height = 256;
    const sx = sc.getContext('2d');
    const g = sx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, th.sky[0]); g.addColorStop(0.6, th.sky[1]); g.addColorStop(1, th.sky[2]);
    sx.fillStyle = g; sx.fillRect(0, 0, 4, 256);
    this.skyCv = sc;
    // تظليل الأطراف
    const vc = document.createElement('canvas'); vc.width = 256; vc.height = 144;
    const vx = vc.getContext('2d');
    const vg = vx.createRadialGradient(128, 72, 40, 128, 72, 150);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(0.6, 'rgba(0,0,0,0.25)'); vg.addColorStop(1, 'rgba(0,0,0,' + th.vignette + ')');
    vx.fillStyle = vg; vx.fillRect(0, 0, 256, 144);
    this.vigCv = vc;
  };

  function genLayer(c, L, seed) {
    const r = LT.rng(seed);
    const rr = (a, b) => a + r() * (b - a);
    c.fillStyle = L.col; c.strokeStyle = L.col;
    c.lineCap = 'round'; c.lineJoin = 'round';
    const base = L.base;
    // أرضية الطبقة
    c.beginPath(); c.moveTo(0, LH);
    for (let x = 0; x <= LW; x += 40) c.lineTo(x, base + Math.sin(x * 0.01 + seed) * 8 + Math.sin(x * 0.037) * 4);
    c.lineTo(LW, LH); c.closePath(); c.fill();

    const draw = (x) => {
      const h = rr(L.h[0], L.h[1]);
      switch (L.kind) {
        case 'trees': {
          const w = rr(L.w[0], L.w[1]);
          c.beginPath(); c.moveTo(x - w, base + 10); c.lineTo(x - w * 0.55, base - h); c.lineTo(x + w * 0.55, base - h); c.lineTo(x + w, base + 10); c.fill();
          c.beginPath(); c.moveTo(x - w * 2.2, base + 6); c.quadraticCurveTo(x - w, base - 6, x - w * 0.7, base - 30); c.lineTo(x + w * 0.7, base - 30); c.quadraticCurveTo(x + w, base - 6, x + w * 2.2, base + 6); c.fill();
          const nb = 3 + (r() * 6 | 0);
          for (let i = 0; i < nb; i++) {
            const by = base - h * rr(0.35, 0.95), side = r() < 0.5 ? -1 : 1, bl = rr(30, 110) * (w / 10 + 0.5);
            c.lineWidth = Math.max(1, w * 0.35 * rr(0.4, 1));
            c.beginPath(); c.moveTo(x, by);
            c.quadraticCurveTo(x + side * bl * 0.5, by - bl * 0.15, x + side * bl, by - bl * rr(0.1, 0.6)); c.stroke();
            if (r() < 0.6) { c.lineWidth *= 0.5; c.beginPath(); c.moveTo(x + side * bl * 0.6, by - bl * 0.2); c.lineTo(x + side * bl * 0.8, by - bl * 0.6); c.stroke(); }
          }
          c.fillRect(x - w * 0.55, -10, w * 1.1, base - h + 12);
          break;
        }
        case 'dead': {
          const w = rr(L.w[0], L.w[1]);
          c.beginPath(); c.moveTo(x - w, base + 10); c.lineTo(x - w * 0.4, base - h); c.lineTo(x + w * 0.3, base - h - 6); c.lineTo(x + w, base + 10); c.fill();
          const nb = 2 + (r() * 4 | 0);
          for (let i = 0; i < nb; i++) {
            const by = base - h * rr(0.4, 1), side = r() < 0.5 ? -1 : 1, bl = rr(20, 80) * (w / 8 + 0.4);
            c.lineWidth = Math.max(1, w * 0.3);
            c.beginPath(); c.moveTo(x, by); c.lineTo(x + side * bl * 0.6, by - bl * 0.5); c.lineTo(x + side * bl, by - bl * 0.4); c.stroke();
          }
          // طحالب متدلية
          c.lineWidth = 1;
          for (let i = 0; i < 4; i++) { const mx = x + rr(-30, 30), my = base - h * rr(0.5, 0.9); c.beginPath(); c.moveTo(mx, my); c.lineTo(mx + rr(-3, 3), my + rr(20, 50)); c.stroke(); }
          break;
        }
        case 'reeds': {
          for (let i = 0; i < 6; i++) {
            const xx = x + rr(-12, 12), hh = h * rr(0.5, 1);
            c.lineWidth = rr(1, 2.5);
            c.beginPath(); c.moveTo(xx, base + 6); c.quadraticCurveTo(xx + rr(-6, 6), base - hh * 0.5, xx + rr(-14, 14), base - hh); c.stroke();
            if (r() < 0.4) { c.beginPath(); c.ellipse(xx + rr(-10, 10), base - hh * 0.9, 2, 8, 0, 0, 7); c.fill(); }
          }
          break;
        }
        case 'factory': {
          const w = rr(80, 200);
          c.fillRect(x - w / 2, base - h, w, h + 20);
          if (r() < 0.7) { const cw = rr(14, 26), ch = rr(80, 200); c.fillRect(x + rr(-w / 3, w / 3), base - h - ch, cw, ch); }
          if (r() < 0.5) { c.beginPath(); c.moveTo(x - w / 2, base - h); for (let k = 0; k < 4; k++) { c.lineTo(x - w / 2 + (k + 0.5) * w / 4, base - h - 24); c.lineTo(x - w / 2 + (k + 1) * w / 4, base - h); } c.fill(); }
          break;
        }
        case 'pipes': {
          c.lineWidth = rr(8, 22);
          const y1 = base - h, xx = x;
          c.beginPath(); c.moveTo(xx, base + 10); c.lineTo(xx, y1); c.quadraticCurveTo(xx, y1 - 40, xx + 40, y1 - 40); c.lineTo(xx + rr(80, 300), y1 - 40); c.stroke();
          c.lineWidth *= 1.5; c.beginPath(); c.moveTo(xx, y1 + 60); c.lineTo(xx, y1 + 64); c.stroke();
          break;
        }
        case 'girders': {
          const w = rr(14, 24);
          c.fillRect(x - w / 2, -10, w, LH);
          c.lineWidth = 3;
          for (let y = 20; y < base; y += 60) { c.beginPath(); c.moveTo(x - w / 2, y); c.lineTo(x + w / 2, y + 60); c.moveTo(x + w / 2, y); c.lineTo(x - w / 2, y + 60); c.stroke(); }
          if (r() < 0.5) { c.lineWidth = 2; c.beginPath(); c.moveTo(x, 0); c.quadraticCurveTo(x + 60, 150, x + 120, rr(60, 200)); c.stroke(); }
          break;
        }
        case 'arches': {
          const w = rr(120, 220);
          c.beginPath(); c.moveTo(x - w / 2, base + 20); c.lineTo(x - w / 2, base - h * 0.6); c.quadraticCurveTo(x, base - h * 1.1, x + w / 2, base - h * 0.6); c.lineTo(x + w / 2, base + 20);
          c.lineTo(x + w / 2 + 40, base + 20); c.lineTo(x + w / 2 + 40, -10); c.lineTo(x - w / 2 - 40, -10); c.lineTo(x - w / 2 - 40, base + 20); c.closePath(); c.fill();
          break;
        }
        case 'columns': {
          const w = rr(30, 60);
          c.fillRect(x - w / 2, -10, w, LH);
          c.fillRect(x - w / 2 - 8, base - 20, w + 16, 30);
          break;
        }
        case 'stalac': {
          const w = rr(10, 30);
          c.beginPath(); c.moveTo(x - w, -10); c.lineTo(x, h); c.lineTo(x + w, -10); c.fill();
          c.beginPath(); c.moveTo(x - w * 1.5, base + 40); c.lineTo(x + rr(-5, 5), base - h * 0.6); c.lineTo(x + w * 1.5, base + 40); c.fill();
          break;
        }
        case 'buildings': {
          const w = rr(80, 180), tilt = rr(-0.06, 0.06);
          c.save(); c.translate(x, base + 20); c.rotate(tilt);
          c.fillRect(-w / 2, -h, w, h + 20);
          c.globalCompositeOperation = 'destination-out';
          for (let yy = -h + 20; yy < -40; yy += 36) for (let xx = -w / 2 + 12; xx < w / 2 - 16; xx += 28) if (r() < 0.55) c.fillRect(xx, yy, 12, 18);
          c.globalCompositeOperation = 'source-over';
          if (r() < 0.5) c.fillRect(-w / 4, -h - rr(20, 60), 6, 60);
          c.restore();
          break;
        }
        case 'poles': {
          c.fillRect(x - 4, base - h, 8, h + 20);
          c.fillRect(x - 30, base - h + 10, 60, 5);
          c.lineWidth = 1.5;
          c.beginPath(); c.moveTo(x - 30, base - h + 12); c.quadraticCurveTo(x + 150, base - h + 70, x + 330, base - h + 20); c.stroke();
          break;
        }
        case 'lab': {
          const w = rr(60, 140);
          c.fillRect(x - w / 2, base - h, w, h + 20);
          c.globalCompositeOperation = 'destination-out';
          c.fillRect(x - w / 2 + 8, base - h + 12, w - 16, 8);
          c.globalCompositeOperation = 'source-over';
          c.beginPath(); c.arc(x, base - h, w * 0.3, Math.PI, 0); c.fill();
          break;
        }
      }
    };
    const n = L.n;
    for (let i = 0; i < n; i++) {
      const x = (i + r() * 0.8) * (LW / n);
      draw(x);
      // تكرار عند الحافة لضمان التكرار السلس
      if (x < 200) draw.call(null, x + LW);
      if (x > LW - 200) draw.call(null, x - LW);
    }
  }

  // ---------- الرسم الرئيسي ----------
  R.draw = function (G) {
    const ctx = this.ctx, W = G.world;
    const th = this.theme;
    const S = this.scale, VW = this.viewW, VH = LT.C.VIEW_H;
    const t = W ? W.time : G.menuT;
    const cam = W ? W.cam : G.menuCam;
    const cx = cam.x + (cam.sx || 0), cy = cam.y + (cam.sy || 0);
    const q = this.quality();

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this.skyCv, 0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(S, 0, 0, S, 0, 0);

    // توهج ضوء في السماء
    if (th.shafts || this.themeName === 'menu') {
      const sg = ctx.createRadialGradient(VW * 0.7, VH * 0.1, 10, VW * 0.7, VH * 0.1, VH * 0.9);
      sg.addColorStop(0, 'rgba(255,255,250,0.22)'); sg.addColorStop(1, 'rgba(255,255,250,0)');
      ctx.fillStyle = sg; ctx.fillRect(0, 0, VW, VH);
    }

    // الطبقات والضباب بينها
    const refY = W ? (W.def.refY || 330) : 330;
    for (let i = 0; i < this.layers.length; i++) {
      const L = this.layers[i];
      const ox = -((cx * L.par) % LW + LW) % LW;
      const oy = -(cy - refY) * L.par * 0.45 - 110;
      const w = LW, h = LH;
      for (let x = ox; x < VW; x += w) ctx.drawImage(L.cv, x, oy, w, h);
      if (oy + h < VH) { ctx.fillStyle = th.layers[i].col; ctx.fillRect(0, oy + h - 1, VW, VH - oy - h + 1); }
      // ضباب بين الطبقات
      const fg = ctx.createLinearGradient(0, 0, 0, VH);
      const fa = 0.18 - i * 0.03;
      fg.addColorStop(0, 'rgba(' + th.fog + ',0)'); fg.addColorStop(0.55, 'rgba(' + th.fog + ',' + (fa * 0.6) + ')'); fg.addColorStop(1, 'rgba(' + th.fog + ',' + fa + ')');
      ctx.fillStyle = fg; ctx.fillRect(0, 0, VW, VH);
      if (q !== 'low' && i === this.layers.length - 2) this.drawFogBlobs(ctx, cx, t, 0.5, th);
    }

    // أشعة الضوء
    if (th.shafts && q !== 'low') {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 4; i++) {
        const bx = ((i * 520 + 200 - cx * 0.3) % 2100 + 2100) % 2100 - 300;
        const a = 0.035 + Math.sin(t * 0.3 + i * 2) * 0.02;
        const g = ctx.createLinearGradient(bx, 0, bx + 200, VH);
        g.addColorStop(0, 'rgba(255,255,245,' + a + ')'); g.addColorStop(1, 'rgba(255,255,245,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(bx, -10); ctx.lineTo(bx + 60, -10); ctx.lineTo(bx + 330, VH); ctx.lineTo(bx + 170, VH); ctx.fill();
      }
      ctx.restore();
    }

    if (!W) { this.post(G, ctx, t); return; }

    // ======= العالم =======
    ctx.save();
    ctx.translate(-cx, -cy);
    this.drawDeco(ctx, W, t, cx, VW);
    this.drawEnts(ctx, W, t, 'back', cx, VW);
    this.drawSolids(ctx, W, cx, VW);
    this.drawEnts(ctx, W, t, 'mid', cx, VW);

    // انعكاس اللاعب في الماء
    const p = W.player;
    for (const e of W.ents) {
      if (e.t !== 'water') continue;
      if (p.cx > e.x && p.cx < e.x + e.w && Math.abs(p.y + p.h - e.cur) < 120 && p.state !== 'swim' && p.y + p.h <= e.cur + 2 && q !== 'low') {
        ctx.save();
        ctx.beginPath(); ctx.rect(e.x, e.cur, e.w, 200); ctx.clip();
        ctx.translate(0, e.cur * 2); ctx.scale(1, -1);
        ctx.globalAlpha = 0.18;
        p.draw(ctx, t, { reflect: true, color: '#000', back: '#000' });
        ctx.restore();
      }
    }

    p.draw(ctx, t);
    this.drawParticles(ctx, W, false);
    this.drawWater(ctx, W, t);
    this.drawEnts(ctx, W, t, 'front', cx, VW);
    this.drawParticles(ctx, W, true);
    this.drawFg(ctx, W, t, cx, VW);
    ctx.restore();

    // ضباب أمامي
    if (q === 'high') this.drawFogBlobs(ctx, cx, t, 1.2, th, 0.5);

    // الإضاءة (للأماكن المظلمة)
    if (W.def.dark) this.drawLighting(ctx, W, cx, cy);
    if (th.red && G.alarm) {
      ctx.fillStyle = 'rgba(160,20,10,' + (0.06 + Math.max(0, Math.sin(t * 3)) * 0.08) + ')';
      ctx.fillRect(0, 0, VW, VH);
    }
    this.post(G, ctx, t);
  };

  R.drawFogBlobs = function (ctx, cx, t, par, th, alpha) {
    const VW = this.viewW;
    ctx.save();
    ctx.globalAlpha = alpha || 1;
    for (let i = 0; i < 7; i++) {
      const w = 700 + (i % 3) * 200;
      const x = ((i * 410 + t * (8 + i * 2) - cx * par) % (VW + w * 2) + (VW + w * 2)) % (VW + w * 2) - w;
      const y = 330 + (i % 4) * 50 + Math.sin(t * 0.2 + i) * 20;
      ctx.globalAlpha = (alpha || 1) * (0.1 + (i % 3) * 0.04);
      ctx.drawImage(this.fogBlob, x, y - 90, w, 220);
    }
    ctx.restore();
    void th;
  };

  // ---------- الأرضيات والجدران ----------
  R.drawSolids = function (ctx, W, cx, VW) {
    const th = this.theme;
    if (!W.edgeCache) W.edgeCache = W.solids.map((s, i) => makeEdge(s, i, th.edge));
    ctx.fillStyle = th.ground;
    for (let i = 0; i < W.solids.length; i++) {
      const s = W.solids[i];
      if (s.x > cx + VW + 50 || s.x + s.w < cx - 50) continue;
      ctx.fillRect(s.x, s.y, s.w, s.h);
    }
    // حواف مضيئة قليلًا وأعشاب
    for (let i = 0; i < W.solids.length; i++) {
      const s = W.solids[i];
      if (s.x > cx + VW + 50 || s.x + s.w < cx - 50) continue;
      ctx.fillStyle = 'rgba(255,255,255,0.055)';
      ctx.fillRect(s.x, s.y, s.w, 1);
      const p = W.edgeCache[i];
      if (p) { ctx.fillStyle = th.ground; ctx.fill(p); }
    }
  };

  function makeEdge(s, i, kind) {
    if (typeof Path2D === 'undefined') return null;
    if (s.w < 6) return null;
    const p = new Path2D();
    const r = LT.rng((s.x * 31 + s.y * 17 + i) | 0);
    const top = s.y;
    if (kind === 'grass' || kind === 'moss') {
      for (let x = s.x; x < s.x + s.w - 2; x += 3 + r() * 5) {
        const h = kind === 'grass' ? 3 + r() * 9 : 2 + r() * 4;
        const lean = (r() - 0.5) * 6;
        p.moveTo(x, top + 1); p.lineTo(x + 1 + lean, top - h); p.lineTo(x + 2.5, top + 1);
      }
      if (kind === 'moss') for (let x = s.x + 10; x < s.x + s.w - 10; x += 30 + r() * 60) {
        p.moveTo(x, top); p.quadraticCurveTo(x + 3, top + 10 + r() * 14, x + 6, top);
      }
    } else if (kind === 'rock') {
      p.moveTo(s.x, top + 2);
      for (let x = s.x; x < s.x + s.w; x += 8 + r() * 14) p.lineTo(x, top - r() * 4);
      p.lineTo(s.x + s.w, top + 2); p.closePath();
    } else if (kind === 'concrete') {
      for (let x = s.x + 6; x < s.x + s.w - 8; x += 40 + r() * 70) { p.rect(x, top - 3 - r() * 5, 2, 8); }
    } else if (kind === 'metal') {
      for (let x = s.x + 10; x < s.x + s.w - 10; x += 48) { p.rect(x, top - 4, 3, 5); }
    }
    return p;
  }

  R.drawEnts = function (ctx, W, t, layer, cx, VW) {
    for (const e of W.ents) {
      const T = LT.Ent[e.t];
      if (!T || !T.draw || T.layer !== layer) continue;
      if (e.x !== undefined && e.t !== 'chaser' && e.t !== 'pulley' && e.t !== 'creature') {
        const ex = e.x, ew = e.w || 0;
        if (ex > cx + VW + 400 || ex + ew < cx - 400) continue;
      }
      T.draw(ctx, e, W, t);
    }
  };

  // ---------- عناصر الديكور ----------
  R.drawDeco = function (ctx, W, t, cx, VW) {
    const D = W.def.deco || [];
    if (!W.decoCache) W.decoCache = [];
    for (let i = 0; i < D.length; i++) {
      const d = D[i];
      const x = d[1];
      if (x > cx + VW + 500 || x < cx - 600) continue;
      if (!W.decoCache[i]) W.decoCache[i] = makeDeco(d, i);
      const c = W.decoCache[i];
      if (!c) continue;
      ctx.save();
      ctx.translate(x, d[2]);
      if (c.sway) ctx.rotate(Math.sin(t * 0.8 + x * 0.01) * c.sway);
      ctx.fillStyle = c.col || '#090909'; ctx.strokeStyle = c.col || '#090909';
      if (c.fill) ctx.fill(c.fill);
      if (c.stroke) { ctx.lineWidth = c.lw || 2; ctx.lineCap = 'round'; ctx.stroke(c.stroke); }
      ctx.restore();
    }
  };

  function makeDeco(d, i) {
    if (typeof Path2D === 'undefined') return null;
    const type = d[0], h = d[3] || 400;
    const r = LT.rng((d[1] * 13 + i * 7) | 0);
    const f = new Path2D(), s = new Path2D();
    const out = { fill: f, stroke: s, col: '#0a0a0a' };
    switch (type) {
      case 'tree': {
        const w = d[4] || 16;
        f.moveTo(-w * 1.6, 2); f.quadraticCurveTo(-w * 0.7, -6, -w * 0.6, -40); f.lineTo(-w * 0.45, -h); f.lineTo(w * 0.45, -h); f.lineTo(w * 0.6, -40); f.quadraticCurveTo(w * 0.7, -6, w * 1.6, 2); f.closePath();
        for (let k = 0; k < 7; k++) {
          const by = -h * (0.3 + r() * 0.6), side = r() < 0.5 ? -1 : 1, bl = 40 + r() * 90;
          s.moveTo(0, by); s.quadraticCurveTo(side * bl * 0.5, by - bl * 0.1, side * bl, by - bl * (0.1 + r() * 0.5));
          s.moveTo(side * bl * 0.6, by - bl * 0.2); s.lineTo(side * bl * 0.75, by - bl * 0.55);
        }
        out.lw = Math.max(2, w * 0.25); out.sway = 0.004; out.col = '#0c0d0d';
        // رمز محفور
        if (d[5]) { s.moveTo(-4, -70); s.lineTo(4, -70); s.lineTo(-2, -58); }
        break;
      }
      case 'deadtree': {
        const w = d[4] || 12;
        f.moveTo(-w * 1.4, 2); f.lineTo(-w * 0.4, -h); f.lineTo(w * 0.3, -h - 10); f.lineTo(w * 1.4, 2); f.closePath();
        for (let k = 0; k < 5; k++) {
          const by = -h * (0.4 + r() * 0.6), side = r() < 0.5 ? -1 : 1, bl = 30 + r() * 70;
          s.moveTo(0, by); s.lineTo(side * bl * 0.6, by - bl * 0.6); s.lineTo(side * bl, by - bl * 0.5);
        }
        out.lw = 3; out.sway = 0.003; out.col = '#0b0c0c';
        break;
      }
      case 'bush': {
        for (let k = 0; k < 7; k++) { const bx = (r() - 0.5) * 50, br = 10 + r() * 16; f.moveTo(bx + br, -br * 0.5); f.arc(bx, -br * 0.5, br, 0, Math.PI * 2); }
        for (let k = 0; k < 10; k++) { const bx = (r() - 0.5) * 60; s.moveTo(bx, -10); s.lineTo(bx + (r() - 0.5) * 30, -30 - r() * 20); }
        out.lw = 1.2; out.sway = 0.02; out.col = '#080909';
        break;
      }
      case 'reeds': {
        for (let k = 0; k < 14; k++) { const bx = (r() - 0.5) * 70, hh = 40 + r() * 70; s.moveTo(bx, 4); s.quadraticCurveTo(bx + (r() - 0.5) * 10, -hh * 0.5, bx + (r() - 0.5) * 20, -hh); }
        out.lw = 1.6; out.sway = 0.03; out.col = '#080909';
        break;
      }
      case 'rocks': {
        for (let k = 0; k < 4; k++) { const bx = (r() - 0.5) * 60, br = 8 + r() * 14; f.moveTo(bx - br, 2); f.lineTo(bx - br * 0.6, -br); f.lineTo(bx + br * 0.4, -br * 1.1); f.lineTo(bx + br, 2); f.closePath(); }
        break;
      }
      case 'pipe': {
        const len = d[3] || 300, vert = d[4];
        if (vert) { f.rect(-8, -len, 16, len); for (let y = -len; y < 0; y += 80) f.rect(-11, y, 22, 6); }
        else { f.rect(0, -8, len, 16); for (let x = 0; x < len; x += 80) f.rect(x, -11, 6, 22); }
        break;
      }
      case 'chain': {
        const len = d[3] || 200;
        for (let y = 0; y < len; y += 10) { s.moveTo(-3, y); s.lineTo(3, y + 6); }
        out.lw = 2; out.sway = 0.02;
        break;
      }
      case 'sign': {
        f.rect(-2, -80, 4, 80); f.moveTo(-34, -96); f.lineTo(30, -90); f.lineTo(32, -60); f.lineTo(-30, -64); f.closePath();
        break;
      }
      case 'fence': {
        const len = d[3] || 200;
        for (let x = 0; x < len; x += 22) { f.moveTo(x, 0); f.lineTo(x + 2, -50 - r() * 16); f.lineTo(x + 5, 0); }
        f.rect(0, -36, len, 3); f.rect(0, -18, len, 3);
        break;
      }
      case 'window': {
        const ww = d[3] || 120, hh = d[4] || 160;
        f.rect(0, 0, ww, 6); f.rect(0, hh, ww, 6); f.rect(0, 0, 6, hh); f.rect(ww - 6, 0, 6, hh); f.rect(ww / 2 - 2, 0, 4, hh); f.rect(0, hh / 2, ww, 4);
        out.col = '#070707';
        break;
      }
      case 'beam': {
        const len = d[3] || 400;
        f.rect(0, -10, len, 20);
        for (let x = 0; x < len - 20; x += 40) { s.moveTo(x, -10); s.lineTo(x + 20, 10); s.lineTo(x + 40, -10); }
        out.lw = 2;
        break;
      }
      case 'car': {
        f.moveTo(-60, 0); f.lineTo(-58, -26); f.lineTo(-30, -30); f.lineTo(-14, -50); f.lineTo(28, -50); f.lineTo(44, -28); f.lineTo(62, -24); f.lineTo(62, 0); f.closePath();
        f.moveTo(-28, 0); f.arc(-36, 0, 10, 0, Math.PI * 2); f.moveTo(48, 0); f.arc(40, 0, 10, 0, Math.PI * 2);
        break;
      }
      case 'skel': {
        // هيكل بقايا لطفل سابق (سرد بيئي، دون دم)
        s.moveTo(-14, 0); s.lineTo(10, -2); s.moveTo(-6, -2); s.lineTo(-10, -12); s.moveTo(4, -2); s.lineTo(8, -10);
        f.moveTo(18, -4); f.arc(14, -4, 4, 0, Math.PI * 2);
        out.lw = 2; out.col = '#141414';
        break;
      }
      case 'console': {
        f.rect(-40, -60, 80, 60); f.moveTo(-40, -60); f.lineTo(-30, -80); f.lineTo(30, -80); f.lineTo(40, -60); f.closePath();
        break;
      }
      case 'tank': {
        f.rect(-30, -h, 60, h); f.moveTo(-30, -h); f.arc(0, -h, 30, Math.PI, 0);
        break;
      }
      default: return null;
    }
    return out;
  }

  // ---------- عناصر أمامية (خيالات قريبة من الكاميرا) ----------
  R.drawFg = function (ctx, W, t, cx, VW) {
    if (this.quality() === 'low') return;
    const fg = W.def.fg;
    if (!fg) return;
    const par = 1.18;
    ctx.save();
    for (let i = 0; i < fg.length; i++) {
      const f = fg[i];
      const sx = f[1] + (cx + VW / 2) * (1 - par) - (VW / 2) * (1 - par) * 0;
      const x = f[1] - (cx) * (par - 1);
      if (x < cx - 300 || x > cx + VW + 300) continue;
      ctx.fillStyle = '#000'; ctx.strokeStyle = '#000';
      const r = LT.rng(i * 101 + 7);
      if (f[0] === 'grass') {
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let k = 0; k < 18; k++) {
          const bx = x + (r() - 0.5) * 120, hh = 30 + r() * 70;
          const sw = Math.sin(t * 1.2 + k) * 5;
          ctx.moveTo(bx, f[2] + 20); ctx.quadraticCurveTo(bx + sw, f[2] - hh * 0.5, bx + sw * 2 + (r() - 0.5) * 20, f[2] - hh);
        }
        ctx.stroke();
      } else if (f[0] === 'branch') {
        ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(x - 200, f[2]); ctx.quadraticCurveTo(x, f[2] + 40 + Math.sin(t * 0.7) * 4, x + 160, f[2] + 90); ctx.stroke();
        ctx.lineWidth = 2;
        for (let k = 0; k < 6; k++) { const bx = x - 150 + k * 50; ctx.beginPath(); ctx.moveTo(bx, f[2] + 20 + k * 10); ctx.lineTo(bx + 10, f[2] + 60 + k * 12 + Math.sin(t + k) * 3); ctx.stroke(); }
      } else if (f[0] === 'pipe') {
        ctx.fillRect(x - 14, f[2], 28, 900);
      }
      void sx;
    }
    ctx.restore();
  };

  // ---------- الماء ----------
  R.drawWater = function (ctx, W, t) {
    for (const e of W.ents) {
      if (e.t !== 'water') continue;
      const top = e.cur, bot = e.y + e.h;
      if (bot - top < 1) continue;
      const g = ctx.createLinearGradient(0, top, 0, bot);
      g.addColorStop(0, 'rgba(18,22,22,0.78)'); g.addColorStop(0.15, 'rgba(8,10,10,0.9)'); g.addColorStop(1, 'rgba(2,3,3,0.97)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(e.x, bot);
      for (let x = e.x; x <= e.x + e.w; x += 10) ctx.lineTo(x, top + Math.sin(x * 0.05 + t * 2) * 1.2 + Math.sin(x * 0.013 - t * 1.3) * 1.5);
      ctx.lineTo(e.x + e.w, bot); ctx.closePath(); ctx.fill();
      // لمعان السطح
      ctx.strokeStyle = 'rgba(210,220,220,0.22)'; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = e.x; x <= e.x + e.w; x += 10) {
        const y = top + Math.sin(x * 0.05 + t * 2) * 1.2 + Math.sin(x * 0.013 - t * 1.3) * 1.5;
        if (x === e.x) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.fillStyle = 'rgba(230,235,235,0.12)';
      for (let k = 0; k < e.w / 60; k++) {
        const x = e.x + ((k * 73 + t * (12 + (e.flow || 0))) % e.w);
        ctx.fillRect(x, top + 3 + (k % 3) * 4, 10 + (k % 4) * 5, 1);
      }
    }
  };

  // ---------- الجزيئات ----------
  R.drawParticles = function (ctx, W, front) {
    const P = W.particles;
    for (const q of P) {
      const k = 1 - q.t / q.life;
      const isFront = q.k === 'smoke' || q.k === 'spark' || q.k === 'ring';
      if (isFront !== front) continue;
      switch (q.k) {
        case 'dust':
          ctx.fillStyle = 'rgba(200,200,195,' + (0.35 * k) + ')';
          ctx.beginPath(); ctx.arc(q.x, q.y, q.s * (1.5 - k * 0.5), 0, 7); ctx.fill(); break;
        case 'chip':
          ctx.fillStyle = '#0a0a0a';
          ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot); ctx.fillRect(-q.s, -q.s * 0.5, q.s * 2, q.s); ctx.restore(); break;
        case 'leaf':
          ctx.fillStyle = 'rgba(10,10,10,' + Math.min(1, k * 2) + ')';
          ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot); ctx.beginPath(); ctx.ellipse(0, 0, q.s, q.s * 0.4, 0, 0, 7); ctx.fill(); ctx.restore(); break;
        case 'splash':
          ctx.fillStyle = 'rgba(190,200,200,' + (0.6 * k) + ')';
          ctx.fillRect(q.x - 1, q.y - 1, q.s, q.s); break;
        case 'bubble':
          ctx.strokeStyle = 'rgba(200,210,210,' + (0.5 * k) + ')'; ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.arc(q.x, q.y, q.s, 0, 7); ctx.stroke(); break;
        case 'ring':
          ctx.strokeStyle = 'rgba(210,220,220,' + (0.35 * k) + ')'; ctx.lineWidth = 1;
          ctx.beginPath();
          if (q.wall) ctx.arc(q.x, q.y, q.s + (1 - k) * 40, 0, 7);
          else ctx.ellipse(q.x, q.y, q.s + (1 - k) * 40, (q.s + (1 - k) * 40) * 0.18, 0, 0, 7);
          ctx.stroke(); break;
        case 'spark':
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          ctx.strokeStyle = 'rgba(255,230,190,' + k + ')'; ctx.lineWidth = q.s;
          ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x - q.vx * 0.02, q.y - q.vy * 0.02); ctx.stroke(); ctx.restore(); break;
        case 'smoke':
          ctx.fillStyle = 'rgba(0,0,0,' + (0.55 * k) + ')';
          ctx.beginPath(); ctx.arc(q.x, q.y, q.s * (1.6 - k * 0.6), 0, 7); ctx.fill(); break;
        case 'shard':
          ctx.fillStyle = 'rgba(5,5,5,' + k + ')';
          ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot); ctx.beginPath(); ctx.moveTo(-q.s, 0); ctx.lineTo(0, -q.s * 1.5); ctx.lineTo(q.s, q.s * 0.5); ctx.fill(); ctx.restore(); break;
        case 'mote':
          ctx.fillStyle = 'rgba(235,235,225,' + (Math.sin(k * Math.PI) * 0.45) + ')';
          ctx.fillRect(q.x, q.y, q.s, q.s); break;
        case 'rain':
          ctx.strokeStyle = 'rgba(200,210,210,0.18)'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x - 3, q.y + 14); ctx.stroke(); break;
      }
    }
  };

  // جزيئات الأجواء (غبار، أوراق، أبواغ، رماد، مطر)
  R.ambient = function (W, dt) {
    const th = this.theme;
    const q = this.quality();
    const mult = q === 'low' ? 0.4 : q === 'high' ? 1.4 : 1;
    const cam = W.cam, VW = this.viewW, VH = LT.C.VIEW_H;
    const rate = (th.motes === 'rain' ? 60 : 9) * mult;
    let n = rate * dt;
    while (n > 0) {
      if (Math.random() < n) {
        const x = cam.x + Math.random() * (VW + 200) - 100, y = cam.y + Math.random() * VH;
        if (th.motes === 'rain') W.spawn({ k: 'rain', x: x + 60, y: cam.y - 20, vx: -120, vy: 700, life: 1, s: 1 });
        else if (th.motes === 'ash') W.spawn({ k: 'mote', x: x, y: y, vx: 10 + Math.random() * 10, vy: 15 + Math.random() * 15, life: 4, s: 1.6 });
        else if (th.motes === 'spore') W.spawn({ k: 'mote', x: x, y: y, vx: Math.random() * 6 - 3, vy: -6 - Math.random() * 6, life: 5, s: 1.3 });
        else W.spawn({ k: 'mote', x: x, y: y, vx: 6 + Math.random() * 8, vy: Math.random() * 6 - 3, life: 4, s: 1.4 });
      }
      n -= 1;
    }
    if (th.leaves && Math.random() < dt * 1.2 * mult) {
      W.spawn({ k: 'leaf', x: cam.x + Math.random() * VW, y: cam.y - 10, vx: 30 + Math.random() * 30, vy: 40 + Math.random() * 30, life: 6, s: 3 + Math.random() * 2, g: 0, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 4 });
    }
    if (W.def.drips && Math.random() < dt * 1.5) {
      W.spawn({ k: 'splash', x: cam.x + Math.random() * VW, y: cam.y + 10, vx: 0, vy: 50, g: 900, life: 0.9, s: 1.6 });
    }
  };

  // ---------- طبقة الإضاءة للأماكن المظلمة ----------
  R.drawLighting = function (ctx, W, cx, cy) {
    const lc = this.lightCtx, cv = this.lightCv;
    const k = cv.height / LT.C.VIEW_H;
    lc.setTransform(1, 0, 0, 1, 0, 0);
    lc.globalCompositeOperation = 'source-over';
    lc.clearRect(0, 0, cv.width, cv.height);
    lc.fillStyle = 'rgba(0,0,0,' + (W.def.dark || 0.9) + ')';
    lc.fillRect(0, 0, cv.width, cv.height);
    lc.globalCompositeOperation = 'destination-out';
    for (const l of W.lights()) {
      const x = (l.x - cx) * k, y = (l.y - cy) * k, r = l.r * k;
      if (x < -r || x > cv.width + r || y < -r || y > cv.height + r) continue;
      const g = lc.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(0,0,0,' + LT.clamp(l.k || 1, 0, 1) + ')');
      g.addColorStop(0.5, 'rgba(0,0,0,' + LT.clamp((l.k || 1) * 0.6, 0, 1) + ')');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      lc.fillStyle = g;
      lc.beginPath(); lc.arc(x, y, r, 0, 7); lc.fill();
    }
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(cv, 0, 0, this.canvas.width, this.canvas.height);
    ctx.restore();
  };

  // ---------- ما بعد المعالجة والنصوص ----------
  R.post = function (G, ctx, t) {
    const VW = this.viewW, VH = LT.C.VIEW_H;
    const th = this.theme;
    const q = this.quality();
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);

    if (G.world && G.world.flash > 0) { ctx.fillStyle = 'rgba(235,240,255,' + (G.world.flash * 0.5) + ')'; ctx.fillRect(0, 0, VW, VH); }
    // تظليل الأطراف
    ctx.drawImage(this.vigCv, 0, 0, VW, VH);
    // توتر المطاردة يغمق الحواف
    if (G.tension > 0.05) {
      const g = ctx.createLinearGradient(0, 0, VW * 0.4, 0);
      g.addColorStop(0, 'rgba(0,0,0,' + (G.tension * 0.6) + ')'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, VW * 0.4, VH);
    }
    // الحبيبات
    if (q !== 'low') {
      ctx.save();
      ctx.globalAlpha = th.grain;
      ctx.globalCompositeOperation = 'overlay';
      const ox = Math.random() * 128, oy = Math.random() * 128;
      const pat = ctx.createPattern(this.grainTile, 'repeat');
      ctx.translate(-ox, -oy);
      ctx.fillStyle = pat; ctx.fillRect(0, 0, VW + 128, VH + 128);
      ctx.restore();
    }
    // أشرطة سينمائية
    if (G.letter > 0.001) {
      const h = VH * 0.11 * LT.ease(G.letter);
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VW, h); ctx.fillRect(0, VH - h, VW, h);
    }
    // التلاشي
    if (G.fade > 0.001) { ctx.fillStyle = 'rgba(0,0,0,' + G.fade + ')'; ctx.fillRect(0, 0, VW, VH); }
    if (G.whiteFade > 0.001) { ctx.fillStyle = 'rgba(240,240,236,' + G.whiteFade + ')'; ctx.fillRect(0, 0, VW, VH); }
    // النصوص
    for (const tx of G.texts) {
      const a = tx.alpha;
      if (a <= 0.01) continue;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = tx.color || '#e8e6e1';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const font = LT.lang === 'ar' ? '"Noto Naskh Arabic","Amiri","Traditional Arabic","Segoe UI",Tahoma,serif' : 'Georgia,"Times New Roman",serif';
      ctx.font = (tx.weight || '400') + ' ' + (tx.size || 22) + 'px ' + font;
      if (tx.spacing && 'letterSpacing' in ctx) ctx.letterSpacing = tx.spacing + 'px';
      ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 8;
      const lines = String(tx.s).split('\n');
      const lh = (tx.size || 22) * 1.5;
      lines.forEach((ln, i) => ctx.fillText(ln, VW / 2, (tx.y || VH / 2) + (i - (lines.length - 1) / 2) * lh));
      ctx.restore();
    }
    // إشعار الحفظ
    if (G.saveNote > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, G.saveNote) * 0.7;
      ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1.5;
      const x = VW - 34, y = 34, a = t * 4;
      ctx.beginPath(); ctx.arc(x, y, 8, a, a + 4.5); ctx.stroke();
      ctx.fillStyle = '#ddd'; ctx.font = '12px sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillText(LT.t('saved'), x - 16, y);
      ctx.restore();
    }
  };
})(window.LT);
