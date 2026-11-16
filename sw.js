// Laboratorio int004: cada versión espera hasta que cierren los clientes de la anterior.
const CACHE = 'manolo-meteo-shell-experimental-metfavoritesfix001a-aislada';
const PREFIX = 'manolo-meteo-shell-experimental-';
const FILES = ['./weather-visuals.js?v=metcanvasfinal001','./weather-visuals.css?v=metcanvasfinal001','./sky-recuperado/chubascos-nocturnos-18.webp','./sky-recuperado/tormenta-nocturna-19.webp','./sky-recuperado/parcialmente-nublado-12.webp','./sky-recuperado/nublado-cubierto-11.webp','./sky-recuperado/chubascos-nubes-09.webp','./sky-recuperado/noche-despejada-15.webp','./sky-recuperado/noche-nublada-16.webp','./','./index.html','./style.css?v=metfooter001a','./app.js?v=metfavoritesfix001a','./frases-provisionales.js?v=metcanvasfinal001','./frases-prototipo.js?v=metadvicefix002a','./safety-browser.js?v=metvisual003','./i18n-ui-005h.js?v=metfooter001a','./i18n-risk-draft-005g.js?v=metvisual003','./referencia-met-ux-003/assets/cielo-sol.webp','./referencia-met-ux-003/assets/cielo-lluvia.webp','./referencia-met-ux-003/assets/cielo-frio.webp','./referencia-met-ux-003/assets/cielo-tormenta.webp','./referencia-met-ux-003/assets/cielo-calor-ux003.webp','./referencia-met-ux-003/assets/lluvia-optimizada-q95.webp','./referencia-met-ux-003/assets/sol.webp','./referencia-met-ux-003/assets/frio.webp','./referencia-met-ux-003/assets/calor.webp','./referencia-met-ux-003/assets/seleccion-002/11_neutro-definitivo.webp','./referencia-met-ux-003/assets/frio-extremo.webp','./referencia-met-ux-003/assets/seleccion-002/01_corporativa_cabecera-384.webp','./referencia-met-ux-003/assets/seleccion-002/02_buscador_ciudades-384.webp','./manifest.webmanifest','./icon.svg','./cordoba-skyline.svg','./cloud-soft.svg','./sun-disc.svg','./icon-192.png','./icon-512.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)))));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (event.request.mode === 'navigate') return (await cache.match('./index.html')) || Response.error();
    const cached = await cache.match(event.request);
    if (cached) return cached;
    // Guardar solo las ocho escenas aprobadas, cuando se solicitan por primera vez.
    const scenes = new Set(['03_soleado.webp','04_nublado.webp','05_lluvia_ligera.webp','06_lluvia.webp','07_frio_ligero.webp','08_frio_nieve.webp','09_calor_extremo.webp','10_tormenta.webp']);
    const sceneBase = new URL('./referencia-met-ux-003/assets/seleccion-002/', self.registration.scope);
    const name = url.pathname.slice(sceneBase.pathname.length);
    try {
      const response = await fetch(event.request);
      if (url.pathname.startsWith(sceneBase.pathname) && scenes.has(name) && !url.search && response.ok) {
        try { await cache.put(event.request, response.clone()); } catch (_) { /* Una cuota llena no impide mostrar la imagen. */ }
      }
      return response;
    } catch (_) { return Response.error(); }
  })());
});



