import { h } from '../../lib/dom.js';
import { session } from '../../lib/store.js';
import { page } from '../../components/layout/Page.js';
import { card } from '../../components/ui/Card.js';
import { icon } from '../../components/ui/Icon.js';
import { comingSoonPage } from '../shared/proximamente.js';

/** Vista informativa del plan Completo para empresas con plan Entrada (RF-012). */
function planInfo() {
  const ventajas = [
    ['shield-alert', 'Riesgo de rotación explicado', 'Cada alerta muestra los factores que la provocan y su fuente, para que la decisión sea siempre de una persona.'],
    ['chart-line', 'Tendencias y línea base', 'Compara la rotación de tu empresa con la de los 12 meses anteriores, con datos reales.'],
    ['users', 'Alertas a RR. HH.', 'Avisos a tiempo para tener una conversación antes de que alguien decida irse.'],
  ];
  return page({
    title: 'IA de RR. HH.',
    subtitle: 'Anticipa la rotación y cuida a las personas que hacen crecer tu negocio.',
    children: [
      card({
        title: 'Disponible en el plan Completo',
        iconName: 'sparkles',
        body: [
          h('p', { text: 'Tu empresa tiene el plan Entrada, con Bienestar, Formación y el Asesor de formación. El plan Completo añade la IA de RR. HH.:' }),
          h('ul', { class: 'list' }, ventajas.map(([ic, title, text]) => h('li', { class: 'list__item' },
            h('span', { class: 'person' },
              h('span', { class: 'state__icon' }, icon(ic)),
              h('span', { class: 'person__text' },
                h('strong', { text: title }),
                h('span', { class: 'person__meta', text }))))),
          ),
          h('p', { class: 'small muted', text: 'Para cambiar de plan, habla con tu persona de contacto en Pyme Hub.' }),
        ],
      }),
    ],
  });
}

export default function iaRrhhView() {
  if (!session.hasFeature('riesgo_rotacion')) return planInfo();
  return comingSoonPage({
    title: 'IA de RR. HH.',
    subtitle: 'Anticipa la rotación y cuida a las personas que hacen crecer tu negocio.',
    iconName: 'sparkles',
    heading: 'Estamos preparando el panel de riesgo de rotación.',
    text: 'Verás el ranking de riesgo con los factores y sus fuentes. La puntuación orienta una conversación, no decide nada sobre la persona.',
  });
}
