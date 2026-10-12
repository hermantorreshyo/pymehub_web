import { risk } from '../../services/api.js';
import { h } from '../../lib/dom.js';
import { session } from '../../lib/store.js';
import { NIVELES_RIESGO, SUPERVISION, points } from '../../lib/risk.js';
import { page } from '../../components/layout/Page.js';
import { levelBadge } from '../../components/ui/Badge.js';
import { card } from '../../components/ui/Card.js';
import { alertBox } from '../../components/ui/Field.js';
import { table } from '../../components/ui/Table.js';
import { dataView, emptyState } from '../../components/ui/StateView.js';

/**
 * «¿De dónde sale esto?» (RF-034, LEG-006): reglas, pesos, evidencia, fuentes, exclusiones
 * y limitaciones del motor de riesgo, tal como las publica GET /v1/risk/methodology.
 */
export default function metodologiaView() {
  const back = { href: '#/ia-rrhh', label: 'Volver a IA de RR. HH.' };
  if (!session.hasFeature('riesgo_rotacion')) {
    return page({
      title: 'Cómo se calcula el riesgo',
      back,
      children: [card({ body: emptyState({ title: 'Disponible en el plan Completo.', text: 'La metodología del riesgo de rotación forma parte de la IA de RR. HH.', iconName: 'lock' }) })],
    });
  }
  return page({
    title: 'Cómo se calcula el riesgo',
    subtitle: 'Reglas sencillas, con su evidencia y sus fuentes, para que puedas explicar cada puntuación.',
    back,
    children: [dataView({
      loadingLabel: 'Cargando la metodología…',
      lines: 8,
      load: (signal) => risk.methodology(signal),
      render: render,
    })],
  });
}

function render(m) {
  const fuentes = new Map(m.fuentes.map((f) => [f.id, f.referencia]));
  return h('div', { class: 'stack' },
    alertBox({ tone: 'info', title: 'Supervisión humana', text: SUPERVISION, iconName: 'shield-check' }),

    h('div', { class: 'two-columns' },
      card({
        title: 'Qué es',
        iconName: 'info',
        body: [
          h('p', { text: `Una puntuación de 0 a 100 por persona, calculada cada noche y bajo demanda con las reglas ${m.version}. Suma los puntos de los factores que se cumplen y resta el del reconocimiento.` }),
          h('p', { text: 'Solo usa datos que la empresa ya maneja: fecha de alta, contrato, turno, incidencias laborales y formación asignada. Nunca datos de salud ni del check-in de bienestar.' }),
        ],
      }),
      card({
        title: 'Niveles',
        iconName: 'gauge',
        body: h('ul', { class: 'list' }, m.niveles.map((n) => h('li', { class: 'list__item' },
          levelBadge(n.nivel),
          h('span', { text: `${n.desde} a ${n.hasta} puntos` }),
          h('span', { class: 'small muted', text: n.nivel === 'ALTO' ? 'Genera una alerta para RR. HH.' : n.nivel === 'MEDIO' ? 'Conviene seguirlo' : 'Sin señales relevantes' })))),
      })),

    card({
      title: `Factores · reglas ${m.version}`,
      iconName: 'list-checks',
      body: [
        h('p', { class: 'small muted', text: 'Los pesos ordenan la fuerza de la evidencia: un factor respaldado por meta-análisis pesa más que uno apoyado en encuestas o en estudios de otro sector.' }),
        table({
          caption: 'Factores del motor de riesgo',
          rows: m.factores,
          columns: [
            { label: 'Factor', primary: true, render: (f) => h('span', { class: 'cell-stack' }, h('strong', { text: `${f.codigo} · ${f.nombre}` })) },
            { label: 'Condición', render: (f) => f.condicion },
            { label: 'Puntos', render: (f) => h('strong', { text: f.puntos_max < 0 ? points(f.puntos_max) : `hasta ${points(f.puntos_max)}` }) },
            { label: 'Evidencia', render: (f) => f.evidencia },
            { label: 'Fuentes', render: (f) => (f.fuentes.length ? f.fuentes.join(', ') : 'Hipótesis del equipo') },
          ],
        }),
      ],
    }),

    h('div', { class: 'two-columns' },
      card({
        title: 'Lo que no se usa, y por qué',
        iconName: 'eye-off',
        body: h('ul', { class: 'goal-list goal-list--plain' }, m.excluidos.map((x) => h('li', {},
          h('strong', { text: x.nombre }), ' ', x.motivo,
          x.fuentes.length ? h('span', { class: 'small muted', text: ` (${x.fuentes.join(', ')})` }) : null))),
      }),
      card({
        title: 'Limitaciones',
        iconName: 'triangle-alert',
        body: h('ul', { class: 'goal-list goal-list--plain' }, m.limitaciones.map((t) => h('li', { text: t }))),
      })),

    card({
      title: 'Fuentes',
      iconName: 'book-open',
      body: h('ol', { class: 'sources' }, [...fuentes].map(([id, ref]) => h('li', { id: `fuente-${id}` },
        h('strong', { text: `[${id}] ` }), ref))),
    }),
    h('p', { class: 'small muted', text: `Niveles: ${Object.values(NIVELES_RIESGO).map((n) => `${n.text.toLowerCase()} ${n.range}`).join(' · ')}. Cada puntuación guarda los factores y la versión de las reglas con que se calculó, para poder explicarla y reproducirla.` }));
}
