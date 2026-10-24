/* =========================================================
   i18n.js : النصوص بالعربية والإنجليزية
   ========================================================= */
(function (LT) {
  'use strict';

  const S = {
    ar: {
      title: 'آخر أثر',
      subtitle: 'THE LAST TRACE',
      continue: 'متابعة اللعب',
      newgame: 'لعبة جديدة',
      chapters: 'اختيار الفصل',
      settings: 'الإعدادات',
      language: 'English',
      about: 'معلومات اللعبة',
      back: 'رجوع',
      resume: 'متابعة',
      restartCp: 'العودة لآخر نقطة حفظ',
      restartCh: 'إعادة الفصل',
      mainmenu: 'القائمة الرئيسية',
      paused: 'إيقاف مؤقت',
      locked: 'مقفل',
      chapter: 'الفصل',
      confirmNew: 'سيتم حذف تقدمك الحالي. هل تريد بدء لعبة جديدة؟',
      confirmReset: 'هل تريد حذف كل التقدم المحفوظ؟ لا يمكن التراجع.',
      yes: 'نعم', no: 'لا', done: 'تم',
      master: 'الصوت العام',
      music: 'الموسيقى',
      sfx: 'المؤثرات',
      quality: 'جودة الرسومات',
      qLow: 'منخفضة', qMed: 'متوسطة', qHigh: 'عالية',
      btnSize: 'حجم الأزرار',
      btnOpacity: 'شفافية الأزرار',
      editLayout: 'تخصيص أماكن الأزرار',
      editHelp: 'اسحب الأزرار إلى المكان المناسب لك، ثم اضغط «تم».',
      resetLayout: 'الوضع الافتراضي',
      powerSave: 'توفير الطاقة (30 إطارًا)',
      hints: 'تلميحات التحكم',
      shake: 'اهتزاز الكاميرا',
      showFps: 'عرض عدد الإطارات (FPS)',
      lang: 'اللغة',
      resetProgress: 'حذف التقدم',
      on: 'تشغيل', off: 'إيقاف',
      saved: 'تم الحفظ',
      rotate: 'أدر الهاتف بالوضع الأفقي',
      tapToStart: 'المس الشاشة للبدء',
      cluesFound: 'الآثار المكتشفة',
      aboutText:
        'آخر أثر — لعبة مغامرات وألغاز ثنائية الأبعاد بأجواء سينمائية مظلمة.\n' +
        'كل الرسومات مرسومة بالكود، وكل الأصوات مولّدة برمجيًا داخل اللعبة، فلا توجد أصول خارجية تحتاج تراخيص.\n\n' +
        'التحكم بلوحة المفاتيح: الأسهم أو A/D للحركة، المسافة أو W للقفز، E أو J للتفاعل والإمساك، S للانحناء، Esc للإيقاف.\n' +
        'على الهاتف: أزرار اليسار واليمين والقفز والتفاعل. اضغط مطولًا على زر التفاعل بجانب صندوق لسحبه.',
      ending1: 'لم يكن الظل يطاردني.',
      ending2: 'كان آخر ما تبقّى من آدم الحقيقي… يحاول إيقافي.',
      ending3: 'لأن كل نسخة تصل إلى هنا… توقظ التي بعدها.',
      ending4: 'الوعاء ٠٨: بدء الإيقاظ',
      tobe: 'يتبع…',
      thanks: 'شكرًا للعب',
      ch: ['', 'الغابة الميتة', 'المستنقع', 'المصنع المهجور', 'الأنفاق', 'المدينة الغارقة', 'المنشأة السرية'],
      chNum: ['', 'الفصل الأول', 'الفصل الثاني', 'الفصل الثالث', 'الفصل الرابع', 'الفصل الخامس', 'الفصل السادس'],
      clue: {
        c1: 'رمز محفور في لحاء الشجرة: ٠٧',
        c2: 'رسمة طفل: أب، وأم، وطفلان… أحدهما مشطوب.',
        c3: 'لافتة صدئة: «مشروع أثر — الدخول ممنوع»',
        c4: 'سوار مستشفى صغير: «آدم — نسخة ٠٦»',
        c5: 'بيان شحنة: «أوعية حفظ × ٨ — مقاس طفل»',
        c6: 'مذكرة ممزقة: «الظل يظهر مع كل نسخة. إنه لا يصطاد… إنه يمنع.»',
        c7: 'آثار أقدام صغيرة في الغبار… كثيرة، وكلها بمقاسي.',
        c8: 'صورة عائلية مبللة. الطفل فيها يشبهني تمامًا.',
        c9: 'سجل: «الأصل: آدم. توفي في الحادث. النسخ تعود دائمًا إلى المنشأة.»',
        c10: 'شاشة مضيئة: «النسخة ٠٧: في الطريق. جهّزوا ٠٨.»'
      }
    },
    en: {
      title: 'THE LAST TRACE',
      subtitle: 'آخر أثر',
      continue: 'Continue',
      newgame: 'New Game',
      chapters: 'Chapters',
      settings: 'Settings',
      language: 'العربية',
      about: 'About',
      back: 'Back',
      resume: 'Resume',
      restartCp: 'Last Checkpoint',
      restartCh: 'Restart Chapter',
      mainmenu: 'Main Menu',
      paused: 'Paused',
      locked: 'Locked',
      chapter: 'Chapter',
      confirmNew: 'Your current progress will be lost. Start a new game?',
      confirmReset: 'Delete all saved progress? This cannot be undone.',
      yes: 'Yes', no: 'No', done: 'Done',
      master: 'Master Volume',
      music: 'Music',
      sfx: 'Effects',
      quality: 'Graphics Quality',
      qLow: 'Low', qMed: 'Medium', qHigh: 'High',
      btnSize: 'Button Size',
      btnOpacity: 'Button Opacity',
      editLayout: 'Customize Button Layout',
      editHelp: 'Drag the buttons where you like, then press “Done”.',
      resetLayout: 'Default Layout',
      powerSave: 'Power Saving (30 FPS)',
      hints: 'Control Hints',
      shake: 'Camera Shake',
      showFps: 'Show FPS',
      lang: 'Language',
      resetProgress: 'Delete Progress',
      on: 'On', off: 'Off',
      saved: 'Saved',
      rotate: 'Rotate your phone to landscape',
      tapToStart: 'Tap to start',
      cluesFound: 'Traces found',
      aboutText:
        'The Last Trace — a dark, cinematic 2D puzzle-adventure.\n' +
        'All art is drawn in code and all sounds are synthesized in the game, so there are no external assets needing licenses.\n\n' +
        'Keyboard: Arrows or A/D to move, Space or W to jump, E or J to interact and grab, S to crouch, Esc to pause.\n' +
        'Phone: left, right, jump and interact buttons. Hold interact next to a box to pull it.',
      ending1: 'The shadow was never hunting me.',
      ending2: 'It was the last trace of the real Adam… trying to stop me.',
      ending3: 'Because every copy that arrives here… wakes the next one.',
      ending4: 'POD 08: AWAKENING',
      tobe: 'To be continued…',
      thanks: 'Thank you for playing',
      ch: ['', 'The Dead Forest', 'The Swamp', 'The Abandoned Factory', 'The Tunnels', 'The Drowned City', 'The Secret Facility'],
      chNum: ['', 'Chapter One', 'Chapter Two', 'Chapter Three', 'Chapter Four', 'Chapter Five', 'Chapter Six'],
      clue: {
        c1: 'A symbol carved into the bark: 07',
        c2: 'A child’s drawing: father, mother, two children… one scratched out.',
        c3: 'A rusted sign: “PROJECT TRACE — NO ENTRY”',
        c4: 'A tiny hospital band: “ADAM — COPY 06”',
        c5: 'Shipping manifest: “Preservation pods × 8 — child size”',
        c6: 'A torn note: “The shadow appears with every copy. It does not hunt… it prevents.”',
        c7: 'Small footprints in the dust… many of them, all my size.',
        c8: 'A soaked family photo. The child in it looks exactly like me.',
        c9: 'Log: “Original: Adam. Died in the accident. Copies always return to the facility.”',
        c10: 'A glowing screen: “COPY 07: EN ROUTE. PREPARE 08.”'
      }
    }
  };

  LT.lang = 'ar';
  LT.setLang = function (l) {
    LT.lang = (l === 'en') ? 'en' : 'ar';
    document.documentElement.lang = LT.lang;
    document.documentElement.dir = LT.lang === 'ar' ? 'rtl' : 'ltr';
  };
  LT.t = function (key) {
    const d = S[LT.lang];
    return (d && d[key] !== undefined) ? d[key] : (S.en[key] !== undefined ? S.en[key] : key);
  };
  LT.clueText = function (id) { return S[LT.lang].clue[id] || id; };
  LT.CLUE_COUNT = 10;
})(window.LT);
