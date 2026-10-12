import { training } from '../../services/api.js';
import { h } from '../../lib/dom.js';
import { LABELS, plural } from '../../lib/format.js';
import { href, navigate } from '../../lib/router.js';
import { NIVELES, categoryBadge, deadlineText, minutes, moduleArt, stateBadge } from '../../lib/training.js';
import { personLine } from '../../components/ui/Avatar.js';
import { badge } from '../../components/ui/Badge.js';
import { button, linkButton, setLoading } from '../../components/ui/Button.js';
import { card } from '../../components/ui/Card.js';
import { icon } from '../../components/ui/Icon.js';
import { dataView, emptyState, errorState, loadingState } from '../../components/ui/StateView.js';
import { toast } from '../../components/ui/Toast.js';
import { openAssignDialog } from '../../components/training/AssignDialog.js';

/**
 * Ficha de un módulo para la gestión: contenido, cuestionario con su solución, quién lo cursa
 * y, si es un módulo propio, edición, publicación y archivo (RF-046).
 */
export default async function moduleDetailView({ params }) {
  const root = h('section', { class: 'page module-page cq' }, loadingState({ label: 'Cargando el módulo…', lines: 5 }));

  async function start() {
    try {
      const m = await training.module(params.id);
      root.replaceChildren(...detail(m, start));
    } catch (error) {
      root.replaceChildren(
        h('a', { class: 'back-link', href: href('/formacion', { tab: 'catalogo' }) }, icon('arrow-left'), 'Volver al catálogo'),
        h('h1', { tabindex: '-1', text: 'Módulo de formación' }),
        errorState({ error, onRetry: start }));
    }
  }
  await start();
  return { title: 'Formación', node: root };
}

function detail(m, reload) {
  const published = m.estado === 'PUBLICADO';
  const actions = h('div', { class: 'module-hero__actions' });
  if (published) actions.append(button({ text: 'Asignar', iconName: 'send', onClick: () => openAssignDialog({ modulo: m, onDone: reload }) }));
  if (m.propio) {
    actions.append(linkButton({ text: 'Editar', href: href(`/formacion/modulos/${m.id}/editar`), variant: 'secondary', iconName: 'pencil' }));
    if (!published) {
      const pub = button({
        text: 'Publicar',
        iconName: 'circle-check',
        variant: published ? 'secondary' : 'primary',
        onClick: async () => {
          setLoading(pub, true, 'Publicando…');
          try {
            await training.publishModule(m.id);
            toast('Módulo publicado: ya está en el catálogo de tu empresa.');
            reload();
          } catch (error) {
            setLoading(pub, false);
            toast(error.message, { tone: 'error' });
          }
        },
      });
      actions.append(pub);
    } else {
      const arch = button({
        text: 'Archivar',
        iconName: 'archive',
        variant: 'tertiary',
        onClick: async () => {
          if (!window.confirm('¿Archivar este módulo? Dejará de estar en el catálogo, pero quien lo tenga asignado lo conserva.')) return;
          setLoading(arch, true, 'Archivando…');
          try {
            await training.updateModule(m.id, { estado: 'ARCHIVADO' });
            toast('Módulo archivado.');
            navigate('/formacion', { tab: 'catalogo' });
          } catch (error) {
            setLoading(arch, false);
            toast(error.message, { tone: 'error' });
          }
        },
      });
      actions.append(arch);
    }
  }

  const hero = h('header', { class: 'module-hero' },
    moduleArt(m.categoria, { size: 'lg', className: 'module-hero__art' }),
    h('div', { class: 'module-hero__text' },
      h('div', { class: 'training-item__tags' },
        categoryBadge(m.categoria),
        m.propio ? badge('Módulo propio', { tone: 'info', iconName: 'building' }) : badge('Catálogo Pyme Hub', { tone: 'success', iconName: 'library' }),
        !published ? badge(m.estado === 'BORRADOR' ? 'Borrador' : 'Archivado', { tone: 'warning', iconName: 'pencil' }) : null),
      h('h1', { tabindex: '-1', text: m.titulo }),
      h('p', { class: 'module-hero__summary', text: m.resumen }),
      h('ul', { class: 'module-hero__meta', role: 'list' },
        h('li', {}, icon('clock'), minutes(m.duracion_min)),
        h('li', {}, icon('signal-medium'), `Nivel ${(NIVELES[m.nivel] ?? m.nivel).toLowerCase()}`),
        h('li', {}, icon('briefcase'), m.puestos_destino.length ? m.puestos_destino.map((p) => LABELS.puesto[p] ?? p).join(', ') : 'Todos los puestos'),
        h('li', {}, icon('tag'), `Versión ${m.version}`)),
      actions));

  const content = card({
    title: 'Contenido',
    iconName: 'book-open',
    body: h('div', { class: 'stack' },
      h('h3', { class: 'small-heading', text: '¿Qué aprenderás?' }),
      h('ul', { class: 'goal-list', role: 'list' }, m.contenido.objetivos.map((o) => h('li', {}, icon('circle-check'), h('span', { text: o })))),
      h('ol', { class: 'block-preview', role: 'list' }, m.contenido.bloques.map((b) => h('li', { class: 'block-preview__item' },
        h('span', { class: 'block-preview__type' }, icon({ texto: 'book-open', lista: 'list-checks', consejo: 'lightbulb', imagen: 'eye' }[b.tipo] ?? 'book-open', { size: 'sm' }),
          { texto: 'Texto', lista: 'Lista', consejo: 'Consejo clave', imagen: 'Ilustración' }[b.tipo] ?? b.tipo),
        b.tipo === 'imagen' ? moduleArt(b.ilustracion, { size: 'sm', alt: b.alt }) : null,
        b.titulo ? h('strong', { text: b.titulo }) : null,
        b.texto ? h('p', { text: b.texto }) : null,
        b.items ? h('ul', {}, b.items.map((t) => h('li', { text: t }))) : null,
        b.alt && b.tipo === 'imagen' ? h('p', { class: 'small muted', text: b.alt }) : null)))),
  });

  const quiz = card({
    title: `Cuestionario · ${plural(m.preguntas.length, 'pregunta', 'preguntas')}`,
    iconName: 'list-checks',
    body: h('ol', { class: 'quiz-key', role: 'list' }, m.preguntas.map((p) => h('li', { class: 'quiz-key__item' },
      h('p', { class: 'quiz-key__q', text: p.enunciado }),
      h('ul', { role: 'list' }, p.opciones.map((o, k) => h('li', { class: ['quiz-key__opt', k === p.correcta && 'is-ok'] },
        icon(k === p.correcta ? 'circle-check' : 'circle', { size: 'sm' }),
        h('span', { text: o }),
        k === p.correcta ? h('span', { class: 'visually-hidden', text: ' (respuesta correcta)' }) : null)))))),
  });

  const usage = card({
    title: 'Quién lo cursa',
    iconName: 'users',
    body: dataView({
      load: (signal) => training.assignments({ modulo_id: m.id, per_page: 50 }, signal),
      isEmpty: (res) => res.data.length === 0,
      empty: () => emptyState({ title: 'Nadie lo cursa todavía.', text: published ? 'Asígnalo a un equipo o a personas concretas.' : 'Publícalo para poder asignarlo.', iconName: 'users' }),
      lines: 4,
      render: (res) => h('div', { class: 'stack' },
        h('p', { class: 'small muted', text: `${plural(res.meta.total, 'persona', 'personas')}` }),
        h('ul', { class: 'list', role: 'list' }, res.data.map((a) => h('li', { class: 'list__item' },
          personLine(a.empleado, { href: `#/plantilla/${a.empleado.id}`, meta: a.mejor_nota !== null ? `Nota ${a.mejor_nota} %` : deadlineText(a) }),
          stateBadge(a.estado))))),
    }),
  });

  return [
    h('a', { class: 'back-link', href: href('/formacion', { tab: 'catalogo' }) }, icon('arrow-left'), 'Volver al catálogo'),
    hero,
    h('div', { class: 'module-layout' }, h('div', { class: 'stack' }, content, quiz), h('aside', { class: 'stack module-aside' }, usage)),
  ];
}

