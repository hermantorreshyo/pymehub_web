import { h } from '../../lib/dom.js';
import { session } from '../../lib/store.js';
import { icon } from '../../components/ui/Icon.js';
import { animatedLogo } from '../../components/brand/AnimatedLogo.js';
import { brandBackground } from '../../components/brand/BrandBackground.js';

/**
 * Sitio web público: lo primero que ve cualquier visitante en pymehub.hermantorres.com.
 * Presenta Pyme Hub con la línea gráfica de la landing "Muy pronto" (logotipo animado,
 * retícula, consola de módulos) y lleva al acceso de usuarios (#/acceso).
 * Es estático: no llama a la API ni muestra cifras que el MVP no respalde (§13.6).
 */

const CONSOLE_MESSAGES = [
  ['Conectando personas…', null],
  ['Registrando el check-in de bienestar en 15 segundos…', 0],
  ['Preparando una micro-formación de 5 minutos…', 1],
  ['El asesor con IA recomienda qué aprender…', 2],
  ['Explicando el riesgo de rotación con sus fuentes…', 3],
  ['Cuidando la privacidad de cada persona…', 4],
];
const CONSOLE_CHIPS = ['Bienestar', 'Upskilling', 'Asesor de formación', 'IA de RR. HH.', 'Privacidad'];

export default function siteView() {
  const logged = session.isAuthenticated;
  const access = logged
    ? { text: 'Ir a mi panel', href: '#/inicio', icon: 'arrow-right' }
    : { text: 'Acceso usuarios', href: '#/acceso', icon: 'log-in' };

  const header = siteHeader(access);
  const node = h('div', { class: 'site' },
    header,
    h('main', { id: 'contenido', tabindex: '-1' },
      hero(access),
      howItWorks(),
      modules(),
      trust(),
      plans(),
      finalCta(access)),
    footer(access));

  wireBehaviour(node, header);
  return { title: 'Talento que impulsa tu negocio', node };
}

/* ---------- Cabecera ---------- */

function scrollLink(text, target) {
  // La navegación es por hash (#/ruta): los anclajes internos se resuelven con scroll
  return h('a', {
    href: '#/',
    text,
    onclick: (event) => {
      event.preventDefault();
      const el = document.getElementById(target);
      if (!el) return;
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      el.querySelector('h2')?.focus({ preventScroll: true });
    },
  });
}

function siteHeader(access) {
  return h('header', { class: 'site__header' },
    h('div', { class: 'site__bar' },
      h('a', { class: 'site__brand', href: '#/', 'aria-label': 'Pyme Hub, inicio' },
        h('img', { src: 'assets/brand/logo.png', alt: '', width: 150, height: 40 })),
      h('nav', { class: 'site__nav', 'aria-label': 'Secciones del sitio' },
        scrollLink('Cómo funciona', 'como-funciona'),
        scrollLink('Módulos', 'modulos'),
        scrollLink('Privacidad', 'confianza'),
        scrollLink('Planes', 'planes')),
      h('a', { class: 'btn btn--primary site__access', href: access.href },
        icon(access.icon), h('span', { text: access.text }))));
}

/* ---------- Hero ---------- */

function hero(access) {
  const status = h('span', { class: 'console__status', text: CONSOLE_MESSAGES[0][0] });
  const chips = CONSOLE_CHIPS.map((text) => h('span', { class: 'chip', text }));

  return h('section', { class: 'hero', 'aria-labelledby': 'site-titulo' },
    brandBackground(),
    h('div', { class: 'site__wrap hero__inner' },
      h('div', { class: 'hero__logo' }, animatedLogo()),
      h('span', { class: 'pill hero__badge' }, h('span', { class: 'live-dot', 'aria-hidden': 'true' }), 'Para pymes de logística de última milla'),
      h('h1', { id: 'site-titulo', tabindex: '-1' },
        'Cuida, forma y retén a tu equipo. ', h('span', { class: 'text-gradient', text: 'Sin complicaciones.' })),
      h('p', { class: 'hero__lead', text: 'Bienestar, formación e inteligencia artificial, por fin al alcance de cualquier pyme. Pyme Hub reúne en un solo lugar lo que necesitas para cuidar a tu plantilla, hacerla crecer y anticiparte a las bajas.' }),
      h('div', { class: 'hero__ctas' },
        h('a', { class: 'btn btn--primary btn--lg', href: access.href }, icon(access.icon), h('span', { text: access.text === 'Acceso usuarios' ? 'Acceder a la plataforma' : access.text })),
        h('a', {
          class: 'btn btn--secondary btn--lg',
          href: '#/',
          onclick: (event) => {
            event.preventDefault();
            document.getElementById('modulos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          },
        }, h('span', { text: 'Conoce los módulos' }), icon('arrow-down'))),
      h('div', { class: 'console', 'aria-hidden': 'true', dataset: { console: '' } },
        h('div', { class: 'console__top' }, h('span', { class: 'console__spinner' }), status),
        h('div', { class: 'brand-bar' }),
        h('div', { class: 'chip-row' }, chips))));
}

/* ---------- Cómo funciona ---------- */

function howItWorks() {
  const steps = [
    ['Da de alta a tu plantilla', 'Importa a tu equipo con un CSV o una a una, organízalo por zonas o turnos e invítalo con un enlace.'],
    ['Check-in de 15 segundos', 'Cada persona cuenta cómo está desde el móvil. Tú ves el clima del equipo, siempre anónimo.'],
    ['Formación en 5 minutos', 'Micro-módulos pensados para conductores y operarios, también sin cobertura, con un asesor que recomienda qué aprender.'],
    ['Decide con información', 'Detecta a tiempo el riesgo de rotación, con cada factor explicado y sus fuentes. La decisión siempre es tuya.'],
  ];
  return h('section', { class: 'section section--white', id: 'como-funciona', 'aria-labelledby': 'h-como' },
    h('div', { class: 'site__wrap' },
      sectionHead('h-como', 'Cómo funciona', 'Del primer día a un equipo que se queda', 'Cuatro pasos sencillos, sin instalaciones ni consultores: Pyme Hub funciona en el navegador y en el móvil.'),
      h('ol', { class: 'steps', role: 'list' },
        steps.map(([title, text]) => h('li', { class: 'step on-scroll' }, h('h3', { text: title }), h('p', { text }))))));
}

/* ---------- Módulos ---------- */

function modules() {
  return h('section', { class: 'section', id: 'modulos', 'aria-labelledby': 'h-modulos' },
    brandBackground(),
    h('div', { class: 'site__wrap' },
      sectionHead('h-modulos', 'Módulos', 'Todo lo que tu equipo necesita, en un solo lugar', 'Empieza por lo esencial y crece cuando lo necesites.', true),
      h('div', { class: 'feature-grid' },
        feature({
          iconName: 'heart',
          title: 'Bienestar',
          text: 'Conoce cómo se siente tu equipo antes de que sea tarde.',
          items: ['Check-in diario voluntario: ánimo, energía y estrés', 'Clima por equipo, anónimo (mínimo 5 personas)', 'Alertas cuando un equipo empeora'],
          tag: 'Plan Entrada y Completo',
        }),
        feature({
          iconName: 'graduation-cap',
          tone: 'blue',
          title: 'Formación adaptativa',
          text: 'Micro-formación útil para el día a día de la última milla.',
          items: ['Módulos de 3 a 5 minutos con cuestionario', 'Asesor con IA que recomienda qué aprender', 'Funciona en el móvil, incluso sin conexión'],
          tag: 'Plan Entrada y Completo',
        }),
        feature({
          iconName: 'sparkles',
          tone: 'navy',
          title: 'IA de RR. HH.',
          text: 'Anticípate a la rotación con información que se entiende.',
          items: ['Riesgo de rotación con cada factor explicado', 'Fuentes y metodología siempre a la vista', 'Comparación con tu punto de partida'],
          tag: 'Plan Completo',
        }))));
}

function feature({ iconName, tone = '', title, text, items, tag }) {
  return h('article', { class: 'feature on-scroll' },
    h('span', { class: ['feature__icon', tone && `feature__icon--${tone}`] }, icon(iconName, { size: 'lg' })),
    h('h3', { text: title }),
    h('p', { text }),
    h('ul', { class: 'feature__list', role: 'list' }, items.map((item) => h('li', {}, icon('check'), h('span', { text: item })))),
    h('span', { class: 'badge badge--info feature__tag', text: tag }));
}

/* ---------- Confianza ---------- */

function trust() {
  return h('section', { class: 'section section--white', id: 'confianza', 'aria-labelledby': 'h-confianza' },
    h('div', { class: 'site__wrap' },
      sectionHead('h-confianza', 'Hecho para tu sector', 'Humana, clara y de confianza', 'Detrás de cada dato hay personas. Por eso Pyme Hub cuida la privacidad desde el diseño.'),
      h('div', { class: 'feature-grid' },
        trustItem('truck', 'Pensado para la última milla', 'Para pymes de 10 a 250 personas con conductores, repartidores y operarios de almacén.'),
        trustItem('shield-check', 'Privacidad por diseño', 'Bienestar solo agregado, notas cifradas y ningún dato personal enviado a la IA. Cumplimiento RGPD.'),
        trustItem('smartphone', 'En el bolsillo de cada persona', 'Se instala como una app desde el navegador y guarda lo que haces sin cobertura hasta recuperar la señal.'))));
}

function trustItem(iconName, title, text) {
  return h('article', { class: 'feature on-scroll' },
    h('span', { class: 'feature__icon' }, icon(iconName, { size: 'lg' })),
    h('h3', { text: title }),
    h('p', { text }));
}

/* ---------- Planes ---------- */

function plans() {
  return h('section', { class: 'section', id: 'planes', 'aria-labelledby': 'h-planes' },
    h('div', { class: 'site__wrap' },
      sectionHead('h-planes', 'Planes', 'Un precio claro por persona', 'Pagas solo por las personas activas de tu plantilla.', true),
      h('div', { class: 'plans' },
        plan({
          name: 'Entrada',
          price: '15 €',
          text: 'Para empezar a cuidar y formar a tu equipo.',
          items: ['Bienestar', 'Formación adaptativa', 'Asesor de formación con IA'],
        }),
        plan({
          name: 'Completo',
          price: '29 €',
          featured: true,
          text: 'Para anticiparte a la rotación con datos.',
          items: ['Todo lo del plan Entrada', 'IA de RR. HH.: riesgo de rotación explicable', 'Alertas y línea base de impacto'],
        })),
      h('p', { class: 'plans__note', text: 'Suscripción mensual o anual por empleado activo.' })));
}

function plan({ name, price, text, items, featured = false }) {
  return h('article', { class: ['plan on-scroll', featured && 'plan--featured'] },
    h('div', { class: 'stack' },
      featured ? h('span', { class: 'badge badge--success', text: 'Más completo' }) : null,
      h('h3', { class: 'plan__name', text: `Plan ${name}` }),
      h('p', { class: 'muted small', text })),
    h('p', { class: 'plan__price' },
      h('span', { class: 'plan__amount', text: price }),
      h('span', { class: 'plan__unit', text: 'por empleado y mes' })),
    h('ul', { class: 'feature__list', role: 'list' }, items.map((item) => h('li', {}, icon('check'), h('span', { text: item })))));
}

/* ---------- Llamada final y pie ---------- */

function finalCta(access) {
  return h('section', { class: 'section', 'aria-labelledby': 'h-cta' },
    h('div', { class: 'site__wrap' },
      h('div', { class: 'cta-band on-scroll' },
        brandBackground({ dark: true }),
        h('h2', { id: 'h-cta', text: 'Mejores personas, mejores negocios.' }),
        h('p', { text: '¿Tu empresa ya trabaja con Pyme Hub? Entra con el email y la contraseña de tu cuenta.' }),
        h('a', { class: 'btn btn--primary btn--lg', href: access.href }, icon(access.icon), h('span', { text: access.text })))));
}

function footer(access) {
  const year = new Date().getFullYear();
  return h('footer', { class: 'site__footer' },
    h('div', { class: 'site__wrap' },
      h('strong', { text: 'Pyme Hub · Talento que impulsa tu negocio' }),
      h('p', { text: `© ${year} Pyme Hub. Proyecto del Trabajo Fin de Máster de EUDE Business School (The Best Team).` }),
      h('nav', { 'aria-label': 'Enlaces del pie' },
        h('a', { href: access.href, text: access.text }))));
}

function sectionHead(id, eyebrow, title, text, center = false) {
  return h('div', { class: ['section__head', center && 'section__head--center'] },
    h('span', { class: 'section__eyebrow', text: eyebrow }),
    h('h2', { id, tabindex: '-1', text: title }),
    text ? h('p', { text }) : null);
}

/* ---------- Comportamiento: consola, aparición al hacer scroll y cabecera ---------- */

function wireBehaviour(node, header) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Consola de módulos: mensajes rotativos, como en la landing
  const consoleEl = node.querySelector('[data-console]');
  const status = consoleEl.querySelector('.console__status');
  const chips = consoleEl.querySelectorAll('.chip');
  let i = 0;
  const show = () => {
    const [text, chip] = CONSOLE_MESSAGES[i];
    chips.forEach((c, n) => c.classList.toggle('is-on', chip !== null && n === chip));
    status.textContent = text;
  };
  const timer = setInterval(() => {
    if (!node.isConnected) { stop(); return; }
    i = (i + 1) % CONSOLE_MESSAGES.length;
    if (reduce) { show(); return; }
    status.classList.add('is-out');
    setTimeout(() => { show(); status.classList.remove('is-out'); }, 350);
  }, 2800);

  // Aparición al entrar en pantalla
  let observer = null;
  if ('IntersectionObserver' in window && !reduce) {
    observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      }
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    node.querySelectorAll('.on-scroll').forEach((el) => observer.observe(el));
  } else {
    node.querySelectorAll('.on-scroll').forEach((el) => el.classList.add('is-visible'));
  }

  // Sombra de la cabecera al desplazarse
  const onScroll = () => {
    if (!node.isConnected) { stop(); return; }
    header.classList.toggle('is-scrolled', window.scrollY > 8);
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  function stop() {
    clearInterval(timer);
    observer?.disconnect();
    window.removeEventListener('scroll', onScroll);
  }
}
