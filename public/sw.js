/*
 * Pyme Hub · service worker (RF-061).
 * - Precachea la estructura de la app (HTML, estilos, iconos y todos los módulos JS).
 *   Al añadir un módulo nuevo, inclúyelo en SHELL (lista ordenada de js/).
 * - Red primero para los archivos propios y copia en caché de lo que se abre:
 *   los módulos de cada vista quedan disponibles sin conexión después de usarlos.
 * - Nunca cachea la API ni recursos de otros orígenes (datos personales, sesión).
 * Al publicar una versión nueva, sube VERSION para limpiar las cachés anteriores.
 */
const VERSION = 'v0.7.0';
const CACHE = `pymehub-${VERSION}`;

const SHELL = [
  // Estructura y estilos
  './',
  'index.html',
  'manifest.webmanifest',
  'styles/tokens.css',
  'styles/globals.css',
  'styles/responsive.css',
  'styles/brand.css',
  'styles/modules.css',
  'assets/icons/sprite.svg',
  'assets/brand/simbolo.png',
  'assets/brand/logo.png',
  'assets/brand/favicon-32.png',
  'assets/brand/icon-192.png',
  'vendor/chartjs/chart.umd.js',
  // Todos los módulos de la app: así cualquier vista abre sin conexión, también el check-in (RF-062)
  'js/app.js',
  'js/components/brand/AnimatedLogo.js',
  'js/components/brand/BrandBackground.js',
  'js/components/dashboard/KPICard.js',
  'js/components/dashboard/KPIGrid.js',
  'js/components/dashboard/WelcomeHeader.js',
  'js/components/layout/AppShell.js',
  'js/components/layout/Brand.js',
  'js/components/layout/MobileNavigation.js',
  'js/components/layout/Page.js',
  'js/components/layout/Sidebar.js',
  'js/components/layout/Topbar.js',
  'js/components/training/AssignDialog.js',
  'js/components/ui/Avatar.js',
  'js/components/ui/Badge.js',
  'js/components/ui/Button.js',
  'js/components/ui/Card.js',
  'js/components/ui/Field.js',
  'js/components/ui/Icon.js',
  'js/components/ui/Progress.js',
  'js/components/ui/StateView.js',
  'js/components/ui/Table.js',
  'js/components/ui/Toast.js',
  'js/config.example.js',
  'js/lib/auth-actions.js',
  'js/lib/charts.js',
  'js/lib/dom.js',
  'js/lib/escape.js',
  'js/lib/format.js',
  'js/lib/navigation.js',
  'js/lib/offline-queue.js',
  'js/lib/risk.js',
  'js/lib/router.js',
  'js/lib/store.js',
  'js/lib/training.js',
  'js/lib/wellbeing.js',
  'js/routes.js',
  'js/services/api.js',
  'js/views/admin/empresas.js',
  'js/views/admin/inicio.js',
  'js/views/employee/asesor.js',
  'js/views/employee/checkin.js',
  'js/views/employee/formacion.js',
  'js/views/employee/inicio.js',
  'js/views/employee/modulo.js',
  'js/views/management/bienestar.js',
  'js/views/management/configuracion.js',
  'js/views/management/equipos.js',
  'js/views/management/formacion-editor.js',
  'js/views/management/formacion-modulo.js',
  'js/views/management/formacion.js',
  'js/views/management/ia-rrhh-metodologia.js',
  'js/views/management/ia-rrhh.js',
  'js/views/management/inicio.js',
  'js/views/management/plantilla-ficha.js',
  'js/views/management/plantilla-nuevo.js',
  'js/views/management/plantilla-tabs.js',
  'js/views/management/plantilla.js',
  'js/views/public/auth-layout.js',
  'js/views/public/invitacion.js',
  'js/views/public/login.js',
  'js/views/public/sitio.js',
  'js/views/shared/mas.js',
  'js/views/shared/proximamente.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(SHELL)
        // config.js no se versiona (RNF-005): se guarda si existe, sin bloquear la instalación
        .then(() => cache.add('js/config.js').catch(() => {})))
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
