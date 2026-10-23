// =========================================================
//   القوالب الجاهزة — مستندات وجداول
// =========================================================

/* ---------- صورة شخصية مؤقتة (تُستبدل بصورتك) ---------- */
var PHOTO_PH = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 110 130">' +
  '<rect width="110" height="130" fill="#e6ebf5"/>' +
  '<circle cx="55" cy="50" r="24" fill="#aab6cf"/>' +
  '<path d="M12 130c3-30 21-44 43-44s40 14 43 44z" fill="#aab6cf"/>' +
  '<circle cx="88" cy="22" r="14" fill="#2563eb"/>' +
  '<path d="M81 22h14M88 15v14" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>');

/* ---------- تنسيقات مشتركة ---------- */
var S = {
  h2: function(c){ return 'font-size:19px;font-weight:bold;color:' + c + ';border-bottom:2px solid ' + c + ';padding-bottom:5px;margin:22px 0 10px'; },
  cell: 'border:1px solid #cbd5e1;padding:8px;text-align:right',
  head: function(c){ return 'border:1px solid ' + c + ';padding:8px;background:' + c + ';color:#ffffff;font-weight:bold;text-align:center'; },
  muted: 'color:#64748b;font-size:14px'
};
function row(cells, style){
  return '<tr>' + cells.map(function(c){ return '<td style="' + style + '">' + c + '</td>'; }).join('') + '</tr>';
}
function dataTable(color, head, rows, extra){
  return '<table data-head="1" style="width:100%;border-collapse:collapse;margin:10px 0">' +
    row(head, S.head(color)) + rows.map(function(r){ return row(r, S.cell); }).join('') + (extra || '') + '</table>';
}

/* =========================================================
   قوالب المستندات
   ========================================================= */
var DOC_TEMPLATES = [
  {
    id: 'blank', icon: '📄', name: 'مستند فارغ', desc: 'ابدأ من صفحة بيضاء', color: '#64748b',
    title: '', html: function(){ return ''; }
  },

  /* ---------- السيرة الذاتية ---------- */
  {
    id: 'cv', icon: '👤', name: 'سيرة ذاتية CV', desc: 'مع صورتك الشخصية', color: '#2563eb',
    title: 'السيرة الذاتية',
    hint: 'المس الصورة لوضع صورتك، ثم عدّل النصوص',
    html: function(){
      var c = '#1e40af';
      return '' +
      '<table data-layout="1" style="width:100%;border-collapse:collapse;margin-bottom:6px"><tr>' +
        '<td style="width:125px;border:0;padding:0 0 0 14px;vertical-align:top">' +
          '<img class="photo" data-ph="1" src="' + PHOTO_PH + '" style="width:110px;height:130px;object-fit:cover;border-radius:12px;display:block">' +
        '</td>' +
        '<td style="border:0;padding:0;vertical-align:middle">' +
          '<h1 style="margin:0;font-size:26px;color:' + c + '">اسمك الكامل</h1>' +
          '<p style="margin:4px 0 10px;font-size:17px;font-weight:bold;color:#2563eb">مهندس مدني</p>' +
          '<p style="margin:2px 0;' + S.muted + '">📞 05XXXXXXXX</p>' +
          '<p style="margin:2px 0;' + S.muted + '">✉️ name@email.com</p>' +
          '<p style="margin:2px 0;' + S.muted + '">📍 الرياض، المملكة العربية السعودية</p>' +
        '</td></tr></table>' +

      '<h2 style="' + S.h2(c) + '">نبذة عني</h2>' +
      '<p>مهندس مدني بخبرة تزيد عن 5 سنوات في إدارة وتنفيذ المشاريع الإنشائية، أتميز بالدقة والالتزام بالجودة والمواعيد، والقدرة على قيادة فرق العمل في الموقع.</p>' +

      '<h2 style="' + S.h2(c) + '">الخبرات العملية</h2>' +
      '<p style="margin-bottom:2px"><b>مهندس موقع — شركة اسم الشركة للمقاولات</b></p>' +
      '<p style="margin-top:0;' + S.muted + '">2021 – حتى الآن</p>' +
      '<ul><li>الإشراف على تنفيذ مبانٍ سكنية وتجارية.</li><li>متابعة الجدول الزمني وكميات المواد.</li><li>إعداد التقارير اليومية والأسبوعية.</li></ul>' +
      '<p style="margin-bottom:2px"><b>مهندس متدرب — شركة اسم الشركة</b></p>' +
      '<p style="margin-top:0;' + S.muted + '">2019 – 2021</p>' +
      '<ul><li>المشاركة في حساب الكميات وإعداد المخططات.</li></ul>' +

      '<h2 style="' + S.h2(c) + '">التعليم</h2>' +
      '<p style="margin-bottom:2px"><b>بكالوريوس الهندسة المدنية — اسم الجامعة</b></p>' +
      '<p style="margin-top:0;' + S.muted + '">2015 – 2019 · التقدير: جيد جداً</p>' +

      '<h2 style="' + S.h2(c) + '">المهارات</h2>' +
      '<ul><li>AutoCAD و Revit</li><li>Microsoft Excel و Project</li><li>حساب الكميات والتكاليف</li><li>إدارة فرق العمل</li></ul>' +

      '<h2 style="' + S.h2(c) + '">اللغات</h2>' +
      '<p>العربية: اللغة الأم · الإنجليزية: جيد</p>';
    }
  },

  /* ---------- عرض سعر ---------- */
  {
    id: 'quote', icon: '💰', name: 'عرض سعر', desc: 'للعملاء مع جدول أسعار', color: '#0f766e',
    title: 'عرض سعر',
    html: function(){
      var c = '#0f766e';
      var tot = 'border:1px solid #cbd5e1;padding:8px;font-weight:bold;background:#f0fdfa';
      return '' +
      '<table data-layout="1" style="width:100%;border-collapse:collapse"><tr>' +
        '<td style="border:0;padding:0;vertical-align:top">' +
          '<h1 style="margin:0;font-size:30px;color:' + c + '">عرض سعر</h1>' +
          '<p style="margin:6px 0;' + S.muted + '">رقم العرض: 001<br>التاريخ: ' + todayStr() + '</p>' +
        '</td>' +
        '<td style="border:0;padding:0;vertical-align:top;text-align:left">' +
          '<p style="margin:0;font-size:19px;font-weight:bold">اسم شركتك للمقاولات</p>' +
          '<p style="margin:4px 0;' + S.muted + '">الرياض – المملكة العربية السعودية<br>05XXXXXXXX</p>' +
        '</td></tr></table>' +
      '<hr style="border:0;border-top:3px solid ' + c + ';margin:14px 0">' +
      '<p style="background:#f0fdfa;border-right:4px solid ' + c + ';padding:10px 14px;border-radius:6px">' +
        '<b>إلى:</b> السيد / اسم العميل المحترم<br><b>المشروع:</b> بناء فيلا سكنية – حي النرجس</p>' +
      '<p>نشكر لكم ثقتكم، ويسرّنا أن نقدّم لكم عرض السعر التالي:</p>' +
      dataTable(c, ['م', 'البند', 'الكمية', 'سعر الوحدة', 'الإجمالي'], [
        ['1', 'أعمال الحفر والردم', '1', '12,000', '12,000'],
        ['2', 'الخرسانة المسلحة', '85 م³', '450', '38,250'],
        ['3', 'أعمال البلوك', '3,000 حبة', '3', '9,000'],
        ['4', 'أعمال اللياسة', '600 م²', '22', '13,200']
      ],
        '<tr><td colspan="4" style="' + tot + '">المجموع</td><td style="' + tot + '">72,450</td></tr>' +
        '<tr><td colspan="4" style="' + tot + '">ضريبة القيمة المضافة 15%</td><td style="' + tot + '">10,867.5</td></tr>' +
        '<tr><td colspan="4" style="' + S.head(c) + ';text-align:right">الإجمالي النهائي</td><td style="' + S.head(c) + '">83,317.5 ريال</td></tr>'
      ) +
      '<h3 style="color:' + c + ';margin-top:20px">الشروط والأحكام</h3>' +
      '<ul><li>العرض ساري لمدة 30 يوماً من تاريخه.</li><li>الدفع: 50% مقدماً، و50% عند التسليم.</li><li>مدة التنفيذ: 90 يوماً من تاريخ استلام الموقع.</li></ul>' +
      '<p style="margin-top:30px">مع خالص التحية،<br><b>الاسم</b><br>المدير العام</p>' +
      '<p>التوقيع: ...................... &nbsp;&nbsp; الختم: ......................</p>';
    }
  },

  /* ---------- خطاب رسمي ---------- */
  {
    id: 'letter', icon: '✉️', name: 'خطاب رسمي', desc: 'لجهة أو شركة', color: '#7c3aed',
    title: 'خطاب رسمي',
    html: function(){
      var c = '#5b21b6';
      return '' +
      '<p style="margin:0;font-size:20px;font-weight:bold;color:' + c + '">اسم شركتك للمقاولات</p>' +
      '<p style="margin:2px 0;' + S.muted + '">س.ت: 1010XXXXXX · هاتف: 05XXXXXXXX</p>' +
      '<hr style="border:0;border-top:2px solid ' + c + ';margin:12px 0 18px">' +
      '<p style="text-align:left">التاريخ: ' + todayStr() + '<br>الرقم: 2026/015</p>' +
      '<p><b>السادة / اسم الجهة المحترمين</b></p>' +
      '<p>السلام عليكم ورحمة الله وبركاته، وبعد:</p>' +
      '<p style="text-align:center"><b><u>الموضوع: طلب تمديد مدة تنفيذ المشروع</u></b></p>' +
      '<p>نفيدكم بأنه نظراً لتأخر توريد بعض المواد الأساسية من قبل المورّد، فإننا نرجو التكرم بالموافقة على تمديد مدة تنفيذ المشروع لمدة ثلاثين يوماً إضافية، مع التزامنا التام بمعايير الجودة المتفق عليها.</p>' +
      '<p>شاكرين لكم حسن تعاونكم، وتفضلوا بقبول فائق الاحترام والتقدير.</p>' +
      '<p style="margin-top:40px;text-align:left">المدير العام<br><b>الاسم</b><br>التوقيع: ....................</p>';
    }
  },

  /* ---------- تقرير يومي للموقع ---------- */
  {
    id: 'report', icon: '🏗', name: 'تقرير يومي للموقع', desc: 'عمالة وأعمال ومواد', color: '#ea580c',
    title: 'تقرير يومي – الموقع',
    html: function(){
      var c = '#c2410c';
      var k = 'border:1px solid #cbd5e1;padding:8px;background:#fff7ed;font-weight:bold;width:35%';
      return '' +
      '<h1 style="margin:0 0 4px;font-size:26px;color:' + c + '">التقرير اليومي للموقع</h1>' +
      '<p style="margin:0 0 12px;' + S.muted + '">التاريخ: ' + todayStr() + '</p>' +
      '<table style="width:100%;border-collapse:collapse">' +
        '<tr><td style="' + k + '">المشروع</td><td style="' + S.cell + '">فيلا سكنية – حي النرجس</td></tr>' +
        '<tr><td style="' + k + '">المهندس المسؤول</td><td style="' + S.cell + '">الاسم</td></tr>' +
        '<tr><td style="' + k + '">حالة الطقس</td><td style="' + S.cell + '">مشمس ☀️</td></tr>' +
      '</table>' +
      '<h2 style="' + S.h2(c) + '">العمالة</h2>' +
      dataTable(c, ['الفئة', 'العدد', 'ساعات العمل'], [
        ['نجارون', '4', '8'], ['حدادون', '3', '8'], ['عمال', '6', '8']
      ]) +
      '<h2 style="' + S.h2(c) + '">الأعمال المنجزة اليوم</h2>' +
      '<ol><li>صب خرسانة سقف الدور الأرضي.</li><li>تركيب حديد أعمدة الدور الأول.</li><li>استلام شدة الدرج.</li></ol>' +
      '<h2 style="' + S.h2(c) + '">المواد المورّدة</h2>' +
      dataTable(c, ['المادة', 'الكمية', 'المورّد'], [
        ['خرسانة جاهزة', '45 م³', 'اسم المصنع'], ['حديد تسليح', '6 طن', 'اسم المورّد']
      ]) +
      '<h2 style="' + S.h2(c) + '">الملاحظات والمشاكل</h2>' +
      '<p>لا توجد ملاحظات.</p>' +
      '<p style="margin-top:30px">توقيع المهندس: ....................</p>';
    }
  }
];

/* =========================================================
   قوالب الجداول
   الأعمدة: أ ب ت ث ج ح خ ...
   ========================================================= */
var SHEET_TEMPLATES = [
  {
    id: 'blank', icon: '▦', name: 'جدول فارغ', desc: 'ابدأ من الصفر', color: '#64748b',
    title: '', rows: []
  },
  {
    id: 'materials', icon: '🧱', name: 'حساب مواد البناء', desc: 'كميات وأسعار وضريبة', color: '#16a34a', soft: '#e7f7ec',
    title: 'حساب مواد البناء', w: { 0: 130, 3: 140 },
    rows: [
      ['البند', 'الوحدة', 'الكمية', 'سعر الوحدة', 'الإجمالي'],
      ['اسمنت', 'كيس', 200, 15, '=ت2*ث2'],
      ['حديد تسليح', 'طن', 12, 2600, '=ت3*ث3'],
      ['بلوك', 'حبة', 3000, 2.5, '=ت4*ث4'],
      ['رمل', 'م³', 30, 85, '=ت5*ث5'],
      ['بحص', 'م³', 25, 110, '=ت6*ث6'],
      ['خشب', 'لوح', 80, 35, '=ت7*ث7'],
      ['أجور العمالة', 'مقطوعية', 1, 15000, '=ت8*ث8'],
      [],
      ['', '', '', 'المجموع', '=جمع(ج2:ج8)'],
      ['', '', '', 'ضريبة 15%', '=ج10*15%'],
      ['', '', '', 'الإجمالي النهائي', '=ج10+ج11']
    ],
    totals: [9, 10, 11]
  },
  {
    id: 'invoice', icon: '🧾', name: 'فاتورة', desc: 'مع ضريبة القيمة المضافة', color: '#2563eb', soft: '#e8f0fe',
    title: 'فاتورة رقم 001', w: { 0: 50, 1: 160, 3: 190 },
    rows: [
      ['م', 'الوصف', 'الكمية', 'السعر', 'الإجمالي'],
      [1, 'توريد وتركيب بلاط', 120, 45, '=ت2*ث2'],
      [2, 'أعمال دهان', 300, 18, '=ت3*ث3'],
      [3, 'تمديدات كهربائية', 1, 8500, '=ت4*ث4'],
      [4, 'أعمال سباكة', 1, 6200, '=ت5*ث5'],
      [],
      ['', '', '', 'المجموع', '=جمع(ج2:ج5)'],
      ['', '', '', 'ضريبة القيمة المضافة 15%', '=ج7*15%'],
      ['', '', '', 'الإجمالي شامل الضريبة', '=ج7+ج8']
    ],
    totals: [6, 7, 8]
  },
  {
    id: 'payroll', icon: '👷', name: 'رواتب العمال', desc: 'أيام وأجور وسلف', color: '#7c3aed', soft: '#f1eafe',
    title: 'رواتب العمال – الشهر', w: { 0: 110, 3: 115 },
    rows: [
      ['الاسم', 'المهنة', 'أيام العمل', 'الأجر اليومي', 'المستحق', 'السلف', 'الصافي'],
      ['أحمد', 'نجار', 26, 150, '=ت2*ث2', 500, '=ج2-ح2'],
      ['محمد', 'حداد', 24, 160, '=ت3*ث3', 0, '=ج3-ح3'],
      ['خالد', 'كهربائي', 26, 180, '=ت4*ث4', 1000, '=ج4-ح4'],
      ['علي', 'سباك', 22, 170, '=ت5*ث5', 300, '=ج5-ح5'],
      ['عمر', 'عامل', 26, 100, '=ت6*ث6', 0, '=ج6-ح6'],
      ['يوسف', 'عامل', 25, 100, '=ت7*ث7', 200, '=ج7-ح7'],
      [],
      ['الإجمالي', '', '=جمع(ت2:ت7)', '', '=جمع(ج2:ج7)', '=جمع(ح2:ح7)', '=جمع(خ2:خ7)']
    ],
    totals: [8]
  },
  {
    id: 'expenses', icon: '📉', name: 'المصاريف الشهرية', desc: 'الميزانية مقابل الصرف', color: '#ea580c', soft: '#fff1e8',
    title: 'المصاريف الشهرية', w: { 0: 130, 4: 120 },
    rows: [
      ['البند', 'الميزانية', 'المصروف', 'الفرق', 'الحالة'],
      ['إيجار المكتب', 5000, 5000, '=ب2-ت2', '=اذا(ث2>=0,"ضمن الحد","تجاوز")'],
      ['الرواتب', 30000, 31500, '=ب3-ت3', '=اذا(ث3>=0,"ضمن الحد","تجاوز")'],
      ['وقود ونقل', 3000, 2400, '=ب4-ت4', '=اذا(ث4>=0,"ضمن الحد","تجاوز")'],
      ['كهرباء وماء', 1200, 1350, '=ب5-ت5', '=اذا(ث5>=0,"ضمن الحد","تجاوز")'],
      ['صيانة المعدات', 2000, 900, '=ب6-ت6', '=اذا(ث6>=0,"ضمن الحد","تجاوز")'],
      ['مصاريف أخرى', 1500, 1100, '=ب7-ت7', '=اذا(ث7>=0,"ضمن الحد","تجاوز")'],
      [],
      ['الإجمالي', '=جمع(ب2:ب7)', '=جمع(ت2:ت7)', '=ب9-ت9', '=اذا(ث9>=0,"ضمن الحد","تجاوز")']
    ],
    totals: [8]
  }
];

// تحويل قالب الجدول إلى بيانات
function makeSheet(t){
  var LT = 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي';
  var cells = {}, maxC = 0;
  t.rows.forEach(function(r, ri){
    r.forEach(function(v, ci){
      if(v === '' || v === null || v === undefined) return;
      cells[LT[ci] + (ri + 1)] = { v: String(v) };
      if(ci + 1 > maxC) maxC = ci + 1;
    });
  });
  function st(ri, ci, o){
    var k = LT[ci] + (ri + 1);
    var cell = cells[k] || (cells[k] = { v: '' });
    for(var p in o) cell[p] = o[p];
  }
  if(t.rows.length){
    for(var c = 0; c < maxC; c++) st(0, c, { b: true, bg: t.color, fg: '#ffffff', al: 'center' });
    (t.totals || []).forEach(function(ri, i, arr){
      var last = i === arr.length - 1;
      for(var c2 = 0; c2 < maxC; c2++) st(ri, c2, last ? { b: true, bg: t.color, fg: '#ffffff' } : { b: true, bg: t.soft });
    });
  }
  return { rows: Math.max(50, t.rows.length + 10), cols: Math.max(8, maxC + 1), cells: cells, w: t.w || {} };
}
