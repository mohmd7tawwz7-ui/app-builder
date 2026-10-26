/* =========================================================
   story2.js : قصة الجزء الثاني — آدم ٠٨
   الحوار الداخلي: 'a' = آدم ٠٨ ، 'e' = الصوت في رأسه (أثر آدم ٠٧)
   كل سطر: [المتحدث, العربية, English]
   ========================================================= */
(function (LT) {
  'use strict';

  LT.STORY = {
    thoughts: {
      // ---------- 1. الاستيقاظ ----------
      t1a: [['a', 'أين... أنا؟', 'Where... am I?'],
            ['e', 'استيقظتَ أخيرًا.', 'You’re finally awake.'],
            ['a', 'من قال هذا؟', 'Who said that?']],
      t1b: [['e', 'الجسد يتذكر ما نسيه العقل. اندفع.', 'The body remembers what the mind forgot. Dash.']],
      t1c: [['a', 'سبعة أوعية فارغة... وأنا الثامن.', 'Seven empty pods... and I’m the eighth.'],
            ['e', 'لستَ أول من يستيقظ هنا.', 'You’re not the first to wake up here.']],
      t1d: [['a', 'إن كان أحدهم قد سبقني... فأين هو الآن؟', 'If someone came before me... where is he now?'],
            ['e', 'أقرب مما تظن.', 'Closer than you think.']],
      // ---------- 2. ممرات بلا نهاية ----------
      t2a: [['a', 'هذه الرموز... أعرفها.', 'These symbols... I know them.'],
            ['e', 'لأنني رسمتُها قبلك.', 'Because I drew them before you.']],
      t2b: [['a', 'من أنت؟', 'Who are you?'],
            ['e', 'آخر ما تبقّى من السابع.', 'What’s left of the seventh.']],
      t2c: [['e', 'لا تثق بالأبواب المفتوحة. كل شيء هنا صُمّم ليعيدك.', 'Don’t trust open doors. Everything here was built to bring you back.']],
      // ---------- 3. أحواض الحمض ----------
      t3a: [['a', 'هذا ليس ماءً.', 'That isn’t water.'],
            ['e', 'لا تلمسه. أنا لمستُه مرة.', 'Don’t touch it. I did, once.']],
      t3b: [['a', 'لماذا يملؤون المكان بالحمض؟', 'Why fill this place with acid?'],
            ['e', 'ليُذيبوا ما لا يحتاجونه... النسخ الفاشلة.', 'To dissolve what they don’t need... the failed copies.']],
      t3c: [['a', 'هل كنتَ فاشلًا؟', 'Were you a failure?'],
            ['e', 'وصلتُ إلى النهاية. هذا هو الفشل عندهم.', 'I reached the end. To them, that’s failure.']],
      // ---------- 4. البيت الزجاجي ----------
      t4a: [['a', 'نباتات ميتة خلف الزجاج... كأنها تنتظر.', 'Dead plants behind glass... as if waiting.']],
      t4b: [['e', 'كل شيء هنا محفوظ تحت الزجاج. حتى نحن.', 'Everything here is kept under glass. Even us.']],
      t4c: [['a', 'إن كسرتُ الزجاج... هل أتحرر؟', 'If I break the glass... am I free?'],
            ['e', 'جرّب.', 'Try.']],
      // ---------- 5. المصهر ----------
      t5a: [['a', 'يصنعون شيئًا هنا.', 'They’re making something here.'],
            ['e', 'أوعية. لكل نسخة وعاء.', 'Pods. One for every copy.']],
      t5b: [['a', 'كم نسخة صنعوا؟', 'How many copies did they make?'],
            ['e', 'يكفي أن تعرف أنك لن تكون الأخير... إلا إذا أردت.', 'Enough to know you won’t be the last... unless you want to be.']],
      t5c: [['a', 'سأكون الأخير.', 'I’ll be the last.']],
      // ---------- 6. الأرشيف ----------
      t6a: [['a', 'ملفات... كلها باسم آدم.', 'Files... all of them named Adam.']],
      t6b: [['e', 'اقرأ الملف الأول. الأصل.', 'Read the first file. The original.']],
      t6c: [['a', 'مات في الحادث... ثم أعادوه. مرة بعد مرة.', 'He died in the accident... and they brought him back. Again and again.'],
            ['e', 'أمه لم تتوقف عن المحاولة.', 'His mother never stopped trying.']],
      // ---------- 7. الأنفاس المعدنية ----------
      t7a: [['a', 'الهواء يدفعني للأعلى... كأنه يريد إخراجي.', 'The air pushes me up... as if it wants me out.']],
      t7b: [['e', 'الظل الذي طاردني... كان يحاول إخراجي أيضًا.', 'The shadow that chased me... was trying to get me out too.']],
      t7c: [['a', 'والآن؟ أين الظل؟', 'And now? Where is the shadow?'],
            ['e', 'ينتظرك. في المصدر.', 'Waiting for you. At the source.']],
      // ---------- 8. الانهيار ----------
      t8a: [['e', 'لقد عرفوا أنك استيقظت. اركض!', 'They know you’re awake. Run!']],
      t8b: [['a', 'إنهم يُغرقون كل شيء!', 'They’re flooding everything!'],
            ['e', 'لا تتوقف. لا تنظر للخلف.', 'Don’t stop. Don’t look back.']],
      t8c: [['a', '...نجوت.', '...I made it.'],
            ['e', 'هذه المرة.', 'This time.']],
      // ---------- 9. محطة الضخ ----------
      t9a: [['a', 'من هنا يأتي الحمض.', 'This is where the acid comes from.']],
      t9b: [['e', 'إن أوقفتَ المضخات، تتوقف الدورة... لوقت قصير.', 'Stop the pumps and the cycle stops... for a while.']],
      t9c: [['a', 'وقت قصير يكفيني.', 'A while is enough.']],
      // ---------- 10. مدينة الصدى ----------
      t10a: [['a', 'مدينة! كان هناك عالم خارج المنشأة.', 'A city! There was a world outside.']],
      t10b: [['e', 'هذا بيته. كان يمشي في هذا الشارع إلى المدرسة.', 'This was his home. He walked this street to school.']],
      t10c: [['a', 'أتذكره... لكنها ليست ذكرياتي.', 'I remember it... but they aren’t my memories.'],
             ['e', 'ولا ذكرياتي أنا أيضًا.', 'Not mine either.']],
      // ---------- 11. الغابة المحترقة ----------
      t11a: [['a', 'الغابة... محترقة.', 'The forest... burned.']],
      t11b: [['e', 'هنا استيقظتُ أنا. كانت حية حينها.', 'This is where I woke. It was alive then.']],
      t11c: [['a', 'من أحرقها؟', 'Who burned it?'],
             ['e', 'هم. حتى لا تستيقظ نسخة أخرى في الطريق الخطأ.', 'They did. So no copy wakes on the wrong path again.']],
      // ---------- 12. المرصد ----------
      t12a: [['a', 'نجوم... لم أرَ النجوم من قبل.', 'Stars... I’ve never seen stars.']],
      t12b: [['e', 'كان يحب النجوم. لهذا بنوا المرصد.', 'He loved the stars. That’s why they built this place.']],
      t12c: [['a', 'بنوا كل هذا... لطفل واحد؟', 'They built all this... for one child?'],
             ['e', 'الحب يبني أشياء غريبة.', 'Love builds strange things.']],
      // ---------- 13. قاعة الحراس ----------
      t13a: [['a', 'الحراس ينظرون إليّ كأنني آلة معطلة.', 'The guards look at me like a broken machine.']],
      t13b: [['e', 'بالنسبة لهم، أنت كذلك.', 'To them, you are.']],
      t13c: [['a', 'لستُ آلة. أنا خائف.', 'I’m not a machine. I’m afraid.'],
             ['e', 'الخوف هو الشيء الوحيد الذي لم يستطيعوا نسخه.', 'Fear is the one thing they couldn’t copy.']],
      // ---------- 14. القلب ----------
      t14a: [['a', 'هذا قلب المنشأة.', 'This is the heart of the facility.']],
      t14b: [['e', 'إن توقف، تتوقف كل الأوعية. لن تستيقظ نسخة بعدك.', 'If it stops, every pod stops. No copy wakes after you.']],
      t14c: [['a', 'وأنت؟ ماذا يحدث لك؟', 'And you? What happens to you?'],
             ['e', 'أنا مجرد أثر. والآثار تختفي.', 'I’m only a trace. Traces fade.']],
      // ---------- 15. المصدر ----------
      t15a: [['a', 'الظل...', 'The shadow...']],
      t15b: [['e', 'ليس عدوك. لم يكن كذلك أبدًا.', 'He isn’t your enemy. He never was.']],
      t15c: [['a', 'أنت... آدم الحقيقي؟', 'You’re... the real Adam?'],
             ['e', 'ما تبقّى منه. الجزء الذي لم يُرِد أن يُعاد.', 'What’s left of him. The part that never wanted to come back.']],
      // تلميحات تُقال عند تعلّم شيء جديد
      hintDash: [['e', 'اضغط زر الاندفاع. ثم انتظر... يحتاج ثانيتين ليعود.', 'Press dash. Then wait... it needs two seconds to return.']],
      hintGlass: [['e', 'الزجاج لا يصمد أمام اندفاعة... ولا أمام شيء ثقيل يسقط عليه.', 'Glass can’t stand a dash... or something heavy falling on it.']],
      hintSym: [['e', 'الرموز مرسومة في مكان ما. ابحث، ثم أدِر الأقراص.', 'The symbols are drawn somewhere. Look, then turn the dials.']],
      hintPieces: [['e', 'الآلة ناقصة. القطع المضيئة... اجمعها.', 'The machine is incomplete. The glowing pieces... collect them.']]
    },

    clues: {
      c1: ['لوحة الوعاء ٠٨: «تاريخ الإيقاظ: اليوم»', 'Pod 08 plate: “Awakening date: today”'],
      c2: ['رسم بالطباشير لطفل يمسك يد ظل.', 'A chalk drawing of a child holding a shadow’s hand.'],
      c3: ['قارورة مكسورة: «محلول التفكيك — للنسخ المرفوضة»', 'A broken flask: “Dissolution fluid — for rejected copies”'],
      c4: ['زهرة مجففة داخل كتاب: «لآدم، من أمه»', 'A dried flower in a book: “For Adam, from Mom”'],
      c5: ['قالب وعاء فارغ محفور عليه: ٠٩', 'An empty pod mold engraved: 09'],
      c6: ['ملف: «آدم — الأصل. الحالة: متوفى. الطلب: إعادة»', 'File: “Adam — Original. Status: deceased. Request: restore”'],
      c7: ['خدوش صغيرة على الجدار: سبعة خطوط.', 'Small scratches on the wall: seven lines.'],
      c8: ['شارة مختبر محترقة: «د. سلمى»', 'A burned lab badge: “Dr. Salma”'],
      c9: ['سجل: «إيقاف المضخات يعطّل الإيقاظ التلقائي»', 'Log: “Stopping the pumps disables automatic awakening”'],
      c10: ['حقيبة مدرسية صغيرة عليها اسم آدم.', 'A small school bag with Adam’s name on it.'],
      c11: ['شجرة محفور عليها: «٠٧ — هنا بدأتُ»', 'A tree carved: “07 — I started here”'],
      c12: ['تلسكوب موجّه نحو نجمة واحدة. ملاحظة: «نجمته»', 'A telescope aimed at one star. Note: “his star”'],
      c13: ['رأس حارس معطّل، عدسته ما زالت تنظر نحو الباب.', 'A broken guard’s head, its lens still facing the door.'],
      c14: ['رسالة صوتية مكتوبة: «سامحني يا آدم. لم أستطع الوداع»', 'Transcribed voice note: “Forgive me, Adam. I couldn’t say goodbye”'],
      c15: ['صورة عائلية، جافة هذه المرة. الطفل فيها يبتسم.', 'A family photo, dry this time. The child is smiling.']
    }
  };
})(window.LT);
