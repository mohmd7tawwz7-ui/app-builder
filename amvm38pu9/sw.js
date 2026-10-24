/* Service Worker: الشبكة أولًا ثم الذاكرة المؤقتة (حتى تظهر تعديلاتك فورًا) */
const CACHE = 'lasttrace-v4';
const FILES = ['./', 'index.html', 'css/style.css', 'manifest.json', 'icon.svg',
  'js/core.js', 'js/i18n.js', 'js/save.js', 'js/audio.js', 'js/input.js', 'js/world.js', 'js/player.js', 'js/sprites-data.js', 'js/sprites.js',
  'js/entities.js', 'js/levels.js', 'js/render.js', 'js/game.js', 'js/ui.js', 'js/main.js'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).catch(() => {})); self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then((r) => {
    const copy = r.clone();
    caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
    return r;
  }).catch(() => caches.match(e.request)));
});
