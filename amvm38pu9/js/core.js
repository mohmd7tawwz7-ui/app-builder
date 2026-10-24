/* =========================================================
   آخر أثر — THE LAST TRACE
   core.js : مساحة الأسماء والثوابت والأدوات العامة
   ========================================================= */
window.LT = window.LT || {};
(function (LT) {
  'use strict';

  LT.VERSION = '1.0.0';

  // ثوابت الفيزياء والحركة (وحدات منطقية: بكسل منطقي / ثانية)
  LT.C = {
    G: 2000,          // الجاذبية
    MAXFALL: 1400,    // أقصى سرعة سقوط
    FALL_KILL: 1240,  // سرعة الاصطدام القاتلة (سقوط من ارتفاع ~ 390)
    PW: 22,           // عرض الشخصية
    PH: 50,           // طول الشخصية واقفًا
    PCH: 28,          // طول الشخصية منحنيًا
    WALK: 115,        // سرعة المشي
    RUN: 230,         // سرعة الجري
    CRAWL: 68,        // سرعة الزحف
    JUMP: 660,        // سرعة القفز الابتدائية (ارتفاع ≈ 109)
    STAMINA: 5,       // ثواني السباحة قبل الإنهاك
    VIEW_H: 540,      // الارتفاع المنطقي للشاشة
    STEP: 1 / 120     // خطوة الفيزياء الثابتة
  };

  LT.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  LT.lerp = function (a, b, t) { return a + (b - a) * t; };
  LT.approach = function (v, t, s) { return v < t ? Math.min(t, v + s) : Math.max(t, v - s); };
  LT.ease = function (t) { t = LT.clamp(t, 0, 1); return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };
  LT.overlap = function (a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  };
  LT.dist = function (ax, ay, bx, by) { const dx = ax - bx, dy = ay - by; return Math.sqrt(dx * dx + dy * dy); };

  // مولد أرقام عشوائية ثابت البذرة (لتوليد الرسومات بنفس الشكل دائمًا)
  LT.rng = function (seed) {
    let s = (seed >>> 0) || 1;
    return function () {
      s ^= s << 13; s >>>= 0;
      s ^= s >>> 17;
      s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  };

  LT.clone = function (o) { return JSON.parse(JSON.stringify(o)); };

  LT.isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
})(window.LT);
