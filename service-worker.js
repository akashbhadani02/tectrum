const CACHE = 'lead-followup-manager-v2';
const ASSETS = ['./', './index.html', './manifest.webmanifest','./manifest.json', './favicon.ico', './img/favicon.png', './img/icon-192.png', './img/icon-512.png', './img/tectrum.jpeg'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS))));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    const copy=response.clone(); caches.open(CACHE).then(c=>c.put(event.request,copy)); return response;
  }).catch(()=>caches.match('./index.html'))));
});
