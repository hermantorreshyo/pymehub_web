/**
 * Instalación de la PWA a voluntad (página #/instalar, QR /app).
 *
 * - Chrome, Edge y Samsung Internet (Android y escritorio) emiten `beforeinstallprompt` una vez por
 *   carga: se guarda aquí, al arrancar, para lanzar el aviso nativo cuando la persona pulse «Instalar».
 * - iPhone y iPad no permiten lanzar la instalación desde la web: se explica «Añadir a pantalla de inicio».
 * - Los navegadores internos de otras apps (Instagram, LinkedIn, Facebook…) no instalan PWA.
 */

let deferred = null;
let installed = false;
const listeners = new Set();
const notify = () => listeners.forEach((fn) => fn(state()));

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault(); // la página decide cuándo ofrecerlo
  deferred = event;
  notify();
});
window.addEventListener('appinstalled', () => {
  installed = true;
  deferred = null;
  notify();
});

const ua = () => navigator.userAgent || '';

export function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

export function isIos() {
  // iPadOS se presenta como Mac: se distingue por la pantalla táctil
  return /iPhone|iPad|iPod/i.test(ua()) || (/Macintosh/.test(ua()) && navigator.maxTouchPoints > 1);
}

export function isAndroid() {
  return /Android/i.test(ua());
}

/** Navegador interno de otra app: no permite instalar. */
export function isInAppBrowser() {
  return /FBAN|FBAV|FB_IAB|Instagram|LinkedInApp|Twitter|Line\/|MicroMessenger|TikTok|Snapchat|GSA\//i.test(ua())
    || (isAndroid() && /; wv\)/.test(ua()));
}

/**
 * Estado para la interfaz:
 *   'instalada' | 'prompt' (botón nativo disponible) | 'interna' | 'ios' | 'manual'
 */
export function state() {
  if (installed || isStandalone()) return 'instalada';
  if (deferred) return 'prompt';
  if (isInAppBrowser()) return 'interna';
  if (isIos()) return 'ios';
  return 'manual';
}

/** Lanza el aviso nativo. Devuelve 'accepted', 'dismissed' o null si no está disponible. */
export async function promptInstall() {
  if (!deferred) return null;
  const event = deferred;
  deferred = null; // cada evento solo se puede usar una vez
  await event.prompt();
  const { outcome } = await event.userChoice;
  if (outcome === 'accepted') installed = true;
  notify();
  return outcome;
}

export function onInstallChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
