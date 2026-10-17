/**
 * Pyme Hub · arranque de la PWA.
 * 1. Carga la configuración (js/config.js, no versionado).
 * 2. Recupera la sesión con GET /v1/auth/me.
 * 3. Arranca el enrutado por hash y pinta la vista en el AppShell o en la pantalla de acceso.
 */
import { auth, configureApi, publicApi } from './services/api.js';
import { formatDate, formatDateTime } from './lib/format.js';
// Captura temprana del aviso de instalación (beforeinstallprompt) para #/instalar
import './lib/install.js';
import { h } from './lib/dom.js';
import { flush, onPendingChange, pending } from './lib/offline-queue.js';
import { currentPath, navigate, parseHash, resolve, startRouter } from './lib/router.js';
import { session } from './lib/store.js';
import { appShell } from './components/layout/AppShell.js';
import { page } from './components/layout/Page.js';
import { card } from './components/ui/Card.js';
import { emptyState, errorState, loadingState } from './components/ui/StateView.js';
import { brandBackground } from './components/brand/BrandBackground.js';
import { routes } from './routes.js';
import { toast } from './components/ui/Toast.js';

const app = document.getElementById('app');
let shell = null;          // { root, main, banner, setActive, key }
let firstRender = true;

/* ---------- Pantallas sin AppShell ---------- */

function fullScreen(...children) {
  app.replaceChildren(h('main', { class: 'splash', id: 'contenido', tabindex: '-1' },
    brandBackground(),
    h('div', { class: 'splash__symbol' },
      h('img', { src: 'assets/brand/simbolo.png', alt: '', width: 64, height: 64 })),
    ...children));
}

function configError() {
  fullScreen(
    h('h1', { text: 'Falta la configuración de Pyme Hub' }),
    h('p', { text: 'Copia public/js/config.example.js como public/js/config.js e indica la URL de la API.' }));
}

/* ---------- Vistas de sistema dentro del AppShell ---------- */

function deniedView(reason) {
  const plan = reason === 'plan';
  return page({
    title: plan ? 'Disponible en otro plan' : 'Sección no disponible',
    children: [card({
      body: emptyState({
        title: plan ? 'Esta funcionalidad no está incluida en el plan de tu empresa.' : 'Esta sección no está disponible para tu perfil.',
        text: plan ? 'Si te interesa, habla con tu persona de contacto en Pyme Hub.' : 'Si crees que deberías verla, consulta con la gerencia de tu empresa.',
        iconName: 'lock',
        action: h('a', { class: 'btn btn--secondary', href: '#/inicio', text: 'Volver al inicio' }),
      }),
    })],
  });
}

function notFoundView() {
  return page({
    title: 'Página no encontrada',
    children: [card({
      body: emptyState({
        title: 'No encontramos esta página.',
        text: 'Puede que el enlace esté incompleto o que la sección haya cambiado de sitio.',
        iconName: 'search',
        action: h('a', { class: 'btn btn--secondary', href: '#/inicio', text: 'Volver al inicio' }),
      }),
    })],
  });
}

/* ---------- AppShell y foco ---------- */

function ensureShell() {
  const key = `${session.grupo}:${session.me.usuario.id}:${(session.me.features ?? []).join(',')}`;
  if (shell?.key === key && shell.root.isConnected) return shell;
  shell = { ...appShell(), key };
  app.replaceChildren(shell.root);
  updateConnectionBanner();
  updateNotices();
  if (navigator.onLine) refreshStatus(); // al crear el shell (arranque o nuevo inicio de sesión)
  return shell;
}

/* ---------- Avisos: mantenimiento programado (RNF-063) y empresa de baja (RF-111) ---------- */

let platformStatus = null;
async function refreshStatus() {
  try {
    platformStatus = await publicApi.status();
  } catch {
    platformStatus = null; // sin conexión o API caída: no se avisa de nada
  }
  updateNotices();
}

function updateNotices() {
  if (!shell) return;
  const borrado = session.me?.interlocutor?.fecha_borrado;
  const prog = platformStatus?.programado;
  // Vigencia de la suscripción (fase 9b): la gerencia ve el enlace para renovar
  const v = session.me?.vigencia;
  const gerente = session.perfil === 'GERENTE';
  const renovar = gerente ? { href: '#/suscripcion', text: 'Ir a Suscripción' } : null;
  if (borrado) {
    shell.notice.show(`Tu empresa está de baja: solo lectura. Sus datos se borrarán el ${formatDate(borrado, 'long')}; puedes exportarlos en Configuración.`, 'triangle-alert');
  } else if (v?.estado === 'VENCIDA') {
    shell.notice.show(gerente
      ? 'La suscripción ha vencido: Pyme Hub está en solo lectura hasta renovarla.'
      : 'La suscripción de tu empresa ha vencido: puedes consultar, pero no registrar nada nuevo hasta que se renueve.', 'circle-alert', renovar);
  } else if (prog) {
    shell.notice.show(`Mantenimiento programado: ${formatDateTime(prog.inicio)} – ${formatDateTime(prog.fin)}.${prog.mensaje ? ` ${prog.mensaje}` : ''}`, 'clock');
  } else if (v?.estado === 'GRACIA' && session.grupo === 'gestion') {
    shell.notice.show(`La suscripción venció el ${formatDate(v.periodo_fin, 'long')}. Todo funciona hasta el ${formatDate(v.gracia_hasta, 'long')}; después quedará en solo lectura.`, 'triangle-alert', renovar);
  } else if (v?.estado === 'PRUEBA' && gerente && v.dias_restantes !== null && v.dias_restantes <= 7) {
    shell.notice.show(v.dias_restantes <= 0 ? 'La prueba gratuita termina hoy.' : `Te ${v.dias_restantes === 1 ? 'queda 1 día' : `quedan ${v.dias_restantes} días`} de prueba gratuita.`, 'clock', { href: '#/suscripcion', text: 'Contratar' });
  } else {
    shell.notice.hide();
  }
}

/** Tras navegar, el foco va al título de la vista para lectores de pantalla (RNF-045). */
function focusTitle(container) {
  if (firstRender) return;
  const title = container.querySelector('h1');
  (title ?? container).focus({ preventScroll: true });
  window.scrollTo({ top: 0 });
}

async function renderRoute(decision) {
  const { route, params = {}, query = {}, loader, isCurrent } = decision;

  // Sin sesión: rutas públicas a pantalla completa; cualquier otra lleva al acceso
  if (!session.isAuthenticated) {
    shell = null;
    if (decision.notFound || !loader) {
      navigate('/acceso', {}, { replace: true });
      return;
    }
  }

  const isPublic = Boolean(route?.site) || (Boolean(route?.public) && !session.isAuthenticated);
  if (isPublic) shell = null;
  const target = isPublic ? null : ensureShell();
  const container = isPublic ? app : target.main;
  target?.setActive(currentPath());

  let result;
  if (decision.notFound) {
    result = notFoundView();
  } else if (decision.denied) {
    result = deniedView(decision.denied);
  } else {
    if (!isPublic) {
      container.setAttribute('aria-busy', 'true');
      container.replaceChildren(h('div', { class: 'loading-brand' },
        h('div', { class: 'brand-bar', 'aria-hidden': 'true' }),
        loadingState({ label: 'Cargando la sección…', lines: 4 })));
    }
    try {
      const mod = await loader();
      if (!isCurrent()) return;
      result = await mod.default({ params, query, route, navigate });
    } catch (error) {
      if (!isCurrent()) return;
      console.error(error);
      result = page({
        title: 'No se ha podido abrir la sección',
        children: [card({ body: errorState({ error, onRetry: resolve, title: 'No se ha podido abrir esta sección.' }) })],
      });
    } finally {
      container.removeAttribute('aria-busy');
    }
  }
  if (!isCurrent()) return;

  if (isPublic) {
    app.replaceChildren(result.node);
    window.scrollTo({ top: 0 });
  } else {
    // Entrada sutil de la vista y escalonado de KPI y tarjetas (RNF-047)
    result.node.classList.add('view-enter');
    container.replaceChildren(result.node);
  }
  document.title = `${result.title} · Pyme Hub`;
  focusTitle(container);
  firstRender = false;
}

/* ---------- Conexión, cola sin conexión y mantenimiento (RF-062, RF-063) ---------- */

async function updateConnectionBanner() {
  if (!shell) return;
  if (navigator.onLine) {
    if (!shell.maintenance) shell.banner.hide();
    return;
  }
  let count = 0;
  try { count = await pending(); } catch { /* IndexedDB no disponible */ }
  shell.banner.show(count > 0
    ? `Sin conexión — se enviará al recuperar la señal (${count} pendiente${count === 1 ? '' : 's'})`
    : 'Sin conexión. Algunas secciones no estarán disponibles hasta recuperar la señal.');
}

window.addEventListener('offline', updateConnectionBanner);
window.addEventListener('online', async () => {
  updateConnectionBanner();
  if (!session.isAuthenticated) return;
  // Si se abrió sin conexión, se verifica ahora la sesión real antes de enviar la cola
  if (session.offline) {
    try {
      session.set(await auth.me());
    } catch {
      return; // sesión caducada: el evento ph:sesion-caducada lleva al acceso
    }
  }
  await sendPending();
});

/** Reenvía la cola sin conexión y avisa de lo enviado (RF-062, RF-063). */
async function sendPending() {
  const { sent = 0, failed = [] } = await flush().catch(() => ({}));
  if (sent > 0) toast(sent === 1 ? 'Hemos enviado lo que guardaste sin conexión.' : `Hemos enviado ${sent} registros que guardaste sin conexión.`);
  if (failed.length) toast('Un registro guardado sin conexión no se ha podido enviar. Vuelve a hacerlo, por favor.', { tone: 'error' });
}
onPendingChange(updateConnectionBanner);

// Tras un pago o una renovación, la vigencia cambia: se refresca el perfil y los avisos
window.addEventListener('ph:vigencia-cambiada', async () => {
  try {
    session.set(await auth.me());
    updateNotices();
  } catch { /* sin conexión: se actualizará en la siguiente comprobación */ }
});

window.addEventListener('ph:sesion-caducada', () => {
  const volver = currentPath();
  session.clear();
  shell = null;
  navigate('/acceso', { motivo: 'caducada', volver }, { replace: true });
});

window.addEventListener('ph:mantenimiento', (event) => {
  if (!shell) return;
  shell.maintenance = true;
  shell.banner.show(event.detail?.message ?? 'Pyme Hub está en mantenimiento.', 'clock');
});

/* ---------- Enlace "Saltar al contenido" con enrutado por hash ---------- */

document.addEventListener('click', (event) => {
  const link = event.target.closest('.skip-link');
  if (!link) return;
  event.preventDefault();
  document.getElementById('contenido')?.focus();
});

/* ---------- Service worker (RF-061) ---------- */

function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
  const register = () => navigator.serviceWorker.register('sw.js').catch((error) => console.warn('Service worker no registrado', error));
  // El arranque es asíncrono: si la página ya terminó de cargar, el evento 'load' no volverá a llegar
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}

/* ---------- Arranque ---------- */

async function restoreSession() {
  // Sin sesión previa en este navegador, el sitio público y el acceso no consultan la API:
  // así no aparece un 401 en la consola en cada visita. Las rutas privadas sí la consultan siempre.
  const { path } = parseHash();
  const publicRoute = path.startsWith('/invitacion/') || path.startsWith('/legal/') || routes.some((r) => (r.site || r.public) && r.path === path);
  if (publicRoute && !session.cached()) return true;
  try {
    session.set(await auth.me());
    return true;
  } catch (error) {
    if (error.code === 'PH-AUTH-002') return true; // sin sesión: se muestra el acceso
    // Sin cobertura: se abre con el último perfil conocido para poder hacer el check-in (RF-062)
    if (error.code === 'PH-NET-001' && session.cached()) {
      session.set({ ...session.cached(), offline: true });
      return true;
    }
    // El sitio público no depende de la API: si no responde, se muestra igualmente
    if (parseHash().path === '/') return true;
    fullScreen(
      errorState({
        error,
        title: 'No hemos podido conectar con Pyme Hub.',
        onRetry: () => boot(),
      }));
    return false;
  }
}

async function boot() {
  let config;
  try {
    ({ config } = await import('./config.js'));
  } catch {
    configError();
    return;
  }
  configureApi(config);
  // Vuelta desde Stripe Checkout sin la ruta (?pago=ok|cancelado): se abre la suscripción
  if (new URLSearchParams(location.search).has('pago') && (!location.hash || location.hash === '#/')) {
    history.replaceState(null, '', `${location.pathname}${location.search}#/suscripcion`);
  }
  if (!(await restoreSession())) return;
  if (session.isAuthenticated && !session.offline && navigator.onLine) sendPending();
  if (!boot.statusTimer) boot.statusTimer = setInterval(() => { if (session.isAuthenticated && navigator.onLine) refreshStatus(); }, 15 * 60 * 1000);
  if (!boot.started) {
    boot.started = true;
    registerServiceWorker();
    await startRouter(routes, renderRoute);
  } else {
    await resolve();
  }
}

boot();
