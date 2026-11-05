/* =========================================================
   platform.js : التكامل مع موقع CrazyGames (اختياري)
   - إذا لم يوجد SDK الموقع (مثل نسخة الـ APK) لا يفعل شيئًا
   - على CrazyGames: تهيئة SDK، أحداث بدء/إيقاف اللعب،
     الحفظ عبر Data Module، لغة المستخدم، منع ملء الشاشة المخصص
   ========================================================= */
(function (LT) {
  'use strict';

  const P = LT.Platform = { cg: false, env: 'none', sdk: null, playing: false };

  function sdk() { return (window.CrazyGames && window.CrazyGames.SDK) || null; }

  // تهيئة (تنتظر SDK بحد أقصى 4 ثوانٍ حتى لا تتعطل اللعبة)
  P.init = function () {
    const S = sdk();
    if (!S) return Promise.resolve(false);
    const timeout = new Promise(function (res) { setTimeout(function () { res('timeout'); }, 4000); });
    return Promise.race([S.init().then(function () { return 'ok'; }), timeout]).then(function (r) {
      if (r !== 'ok') return false;
      P.sdk = S;
      P.env = S.environment;
      P.cg = (P.env === 'crazygames' || P.env === 'local');
      if (P.cg) { try { S.game.loadingStart(); } catch (e) { } }
      return P.cg;
    }).catch(function () { return false; });
  };

  // لغة المستخدم من الموقع (والإنجليزية افتراضيًا)
  P.lang = function () {
    let loc = '';
    try {
      const si = P.sdk && P.sdk.user && P.sdk.user.systemInfo;
      loc = (si && (si.locale || si.language)) || '';
    } catch (e) { }
    if (!loc) loc = navigator.language || 'en';
    return String(loc).toLowerCase().indexOf('ar') === 0 ? 'ar' : 'en';
  };

  // مكان الحفظ: Data Module على الموقع، وإلا localStorage
  P.storage = function () {
    if (P.cg && P.sdk && P.sdk.data) {
      return {
        getItem: function (k) { try { return P.sdk.data.getItem(k); } catch (e) { return P.local().getItem(k); } },
        setItem: function (k, v) { try { P.sdk.data.setItem(k, v); } catch (e) { P.local().setItem(k, v); } }
      };
    }
    return P.local();
  };
  P.local = function () {
    try { if (window.localStorage) return window.localStorage; } catch (e) { }
    const mem = {};
    return { getItem: function (k) { return mem[k] === undefined ? null : mem[k]; }, setItem: function (k, v) { mem[k] = String(v); } };
  };

  P.loadingStop = function () { if (P.cg) { try { P.sdk.game.loadingStop(); } catch (e) { } } };
  P.happy = function () { if (P.cg) { try { P.sdk.game.happytime(); } catch (e) { } } };

  // يُستدعى كل إطار: يرسل gameplayStart / gameplayStop عند تغيّر الحالة
  P.tick = function (G) {
    if (!P.cg) return;
    const now = !!G.world && (G.state === 'play' || G.state === 'cine');
    if (now === P.playing) return;
    P.playing = now;
    try { if (now) P.sdk.game.gameplayStart(); else P.sdk.game.gameplayStop(); } catch (e) { }
  };
})(window.LT);
