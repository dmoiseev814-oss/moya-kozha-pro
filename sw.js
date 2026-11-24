/* МОЯ КОЖА PRO — локальная PWA; повысить версию при следующей публикации. */
const CACHE_NAME = 'moya-kozha-pro-shell-v1.3.0';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  // Установка завершается только при успешном кэшировании ВСЕХ обязательных файлов.
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(
      names.filter((name) => name.startsWith('moya-kozha-pro-shell-') && name !== CACHE_NAME)
        .map((name) => caches.delete(name))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const scope = new URL(self.registration.scope);
  // Не перехватываем чужие ресурсы, другие папки и запросы извне проекта.
  if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match(request, { ignoreSearch: true }))
          || (await cache.match('./index.html'))
          || (await cache.match('./'))
          || Response.error();
      })
    );
    return;
  }

  // Критически важные статические файлы — из кэша с возможностью обновления
  // при следующей версии Service Worker. Остальные запросы — без кэширования.
  event.respondWith(
    caches.match(request, { ignoreSearch: true })
      .then((cached) => cached || fetch(request))
  );
});
