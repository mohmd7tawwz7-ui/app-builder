// ===== أدوات مشتركة لكل الصفحات =====
function $(s){ return document.querySelector(s); }

// إظهار أي خطأ على الشاشة حتى نعرف المشكلة
window.onerror = function(msg, src, line){
  toast('خطأ: ' + msg + (line ? ' (سطر ' + line + ')' : ''));
};

function loadData(name, def){
  try {
    var v = JSON.parse(localStorage.getItem(name));
    return (v === null || v === undefined) ? def : v;
  } catch(e){ return def; }
}
function saveData(name, value){
  try { localStorage.setItem(name, JSON.stringify(value)); }
  catch(e){ toast('تعذّر الحفظ'); }
}

var _toastTimer;
function toast(msg){
  var t = $('#toast');
  if(!t){
    t = document.createElement('div');
    t.id = 'toast'; t.className = 'toast';
    t.appendChild(document.createElement('span'));
    document.body.appendChild(t);
  }
  t.querySelector('span').textContent = msg;
  t.classList.add('toast-on');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(function(){ t.classList.remove('toast-on'); }, 2500);
}

// نافذة تأكيد داخل التطبيق (بدل confirm الذي لا يعمل في بعض التطبيقات)
function ask(msg, onYes){
  var bg = document.createElement('div');
  bg.className = 'dlg-bg';
  bg.innerHTML = '<div class="dlg"><p></p><div class="dlg-btns">' +
                 '<button class="dlg-no">إلغاء</button><button class="dlg-yes">نعم</button></div></div>';
  bg.querySelector('p').textContent = msg;
  document.body.appendChild(bg);
  bg.querySelector('.dlg-no').onclick = function(){ bg.parentNode.removeChild(bg); };
  bg.querySelector('.dlg-yes').onclick = function(){ bg.parentNode.removeChild(bg); onYes(); };
}

function download(fileName, content, type){
  var a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type: type }));
  a.download = fileName;
  document.body.appendChild(a); a.click(); a.parentNode.removeChild(a);
}

function newId(){ return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

function escapeHtml(s){
  return String(s).replace(/[&<>"]/g, function(c){
    return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c];
  });
}

function niceDate(t){
  try {
    return new Date(t).toLocaleDateString('ar', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });
  } catch(e){
    var d = new Date(t);
    return d.getDate() + '/' + (d.getMonth() + 1) + ' ' + d.getHours() + ':' + ('0' + d.getMinutes()).slice(-2);
  }
}

// تسطيح المصفوفات المتداخلة (بديل flat)
function flatAll(a){
  var out = [];
  (function walk(x){
    for(var i = 0; i < x.length; i++){
      if(Array.isArray(x[i])) walk(x[i]); else out.push(x[i]);
    }
  })(a);
  return out;
}

// ===== تأثير الموجة عند لمس الأزرار =====
var RIPPLE_SEL = 'button, .card, .item, .new-btn';
function addRipple(e){
  var el = e.target.closest ? e.target.closest(RIPPLE_SEL) : null;
  if(!el || el.closest('.slide') || el.closest('#grid')) return;
  var pt = e.touches ? e.touches[0] : e;
  var r = el.getBoundingClientRect(), size = Math.max(r.width, r.height);
  var s = document.createElement('span');
  s.className = 'ripple';
  s.style.width = s.style.height = size + 'px';
  s.style.left = (pt.clientX - r.left - size / 2) + 'px';
  s.style.top = (pt.clientY - r.top - size / 2) + 'px';
  if(getComputedStyle(el).position === 'static') el.style.position = 'relative';
  el.classList.add('rp');
  el.appendChild(s);
  setTimeout(function(){ if(s.parentNode) s.parentNode.removeChild(s); }, 600);
}
var _touched = false;
document.addEventListener('touchstart', function(e){ _touched = true; addRipple(e); }, { passive: true });
document.addEventListener('mousedown', function(e){ if(!_touched) addRipple(e); });

// ===== انتقال ناعم بين الصفحات =====
document.addEventListener('click', function(e){
  var a = e.target.closest ? e.target.closest('a[href]') : null;
  if(!a || e.defaultPrevented) return;
  var href = a.getAttribute('href');
  if(!href || href.charAt(0) === '#' || /^(https?:|blob:|data:)/.test(href) || a.hasAttribute('download')) return;
  e.preventDefault();
  document.body.classList.add('leaving');
  setTimeout(function(){ location.href = href; }, 180);
});
// إصلاح الرجوع بزر الجوال (الصفحة المحفوظة في الذاكرة)
window.addEventListener('pageshow', function(){ document.body.classList.remove('leaving'); });

// ===== نافذة سفلية (لاختيار القوالب والإعدادات) =====
function openSheet(title, bodyHTML){
  var bg = document.createElement('div');
  bg.className = 'sheet-bg';
  bg.innerHTML = '<div class="sheet"><div class="sheet-handle"></div><h3></h3><div class="sheet-body"></div></div>';
  bg.querySelector('h3').textContent = title;
  bg.querySelector('.sheet-body').innerHTML = bodyHTML;
  document.body.appendChild(bg);
  function close(){ if(bg.parentNode) bg.parentNode.removeChild(bg); }
  bg.addEventListener('click', function(e){ if(e.target === bg) close(); });
  return { el: bg, close: close };
}

// اختيار قالب من قائمة
function chooseTemplate(title, list, onPick){
  var html = '<div class="tpl-grid">' + list.map(function(t, i){
    return '<button class="tpl" data-i="' + i + '" style="--tc:' + (t.color || '#64748b') + '">' +
      '<span class="tpl-icon">' + t.icon + '</span><b>' + t.name + '</b><small>' + t.desc + '</small></button>';
  }).join('') + '</div>';
  var s = openSheet(title, html);
  s.el.querySelector('.tpl-grid').addEventListener('click', function(e){
    var b = e.target.closest('.tpl'); if(!b) return;
    s.close();
    onPick(list[+b.getAttribute('data-i')]);
  });
}

// تصغير الصورة قبل حفظها (حتى لا تمتلئ ذاكرة الجوال)
function readImage(file, maxW, cb){
  var fr = new FileReader();
  fr.onload = function(){
    var img = new Image();
    img.onload = function(){
      var w = img.width, h = img.height;
      if(w > maxW){ h = Math.round(h * maxW / w); w = maxW; }
      var cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      var ctx = cv.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      cb(cv.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = function(){ toast('تعذّر فتح الصورة'); };
    img.src = fr.result;
  };
  fr.readAsDataURL(file);
}

function todayStr(){
  var d = new Date();
  return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear();
}
