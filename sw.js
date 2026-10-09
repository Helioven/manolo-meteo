const CACHE = 'manolo-meteo-shell-v1-8-2';
const PREFIX = 'manolo-meteo-shell-';
const FILES = ['./','./index.html','./style.css?v=1.8.2','./app.js?v=1.8.2','./manifest.webmanifest','./icon.svg','./cordoba-skyline.svg','./cloud-soft.svg','./sun-disc.svg','./icon-192.png','./icon-512.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key))
  )));
  self.clients.claim();
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;
  event.respondWith(
    fetch(event.request).then(async response => {
      if (!response.ok) {
        const fallback = await caches.match(event.request);
        return fallback || response;
      }
      const cache = await caches.open(CACHE);
      await cache.put(event.request, response.clone()).catch(() => {});
      return response;
    }).catch(async () => (await caches.match(event.request)) || Response.error())
  );
});
