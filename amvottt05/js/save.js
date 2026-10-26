/* =========================================================
   save.js : حفظ التقدم والإعدادات (LocalStorage)
   - يحتوي رقم إصدار + دالة ترحيل حتى لا تُحذف البيانات عند التحديث
   ========================================================= */
(function (LT) {
  'use strict';

  const KEY = 'lasttrace2_save';
  const VER = 1;

  function defaults() {
    return {
      v: VER,
      unlocked: 1,        // آخر فصل مفتوح
      current: null,      // { ch: رقم الفصل, snap: حالة آخر نقطة حفظ }
      clues: [],          // الآثار المكتشفة
      completed: false,
      layout: null,       // أماكن أزرار اللمس
      settings: {
        lang: 'ar',
        master: 0.9,
        music: 0.7,
        sfx: 0.9,
        quality: 'medium',
        btnSize: 1,
        btnOpacity: 0.5,
        powerSave: false,
        hints: true,
        shake: true,
        showFps: false
      }
    };
  }

  const Save = LT.Save = {
    data: null,

    load: function () {
      let d = null;
      const st = LT.Platform ? LT.Platform.storage() : localStorage;
      try {
        let raw = st.getItem(KEY);
        // نقل حفظ قديم من المتصفح إلى حفظ الموقع (أول مرة فقط)
        if (!raw && LT.Platform && LT.Platform.cg) { raw = LT.Platform.local().getItem(KEY); if (raw) st.setItem(KEY, raw); }
        if (raw) d = JSON.parse(raw);
      } catch (e) { d = null; }
      this.fresh = !d;
      this.data = this.migrate(d);
      return this.data;
    },

    // ترحيل البيانات القديمة إلى الإصدار الحالي دون فقدانها
    migrate: function (d) {
      const def = defaults();
      if (!d || typeof d !== 'object') return def;
      const out = Object.assign(def, d);
      out.settings = Object.assign(defaults().settings, d.settings || {});
      if (!Array.isArray(out.clues)) out.clues = [];
      out.unlocked = Math.max(1, Math.min(15, out.unlocked | 0));
      out.v = VER;
      return out;
    },

    write: function () {
      try { (LT.Platform ? LT.Platform.storage() : localStorage).setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* التخزين ممتلئ أو غير متاح */ }
    },

    setCurrent: function (ch, snap) {
      this.data.current = { ch: ch, snap: snap };
      if (ch > this.data.unlocked) this.data.unlocked = ch;
      this.write();
    },

    addClue: function (id) {
      if (this.data.clues.indexOf(id) < 0) { this.data.clues.push(id); this.write(); }
    },

    resetProgress: function () {
      const s = this.data.settings, l = this.data.layout;
      this.data = defaults();
      this.data.settings = s;
      this.data.layout = l;
      this.write();
    }
  };
})(window.LT);
