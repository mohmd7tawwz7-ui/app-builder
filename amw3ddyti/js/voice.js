/* =========================================================
   voice.js : صوت آدم والصوت الذي في رأسه
   ثلاثة أوضاع (من الإعدادات):
   - speech : كلام حقيقي بصوت الجهاز (عربي أو إنكليزي حسب اللغة)
              وإن لم يجد الجهاز صوتًا مناسبًا يتحول تلقائيًا إلى الهمهمة
   - murmur : همهمة غامضة بلا كلمات (مثل ألعاب الظل)
   - off    : بدون صوت
   'a' = آدم (صوت طفل)   'e' = الصوت في رأسه (عميق مع صدى)
   ========================================================= */
(function (LT) {
  'use strict';

  const V = LT.Voice = {
    voices: [],
    speakingUntil: 0,
    utter: null,
    nodes: []
  };

  const SS = window.speechSynthesis || null;

  function loadVoices() {
    if (!SS) return;
    try { V.voices = SS.getVoices() || []; } catch (e) { V.voices = []; }
  }
  if (SS) {
    loadVoices();
    try { SS.addEventListener ? SS.addEventListener('voiceschanged', loadVoices) : (SS.onvoiceschanged = loadVoices); } catch (e) { /* تجاهل */ }
  }

  function mode() {
    const s = LT.Save && LT.Save.data && LT.Save.data.settings;
    return (s && s.voice) || 'speech';
  }
  function volume() {
    const s = LT.Save.data.settings;
    return Math.max(0, Math.min(1, (s.master === undefined ? 1 : s.master) * (s.sfx === undefined ? 1 : s.sfx)));
  }

  // اختيار صوت الجهاز المناسب للغة
  V.pickVoice = function (lang) {
    if (!V.voices.length) loadVoices();
    const list = V.voices.filter(function (v) { return v.lang && v.lang.toLowerCase().indexOf(lang) === 0; });
    if (!list.length) return null;
    const local = list.filter(function (v) { return v.localService; });
    return (local[0] || list[0]);
  };

  V.hasSpeech = function () {
    return !!(SS && window.SpeechSynthesisUtterance && V.pickVoice(LT.lang === 'ar' ? 'ar' : 'en'));
  };

  V.busy = function () { return performance.now() < V.speakingUntil; };

  // يُرجع المدة التقريبية بالثواني (0 إذا لا يوجد صوت)
  V.say = function (who, text) {
    const m = mode();
    if (m === 'off' || !text) return 0;
    if (m === 'speech' && V.hasSpeech()) return V.speak(who, text);
    return V.murmur(who, text);
  };

  // ---------- كلام حقيقي ----------
  V.speak = function (who, text) {
    const lang = LT.lang === 'ar' ? 'ar' : 'en';
    const voice = V.pickVoice(lang);
    try { SS.cancel(); } catch (e) { /* تجاهل */ }
    const u = new SpeechSynthesisUtterance(text.replace(/[«»"]/g, ''));
    u.voice = voice;
    u.lang = voice.lang;
    if (who === 'e') { u.pitch = 0.45; u.rate = 0.82; u.volume = volume() * 0.85; }
    else { u.pitch = 1.55; u.rate = 0.95; u.volume = volume(); }
    const est = 0.6 + text.length * (lang === 'ar' ? 0.085 : 0.07) / u.rate;
    V.speakingUntil = performance.now() + est * 1000 * 1.5;
    u.onend = u.onerror = function () { if (V.utter === u) { V.speakingUntil = performance.now(); V.utter = null; } };
    V.utter = u;
    try { SS.speak(u); } catch (e) { V.speakingUntil = 0; return V.murmur(who, text); }
    // نفَس خافت مع صدى للصوت الذي في الرأس
    if (who === 'e') V.breath(est);
    return est;
  };

  // ---------- همهمة بلا كلمات ----------
  const VOWELS = [[730, 1090], [530, 1840], [270, 2290], [570, 840], [300, 870], [660, 1720]];
  V.murmur = function (who, text) {
    const A = LT.Audio;
    if (!A || !A.ready || !A.ctx) return 0;
    const c = A.ctx;
    const deep = who === 'e';
    const words = text.split(/\s+/).filter(Boolean);
    const sylls = Math.max(2, Math.min(26, Math.round(text.replace(/\s/g, '').length / (deep ? 3.4 : 2.8))));
    const base = deep ? 92 : 255;
    const sylLen = deep ? 0.17 : 0.12;
    let t = c.currentTime + 0.05;
    const start = t;
    const out = c.createGain();
    out.gain.value = (deep ? 0.55 : 0.42);
    out.connect(A.sfx);
    V.cur = out;
    if (deep) { const r = c.createGain(); r.gain.value = 1.1; out.connect(r); r.connect(A.revIn); }
    const perWord = Math.max(1, Math.round(sylls / Math.max(1, words.length)));
    for (let i = 0; i < sylls; i++) {
      const v = VOWELS[(Math.random() * VOWELS.length) | 0];
      const d = sylLen * (0.75 + Math.random() * 0.6);
      const last = i === sylls - 1;
      const p0 = base * (1 + (Math.random() - 0.5) * 0.18) * (last ? 0.9 : 1);
      // المصدر: موجة منشارية = حبال صوتية
      const o = c.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(p0, t);
      o.frequency.linearRampToValueAtTime(p0 * (last ? 0.82 : (0.95 + Math.random() * 0.12)), t + d);
      // مرشحا الحروف (الفورمانت)
      const f1 = c.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = v[0] * (deep ? 0.8 : 1.15); f1.Q.value = 6;
      const f2 = c.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = v[1] * (deep ? 0.8 : 1.15); f2.Q.value = 9;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(1, t + 0.025);
      g.gain.setValueAtTime(1, t + d * 0.6);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(f1); o.connect(f2); f1.connect(g); f2.connect(g); g.connect(out);
      o.start(t); o.stop(t + d + 0.02);
      // حرف ساكن قصير أحيانًا
      if (Math.random() < 0.55 && A.noiseBuf) {
        const n = c.createBufferSource(); n.buffer = A.noiseBuf;
        n.playbackRate.value = 1;
        const hf = c.createBiquadFilter(); hf.type = 'bandpass'; hf.frequency.value = 2500 + Math.random() * 3000; hf.Q.value = 1.2;
        const ng = c.createGain();
        ng.gain.setValueAtTime(deep ? 0.12 : 0.18, t);
        ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
        n.connect(hf); hf.connect(ng); ng.connect(out);
        n.start(t, Math.random()); n.stop(t + 0.05);
      }
      t += d + 0.015;
      if ((i + 1) % perWord === 0) t += deep ? 0.12 : 0.08; // فاصل بين الكلمات
    }
    const dur = t - start;
    V.speakingUntil = performance.now() + dur * 1000;
    setTimeout(function () { try { out.disconnect(); } catch (e) { /* تجاهل */ } }, (dur + 3) * 1000);
    if (deep) V.breath(dur);
    return dur;
  };

  // نفَس منخفض يرافق الصوت الذي في الرأس
  V.breath = function (dur) {
    const A = LT.Audio;
    if (!A || !A.ready || !A.brownBuf) return;
    const c = A.ctx, t = c.currentTime;
    const n = c.createBufferSource(); n.buffer = A.brownBuf; n.loop = true;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.09, t + 0.5);
    g.gain.setValueAtTime(0.09, t + Math.max(0.6, dur - 0.3));
    g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.6);
    n.connect(f); f.connect(g); g.connect(A.sfx); g.connect(A.revIn);
    n.start(t); n.stop(t + dur + 0.7);
  };

  V.stop = function () {
    V.speakingUntil = 0;
    V.utter = null;
    if (V.cur) { try { V.cur.disconnect(); } catch (e) { /* تجاهل */ } V.cur = null; }
    if (SS) { try { SS.cancel(); } catch (e) { /* تجاهل */ } }
  };
})(window.LT);
