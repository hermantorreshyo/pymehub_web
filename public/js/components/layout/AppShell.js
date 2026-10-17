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

  // Demo comercial: aviso permanente para que nadie confunda los datos de ejemplo (DMO-024)
  const demo = session.me?.demo
    ? h('p', { class: 'demo-ribbon', role: 'note' }, icon('sparkles', { size: 'sm' }),
      h('span', { text: 'Estás en la demostración de Pyme Hub: datos 100 % ficticios que se restauran cada noche.' }))
    : null;

  // Avisos de la plataforma: mantenimiento programado (RNF-063) y empresa de baja (RF-111)
  const notice = h('p', { class: 'notice-banner', role: 'status', hidden: true });
  notice.show = (text, iconName = 'clock', link = null) => {
    notice.replaceChildren(icon(iconName, { size: 'sm' }), h('span', { text }),
      link ? h('a', { href: link.href, class: 'notice-banner__link', text: link.text }) : null);
    notice.hidden = false;
  };
  notice.hide = () => { notice.hidden = true; };

  const root = h('div', { class: ['app-shell', `app-shell--${grupo}`] },
    grupo === 'empleado' ? null : sidebar(),
    h('div', { class: 'topbar-area' }, banner, notice, demo, topbar()),
    main,
    mobileNavigation());

  return {
    root,
    main,
    banner,
    notice,
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
