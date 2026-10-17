import { publicApi } from '../../services/api.js';
import { h } from '../../lib/dom.js';
import { session } from '../../lib/store.js';
import { isAndroid, onInstallChange, promptInstall, state } from '../../lib/install.js';
import { icon } from '../../components/ui/Icon.js';
import { brandBackground } from '../../components/brand/BrandBackground.js';
import { toast } from '../../components/ui/Toast.js';

/**
 * «Instala Pyme Hub» (#/instalar): destino del QR /app.
 * Ofrece el botón nativo donde el navegador lo permite, explica los pasos en iPhone y en el resto,
 * y avisa si se abrió dentro de otra app. La visita del QR y la instalación se cuentan sin cookies
 * ni datos personales (POST /v1/public/visits).
 */

const CAMPANIA = 'instalar_app';

/** Parámetros de campaña del QR, leídos una vez al cargar (antes de limpiar la URL). */
const ORIGEN = (() => {
  const p = new URLSearchParams(location.search);
  const slug = (v) => (/^[a-z0-9_-]{1,40}$/.test(v ?? '') ? v : null);
  if (p.get('utm_campaign') !== CAMPANIA) return null;
  return { source: slug(p.get('utm_source')) ?? 'qr', medium: slug(p.get('utm_medium')) ?? 'impreso' };
})();
let visitSent = false;
let installSent = false;

const VENTAJAS = [
  ['smartphone', 'Un icono en tu pantalla de inicio', 'Se abre a pantalla completa, como cualquier app.'],
  ['wifi-off', 'Funciona sin cobertura', 'El check-in y la formación se guardan y se envían al recuperar la señal.'],
  ['shield-check', 'Sin tiendas de aplicaciones', 'Se instala desde el navegador, ocupa muy poco y se actualiza sola.'],
];

export default function installView() {
  if (ORIGEN && location.search) history.replaceState(null, '', `${location.pathname}#/instalar`);
  if (ORIGEN && !visitSent) {
    visitSent = true;
    publicApi.visit({ campaign: CAMPANIA, ...ORIGEN }).catch(() => {});
  }

  const panel = h('div', { class: 'install-panel', 'aria-live': 'polite' });
  const render = () => panel.replaceChildren(...content(state()));
  render();
  const off = onInstallChange((st) => {
    if (!panel.isConnected) { off(); return; }
    if (st === 'instalada' && !installSent) {
      installSent = true;
      publicApi.visit({ campaign: CAMPANIA, source: ORIGEN?.source ?? 'web', medium: 'instalacion' }).catch(() => {});
    }
    render();
  });

  const next = session.isAuthenticated ? '#/inicio' : '#/acceso';
  const node = h('div', { class: 'site install' },
    h('header', { class: 'site__header' },
      h('div', { class: 'site__bar' },
        h('a', { class: 'site__brand', href: '#/', 'aria-label': 'Pyme Hub, inicio' },
          h('img', { src: 'assets/brand/logo.png', alt: '', width: 150, height: 40 })))),
    h('main', { id: 'contenido', tabindex: '-1', class: 'install__main' },
      brandBackground(),
      h('div', { class: 'site__wrap install__inner' },
        h('img', { class: 'install__icon', src: 'assets/brand/icon-192.png', alt: '', width: 96, height: 96 }),
        h('h1', { tabindex: '-1', text: 'Instala Pyme Hub' }),
        h('p', { class: 'install__lead', text: 'Ten Pyme Hub a un toque: haz tu check-in, sigue tu formación y consulta a tu equipo desde la pantalla de inicio.' }),
        panel,
        h('ul', { class: 'install__benefits', role: 'list' },
          VENTAJAS.map(([ic, title, text]) => h('li', {},
            h('span', { class: 'feature__icon' }, icon(ic)),
            h('span', {}, h('strong', { text: title }), h('span', { class: 'small muted', text }))))),
        h('p', { class: 'install__alt' },
          h('a', { href: next, text: 'Prefiero usarla en el navegador' })))));
  return { title: 'Instala Pyme Hub', node };
}

/* ---------- Contenido según el navegador ---------- */

function content(st) {
  const next = session.isAuthenticated ? '#/inicio' : '#/acceso';
  if (st === 'instalada') {
    return [
      h('div', { class: 'install-done' }, icon('circle-check', { size: 'lg' }),
        h('p', {}, h('strong', { text: 'Pyme Hub ya está instalada en este dispositivo.' }),
          h('span', { text: ' Ábrela desde el icono de tu pantalla de inicio.' }))),
      h('a', { class: 'btn btn--primary btn--lg btn--block', href: next }, icon('arrow-right'), h('span', { text: 'Abrir Pyme Hub' })),
    ];
  }
  if (st === 'prompt') {
    const btn = h('button', { type: 'button', class: 'btn btn--primary btn--lg btn--block' },
      icon('download'), h('span', { text: 'Instalar Pyme Hub' }));
    btn.addEventListener('click', async () => {
      const outcome = await promptInstall().catch(() => null);
      if (outcome === 'dismissed') toast('Puedes instalarla cuando quieras desde esta misma página.', { tone: 'success' });
    });
    return [btn, h('p', { class: 'small muted install__hint', text: 'Tu navegador te pedirá confirmación. No hace falta ninguna tienda de aplicaciones.' })];
  }
  if (st === 'interna') {
    const url = `${location.origin}${location.pathname}#/instalar`;
    const copy = h('button', { type: 'button', class: 'btn btn--secondary btn--block' }, icon('copy'), h('span', { text: 'Copiar el enlace' }));
    copy.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(url); toast('Enlace copiado. Pégalo en Chrome o en Safari.'); } catch { toast(url); }
    });
    return [
      h('div', { class: 'install-warn' }, icon('triangle-alert', { size: 'lg' }),
        h('p', {}, h('strong', { text: 'Estás dentro de otra aplicación.' }),
          h('span', { text: isAndroidOrIos() ? ' Desde aquí no se puede instalar. Pulsa el menú (⋯ o ⋮) y elige «Abrir en el navegador», o copia el enlace y pégalo en Chrome o en Safari.' : ' Abre esta página en tu navegador para instalarla.' }))),
      copy,
    ];
  }
  if (st === 'ios') {
    return [
      h('ol', { class: 'install-steps' },
        step(1, 'share', 'Pulsa «Compartir»', 'El cuadrado con la flecha hacia arriba, abajo en Safari o arriba en Chrome.'),
        step(2, 'plus', 'Elige «Añadir a pantalla de inicio»', 'Si no lo ves, desliza la lista hacia arriba.'),
        step(3, 'check', 'Pulsa «Añadir»', 'Pyme Hub aparecerá en tu pantalla de inicio.')),
      h('p', { class: 'small muted install__hint', text: 'En iPhone y iPad funciona con Safari y, desde iOS 16.4, también con Chrome y Edge.' }),
    ];
  }
  // Navegadores sin aviso propio todavía (o que ya lo mostraron en esta visita)
  return [
    h('ol', { class: 'install-steps' },
      isAndroid()
        ? [
          step(1, 'ellipsis', 'Abre el menú del navegador', 'Los tres puntos de la esquina superior.'),
          step(2, 'download', 'Elige «Instalar aplicación»', 'O «Añadir a pantalla de inicio», según el navegador.'),
          step(3, 'check', 'Confirma', 'Pyme Hub aparecerá con el resto de tus apps.'),
        ]
        : [
          step(1, 'download', 'Busca el icono de instalar', 'En Chrome y Edge, a la derecha de la barra de direcciones.'),
          step(2, 'check', 'Pulsa «Instalar»', 'Pyme Hub se abrirá en su propia ventana.'),
          step(3, 'smartphone', 'O instálala en el móvil', 'Abre esta misma página en el teléfono.'),
        ]),
    h('p', { class: 'small muted install__hint', text: 'Si tu navegador no ofrece la opción, usa Chrome, Edge o Safari.' }),
  ];
}

function isAndroidOrIos() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
}

function step(n, ic, title, text) {
  return h('li', { class: 'install-step' },
    h('span', { class: 'install-step__num', 'aria-hidden': 'true', text: String(n) }),
    h('span', { class: 'install-step__body' }, h('strong', { text: title }), h('span', { class: 'small muted', text })),
    h('span', { class: 'install-step__icon', 'aria-hidden': 'true' }, icon(ic)));
}
