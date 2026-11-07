// ===== المستندات =====
var KEY = 'office-docs';
var docs = loadData(KEY, []);
var current = null;   // المستند المفتوح الآن

var listView = $('#listView'), editView = $('#editView');
var paper = $('#paper'), titleBox = $('#docTitle');

/* =========================================================
   قائمة المستندات
   ========================================================= */
function showList(){
  current = null;
  selectImg(null);
  editView.classList.add('hidden');
  listView.classList.remove('hidden');
  docs.sort(function(a, b){ return b.updated - a.updated; });
  var box = $('#items');
  if(!docs.length){ box.innerHTML = '<div class="empty">لا توجد مستندات بعد</div>'; return; }
  box.innerHTML = docs.map(function(d){
    return '<div class="item" data-id="' + d.id + '">' +
      '<div class="item-icon">' + (d.icon || '📝') + '</div>' +
      '<div class="info"><b>' + escapeHtml(d.title || 'بدون عنوان') + '</b><small>' + niceDate(d.updated) + '</small></div>' +
      '<button class="del" data-del="' + d.id + '">🗑</button></div>';
  }).join('');
}
function findDoc(id){ return docs.filter(function(x){ return x.id === id; })[0]; }
function deleteDoc(id){
  var d = findDoc(id);
  ask('حذف "' + (d.title || 'بدون عنوان') + '"؟', function(){
    docs = docs.filter(function(x){ return x.id !== id; });
    saveData(KEY, docs); showList(); toast('تم الحذف');
  });
}

$('#items').addEventListener('click', function(e){
  var del = e.target.closest('[data-del]');
  if(del){ deleteDoc(del.getAttribute('data-del')); return; }
  var item = e.target.closest('.item');
  if(item) openDoc(item.getAttribute('data-id'));
});

// مستند جديد: اختيار قالب
$('#newDoc').addEventListener('click', function(){
  chooseTemplate('اختر نوع المستند', DOC_TEMPLATES, function(t){
    var d = { id: newId(), title: t.title, html: t.html(), icon: t.icon, updated: Date.now() };
    docs.push(d); saveData(KEY, docs);
    openDoc(d.id);
    if(t.hint) setTimeout(function(){ toast(t.hint); }, 400);
    else if(!t.title) titleBox.focus();
  });
});

/* =========================================================
   فتح المستند والحفظ
   ========================================================= */
function openDoc(id){
  current = findDoc(id);
  listView.classList.add('hidden');
  editView.classList.remove('hidden');
  titleBox.value = current.title;
  paper.innerHTML = current.html;
  lastRange = null;
  showTab('home');
  updateCtx();
  countWords();
  paper.parentNode.scrollTop = 0;
}

var saveTimer;
function saveDoc(){
  if(!current) return;
  if(selImg) selImg.classList.remove('img-sel');
  current.title = titleBox.value.trim();
  current.html = paper.innerHTML;
  current.updated = Date.now();
  if(selImg) selImg.classList.add('img-sel');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(function(){ saveData(KEY, docs); }, 400);
}
paper.addEventListener('input', function(){ saveDoc(); countWords(); });
titleBox.addEventListener('input', saveDoc);

function countWords(){
  var text = (paper.innerText || paper.textContent || '').trim();
  var words = text ? text.split(/\s+/).length : 0;
  var imgs = paper.querySelectorAll('img').length, tbls = paper.querySelectorAll('table:not([data-layout])').length;
  $('#status').textContent = words + ' كلمة' + (imgs ? ' · ' + imgs + ' صورة' : '') + (tbls ? ' · ' + tbls + ' جدول' : '') + ' — يُحفظ تلقائياً';
}

/* =========================================================
   مكان المؤشر (حتى تعمل الأزرار على المكان الصحيح)
   ========================================================= */
var lastRange = null;
document.addEventListener('selectionchange', function(){
  if(!current) return;
  var s = window.getSelection();
  if(!s.rangeCount) return;
  var r = s.getRangeAt(0);
  if(paper.contains(r.commonAncestorContainer)){ lastRange = r.cloneRange(); updateCtx(); }
  updateButtons();
});
function restore(){
  paper.focus();
  var s = window.getSelection();
  if(lastRange){ s.removeAllRanges(); s.addRange(lastRange); }
  else {
    // ضع المؤشر في آخر المستند
    var r = document.createRange();
    r.selectNodeContents(paper); r.collapse(false);
    s.removeAllRanges(); s.addRange(r);
  }
}
function exec(cmd, val){
  restore();
  try { document.execCommand(cmd, false, val === undefined ? null : val); } catch(e){}
  saveDoc(); countWords(); updateButtons();
}

/* =========================================================
   التبويبات وأدوات التنسيق
   ========================================================= */
function showTab(name){
  var tabs = document.querySelectorAll('#tabs button');
  for(var i = 0; i < tabs.length; i++) tabs[i].classList.toggle('on', tabs[i].getAttribute('data-tab') === name);
  var panels = document.querySelectorAll('.panel');
  for(var j = 0; j < panels.length; j++) panels[j].classList.toggle('hidden', panels[j].getAttribute('data-panel') !== name);
}
$('#tabs').addEventListener('click', function(e){
  var b = e.target.closest('button'); if(b) showTab(b.getAttribute('data-tab'));
});

// منع فقدان التحديد عند الضغط على الأزرار (في الكمبيوتر)
editView.addEventListener('mousedown', function(e){
  if(e.target.closest('.tools button')) e.preventDefault();
});

var home = document.querySelector('[data-panel="home"]');
home.addEventListener('click', function(e){
  var b = e.target.closest('button'); if(!b) return;
  var cmd = b.getAttribute('data-cmd'), block = b.getAttribute('data-block');
  if(cmd) exec(cmd);
  if(block) exec('formatBlock', '<' + block + '>');
});
$('#textColor').addEventListener('input', function(e){ exec('foreColor', e.target.value); });
$('#fontSize').addEventListener('change', function(e){
  if(e.target.value) exec('fontSize', e.target.value);
  e.target.value = '';
});

function updateButtons(){
  ['bold', 'italic', 'underline'].forEach(function(c){
    var b = home.querySelector('[data-cmd="' + c + '"]');
    try { b.classList.toggle('on', document.queryCommandState(c)); } catch(e){}
  });
}

/* =========================================================
   إدراج: خط، تاريخ، جدول، صورة
   ========================================================= */
$('#insLine').addEventListener('click', function(){ exec('insertHorizontalRule'); });
$('#insDate').addEventListener('click', function(){ exec('insertText', todayStr()); });

/* ----- الجدول ----- */
var CELL_ST = 'border:1px solid #cbd5e1;padding:8px;text-align:right';
var HEAD_ST = 'border:1px solid #2563eb;padding:8px;background:#2563eb;color:#ffffff;font-weight:bold;text-align:center';

$('#insTable').addEventListener('click', function(){
  var rows = 3, cols = 3;
  var s = openSheet('إدراج جدول',
    '<div class="field">عدد الصفوف<div class="stepper"><button data-k="r" data-d="-1">−</button><span id="vR">3</span><button data-k="r" data-d="1">+</button></div></div>' +
    '<div class="field">عدد الأعمدة<div class="stepper"><button data-k="c" data-d="-1">−</button><span id="vC">3</span><button data-k="c" data-d="1">+</button></div></div>' +
    '<label class="field">صف عناوين ملوّن<input type="checkbox" id="vH" checked></label>' +
    '<button class="big-btn" id="vOk">إدراج الجدول</button>');
  s.el.addEventListener('click', function(e){
    var b = e.target.closest('[data-k]');
    if(b){
      var d = +b.getAttribute('data-d');
      if(b.getAttribute('data-k') === 'r'){ rows = Math.max(1, Math.min(30, rows + d)); s.el.querySelector('#vR').textContent = rows; }
      else { cols = Math.max(1, Math.min(8, cols + d)); s.el.querySelector('#vC').textContent = cols; }
    }
  });
  s.el.querySelector('#vOk').addEventListener('click', function(){
    var head = s.el.querySelector('#vH').checked;
    s.close();
    var h = '<table data-head="' + (head ? 1 : 0) + '" style="width:100%;border-collapse:collapse;margin:12px 0">';
    for(var i = 0; i < rows; i++){
      h += '<tr>';
      for(var j = 0; j < cols; j++){
        var isHead = head && i === 0;
        h += '<td style="' + (isHead ? HEAD_ST : CELL_ST) + '">' + (isHead ? 'عنوان ' + (j + 1) : '<br>') + '</td>';
      }
      h += '</tr>';
    }
    h += '</table><p><br></p>';
    exec('insertHTML', h);
    toast('المس أي خانة في الجدول للكتابة فيها');
  });
});

// الخانة التي يقف فيها المؤشر (نتجاهل جداول التصميم مثل رأس السيرة الذاتية)
function curCell(){
  if(!lastRange) return null;
  var n = lastRange.startContainer;
  if(n.nodeType === 3) n = n.parentNode;
  var td = n.closest ? n.closest('td,th') : null;
  if(!td || !paper.contains(td)) return null;
  if(td.closest('table').getAttribute('data-layout')) return null;
  return td;
}

$('#tableBar').addEventListener('click', function(e){
  var b = e.target.closest('[data-t]'); if(!b) return;
  var td = curCell(); if(!td) return;
  var tr = td.parentNode, table = td.closest('table');
  var head = table.getAttribute('data-head') === '1';
  var ci = td.cellIndex, op = b.getAttribute('data-t');

  if(op === 'addRow'){
    var base = (head && tr.rowIndex === 0) ? (table.rows[1] || tr) : tr;
    var nr = base.cloneNode(true);
    for(var i = 0; i < nr.cells.length; i++){
      nr.cells[i].innerHTML = '<br>';
      if(base === tr && head && tr.rowIndex === 0) nr.cells[i].setAttribute('style', CELL_ST);
    }
    tr.parentNode.insertBefore(nr, tr.nextSibling);
    toast('أُضيف صف');
  }
  else if(op === 'addCol'){
    for(var r = 0; r < table.rows.length; r++){
      var row = table.rows[r];
      var src = row.cells[Math.min(ci, row.cells.length - 1)];
      var nc = src.cloneNode(false);
      nc.innerHTML = (head && r === 0) ? 'عنوان' : '<br>';
      src.parentNode.insertBefore(nc, src.nextSibling);
    }
    toast('أُضيف عمود');
  }
  else if(op === 'delRow'){
    if(table.rows.length > 1) tr.parentNode.removeChild(tr); else table.parentNode.removeChild(table);
    lastRange = null;
  }
  else if(op === 'delCol'){
    if(tr.cells.length > 1){
      for(var r2 = 0; r2 < table.rows.length; r2++){
        var c = table.rows[r2].cells[ci]; if(c) c.parentNode.removeChild(c);
      }
    } else table.parentNode.removeChild(table);
    lastRange = null;
  }
  else if(op === 'delTable'){
    ask('حذف الجدول كاملاً؟', function(){
      table.parentNode.removeChild(table); lastRange = null;
      saveDoc(); countWords(); updateCtx();
    });
    return;
  }
  saveDoc(); countWords(); updateCtx();
});

/* ----- الصور ----- */
var selImg = null, replaceTarget = null;
var fileIn = $('#imgFile');

$('#insImage').addEventListener('click', function(){ replaceTarget = null; fileIn.click(); });

fileIn.addEventListener('change', function(){
  var f = fileIn.files[0]; fileIn.value = '';
  if(!f) return;
  toast('جاري تجهيز الصورة...');
  var isPhoto = replaceTarget && replaceTarget.classList.contains('photo');
  readImage(f, isPhoto ? 400 : 900, function(url){
    if(replaceTarget){
      replaceTarget.src = url;
      replaceTarget.removeAttribute('data-ph');
      selectImg(replaceTarget);
    } else {
      exec('insertHTML', '<img src="' + url + '" style="width:60%;display:block;margin:10px auto;border-radius:8px"><p><br></p>');
    }
    replaceTarget = null;
    saveDoc(); countWords();
    toast('تمت إضافة الصورة ✓');
  });
});

function selectImg(img){
  if(selImg) selImg.classList.remove('img-sel');
  selImg = img;
  if(img) img.classList.add('img-sel');
  updateCtx();
}
paper.addEventListener('click', function(e){
  if(e.target.tagName === 'IMG'){
    selectImg(e.target);
    // صورة السيرة الذاتية المؤقتة: افتح المعرض مباشرة
    if(e.target.getAttribute('data-ph')){ replaceTarget = e.target; fileIn.click(); }
  } else selectImg(null);
});

$('#imgBar').addEventListener('click', function(e){
  if(!selImg) return;
  var b = e.target.closest('button'); if(!b) return;
  var size = b.getAttribute('data-s'), al = b.getAttribute('data-a');
  if(size){
    if(selImg.classList.contains('photo')){
      var px = { 25: 80, 50: 110, 75: 150, 100: 200 }[size];
      selImg.style.width = px + 'px'; selImg.style.height = Math.round(px * 1.18) + 'px';
    } else { selImg.style.width = size + '%'; selImg.style.height = 'auto'; }
  }
  if(al){
    var st = selImg.style;
    if(al === 'center'){ st.cssFloat = 'none'; st.display = 'block'; st.margin = '10px auto'; }
    if(al === 'right'){ st.cssFloat = 'right'; st.display = 'inline'; st.margin = '4px 0 8px 14px'; }
    if(al === 'left'){ st.cssFloat = 'left'; st.display = 'inline'; st.margin = '4px 14px 8px 0'; }
  }
  saveDoc();
});
$('#imgReplace').addEventListener('click', function(){ if(selImg){ replaceTarget = selImg; fileIn.click(); } });
$('#imgDelete').addEventListener('click', function(){
  if(!selImg) return;
  var img = selImg; selectImg(null);
  img.parentNode.removeChild(img);
  saveDoc(); countWords(); toast('تم حذف الصورة');
});

// إظهار أدوات الجدول أو الصورة حسب مكانك
function updateCtx(){
  $('#imgBar').classList.toggle('hidden', !selImg);
  $('#tableBar').classList.toggle('hidden', !!selImg || !curCell());
}

/* =========================================================
   تبويب ملف
   ========================================================= */
$('#exportDoc').addEventListener('click', function(){
  saveDoc();
  var name = (current.title || 'مستند') + '.doc';
  var html = '<html><head><meta charset="utf-8"><title>' + escapeHtml(current.title) + '</title>' +
    '<style>body{font-family:Arial;font-size:13pt;direction:rtl}table{border-collapse:collapse}td{padding:6px}</style></head>' +
    '<body dir="rtl">' + current.html + '</body></html>';
  download(name, '﻿' + html, 'application/msword');
  toast('تم التصدير — يفتح في Word');
});
$('#dupDoc').addEventListener('click', function(){
  saveDoc();
  var d = { id: newId(), title: (current.title || 'مستند') + ' (نسخة)', html: current.html, icon: current.icon, updated: Date.now() };
  docs.push(d); saveData(KEY, docs);
  openDoc(d.id); toast('تم إنشاء نسخة');
});
$('#delDoc').addEventListener('click', function(){ saveDoc(); deleteDoc(current.id); });

/* ----- زر الرجوع ----- */
$('#back').addEventListener('click', function(e){
  if(current){ e.preventDefault(); e.stopPropagation(); saveDoc(); saveData(KEY, docs); showList(); }
}, true);

showList();
