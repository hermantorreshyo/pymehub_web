import { h } from '../../lib/dom.js';
import { isActive } from '../../lib/navigation.js';
import { session } from '../../lib/store.js';
import { icon } from '../ui/Icon.js';
import { mobileNavigation } from './MobileNavigation.js';
import { sidebar } from './Sidebar.js';
import { topbar } from './Topbar.js';

/** Banda de estado (sin conexión, mantenimiento) encima de la barra superior. */
export function statusBanner() {
  const banner = h('div', { class: 'status-banner', role: 'status', hidden: true });
  banner.show = (text, iconName = 'wifi-off') => {
    banner.replaceChildren(icon(iconName), h('span', { text }));
    banner.hidden = false;
  };
  banner.hide = () => { banner.hidden = true; };
  return banner;
}

/**
 * Estructura de la aplicación con sesión (§13.3):
 * Sidebar + MainArea (Topbar + contenido) + navegación inferior.
 */
export function appShell() {
  const grupo = session.grupo;
  const main = h('main', { class: 'main-area', id: 'contenido', tabindex: '-1' });
  const banner = statusBanner();

  const root = h('div', { class: ['app-shell', `app-shell--${grupo}`] },
    grupo === 'empleado' ? null : sidebar(),
    h('div', { class: 'topbar-area' }, banner, topbar()),
    main,
    mobileNavigation());

  return {
    root,
    main,
    banner,
    /** Marca la sección activa en todas las navegaciones. */
    setActive(path) {
      root.querySelectorAll('[data-nav]').forEach((link) => {
        const item = { path: link.getAttribute('href').slice(1) };
        if (isActive(item, path)) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      });
    },
  };
}
