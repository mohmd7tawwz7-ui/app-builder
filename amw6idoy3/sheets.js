// ===== الجداول =====

/* ----- الحروف العربية للأعمدة ----- */
var LETTERS = 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي'.split('');   // للاستخدام الداخلي
function showLetter(c){ return c === 0 ? 'أ' : LETTERS[c]; }   // للعرض
function key(r, c){ return LETTERS[c] + (r + 1); }
function showKey(r, c){ return showLetter(c) + (r + 1); }

/* =========================================================
   الحفظ: عدة جداول
   ========================================================= */
var KEY = 'office-sheets';
var tables = loadData(KEY, []);
// نقل الجدول القديم (من النسخة السابقة) إن وجد
(function(){
  var old = loadData('jadawili-v2', null);
  if(old && old.cells && !tables.length){
    tables.push({ id: newId(), title: 'جدولي', icon: '▦', updated: Date.now(), rows: old.rows, cols: old.cols, cells: old.cells, w: {} });
    saveData(KEY, tables);
  }
})();

var data = null;        // الجدول المفتوح الآن
var saveTimer;
function save(){
  if(!data) return;
  data.updated = Date.now();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(function(){ saveData(KEY, tables); }, 300);
}

var sel = { r: 0, c: 0 };
var undoList = [];
var grid = $('#grid'), input = $('#input');
var listView = $('#listView'), editView = $('#editView');
var cellsEl = [], colHeads = [], rowHeads = [];

/* ----- مربع الكتابة داخل الخلية ----- */
var editor = document.createElement('input');
editor.id = 'cellEdit';
editor.setAttribute('autocomplete', 'off');
editor.setAttribute('spellcheck', 'false');
editor.setAttribute('enterkeyhint', 'next');
var editTd = null;   // الخلية التي نكتب فيها الآن

/* =========================================================
   قائمة الجداول
   ========================================================= */
function findTable(id){ return tables.filter(function(t){ return t.id === id; })[0]; }
function countFilled(t){ var n = 0; for(var k in t.cells) if(t.cells[k].v) n++; return n; }

function showList(){
  closeEditor();
  data = null;
  editView.classList.add('hidden');
  listView.classList.remove('hidden');
  tables.sort(function(a, b){ return b.updated - a.updated; });
  var box = $('#items');
  if(!tables.length){ box.innerHTML = '<div class="empty">لا توجد جداول بعد</div>'; return; }
  box.innerHTML = tables.map(function(t){
    return '<div class="item" data-id="' + t.id + '">' +
      '<div class="item-icon">' + (t.icon || '▦') + '</div>' +
      '<div class="info"><b>' + escapeHtml(t.title || 'بدون اسم') + '</b><small>' + countFilled(t) + ' خلية — ' + niceDate(t.updated) + '</small></div>' +
      '<button class="del" data-del="' + t.id + '">🗑</button></div>';
  }).join('');
}
$('#items').addEventListener('click', function(e){
  var del = e.target.closest('[data-del]');
  if(del){
    var id = del.getAttribute('data-del'), t = findTable(id);
    ask('حذف "' + (t.title || 'بدون اسم') + '"؟', function(){
      tables = tables.filter(function(x){ return x.id !== id; });
      saveData(KEY, tables); showList(); toast('تم الحذف');
    });
    return;
  }
  var item = e.target.closest('.item');
  if(item) openTable(item.getAttribute('data-id'));
});

$('#newSheet').addEventListener('click', function(){
  chooseTemplate('اختر نوع الجدول', SHEET_TEMPLATES, function(t){
    var s = makeSheet(t);
    var tb = { id: newId(), title: t.title, icon: t.icon, updated: Date.now(), rows: s.rows, cols: s.cols, cells: s.cells, w: s.w };
    tables.push(tb); saveData(KEY, tables);
    openTable(tb.id);
    if(t.rows.length) setTimeout(function(){ toast('غيّر الأرقام وستتحدث المجاميع تلقائياً'); }, 400);
  });
});

function openTable(id){
  data = findTable(id);
  if(!data.w) data.w = {};
  undoList = [];
  sel = { r: 0, c: 0 };
  listView.classList.add('hidden');
  editView.classList.remove('hidden');
  $('#sheetTitle').value = data.title || '';
  build();
  grid.scrollTop = 0;
}
$('#sheetTitle').addEventListener('input', function(e){ data.title = e.target.value.trim(); save(); });

/* ----- تنظيف النص العربي (خارج النصوص بين علامتي التنصيص) ----- */
function clean(t){
  var parts = String(t).split('"');
  for(var i = 0; i < parts.length; i += 2){
    parts[i] = parts[i]
      .replace(/[٠-٩]/g, function(d){ return d.charCodeAt(0) - 1632; })
      .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
      .replace(/،/g, ',').replace(/؛/g, ',');
  }
  return parts.join('"');
}
function raw(k){ return (data.cells[k] && data.cells[k].v) || ''; }

/* =========================================================
   المعادلات
   ========================================================= */
function onlyNums(a){ return flatAll(a).filter(function(v){ return typeof v === 'number'; }); }
var FN = {};
FN['جمع']   = function(){ return onlyNums([].slice.call(arguments)).reduce(function(x, y){ return x + y; }, 0); };
FN['متوسط'] = function(){ var n = onlyNums([].slice.call(arguments)); if(!n.length) throw 'div'; return FN['جمع'](n) / n.length; };
FN['اكبر']  = function(){ var n = onlyNums([].slice.call(arguments)); return n.length ? Math.max.apply(null, n) : 0; };
FN['اصغر']  = function(){ var n = onlyNums([].slice.call(arguments)); return n.length ? Math.min.apply(null, n) : 0; };
FN['عدد']   = function(){ return onlyNums([].slice.call(arguments)).length; };
FN['اذا']   = function(s, a, b){ return s ? a : (b === undefined ? '' : b); };
FN['تقريب'] = function(x, d){ var p = Math.pow(10, d || 0); return Math.round(x * p) / p; };
// أسماء إنجليزية أيضاً
FN.SUM = FN['جمع']; FN.AVERAGE = FN['متوسط']; FN.MAX = FN['اكبر']; FN.MIN = FN['اصغر'];
FN.COUNT = FN['عدد']; FN.IF = FN['اذا']; FN.ROUND = FN['تقريب'];

var L = '[' + LETTERS.join('') + ']';
var AR = 'ء-يA-Za-z';
var RE_WORD  = new RegExp('[' + AR + '_]+\\d*', 'g');
var RE_REF1  = new RegExp('^' + L + '\\d+$');
var RE_FUNC  = new RegExp('([' + AR + ']+)\\s*\\(', 'g');
var RE_REF   = new RegExp('(^|[^' + AR + '"])(' + L + ')(\\d+)(?::(' + L + ')(\\d+))?', 'g');
var RE_POS   = new RegExp('^(' + L + ')(\\d+)$');
var compiled = {};

function compile(src){
  if(compiled[src]) return compiled[src];
  var parts = src.split('"');
  for(var i = 0; i < parts.length; i += 2){
    var p = parts[i];
    // فحص: نسمح فقط بخلايا ودوال معروفة
    var words = p.match(RE_WORD) || [];
    for(var w = 0; w < words.length; w++){
      var word = words[w];
      if(RE_REF1.test(word)) continue;
      if(FN[word] || FN[word.toUpperCase()]) continue;
      throw 'name';
    }
    p = p.replace(RE_FUNC, function(m, n){ return 'F["' + (FN[n] ? n : n.toUpperCase()) + '"]('; });
    p = p.replace(RE_REF, function(m, pre, c1, r1, c2, r2){
      return pre + (c2 ? 'R("' + c1 + r1 + '","' + c2 + r2 + '")' : 'C("' + c1 + r1 + '")');
    });
    p = p.replace(/(\d+(?:\.\d+)?)%/g, '($1/100)')
         .replace(/<>/g, '!=')
         .replace(/(^|[^<>!=])=(?!=)/g, '$1==')
         .replace(/\^/g, '**');
    parts[i] = p;
  }
  return compiled[src] = new Function('F', 'C', 'R', '"use strict";return (' + parts.join('"') + ');');
}

var memo = {}, busy = {};
function err(e){
  if(e && e.err) return e;
  return { err: e === 'circ' ? '#دائري' : e === 'div' ? '#قسمة/0' : e === 'name' ? '#اسم؟' : '#خطأ' };
}
function pos(k){ var m = RE_POS.exec(k); return { c: LETTERS.indexOf(m[1]), r: +m[2] - 1 }; }
function C(k){ var v = value(k); if(v && v.err) throw v; return v === '' ? 0 : v; }
function R(a, b){
  var A = pos(a), B = pos(b), out = [];
  for(var r = Math.min(A.r, B.r); r <= Math.max(A.r, B.r); r++)
    for(var c = Math.min(A.c, B.c); c <= Math.max(A.c, B.c); c++){
      var v = value(key(r, c)); if(v && v.err) throw v; out.push(v);
    }
  return out;
}
function value(k){
  if(memo.hasOwnProperty(k)) return memo[k];
  if(busy[k]) throw 'circ';
  var t = raw(k), v;
  if(t === '') v = '';
  else if(t.charAt(0) === '='){
    busy[k] = true;
    try {
      v = compile(clean(t.slice(1)))(FN, C, R);
      if(typeof v === 'number' && isNaN(v)) v = { err: '#خطأ' };
      else if(typeof v === 'number' && !isFinite(v)) v = { err: '#قسمة/0' };
    } catch(e){ v = err(e); }
    busy[k] = false;
  } else {
    var n = Number(clean(t).replace(/,/g, ''));
    v = (t.trim() !== '' && !isNaN(n)) ? n : t;
  }
  memo[k] = v;
  return v;
}
// عرض الأرقام بفواصل الآلاف: 72450 ← 72,450
function fmtNum(v){
  var n = Math.round(v * 100) / 100;
  var parts = String(Math.abs(n)).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (n < 0 ? '-' : '') + parts.join('.');
}
function show(v){
  if(v && v.err) return v.err;
  if(typeof v === 'number') return fmtNum(v);
  if(typeof v === 'boolean') return v ? 'صح' : 'خطأ';
  return v;
}

/* =========================================================
   رسم الجدول
   ========================================================= */
function build(){
  closeEditor();
  var h = '<table><thead><tr><th></th>';
  for(var c = 0; c < data.cols; c++) h += '<th>' + showLetter(c) + '</th>';
  h += '</tr></thead><tbody>';
  for(var r = 0; r < data.rows; r++){
    h += '<tr><th>' + (r + 1) + '</th>';
    for(var c2 = 0; c2 < data.cols; c2++) h += '<td data-r="' + r + '" data-c="' + c2 + '"></td>';
    h += '</tr>';
  }
  grid.innerHTML = h + '</tbody></table>';
  var trs = grid.querySelectorAll('tbody tr');
  cellsEl = [];
  for(var i = 0; i < trs.length; i++) cellsEl.push(Array.prototype.slice.call(trs[i].querySelectorAll('td')));
  colHeads = Array.prototype.slice.call(grid.querySelectorAll('thead th'), 1);
  rowHeads = Array.prototype.slice.call(grid.querySelectorAll('tbody th'));
  // عرض الأعمدة الخاصة
  for(var col in data.w){
    var px = data.w[col] + 'px', list = [colHeads[col]];
    for(var r2 = 0; r2 < data.rows; r2++) list.push(cellsEl[r2][col]);
    list.forEach(function(el){ if(el){ el.style.width = px; el.style.minWidth = px; el.style.maxWidth = px; } });
  }
  if(sel.r >= data.rows || sel.c >= data.cols) sel = { r: 0, c: 0 };
  refresh();
  select(sel.r, sel.c);
}
function refresh(){
  memo = {}; busy = {};
  for(var r = 0; r < data.rows; r++) for(var c = 0; c < data.cols; c++){
    var k = key(r, c), cell = data.cells[k], v = value(k), td = cellsEl[r][c];
    if(td === editTd) continue;   // لا نلمس الخلية التي نكتب فيها
    td.textContent = show(v);
    td.className = (typeof v === 'number' ? 'num' : '') + (v && v.err ? ' err' : '') + (r === sel.r && c === sel.c ? ' sel' : '');
    td.style.fontWeight = cell && cell.b ? '700' : '';
    td.style.background = (cell && cell.bg) || '';
    td.style.color = (cell && cell.fg) || '';
    td.style.textAlign = (cell && cell.al) || '';
  }
}
function select(r, c){
  if(cellsEl[sel.r] && cellsEl[sel.r][sel.c]) cellsEl[sel.r][sel.c].classList.remove('sel');
  if(colHeads[sel.c]) colHeads[sel.c].classList.remove('hl');
  if(rowHeads[sel.r]) rowHeads[sel.r].classList.remove('hl');
  sel = { r: r, c: c };
  var td = cellsEl[r][c];
  td.classList.add('sel'); colHeads[c].classList.add('hl'); rowHeads[r].classList.add('hl');
  $('#cellName').textContent = showKey(r, c);
  input.value = raw(key(r, c));
  $('#bBold').classList.toggle('on', !!(data.cells[key(r, c)] || {}).b);
  keepVisible(td);
}
// إظهار الخلية إذا كانت خارج الشاشة
function keepVisible(td){
  var g = grid.getBoundingClientRect(), b = td.getBoundingClientRect();
  if(b.top < g.top + 38) grid.scrollTop -= (g.top + 38 - b.top);
  else if(b.bottom > g.bottom) grid.scrollTop += (b.bottom - g.bottom);
}

/* =========================================================
   الكتابة داخل الخلية
   ========================================================= */
function openEditor(r, c, startText){
  closeEditor();
  select(r, c);
  var td = cellsEl[r][c];
  editTd = td;
  td.className = 'sel editing';
  td.textContent = '';
  editor.value = (startText !== undefined) ? startText : raw(key(r, c));
  editor.style.fontWeight = td.style.fontWeight;
  td.appendChild(editor);
  input.value = editor.value;
  editor.focus();
  try { editor.setSelectionRange(editor.value.length, editor.value.length); } catch(e){}
  // بعد ظهور لوحة المفاتيح نتأكد أن الخلية ظاهرة
  setTimeout(function(){ if(editTd === td) keepVisible(td); }, 350);
}
function closeEditor(){
  if(!editTd) return;
  var td = editTd;
  editTd = null;
  if(editor.parentNode) editor.parentNode.removeChild(editor);
  td.className = 'sel';
}
// حفظ ما كُتب وإغلاق مربع الكتابة
function commit(){
  if(!editTd) return;
  var v = editor.value;
  closeEditor();
  setCell(v);
  refresh();
}

editor.addEventListener('input', function(){ input.value = editor.value; });
input.addEventListener('input', function(){ if(editTd) editor.value = input.value; });

editor.addEventListener('keydown', function(e){
  if(e.key === 'Enter' || e.keyCode === 13){
    e.preventDefault();
    commit();
    // الانتقال للخلية التي تحتها والكتابة فيها مباشرة
    if(sel.r < data.rows - 1) openEditor(sel.r + 1, sel.c);
  } else if(e.key === 'Escape'){
    closeEditor(); refresh(); select(sel.r, sel.c);
  }
});
// عند الخروج من الخلية نحفظ (إلا إذا انتقلنا لشريط المعادلة)
editor.addEventListener('blur', function(e){
  if(e.relatedTarget === input) return;
  if(e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('.quick')) return;
  commit();
});

/* ----- التعديل ----- */
function snapshot(){ return JSON.stringify({ rows: data.rows, cols: data.cols, cells: data.cells, w: data.w }); }
function remember(){ undoList.push(snapshot()); if(undoList.length > 40) undoList.shift(); }
function setCell(v){
  var k = key(sel.r, sel.c);
  if(v === raw(k)) return;
  remember();
  var cell = data.cells[k] || {};
  cell.v = v;
  if(!v && !cell.b && !cell.bg) delete data.cells[k]; else data.cells[k] = cell;
  refresh(); save();
}
function styleCell(fn){
  commit();
  remember();
  var k = key(sel.r, sel.c);
  if(!data.cells[k]) data.cells[k] = { v: '' };
  fn(data.cells[k]);
  refresh(); save(); select(sel.r, sel.c);
}

/* =========================================================
   لمس الخلايا
   ========================================================= */
// أثناء كتابة معادلة: لمس خلية أخرى يضيف اسمها للمعادلة
var added = false;
function activeField(){
  var a = document.activeElement;
  return (a === editor || a === input) ? a : null;
}
function canAddRef(){
  var f = activeField();
  if(!f || f.value.charAt(0) !== '=') return false;
  return /[=(,+\-*\/^:<>]\s*$/.test(f.value.slice(0, f.selectionStart));
}
function press(e){
  added = false;   // لمسة جديدة
  var td = e.target.closest('td');
  if(!td || td === editTd) return;
  if(canAddRef()){
    e.preventDefault();   // نبقي لوحة المفاتيح مفتوحة
    var f = activeField();
    var ref = showKey(+td.getAttribute('data-r'), +td.getAttribute('data-c')), p = f.selectionStart;
    f.value = f.value.slice(0, p) + ref + f.value.slice(f.selectionEnd);
    f.setSelectionRange(p + ref.length, p + ref.length);
    if(f === editor) input.value = editor.value; else if(editTd) editor.value = input.value;
    added = true;
  }
}
grid.addEventListener('touchstart', press);
grid.addEventListener('mousedown', press);
grid.addEventListener('click', function(e){
  if(added){ added = false; return; }
  var td = e.target.closest('td');
  if(!td || td === editTd) return;
  // إذا كنا نكتب في شريط المعادلة نحفظه أولاً
  if(!editTd && document.activeElement === input) setCell(input.value);
  commit();
  openEditor(+td.getAttribute('data-r'), +td.getAttribute('data-c'));
});

/* ----- شريط المعادلة في الأعلى ----- */
input.addEventListener('keydown', function(e){
  if(e.key === 'Enter' || e.keyCode === 13){
    e.preventDefault();
    if(editTd) commit(); else setCell(input.value);
    if(sel.r < data.rows - 1) openEditor(sel.r + 1, sel.c);
  }
});
input.addEventListener('blur', function(e){
  if(e.relatedTarget === editor) return;
  if(editTd){ if(e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('.quick')) return; commit(); }
});
$('#ok').addEventListener('click', function(){
  if(editTd) commit(); else setCell(input.value);
  input.blur(); editor.blur(); toast('تم ✓');
});

/* ----- أزرار المعادلات السريعة ----- */
var quickBtns = document.querySelectorAll('.quick button');
for(var q = 0; q < quickBtns.length; q++){
  quickBtns[q].addEventListener('click', function(){
    openEditor(sel.r, sel.c, '=' + this.textContent + '(');
    toast('المس الخلية الأولى ثم اكتب : ثم المس الأخيرة ثم )');
  });
}

/* ----- لوحة مفاتيح الكمبيوتر ----- */
document.addEventListener('keydown', function(e){
  if(!data || activeField() || document.activeElement === $('#sheetTitle') || e.ctrlKey || e.metaKey) return;
  var mv = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, 1], ArrowRight: [0, -1] }[e.key];
  if(mv){
    e.preventDefault();
    select(Math.max(0, Math.min(data.rows - 1, sel.r + mv[0])), Math.max(0, Math.min(data.cols - 1, sel.c + mv[1])));
  } else if(e.key === 'Enter' || e.key === 'F2'){
    e.preventDefault(); openEditor(sel.r, sel.c);
  } else if(e.key === 'Delete' || e.key === 'Backspace'){
    e.preventDefault(); setCell('');
  } else if(e.key && e.key.length === 1){
    e.preventDefault(); openEditor(sel.r, sel.c, e.key);
  }
});

/* =========================================================
   الأدوات
   ========================================================= */
$('#bSum').addEventListener('click', function(){
  commit();
  memo = {}; busy = {};
  function isNum(r, c){ return typeof value(key(r, c)) === 'number'; }
  var f = '';
  if(sel.r > 0 && isNum(sel.r - 1, sel.c)){
    var r = sel.r - 1; while(r > 0 && isNum(r - 1, sel.c)) r--;
    f = '=جمع(' + showKey(r, sel.c) + ':' + showKey(sel.r - 1, sel.c) + ')';
  } else if(sel.c > 0 && isNum(sel.r, sel.c - 1)){
    var c = sel.c - 1; while(c > 0 && isNum(sel.r, c - 1)) c--;
    f = '=جمع(' + showKey(sel.r, c) + ':' + showKey(sel.r, sel.c - 1) + ')';
  }
  if(!f) return toast('لا توجد أرقام فوق الخلية أو بجانبها');
  input.value = f; setCell(f); toast(f);
});
$('#bUndo').addEventListener('click', function(){
  closeEditor();
  if(!undoList.length) return toast('لا يوجد شيء للتراجع');
  var u = JSON.parse(undoList.pop());
  data.rows = u.rows; data.cols = u.cols; data.cells = u.cells; data.w = u.w || {};
  save(); build();
});
$('#bBold').addEventListener('click', function(){ styleCell(function(c){ c.b = !c.b; }); });
$('#bColor').addEventListener('input', function(e){ var col = e.target.value; styleCell(function(c){ c.bg = col; c.fg = ''; }); });
$('#bColor').addEventListener('change', function(e){ var col = e.target.value; styleCell(function(c){ c.bg = col; c.fg = ''; }); });
$('#bClear').addEventListener('click', function(){
  closeEditor();
  remember(); delete data.cells[key(sel.r, sel.c)];
  refresh(); save(); select(sel.r, sel.c);
});
$('#bRow').addEventListener('click', function(){ commit(); remember(); data.rows += 10; save(); build(); toast('أُضيفت 10 صفوف'); });
$('#bCol').addEventListener('click', function(){
  commit();
  if(data.cols >= LETTERS.length) return toast('وصلت لأقصى عدد أعمدة');
  remember(); data.cols++; save(); build(); toast('أُضيف العمود ' + showLetter(data.cols - 1));
});
$('#bExport').addEventListener('click', function(){
  commit();
  memo = {}; busy = {};
  var maxR = -1, maxC = -1;
  for(var k in data.cells){ if(raw(k)){ var p = pos(k); maxR = Math.max(maxR, p.r); maxC = Math.max(maxC, p.c); } }
  if(maxR < 0) return toast('الجدول فارغ');
  var lines = [];
  for(var r = 0; r <= maxR; r++){
    var row = [];
    for(var c = 0; c <= maxC; c++){
      var v = value(key(r, c));
      var t = typeof v === 'number' ? String(Math.round(v * 1e10) / 1e10) : String(show(v));
      if(/[",\n]/.test(t)) t = '"' + t.replace(/"/g, '""') + '"';
      row.push(t);
    }
    lines.push(row.join(','));
  }
  download((data.title || 'جدول') + '.csv', '﻿' + lines.join('\n'), 'text/csv');
  toast('تم التصدير — يفتح في إكسل');
});

/* ----- زر الرجوع ----- */
$('#back').addEventListener('click', function(e){
  if(data){ e.preventDefault(); e.stopPropagation(); commit(); saveData(KEY, tables); showList(); }
}, true);

showList();
