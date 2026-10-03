import { h } from '../../lib/dom.js';
import { session } from '../../lib/store.js';
import { welcomeHeader } from '../../components/dashboard/WelcomeHeader.js';
import { card } from '../../components/ui/Card.js';
import { soonState } from '../../components/ui/StateView.js';

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
      body: soonState({
        title: 'Muy pronto podrás contarnos cómo estás.',
        text: 'Tres preguntas rápidas sobre ánimo, energía y estrés. Tus notas solo las verás tú.',
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
