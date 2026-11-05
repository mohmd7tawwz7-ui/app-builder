/* =========================================================
   main.js : نقطة البداية
   ========================================================= */
(function (LT) {
  'use strict';

  function boot() {
    // ننتظر SDK الموقع (إن وجد) ثم نبدأ
    LT.Platform.init().then(boot2, boot2);
  }

  function boot2() {
    const P = LT.Platform;
    LT.Save.load();
    // على CrazyGames: أول مرة نستخدم لغة المستخدم (العربية أو الإنجليزية)
    if (P.cg && LT.Save.fresh) { LT.Save.data.settings.lang = P.lang(); LT.Save.write(); }
    LT.setLang(LT.Save.data.settings.lang);
    LT.Render.init(document.getElementById('game'));
    LT.Input.init();
    LT.UI.init();
    LT.Game.init();

    // الصوت يحتاج لمسة من المستخدم أولًا (سياسة المتصفحات)
    const start = document.getElementById('start');
    start.querySelector('.st-title').textContent = LT.t('title');
    start.querySelector('.st-tap').textContent = LT.t('tapToStart');
    document.getElementById('rotate-text').textContent = LT.t('rotate');
    // أي لمسة/نقرة تفعّل الصوت أو تستأنفه (ضروري على iOS)
    ['pointerdown', 'touchend', 'click', 'keydown'].forEach(function (ev) {
      window.addEventListener(ev, function () { if (LT.Game.state !== 'pause') LT.Audio.init(); }, { passive: true });
    });

    if (P.cg) {
      // على الموقع: ندخل القائمة مباشرة بدون شاشة "المس للبدء"
      LT.Audio.setTheme('menu');
      start.style.display = 'none';
      LT.Game.fade = 1; LT.Game.fadeTo(0, 1.2);
      LT.UI.show('main');
      P.loadingStop();
    }
    start.addEventListener('click', function () {
      LT.Audio.init();
      LT.Audio.setTheme('menu');
      tryFullscreen();
      start.style.display = 'none';
      LT.Game.fade = 1; LT.Game.fadeTo(0, 1.5);
      LT.UI.show('main');
    });

    // وضع التصحيح: أضف ?debug=1 للرابط
    if (/debug=1/.test(location.search)) {
      window.addEventListener('keydown', function (e) {
        const G = LT.Game;
        if (!G.world) return;
        if (e.code === 'KeyN') G.nextChapter();
        if (e.code === 'KeyG') { G.godMode = !G.godMode; console.log('god', G.godMode); }
        if (e.code === 'KeyT') { G.world.player.x += 400; }
      });
    }
  }

  function tryFullscreen() {
    const d = document.documentElement;
    if (!LT.isTouch) return;
    if (LT.Platform.cg || window.self !== window.top) return;   // الموقع يوفّر ملء الشاشة بنفسه
    const req = d.requestFullscreen || d.webkitRequestFullscreen;
    if (req) {
      try {
        const r = req.call(d);
        if (r && r.then) r.then(function () {
          if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(function () { });
        }).catch(function () { });
      } catch (e) { /* غير مدعوم */ }
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  // تسجيل Service Worker للعمل دون إنترنت (عند التشغيل عبر http/https فقط)
  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0 && window.self === window.top && !window.CrazyGames) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () { }); });
  }
})(window.LT);
