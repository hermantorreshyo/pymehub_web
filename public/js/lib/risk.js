/**
 * Riesgo de rotación (§9): piezas comunes del panel de IA de RR. HH., el ranking y la ficha.
 *
 * - El nivel siempre va en texto e icono, nunca solo con color (RNF-044).
 * - Cada factor se explica en lenguaje llano con su evidencia y sus fuentes (RF-034).
 * - La puntuación orienta una conversación; ninguna acción es automática (LEG-005).
 */
import { h } from './dom.js';
import { formatDate, formatNumber, plural } from './format.js';
import { badge, levelBadge } from '../components/ui/Badge.js';
import { icon } from '../components/ui/Icon.js';

export const NIVELES_RIESGO = {
  ALTO: { text: 'Alto', range: '55–100', tone: 'danger', icon: 'triangle-alert' },
  MEDIO: { text: 'Medio', range: '30–54', tone: 'warning', icon: 'circle-alert' },
  BAJO: { text: 'Bajo', range: '0–29', tone: 'success', icon: 'circle-check' },
};

export const DIMENSIONES = { equipo: 'Equipo', puesto: 'Puesto', turno: 'Turno', tipo_contrato: 'Tipo de contrato' };

export const SUPERVISION = 'Esta puntuación orienta una conversación, no decide nada sobre la persona. El sistema solo avisa: cualquier decisión es siempre de una persona (LEG-005).';

/** "+30" o "−15" (signo menos tipográfico). */
export function points(n) {
  return n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0';
}

/** Porcentaje con coma decimal: 12,3 %. */
export function pct(n, digits = 1) {
  return n === null || n === undefined ? '—' : `${formatNumber(n, { maximumFractionDigits: digits })} %`;
}

/** Puntuación 0–100 con su nivel en texto e icono y una barra de apoyo visual. */
export function scoreMeter(puntuacion, nivel, { size = 'md' } = {}) {
  return h('div', { class: ['risk-meter', `risk-meter--${size}`, `risk-meter--${nivel}`] },
    h('span', { class: 'risk-meter__value' }, String(puntuacion), h('small', { text: '/100' })),
    levelBadge(nivel),
    h('span', {
      class: 'risk-meter__track',
      role: 'img',
      'aria-label': `Puntuación ${puntuacion} de 100, nivel ${NIVELES_RIESGO[nivel]?.text.toLowerCase() ?? nivel}`,
    }, h('span', { class: 'risk-meter__fill', style: { '--w': `${Math.max(2, puntuacion)}%` } })));
}

/** Factores que suman o restan, con su explicación, evidencia y fuentes. */
export function factorList(factores, { compact = false } = {}) {
  if (!factores.length) {
    return h('p', { class: 'risk-none' }, icon('circle-check', { size: 'sm' }),
      'Ningún factor del modelo suma puntos ahora mismo.');
  }
  return h('ul', { class: ['risk-factors', compact && 'risk-factors--compact'], role: 'list' },
    factores.map((f) => h('li', { class: ['risk-factor', f.puntos < 0 && 'risk-factor--minus'] },
      h('span', { class: 'risk-factor__pts', 'aria-label': `${points(f.puntos)} puntos` }, points(f.puntos)),
      h('div', { class: 'risk-factor__body' },
        h('strong', { text: f.nombre }),
        compact ? null : h('span', { text: f.detalle }),
        compact ? null : h('span', { class: 'risk-factor__meta' },
          `Evidencia: ${f.evidencia}`,
          f.fuentes?.length ? ` · Fuentes: ${f.fuentes.join(', ')}` : ' · Sin fuente directa')))));
}

/** Principales factores en una línea (ranking): "Antigüedad +30 · Ausencias +25". */
export function factorChips(factores) {
  if (!factores.length) return h('span', { class: 'small muted', text: 'Sin factores' });
  return h('span', { class: 'risk-chips' },
    factores.map((f) => h('span', { class: ['risk-chip', f.puntos < 0 && 'risk-chip--minus'] },
      f.nombre, h('b', { text: points(f.puntos) }))));
}

/** Aviso de supervisión humana con enlace a la metodología (RF-034, LEG-005). */
export function supervisionNote({ withLink = true } = {}) {
  return h('p', { class: 'anon-note risk-note' }, icon('shield-check', { size: 'sm' }),
    h('span', {}, SUPERVISION, withLink ? ' ' : null,
      withLink ? h('a', { href: '#/ia-rrhh/metodologia', text: '¿De dónde sale esto?' }) : null));
}

/** Comparación con la línea base (RF-037): datos reales, sin predicciones de impacto. */
export function baselineComparison(d) {
  const lb = d.linea_base;
  const a = d.actual;
  const c = d.comparacion;
  const row = (title, antes, ahora, rel) => h('li', { class: 'baseline__row' },
    h('span', { class: 'baseline__title', text: title }),
    h('span', { class: 'baseline__vals' },
      h('span', {}, h('small', { text: 'Antes' }), antes),
      icon('arrow-right', { size: 'sm' }),
      h('span', {}, h('small', { text: 'Desde el alta' }), ahora)),
    rel === null ? badge('Sin referencia', { iconName: 'minus' })
      : badge(`${rel > 0 ? '+' : rel < 0 ? '−' : ''}${formatNumber(Math.abs(rel), { maximumFractionDigits: 1 })} %`,
        { tone: rel <= c.objetivo_piloto ? 'success' : rel < 0 ? 'info' : 'warning', iconName: rel < 0 ? 'arrow-down' : rel > 0 ? 'arrow-up' : 'minus' }));
  return h('div', { class: 'stack' },
    h('ul', { class: 'baseline', role: 'list' },
      row('Rotación voluntaria anual', pct(lb.rotacion_voluntaria), pct(a.rotacion_voluntaria_anualizada), c.rotacion_relativa),
      row('Ausencias injustificadas por persona y año', formatNumber(lb.absentismo_por_persona, { maximumFractionDigits: 2 }), formatNumber(a.absentismo_anualizado_por_persona, { maximumFractionDigits: 2 }), c.absentismo_relativo)),
    h('p', { class: 'small muted', text: `Línea base: ${formatDate(lb.periodo_inicio)} – ${formatDate(lb.periodo_fin)}${lb.fuente ? ` · ${lb.fuente}` : ''}. Desde el alta: ${plural(a.dias, 'día', 'días')}, cifras anualizadas. Objetivo del piloto: reducir la rotación un ${Math.abs(c.objetivo_piloto)} % a 12 meses.` }),
    c.periodo_corto ? h('p', { class: 'anon-note' }, icon('hourglass', { size: 'sm' }), 'Han pasado menos de 90 días desde el alta: la comparación todavía no es representativa.') : null);
}
