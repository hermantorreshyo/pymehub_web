/*
 * Pyme Hub · service worker (RF-061).
 * - Precachea la estructura de la app (HTML, estilos, arranque, iconos).
 * - Red primero para los archivos propios y copia en caché de lo que se abre:
 *   los módulos de cada vista quedan disponibles sin conexión después de usarlos.
 * - Nunca cachea la API ni recursos de otros orígenes (datos personales, sesión).
 * Al publicar una versión nueva, sube VERSION para limpiar las cachés anteriores.
 */
const VERSION = 'v0.1.0';
const CACHE = `pymehub-${VERSION}`;

const SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'styles/tokens.css',
  'styles/globals.css',
  'styles/responsive.css',
  'js/app.js',
  'js/routes.js',
  'js/services/api.js',
  'js/lib/dom.js',
  'js/lib/format.js',
  'js/lib/router.js',
  'js/lib/store.js',
  'js/lib/navigation.js',
  'js/lib/offline-queue.js',
  'js/lib/auth-actions.js',
  'js/components/layout/AppShell.js',
  'js/components/layout/Brand.js',
  'js/components/layout/Page.js',
  'js/components/layout/Sidebar.js',
  'js/components/layout/Topbar.js',
  'js/components/layout/MobileNavigation.js',
  'js/components/ui/Avatar.js',
  'js/components/ui/Badge.js',
  'js/components/ui/Button.js',
  'js/components/ui/Card.js',
  'js/components/ui/Icon.js',
  'js/components/ui/StateView.js',
  'js/components/ui/Toast.js',
  'assets/icons/sprite.svg',
  'assets/brand/simbolo.png',
  'assets/brand/logo.png',
  'assets/brand/favicon-32.png',
  'assets/brand/icon-192.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('pymehub-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // API, fuentes y CDN: siempre a la red

  // Navegaciones: red primero y, sin conexión, la app desde la caché
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('index.html'))
    );
    return;
  }

  // Archivos propios: red primero, guardando copia para usarla sin conexión
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached ?? Response.error()))
  );
});
