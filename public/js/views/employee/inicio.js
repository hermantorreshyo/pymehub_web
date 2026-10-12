import { wellbeing } from '../../services/api.js';
import { h } from '../../lib/dom.js';
import { session } from '../../lib/store.js';
import { SCALES, levelOf, optionLabel, tone, wellbeingBadge } from '../../lib/wellbeing.js';
import { welcomeHeader } from '../../components/dashboard/WelcomeHeader.js';
import { card } from '../../components/ui/Card.js';
import { icon } from '../../components/ui/Icon.js';
import { dataView, soonState } from '../../components/ui/StateView.js';

/** Inicio del empleado: pensado para el móvil y el uso con una mano (RNF-031). */
export default function employeeHome() {
  const me = session.me;
  const { node: welcome, titleId } = welcomeHeader({
    name: me.usuario.nombre,
    text: 'Este es tu espacio para contar cómo estás y seguir creciendo.',
  });

  const cards = [
    session.hasFeature('bienestar') && card({
      title: 'Tu check-in de hoy',
      iconName: 'smile',
      className: 'card--checkin',
      body: dataView({
        load: (signal) => wellbeing.mine(30, signal),
        loadingLabel: 'Comprobando tu check-in…',
        lines: 2,
        render: (res) => checkinSummary(res),
      }),
    }),
    session.hasFeature('formacion') && card({
      title: 'Tu formación',
      iconName: 'graduation-cap',
      body: soonState({
        title: 'Tu formación aparecerá aquí.',
        text: 'Módulos cortos para aprender en el móvil y un asesor que te recomienda por dónde seguir.',
      }),
    }),
  ].filter(Boolean);

  return {
    title: 'Inicio',
    node: h('section', { class: 'page', 'aria-labelledby': titleId }, welcome, h('div', { class: 'dashboard-grid' }, cards)),
  };
}

function checkinSummary({ data, meta }) {
  const today = data.find((c) => c.fecha === meta.hoy);
  if (!today) {
    return h('div', { class: 'home-checkin' },
      h('p', { class: 'home-checkin__lead', text: '¿Cómo te sientes hoy? Cuéntanoslo en 15 segundos.' }),
      h('p', { class: 'small muted', text: 'Tres preguntas rápidas. Tu empresa solo ve medias de equipo, nunca tus respuestas.' }),
      h('a', { class: 'btn btn--primary btn--lg btn--block', href: '#/checkin' }, icon('smile'), h('span', { text: 'Hacer mi check-in' })),
      meta.racha > 0 ? h('p', { class: 'home-checkin__streak' }, icon('flame', { size: 'sm' }), meta.racha === 1 ? 'Ayer respondiste: ¡sigue la racha!' : `Llevas ${meta.racha} días seguidos`) : null);
  }
  return h('div', { class: 'home-checkin home-checkin--done' },
    h('p', { class: 'home-checkin__lead' }, icon('circle-check'), ' Hecho hoy. ¡Gracias!'),
    h('ul', { class: 'answers', role: 'list' },
      SCALES.map((s) => h('li', { class: ['answers__item', `answers__item--${tone(s, today[s.name])}`] },
        icon(s.options.find((o) => o.value === today[s.name])?.icon ?? 'meh'),
        h('span', {}, h('strong', { text: s.short }), ' ', optionLabel(s.name, today[s.name]))))),
    meta.medias ? h('p', { class: 'home-checkin__meta' }, 'Tu media de 30 días: ', h('strong', { text: `${meta.medias.indice}/100` }), ' ', wellbeingBadge(levelOf(meta.medias.indice))) : null,
    h('a', { class: 'btn btn--secondary btn--block', href: '#/checkin' }, icon('activity'), h('span', { text: 'Ver mi evolución' })));
}
