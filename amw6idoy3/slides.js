// ===== العروض =====
var KEY = 'office-slides';
var decks = loadData(KEY, []);
var deck = null;      // العرض المفتوح
var index = 0;        // رقم الشريحة الحالية

var COLORS = ['#ffffff', '#fff8e1', '#e3f2fd', '#1e7e45', '#1565c0', '#6a1b9a', '#c62828', '#ef6c00', '#263238'];
var listView = $('#listView'), editView = $('#editView');

// لون النص المناسب للخلفية (فاتح أو غامق)
function textColor(bg){
  var n = parseInt(bg.slice(1), 16);
  var light = ((n >> 16) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000;
  return light > 150 ? '#1f2328' : '#ffffff';
}

var saveTimer;
function save(){
  if(deck) deck.updated = Date.now();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(function(){ saveData(KEY, decks); }, 300);
}
function findDeck(id){ return decks.filter(function(d){ return d.id === id; })[0]; }

/* ----- القائمة ----- */
function showList(){
  deck = null;
  editView.classList.add('hidden');
  listView.classList.remove('hidden');
  decks.sort(function(a, b){ return b.updated - a.updated; });
  var box = $('#items');
  if(!decks.length){ box.innerHTML = '<div class="empty">لا توجد عروض بعد</div>'; return; }
  box.innerHTML = decks.map(function(d){
    return '<div class="item" data-id="' + d.id + '">' +
      '<div class="item-icon">🎞</div><div class="info"><b>' + escapeHtml(d.title || 'بدون اسم') + '</b><small>' + d.slides.length + ' شريحة — ' + niceDate(d.updated) + '</small></div>' +
      '<button class="del" data-del="' + d.id + '">🗑</button></div>';
  }).join('');
}
$('#items').addEventListener('click', function(e){
  var del = e.target.closest('[data-del]');
  if(del){
    var id = del.getAttribute('data-del'), d = findDeck(id);
    ask('حذف "' + (d.title || 'بدون اسم') + '"؟', function(){
      decks = decks.filter(function(x){ return x.id !== id; });
      saveData(KEY, decks); showList(); toast('تم الحذف');
    });
    return;
  }
  var item = e.target.closest('.item');
  if(item) openDeck(item.getAttribute('data-id'));
});
$('#newDeck').addEventListener('click', function(){
  var d = { id: newId(), title: '', updated: Date.now(),
            slides: [{ t: 'عنوان العرض', b: 'اسمك أو وصف قصير', bg: '#1565c0' }] };
  decks.push(d); saveData(KEY, decks);
  openDeck(d.id);
});

/* ----- المحرر ----- */
function openDeck(id){
  deck = findDeck(id);
  index = 0;
  listView.classList.add('hidden');
  editView.classList.remove('hidden');
  $('#deckTitle').value = deck.title;
  drawSlide(); drawThumbs();
}
function drawSlide(){
  var s = deck.slides[index];
  var el = $('#slide');
  el.style.background = s.bg;
  el.style.color = textColor(s.bg);
  $('#sTitle').value = s.t;
  $('#sBody').value = s.b;
  $('#colors').innerHTML = COLORS.map(function(c){
    return '<button data-c="' + c + '" style="background:' + c + '" class="' + (c === s.bg ? 'on' : '') + '"></button>';
  }).join('');
}
function drawThumbs(){
  $('#thumbs').innerHTML = deck.slides.map(function(s, i){
    return '<div class="thumb ' + (i === index ? 'on' : '') + '" data-i="' + i + '" style="background:' + s.bg + ';color:' + textColor(s.bg) + '">' +
      '<i>' + (i + 1) + '</i><b>' + escapeHtml(s.t) + '</b></div>';
  }).join('');
  var on = $('#thumbs .on');
  if(on && on.scrollIntoView) on.scrollIntoView(false);
}

$('#deckTitle').addEventListener('input', function(e){ deck.title = e.target.value.trim(); save(); });
$('#sTitle').addEventListener('input', function(e){ deck.slides[index].t = e.target.value; save(); drawThumbs(); });
$('#sBody').addEventListener('input', function(e){ deck.slides[index].b = e.target.value; save(); });
$('#colors').addEventListener('click', function(e){
  var b = e.target.closest('button'); if(!b) return;
  deck.slides[index].bg = b.getAttribute('data-c'); save(); drawSlide(); drawThumbs();
});
$('#thumbs').addEventListener('click', function(e){
  var t = e.target.closest('.thumb'); if(!t) return;
  index = +t.getAttribute('data-i'); drawSlide(); drawThumbs();
});

$('#addSlide').addEventListener('click', function(){
  var bg = deck.slides[index].bg === '#1565c0' ? '#ffffff' : deck.slides[index].bg;
  deck.slides.splice(index + 1, 0, { t: '', b: '', bg: bg });
  index++; save(); drawSlide(); drawThumbs(); $('#sTitle').focus();
});
$('#dupSlide').addEventListener('click', function(){
  var s = deck.slides[index];
  deck.slides.splice(index + 1, 0, { t: s.t, b: s.b, bg: s.bg });
  index++; save(); drawSlide(); drawThumbs(); toast('تم تكرار الشريحة');
});
$('#delSlide').addEventListener('click', function(){
  if(deck.slides.length === 1) return toast('يجب أن تبقى شريحة واحدة على الأقل');
  ask('حذف الشريحة ' + (index + 1) + '؟', function(){
    deck.slides.splice(index, 1);
    index = Math.min(index, deck.slides.length - 1);
    save(); drawSlide(); drawThumbs();
  });
});
function move(step){
  var to = index + step;
  if(to < 0 || to >= deck.slides.length) return;
  var tmp = deck.slides[index];
  deck.slides[index] = deck.slides[to];
  deck.slides[to] = tmp;
  index = to; save(); drawSlide(); drawThumbs();
}
$('#moveUp').addEventListener('click', function(){ move(-1); });
$('#moveDown').addEventListener('click', function(){ move(1); });

/* ----- تشغيل العرض ----- */
var playIndex = 0;
function drawShow(){
  var s = deck.slides[playIndex], el = $('#showSlide');
  el.style.background = s.bg;
  el.style.color = textColor(s.bg);
  el.classList.remove('anim'); void el.offsetWidth; el.classList.add('anim');
  el.innerHTML = '<h1>' + escapeHtml(s.t) + '</h1><p>' + escapeHtml(s.b) + '</p>';
  $('#count').textContent = (playIndex + 1) + '/' + deck.slides.length;
}
function go(step){
  var to = playIndex + step;
  if(to >= deck.slides.length){ exitShow(); return; }
  if(to < 0) return;
  playIndex = to; drawShow();
}
function exitShow(){
  $('#show').classList.add('hidden'); $('#showNav').classList.add('hidden');
  try { if(document.fullscreenElement) document.exitFullscreen(); } catch(e){}
}
$('#play').addEventListener('click', function(){
  playIndex = index;
  $('#show').classList.remove('hidden'); $('#showNav').classList.remove('hidden');
  try { var r = document.documentElement.requestFullscreen(); if(r && r.catch) r.catch(function(){}); } catch(e){}
  drawShow();
});
$('#next').addEventListener('click', function(){ go(1); });
$('#prev').addEventListener('click', function(){ go(-1); });
$('#exit').addEventListener('click', exitShow);

// لمس الشاشة = التالي، والسحب يميناً أو يساراً للتنقل
var startX = null, swiped = false;
$('#show').addEventListener('touchstart', function(e){ startX = e.touches[0].clientX; swiped = false; });
$('#show').addEventListener('touchend', function(e){
  if(startX === null) return;
  var dx = e.changedTouches[0].clientX - startX;
  if(Math.abs(dx) > 50){ swiped = true; go(dx > 0 ? 1 : -1); }
  startX = null;
});
$('#show').addEventListener('click', function(){ if(!swiped) go(1); swiped = false; });

/* ----- زر الرجوع ----- */
$('#back').addEventListener('click', function(e){
  if(deck){ e.preventDefault(); saveData(KEY, decks); showList(); }
});

showList();
