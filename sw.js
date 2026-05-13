// sw.js — Service Worker do La Moda - Fabi
// Estrategia:
//   - SHELL estatico cacheado (cache-first com background-update)
//   - Requests pro Firebase NAO sao interceptadas (o SDK gerencia IndexedDB proprio)
//   - Bump de CACHE_VERSION invalida o cache antigo

const CACHE_VERSION = 'v0.0.3';
const CACHE_SHELL   = `lamoda-fabi-shell-${CACHE_VERSION}`;

const SHELL_FILES = [
  '/',
  '/index.html',
  '/app.js',
  '/manifest.webmanifest',
  '/shared/styles.css',
  '/shared/firebase.js',
  '/shared/auth.js',
  '/shared/auth-gate.js',
  '/vendas/',
  '/vendas/index.html',
  '/vendas/vendas.js',
  '/visitas/',
  '/visitas/index.html',
  '/visitas/visitas.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_SHELL).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_SHELL).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1) Nao interceptar Firebase / Google APIs / fontes.
  //    Firebase SDK tem seu proprio offline (IndexedDB).
  const passthroughHosts = [
    'firebaseio.com',
    'firestore.googleapis.com',
    'identitytoolkit.googleapis.com',
    'securetoken.googleapis.com',
    'firebasestorage.googleapis.com',
    'firebaseinstallations.googleapis.com',
    'firebase.googleapis.com',
    'apis.google.com',
    'accounts.google.com',
    'gstatic.com',
    'googleusercontent.com'
  ];
  if (passthroughHosts.some((h) => url.hostname.endsWith(h))) {
    return; // browser handles
  }

  // 2) So GET de mesma origem.
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // 3) Cache-first com background-update.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((fresh) => {
          if (fresh && fresh.ok) {
            const copy = fresh.clone();
            caches.open(CACHE_SHELL).then((cache) => cache.put(event.request, copy));
          }
          return fresh;
        })
        .catch(() => cached); // offline: serve cached

      return cached || fetchPromise;
    })
  );
});
