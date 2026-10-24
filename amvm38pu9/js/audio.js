/* =========================================================
   audio.js : كل الأصوات مولّدة برمجيًا (Web Audio API)
   لا توجد ملفات صوتية خارجية => لا حاجة لتراخيص
   ========================================================= */
(function (LT) {
  'use strict';

  const A = LT.Audio = {
    ctx: null, ready: false,
    theme: null, musicMode: 'calm', tension: 0,
    _noteT: 4, _ambT: 1, _pulseT: 0, _beatT: 0, _breathT: 0,
    buzzLevel: 0, flowLevel: 0, scrapeT: 0, camX: 0, viewW: 960
  };

  A.init = function () {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const c = this.ctx = new AC();

    this.out = c.createDynamicsCompressor();
    this.out.connect(c.destination);
    this.master = c.createGain(); this.master.connect(this.out);
    this.sfx = c.createGain(); this.sfx.connect(this.master);
    this.music = c.createGain(); this.music.connect(this.master);
    this.amb = c.createGain(); this.amb.connect(this.master);

    // صدى (Reverb) مولد
    this.rev = c.createConvolver();
    this.rev.buffer = this.impulse(2.6, 2.4);
    this.revIn = c.createGain(); this.revIn.gain.value = 1;
    this.revIn.connect(this.rev);
    this.revOut = c.createGain(); this.revOut.gain.value = 0.32;
    this.rev.connect(this.revOut); this.revOut.connect(this.master);

    // ضجيج أبيض
    const len = c.sampleRate * 2;
    const nb = c.createBuffer(1, len, c.sampleRate);
    const d = nb.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = nb;
    // ضجيج بني (أنعم للرياح والماء)
    const bb = c.createBuffer(1, len, c.sampleRate);
    const bd = bb.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; bd[i] = last * 3.5; }
    this.brownBuf = bb;

    this.buildLoops();
    this.ready = true;
    this.applyVolumes();
    if (this._pendingTheme) this.setTheme(this._pendingTheme);
  };

  A.impulse = function (sec, decay) {
    const c = this.ctx, rate = c.sampleRate, len = Math.floor(rate * sec);
    const b = c.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return b;
  };

  A.applyVolumes = function () {
    if (!this.ready) return;
    const s = LT.Save.data.settings;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(s.master, t, 0.05);
    this.sfx.gain.setTargetAtTime(s.sfx, t, 0.05);
    this.amb.gain.setTargetAtTime(s.sfx * 0.9, t, 0.05);
    this.music.gain.setTargetAtTime(s.music, t, 0.05);
  };

  A.suspend = function () { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend(); };
  A.resume = function () { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); };

  // ---------- أدوات بناء الأصوات ----------
  function panNode(c, pan) {
    if (c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = LT.clamp(pan || 0, -1, 1); return p; }
    return c.createGain();
  }

  // صوت ضجيج مُرشَّح بغلاف زمني
  A.noise = function (o) {
    if (!this.ready) return;
    const c = this.ctx, t = c.currentTime + (o.delay || 0);
    const src = c.createBufferSource();
    src.buffer = o.brown ? this.brownBuf : this.noiseBuf;
    src.playbackRate.value = o.rate || 1;
    const f = c.createBiquadFilter();
    f.type = o.type || 'bandpass';
    f.frequency.setValueAtTime(o.f || 1000, t);
    if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t + (o.d || 0.2));
    f.Q.value = o.q || 1;
    const g = c.createGain();
    const a = o.a || 0.005, dur = o.d || 0.2, v = (o.v || 0.2) * (o.vol === undefined ? 1 : o.vol);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dur);
    const p = panNode(c, o.pan);
    src.connect(f); f.connect(g); g.connect(p); p.connect(o.dest || this.sfx);
    if (o.rev) { const rg = c.createGain(); rg.gain.value = o.rev; g.connect(rg); rg.connect(this.revIn); }
    src.start(t, Math.random() * 1.5); src.stop(t + a + dur + 0.05);
  };

  // نغمة مذبذب بغلاف زمني
  A.tone = function (o) {
    if (!this.ready) return;
    const c = this.ctx, t = c.currentTime + (o.delay || 0);
    const osc = c.createOscillator();
    osc.type = o.w || 'sine';
    osc.frequency.setValueAtTime(o.f || 440, t);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t + (o.d || 0.2));
    if (o.det) osc.detune.value = o.det;
    const g = c.createGain();
    const a = o.a || 0.005, dur = o.d || 0.2, v = (o.v || 0.2) * (o.vol === undefined ? 1 : o.vol);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dur);
    let node = osc;
    if (o.lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; osc.connect(f); node = f; }
    const p = panNode(c, o.pan);
    node.connect(g); g.connect(p); p.connect(o.dest || this.sfx);
    if (o.rev) { const rg = c.createGain(); rg.gain.value = o.rev; g.connect(rg); rg.connect(this.revIn); }
    osc.start(t); osc.stop(t + a + dur + 0.05);
  };

  // حلقات مستمرة: الرياح، الماء، الطنين الكهربائي، الدرون الموسيقي
  A.buildLoops = function () {
    const c = this.ctx;
    const mkLoop = (buf, type, f, q, dest) => {
      const s = c.createBufferSource(); s.buffer = buf; s.loop = true;
      const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
      const g = c.createGain(); g.gain.value = 0;
      s.connect(fl); fl.connect(g); g.connect(dest); s.start();
      return { src: s, f: fl, g: g };
    };
    this.wind = mkLoop(this.brownBuf, 'bandpass', 420, 0.7, this.amb);
    this.wind2 = mkLoop(this.noiseBuf, 'bandpass', 1800, 4, this.amb);
    this.water = mkLoop(this.brownBuf, 'lowpass', 700, 0.5, this.amb);
    this.flow = mkLoop(this.noiseBuf, 'lowpass', 900, 0.5, this.sfx);

    // طنين كهربائي
    const bo = c.createOscillator(); bo.type = 'sawtooth'; bo.frequency.value = 100;
    const bo2 = c.createOscillator(); bo2.type = 'square'; bo2.frequency.value = 50.5;
    const bf = c.createBiquadFilter(); bf.type = 'bandpass'; bf.frequency.value = 900; bf.Q.value = 2;
    const bg = c.createGain(); bg.gain.value = 0;
    bo.connect(bf); bo2.connect(bf); bf.connect(bg); bg.connect(this.sfx); bo.start(); bo2.start();
    this.buzz = { g: bg };

    // همهمة آلات/مختبر
    const ho = c.createOscillator(); ho.type = 'sine'; ho.frequency.value = 55;
    const ho2 = c.createOscillator(); ho2.type = 'triangle'; ho2.frequency.value = 110.4;
    const hg = c.createGain(); hg.gain.value = 0;
    ho.connect(hg); ho2.connect(hg); hg.connect(this.amb); ho.start(); ho2.start();
    this.hum = { g: hg };

    // درون موسيقي هادئ
    const d1 = c.createOscillator(); d1.type = 'sawtooth'; d1.frequency.value = 55;
    const d2 = c.createOscillator(); d2.type = 'sawtooth'; d2.frequency.value = 55.35;
    const d3 = c.createOscillator(); d3.type = 'sine'; d3.frequency.value = 82.4;
    const df = c.createBiquadFilter(); df.type = 'lowpass'; df.frequency.value = 160; df.Q.value = 3;
    const lfo = c.createOscillator(); lfo.frequency.value = 0.06;
    const lg = c.createGain(); lg.gain.value = 70; lfo.connect(lg); lg.connect(df.frequency); lfo.start();
    const dg = c.createGain(); dg.gain.value = 0;
    d1.connect(df); d2.connect(df); d3.connect(df); df.connect(dg); dg.connect(this.music);
    d1.start(); d2.start(); d3.start();
    this.drone = { g: dg, f: df };

    // وتر متوتر (للمطاردة)
    this.tens = mkLoop(this.noiseBuf, 'bandpass', 2600, 25, this.music);
  };

  // ---------- تحديد مكان الصوت حسب الكاميرا ----------
  A.pos = function (x) {
    if (x === undefined || x === null) return { pan: 0, vol: 1 };
    const cx = this.camX + this.viewW / 2;
    const d = (x - cx) / (this.viewW * 0.6);
    return { pan: LT.clamp(d * 0.8, -0.9, 0.9), vol: LT.clamp(1.25 - Math.abs(d) * 0.55, 0, 1) };
  };

  // ---------- مكتبة المؤثرات ----------
  A.play = function (name, x, opt) {
    if (!this.ready) return;
    opt = opt || {};
    const P = this.pos(x);
    const pan = P.pan, vol = P.vol * (opt.v || 1);
    if (!(vol > 0.01) || !isFinite(pan)) return;
    if (opt.k !== undefined && !isFinite(opt.k)) opt.k = 1;
    const r = Math.random;
    switch (name) {
      case 'step': {
        const m = opt.mat || 'dirt';
        if (m === 'metal') {
          this.noise({ f: 2600 + r() * 600, q: 6, d: 0.05, v: 0.09, pan, vol });
          this.tone({ f: 700 + r() * 200, d: 0.08, v: 0.025, w: 'triangle', pan, vol });
        } else if (m === 'wood') {
          this.noise({ f: 900 + r() * 200, q: 2, d: 0.05, v: 0.12, pan, vol });
          this.tone({ f: 140, f2: 90, d: 0.06, v: 0.06, pan, vol });
        } else if (m === 'water') {
          this.noise({ type: 'lowpass', f: 1300, d: 0.14, v: 0.12, pan, vol });
        } else if (m === 'stone') {
          this.noise({ f: 1300 + r() * 400, q: 1.5, d: 0.04, v: 0.12, pan, vol, rev: 0.4 });
        } else {
          this.noise({ f: 420 + r() * 220, q: 1.2, d: 0.06, v: 0.16, pan, vol });
        }
        break;
      }
      case 'jump':
        this.noise({ f: 700, q: 1, d: 0.07, v: 0.1, pan, vol });
        this.noise({ type: 'highpass', f: 2500, d: 0.12, v: 0.025, a: 0.02, pan, vol });
        break;
      case 'land':
        this.noise({ type: 'lowpass', f: 500, d: 0.14, v: 0.25 * (opt.k || 1), pan, vol });
        this.tone({ f: 90, f2: 45, d: 0.12, v: 0.12 * (opt.k || 1), pan, vol });
        break;
      case 'grab':
        this.noise({ f: 1500, q: 2, d: 0.05, v: 0.08, pan, vol });
        break;
      case 'climb':
        this.noise({ f: 600, q: 1, d: 0.25, v: 0.07, a: 0.05, pan, vol });
        this.noise({ type: 'highpass', f: 2200, d: 0.3, v: 0.03, a: 0.1, pan, vol });
        break;
      case 'scrape':
        if (opt.mat === 'metal') this.noise({ f: 1700 + r() * 300, q: 5, d: 0.1, v: 0.06, pan, vol });
        else this.noise({ f: 320 + r() * 160, q: 1.5, d: 0.1, v: 0.1, pan, vol });
        break;
      case 'thud':
        this.tone({ f: 110, f2: 38, d: 0.35, v: 0.35 * (opt.k || 1), pan, vol });
        this.noise({ type: 'lowpass', f: 380, d: 0.3, v: 0.3 * (opt.k || 1), pan, vol, rev: 0.3 });
        break;
      case 'clank':
        this.tone({ f: 190, d: 0.05, v: 0.12, w: 'square', lp: 1500, pan, vol });
        this.noise({ f: 2500, q: 3, d: 0.08, v: 0.15, pan, vol });
        this.tone({ f: 920, d: 0.4, v: 0.03, w: 'triangle', pan, vol, rev: 0.6 });
        break;
      case 'plate':
        this.tone({ f: 160, f2: 100, d: 0.18, v: 0.2, w: 'triangle', pan, vol });
        this.noise({ f: 1800, q: 3, d: 0.06, v: 0.1, pan, vol });
        break;
      case 'door':
        this.noise({ type: 'lowpass', f: 240, d: 0.12, v: 0.22, pan, vol });
        this.tone({ f: 48 + r() * 6, d: 0.12, v: 0.06, w: 'sawtooth', lp: 300, pan, vol });
        break;
      case 'creak':
        this.tone({ f: 150 + r() * 40, f2: 110, d: 0.35, v: 0.05, w: 'sawtooth', lp: 900, a: 0.05, pan, vol });
        break;
      case 'rope':
        this.tone({ f: 170, f2: 120, d: 0.3, v: 0.05, w: 'sawtooth', lp: 700, a: 0.03, pan, vol });
        this.noise({ f: 900, q: 2, d: 0.25, v: 0.06, a: 0.04, pan, vol });
        break;
      case 'crack':
        this.noise({ type: 'highpass', f: 1500, d: 0.12, v: 0.4, pan, vol, rev: 0.4 });
        this.noise({ f: 300, q: 1, d: 0.3, v: 0.2, pan, vol });
        break;
      case 'treefall':
        this.noise({ type: 'lowpass', f: 300, d: 1.0, v: 0.35, a: 0.05, pan, vol, rev: 0.6 });
        this.tone({ f: 70, f2: 30, d: 0.9, v: 0.4, pan, vol });
        break;
      case 'splash':
        this.noise({ type: 'lowpass', f: 1800, f2: 400, d: 0.45, v: 0.32 * (opt.k || 1), pan, vol });
        for (let i = 0; i < 4; i++) this.tone({ f: 300 + r() * 500, f2: 900 + r() * 600, d: 0.06, v: 0.04, delay: 0.05 + r() * 0.3, pan, vol });
        break;
      case 'swim':
        this.noise({ type: 'lowpass', f: 900, d: 0.22, v: 0.1, a: 0.04, pan, vol });
        break;
      case 'bubble':
        this.tone({ f: 350 + r() * 300, f2: 900 + r() * 400, d: 0.07, v: 0.05, pan, vol });
        break;
      case 'drip':
        this.tone({ f: 1500 + r() * 600, f2: 700, d: 0.07, v: 0.05, pan, vol, rev: 0.9 });
        break;
      case 'zap':
        this.noise({ type: 'highpass', f: 2500, d: 0.35, v: 0.35, pan, vol });
        this.tone({ f: 70, d: 0.4, v: 0.25, w: 'sawtooth', pan, vol });
        this.tone({ f: 1200, f2: 300, d: 0.3, v: 0.08, w: 'square', lp: 3000, pan, vol });
        break;
      case 'spark':
        this.noise({ type: 'highpass', f: 4000, d: 0.04, v: 0.08, pan, vol });
        break;
      case 'slam':
        this.tone({ f: 80, f2: 30, d: 0.4, v: 0.45, pan, vol });
        this.noise({ f: 1200, q: 1, d: 0.2, v: 0.3, pan, vol, rev: 0.5 });
        this.tone({ f: 420, d: 0.5, v: 0.04, w: 'triangle', pan, vol, rev: 0.6 });
        break;
      case 'servo':
        this.tone({ f: 260, f2: 360, d: 0.3, v: 0.04, w: 'sawtooth', lp: 1200, a: 0.05, pan, vol });
        break;
      case 'alarm':
        for (let i = 0; i < 2; i++) this.tone({ f: 880, d: 0.08, v: 0.08, w: 'square', lp: 2500, delay: i * 0.14, pan, vol });
        break;
      case 'robotdie':
        this.noise({ type: 'lowpass', f: 900, d: 0.8, v: 0.35, pan, vol, rev: 0.5 });
        this.tone({ f: 400, f2: 40, d: 0.9, v: 0.15, w: 'sawtooth', lp: 1500, pan, vol });
        break;
      case 'growl':
        this.tone({ f: 48, f2: 38, d: 0.9, v: 0.25, w: 'sawtooth', lp: 220, a: 0.15, pan, vol });
        this.noise({ type: 'lowpass', f: 260, d: 0.8, v: 0.2, a: 0.2, pan, vol });
        break;
      case 'tick':
        this.noise({ type: 'highpass', f: 5000, d: 0.012, v: 0.18, pan, vol, rev: 0.3 });
        break;
      case 'knock':
        this.tone({ f: opt.hollow ? 180 : 120, f2: 80, d: 0.12, v: 0.25, w: 'triangle', pan, vol, rev: opt.hollow ? 0.8 : 0.1 });
        this.noise({ f: opt.hollow ? 700 : 400, q: 2, d: 0.06, v: 0.15, pan, vol });
        break;
      case 'rumble':
        this.noise({ type: 'lowpass', f: 160, d: 1.6, v: 0.4, a: 0.2, brown: true, pan, vol, rev: 0.5 });
        break;
      case 'chain':
        for (let i = 0; i < 5; i++) this.noise({ f: 3000 + r() * 1500, q: 8, d: 0.05, v: 0.08, delay: i * 0.05, pan, vol });
        break;
      case 'clue':
        this.tone({ f: 659, d: 1.6, v: 0.06, rev: 1, pan });
        this.tone({ f: 988, d: 1.8, v: 0.04, delay: 0.12, rev: 1, pan });
        this.tone({ f: 1318, d: 2, v: 0.025, delay: 0.24, rev: 1, pan });
        break;
      case 'save':
        this.tone({ f: 220, d: 1.4, v: 0.035, rev: 1, a: 0.1 });
        this.tone({ f: 330, d: 1.4, v: 0.025, rev: 1, a: 0.2 });
        break;
      case 'death':
        this.tone({ f: 60, f2: 28, d: 1.2, v: 0.45 });
        this.noise({ type: 'lowpass', f: 700, f2: 120, d: 1, v: 0.3, rev: 0.8 });
        this.tone({ f: 233, d: 1.6, v: 0.05, w: 'triangle', rev: 1, delay: 0.1 });
        this.tone({ f: 247, d: 1.6, v: 0.04, w: 'triangle', rev: 1, delay: 0.1 });
        break;
      case 'shadow':
        this.noise({ f: 2400, q: 4, d: 1.4, v: 0.12, a: 0.4, rev: 1, pan, vol });
        this.tone({ f: 41, d: 2, v: 0.3, w: 'sawtooth', lp: 160, a: 0.3, pan, vol });
        break;
      case 'sting':
        this.tone({ f: 110, d: 2.5, v: 0.2, w: 'sawtooth', lp: 600, rev: 1 });
        this.tone({ f: 116.5, d: 2.5, v: 0.15, w: 'sawtooth', lp: 600, rev: 1 });
        this.noise({ f: 3000, q: 10, d: 2, v: 0.08, a: 0.5, rev: 1 });
        break;
      case 'heart':
        this.tone({ f: 58, f2: 40, d: 0.12, v: 0.3 * (opt.v || 1), dest: this.music });
        this.tone({ f: 52, f2: 36, d: 0.12, v: 0.22 * (opt.v || 1), delay: 0.2, dest: this.music });
        break;
      case 'breath':
        this.noise({ f: 1100, q: 0.7, d: 0.45, v: 0.05 * (opt.v || 1), a: 0.25 });
        break;
      case 'ui':
        this.tone({ f: 520, d: 0.06, v: 0.05, w: 'triangle' });
        break;
      case 'whoosh':
        this.noise({ f: 400, f2: 2500, q: 1.5, d: 0.6, v: 0.12, a: 0.2, rev: 0.6 });
        break;
      case 'pod':
        this.tone({ f: 82, d: 4, v: 0.25, w: 'sawtooth', lp: 400, a: 1, rev: 1 });
        this.tone({ f: 123, d: 4, v: 0.15, w: 'sawtooth', lp: 500, a: 1.5, rev: 1 });
        this.noise({ f: 5000, q: 20, d: 3, v: 0.04, a: 1, rev: 1 });
        break;
    }
  };

  // ---------- الأجواء حسب الفصل ----------
  A.setTheme = function (th) {
    if (!this.ready) { this._pendingTheme = th; return; }
    this.theme = th;
    const t = this.ctx.currentTime;
    const W = { forest: 0.16, swamp: 0.1, factory: 0.06, tunnel: 0.04, city: 0.08, lab: 0.02, menu: 0.12 }[th] || 0.1;
    const Wt = { forest: 0.012, swamp: 0.008, factory: 0.006, tunnel: 0.003, city: 0.01, lab: 0, menu: 0.01 }[th] || 0.006;
    const Wa = { swamp: 0.12, city: 0.14, tunnel: 0.03 }[th] || 0;
    const H = { factory: 0.05, lab: 0.06, tunnel: 0.015 }[th] || 0;
    this.wind.g.gain.setTargetAtTime(W, t, 1.5);
    this.wind2.g.gain.setTargetAtTime(Wt, t, 1.5);
    this.water.g.gain.setTargetAtTime(Wa, t, 1.5);
    this.hum.g.gain.setTargetAtTime(H, t, 1.5);
    this.revOut.gain.setTargetAtTime(th === 'tunnel' || th === 'lab' ? 0.5 : 0.3, t, 0.5);
  };

  A.setMusic = function (mode) { this.musicMode = mode; };

  // تحديث كل إطار: أصوات عشوائية للأجواء + موسيقى + توتر
  A.update = function (dt, game) {
    if (!this.ready) return;
    const c = this.ctx, t = c.currentTime;
    const r = Math.random;

    // تموج الرياح
    this._ambT -= dt;
    if (this._ambT <= 0) {
      this._ambT = 0.8 + r() * 1.5;
      this.wind.f.frequency.setTargetAtTime(250 + r() * 500, t, 1.2);
      this.wind2.f.frequency.setTargetAtTime(1200 + r() * 1600, t, 1.0);
      const th = this.theme;
      const x = this.camX + this.viewW * (r() * 1.6 - 0.3);
      if (th === 'swamp' && r() < 0.5) {
        const f = 90 + r() * 60;
        for (let i = 0; i < 3; i++) this.tone({ f: f, f2: f * 0.8, d: 0.07, v: 0.05, w: 'square', lp: 400, delay: i * 0.12, pan: (r() - 0.5) * 1.6, rev: 0.3 });
      } else if (th === 'factory' && r() < 0.35) {
        this.play('clank', x, { v: 0.35 });
      } else if ((th === 'tunnel' || th === 'city') && r() < 0.6) {
        this.play('drip', x, { v: 0.7 });
      } else if (th === 'forest' && r() < 0.25) {
        this.play('creak', x, { v: 0.5 });
      } else if (th === 'lab' && r() < 0.3) {
        this.tone({ f: 1760, d: 0.05, v: 0.025, w: 'square', lp: 4000, pan: (r() - 0.5) });
      }
    }

    // الطنين الكهربائي وتدفق الماء حسب القرب
    this.buzz.g.gain.setTargetAtTime(this.buzzLevel * 0.06, t, 0.05);
    this.flow.g.gain.setTargetAtTime(this.flowLevel * 0.12, t, 0.2);
    this.buzzLevel = 0; this.flowLevel = 0;

    // الموسيقى
    const mode = this.musicMode;
    const tens = this.tension;
    const droneV = mode === 'none' ? 0 : (mode === 'chase' ? 0.16 : (mode === 'end' ? 0.12 : 0.07));
    this.drone.g.gain.setTargetAtTime(droneV, t, mode === 'chase' ? 0.3 : 2.5);
    this.drone.f.frequency.setTargetAtTime(mode === 'chase' ? 420 : 160, t, 0.8);
    this.tens.g.gain.setTargetAtTime(mode === 'chase' ? 0.025 + tens * 0.03 : 0, t, 0.5);

    if (mode === 'calm' || mode === 'dark' || mode === 'end') {
      this._noteT -= dt;
      if (this._noteT <= 0) {
        this._noteT = 6 + r() * 9;
        const scale = mode === 'end' ? [220, 261.6, 329.6, 392, 440] : [110, 130.8, 164.8, 196, 220, 146.8];
        const f = scale[(r() * scale.length) | 0];
        this.tone({ f: f, d: 3.5, v: 0.05, a: 0.01, rev: 1.2, dest: this.music });
        if (r() < 0.5) this.tone({ f: f * 1.5, d: 3, v: 0.025, delay: 0.6 + r(), rev: 1.2, dest: this.music });
      }
    }
    if (mode === 'chase') {
      this._pulseT -= dt;
      if (this._pulseT <= 0) {
        this._pulseT = 0.52 - tens * 0.18;
        this.tone({ f: 62, f2: 34, d: 0.25, v: 0.35, dest: this.music });
        this.noise({ type: 'lowpass', f: 300, d: 0.12, v: 0.1, dest: this.music });
      }
    }
    // نبض القلب والتنفس عند التوتر
    if (tens > 0.05) {
      this._beatT -= dt;
      if (this._beatT <= 0) { this._beatT = 0.95 - tens * 0.4; this.play('heart', null, { v: 0.4 + tens * 0.6 }); }
      this._breathT -= dt;
      if (this._breathT <= 0) { this._breathT = 0.7 + (1 - tens) * 0.8; this.play('breath', null, { v: 0.5 + tens }); }
    }
  };
})(window.LT);
